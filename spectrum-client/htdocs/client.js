var message_template = {
  'Name': null,
  'UUID': null,
  'Action': null,
  'Value': null,
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

var message_endpoint = 'controller/';
var playerId = {
  'north': uuidv4(),
  'south': uuidv4()
};

function getPositionForButton(btn) {
  let parent = btn.closest("section[data-position]");
  let position = parent.dataset.position;
  return position.toLowerCase().trim()
}

function sendGameMessage(msg, position) {
  msg.UUID = playerId[position];
  msg.Name = position[0].toUpperCase() + position.substring(1);

  console.log("sendGameMessage:", msg);
  return fetch(message_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(msg),
  });
  // .then(response => response.json());
}

let timers = {
  "north": null,
  "south": null
};

function toggleStatusPolling(btn) {
  let position = getPositionForButton(btn);
  let timer = timers[position];
  if (timer) {
    clearInterval(timer);
    timers[position] = null;
    btn.classList.toggle("polling", false);
  } else {
    timers[position] = setInterval(function() {
      sendStatusMessage(btn);
    }, 1000);
    btn.classList.toggle("polling", true);
  }
}

function sendJoinMessage(btn) {
  let msg = Object.assign({}, message_template);
  let position = getPositionForButton(btn);
  msg.Action = 'join';
  msg.Value = position;
  sendGameMessage(msg, position)
  .then(data => console.log("response: ", data))
  .catch(error => console.error(error));
}

function sendStatusMessage(btn) {
  let msg = Object.assign({}, message_template);
  let position = getPositionForButton(btn);
  msg.Action = 'status';
  msg.Value = '';
  sendGameMessage(msg, position)
  .then(data => console.log("response: ", data))
  .catch(error => console.error(error));
}

function sendPulseMessage(btn) {
  let msg = Object.assign({}, message_template);
  let position = getPositionForButton(btn);
  msg.Action = 'pulse';
  msg.Value = [
    [255,0,0],
    [0,255,0],
    [0,0,255],
    [0,0,255],
    [0,255,0],
    [255,0,0],
  ];
  sendGameMessage(msg, position)
  .then(data => console.log("response: ", data))
  .catch(error => console.error(error));
}
