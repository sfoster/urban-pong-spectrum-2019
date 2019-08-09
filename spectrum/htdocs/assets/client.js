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
    sendColors() {
      console.log("sendColors as: " + this.id);
      return Promise.resolve({ status: "ok" });
    }
    heartbeat() {
      console.log("heartbeat as: " + this.id);
      return Promise.resolve({ status: "ok", position: 0 });
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
    sendColors(colorValues) {
      return this._sendRequest("/colors", "POST", null, {
        colorValues
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
      heartbeatInterval: 30000,
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
      this.heartbeat();
      this.pollTimer = setInterval(() => {
        this.heartbeat();
      }, this.config.heartbeatInterval);
    }
  }
}
