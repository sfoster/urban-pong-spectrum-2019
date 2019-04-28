function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

class Client {
  constructor(player, options={}) {
    console.log("Client ctor");
    this.message_endpoint = '/controller/';
    this.pollingTimer;
    this.player = player;
  }
  publishResponse(topic, data) {
    let event = new CustomEvent('player'+topic, {
      detail: data
    });
    document.dispatchEvent(event);
  }
  sendGameMessage(msg, position) {
    msg.UUID = this.player.id;
    msg.Name = position[0].toUpperCase() + position.substring(1);

    return fetch(this.message_endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg),
    }).then(resp => {
      return resp.json();
    });
  }
  sendJoinMessage(player) {
    let position = player.position;
    let msg = {
      'Action': 'join',
      'Value': position
    };
    console.log("sendJoinMessage:", msg, position);
    return this.sendGameMessage(msg, position)
    .then(data => {
      console.log(data);
      return data;
    })
    .catch(error => {
      console.error(error);
      return error;
    });
  }

  sendStatusMessage(player) {
    let position = player.position;
    let msg = {
      'Action': 'status',
      'Value': '',
    };
    return this.sendGameMessage(msg, position)
    .then(data => {
      console.log(data);
      return data;
    })
    .catch(error => {
      console.error(error);
      return data;
    });
  }

  sendPulseMessage(player, colorValues) {
    let position = player.position;
    let msg = {
      'Action': 'pulse',
      'Value': colorValues || [
        [255,0,0],
        [0,255,0],
        [0,0,255],
        [0,0,255],
        [0,255,0],
        [255,0,0],
      ],
    };
    console.log("sendPulseMessage:", msg, position);
    return this.sendGameMessage(msg, position)
    .then(data => {
      console.log(data);
      return data;
    })
    .catch(error => {
      console.error(error);
      return data;
    });
  }
  stopPollingForStatus() {
    console.log("stopPollingForStatus");
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }
  pollForStatus(player) {
    console.log("pollForStatus:", player);
    this.stopPollingForStatus();
    this.pollingTimer = setInterval(function() {
      this.sendStatusMessage(player).then(resp => {
        this.publishResponse('status', resp);
      });
    }.bind(this), 1000);
  }
}
