var message_template = {
  'name': null,
  'uuid': null,
  'action': null,
  'value': null,
}

var message_endpoint = 'client_update';

function sendGameMessage(msg) {
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
  msg.action = 'join';
  msg.position = btn.dataset.position;
  sendGameMessage(msg)
  .then(data => console.log("response: ", data))
  .catch(error => console.error(error));
}
