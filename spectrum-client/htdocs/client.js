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

function sendJoinMessage(btn) {
  let msg = Object.assign({}, message_template);
  let position = btn.dataset.position.toLowerCase().trim();
  msg.Action = 'join';
  msg.Value = position;
  sendGameMessage(msg, position)
  .then(data => console.log("response: ", data))
  .catch(error => console.error(error));
}

