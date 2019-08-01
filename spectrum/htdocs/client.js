function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

class SpectrumClient {
  constructor(config) {
    this.config = Object.assign({}, config);
    this.id = uuidv4();
    this.pollTimer = null;
  }

  toggleStatusPolling(force) {
    let wasPolling = !!this.pollTimer;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (!wasPolling || force) {
      this.pollTimer = setInterval(() => {
        this.queueStatus();
      }, 1000);
    }
  }

  join() {
    let joinPromise = fetch(this.config.prefix + '/queue/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // client details of who/what wants to join
        clientId: this.id
      }),
    });
    return joinPromise
      .then(resp => resp.json())
      .then(data => {
        console.log("join response: ", data);
      }).catch(ex => {
        console.warn("join exception: ", ex);
      });
  }

  queueStatus() {
    let statusPromise = fetch(this.config.prefix + '/queue');
    return statusPromise
      .then(resp => resp.json())
      .then(data => {
        console.log("queueStatus response: ", data);
      }).catch(ex => {
        console.warn("queueStatus exception: ", ex);
      });
  }

  colors(colorValues = []) {
    let colorsPromise = fetch(this.config.prefix + '/colors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // client details of who/what wants to join
        clientId: this.id,
        colorValues
      })
    });
    return colorsPromise
      .then(resp => resp.json())
      .then(data => {
        console.log("colors response: ", data);
      }).catch(ex => {
        console.warn("colors exception: ", ex);
      });
  }
}
