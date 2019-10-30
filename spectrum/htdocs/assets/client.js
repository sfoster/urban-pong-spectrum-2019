"use strict";

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function mixColors(color1, color2, responseColors) {
  responseColors[0] = color1;
  responseColors[1] = color2;
  responseColors[2] = [
    (color1[0] + color2[0]) / 2,
    (color1[1] + color2[1]) / 2,
    (color1[2] + color2[2]) / 2,
  ];
  return responseColors;
}

/*
  Spectrum clients
  ================

  * joinQueue - send join request, possibly including geolocation details
  * leaveQueue - send request to explicitly leave the queue instead of just timing out the heartbeat
  * getPosition - ask the server for the queue position of this client
  * heartbeat - sendping/heartbeat, inform the server we're still active
  * sendColors - accept 2 and mix them in client; send request with array of colors
*/

function FakeAPIMixin(Base) {
  class FakeAPIClient extends Base {
    joinQueue() {
      console.log("joinQueue as: " + this.id);
      return Promise.resolve({ status: "ok" });
    }
    getPosition() {
      console.log("getPosition as: " + this.id);
      return Promise.resolve({ status: "ok", position: 0 });
    }
    leaveQueue() {
      console.log("leaveQueue as: " + this.id);
      return Promise.resolve({ status: "ok" });
    }
    sendColors(rgbColors) {
      // we expect 2 (options.colorCount) colors and mix them to return a 3rd
      let colors = this._responseColors;
      if (colors) {
        colors.length = 0;
      } else {
         colors = this._responseColors = [];
      }
      mixColors(rgbColors[0], rgbColors[1], colors);
      console.log("sendColors as: " + this.id, colors);
      return Promise.resolve({
        status: "ok",
        colors: [].concat(colors),
      });
    }
    heartbeat() {
      console.log("heartbeat as: " + this.id);
      let resp = {
        status: "ok",
        position: 0,
      };
      if (this._responseColors && this._responseColors.length) {
        resp.colors = [].concat(this._responseColors);
        this._responseColors.length = 0;
      }
      return Promise.resolve(resp);
    }
  }
  return FakeAPIClient;
}

function HttpAPIMixin(Base) {
  class HttpAPIClient extends Base {
    _sendRequest(route, method = "GET", headers = {}, body) {
      let url = this.config.prefix + route + (method == "GET" ? "/" + this.id : "");
      console.log("_sendRequest to url", url);
      headers = Object.assign({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }, headers);

      if (body && (method == "POST" || method == "PUT")) {
         body = Object.assign({
          // client details of who/what wants to join
          clientId: this.id
         }, body);
      }

      let responsePromise = fetch(url, {
        method,
        headers,
        body: JSON.stringify(body),
      });
      return responsePromise
        .then(resp => {
          let statusText = resp.statusText;
          if (resp.ok || resp.status < 400) {
            return resp.json();
          } else if (resp.headers.get('Content-Type').includes("json")) {
            console.log("request got through but was denied");
            // request got through but was denied
            return resp.json().then(data => {
              if (!data.error) {
                data.error = statusText;
              }
              return data;
            });
          } else {
            console.log("error response:", resp);
          }
        })
        .then(data => {
          console.log(route + " response: ", data);
          return data;
        }).catch(ex => {
          console.warn(route + " exception: ", ex);
          return ex;
        });
    }
    getPosition() {
      return this._sendRequest("", "GET");
    }
    joinQueue() {
      return this._sendRequest("/join", "POST", undefined, {});
    }
    leaveQueue() {
      return this._sendRequest("/leave", "POST", undefined, {});
    }
    sendColors(rgbColors) {
      let colorValues = mixColors(rgbColors[0], rgbColors[1], []);
      console.log("sendColors, colorValues: ", colorValues);
      let resp = this._sendRequest("/colors", "POST", undefined, {
          colorValues,
        }
      );
      return resp.then(data => {
        data.colors = colorValues;
        return data;
      });
    }
    heartbeat() {
      return this.getPosition();
    }
  }
  return HttpAPIClient;
}

class SpectrumClient {
  constructor(config) {
    this.config = Object.assign({}, {
      heartbeatInterval: 2000,
    }, config);
    this.id = uuidv4();
    this.pollTimer = null;
    console.log("/SpectrumClient ctor");
  }

  toggleHeartbeat(force) {
    let wasPolling = !!this.pollTimer;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (!wasPolling || force) {
      this._wrappedHeartbeat = this.wrapMethod("heartbeat");
      console.log("heartbeatInterval: ", this.config.heartbeatInterval);
      this._wrappedHeartbeat();
      this.pollTimer = setInterval(() => {
        this._wrappedHeartbeat();
      }, this.config.heartbeatInterval);
    }
  }

  wrapMethod(methodName) {
    return function() {
      let topic = "client" + methodName.charAt(0).toUpperCase() + methodName.substring(1);
      this[methodName]().then(resp => {
        if (resp.error) {
          topic += "Error";
        }
        console.log(methodName + " resp", topic, resp);
        document.dispatchEvent(new CustomEvent(topic, {
          bubbles: true,
          detail: resp,
        }));
      }).catch(ex => {
        topic += "Error";
        console.log(methodName + " ex", topic, ex);
        document.dispatchEvent(new CustomEvent(topic, {
          bubbles: true,
          detail: ex,
        }));
      });
    }.bind(this);
  }
}
