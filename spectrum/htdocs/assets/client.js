"use strict";

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

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
      let colorAnswer = [
        (rgbColors[0][0] + rgbColors[1][0]) / 2,
        (rgbColors[0][1] + rgbColors[1][1]) / 2,
        (rgbColors[0][2] + rgbColors[1][2]) / 2,
      ];
      for(let i=0; i<rgbColors.length; i++) {
        colors.push(rgbColors[i]);
      }
      colors.push(colorAnswer);
      console.log("sendColor as: " + this.id, colors);
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
      headers = Object.assign({
        'Content-Type': 'application/json',
      }, headers);

      if (body && (method == "POST" || method == "PUT")) {
         JSON.stringify(Object.assign({
          // client details of who/what wants to join
          clientId: this.id
         }, body));
      }

      let responsePromise = fetch(url, {
        method,
        headers,
        body
      });
      return responsePromise
        .then(resp => resp.json())
        .then(data => {
          console.log(route + " response: ", data);
        }).catch(ex => {
          console.warn(route + " exception: ", ex);
        });
    }
    getPosition() {
      return this._sendRequest("/queue", "GET");
    }
    joinQueue() {
      return this._sendRequest("/queue/join", "POST");
    }
    leaveQueue() {
      return this._sendRequest("/queue/leave", "POST")
    }
    sendColors(colorValue) {
      return this._sendRequest("/colors", "POST", null, {
        colorValues: [colorValue]
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
      this[methodName]().then(resp => {
        let topic = "client" + methodName.charAt(0).toUpperCase() + methodName.substring(1);
        let errorTopic = topic + "Error";
        // console.log(methodName + " resp", topic, resp);
        document.dispatchEvent(new CustomEvent(topic, {
          bubbles: true,
          detail: resp,
        }));
      }).catch(ex => {
        // console.log(methodName + " ex", errorTopic, resp);
        document.dispatchEvent(new CustomEvent(errorTopic, {
          bubbles: true,
          detail: ex,
        }));
      });
    }.bind(this);
  }
}
