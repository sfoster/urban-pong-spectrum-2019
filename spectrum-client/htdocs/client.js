var message_template = {
  'name': null,
  'uuid': null,
  'action': null,
  'value': null,
}

var message_endpoint = 'client_update';

function sendGameMessage(msg) {
  return fetch(message_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(msg),
  });
  // .then(response => response.json());
}

function sendJoinMessage() {
  console.log("click");
  let msg = message_template;

  msg.action = 'join';
  sendGameMessage(msg)
  .then(data => console.log(data))
  .catch(error => console.error(error));
}

let button = document.getElementById("join")
console.log(button);
button.addEventListener("click", sendJoinMessage);

