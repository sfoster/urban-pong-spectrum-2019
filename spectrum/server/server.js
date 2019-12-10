const config = require("./config");
const httpServer = require("./httpServer");
const mqttClient = require("./mqttClient");
const clock = require("./clock");
const store = require("./datastore");
const LC_INACTIVE_THRESHOLD = 60000;
const CLIENT_INACTIVE_THRESHOLD = 10000;
const HOUSEKEEPING_MS = 1000;

clock.start();
clock.registerInterval(LC_INACTIVE_THRESHOLD);
clock.on("interval-" + LC_INACTIVE_THRESHOLD, function(now, since) {
  let lastSeen = store.lightController.get("lastSeen");
  if (now - lastSeen >= LC_INACTIVE_THRESHOLD) {
    store.lightController.set("online", false);
  }
});

clock.registerInterval(HOUSEKEEPING_MS);
clock.on("interval-" + HOUSEKEEPING_MS, function(now, since) {
  // evict any clients we've not heard from in a while
  for (let [id, client] of store.clients) {
    if (now - client.lastPing >= CLIENT_INACTIVE_THRESHOLD) {
      store.clients.delete(id);
      console.log("deleting inactive client: ", id);
    }
  }
});

httpServer.listen(config.HTTP_PORT, function() {
  console.log('Status app listening on port ' + config.HTTP_PORT + '!');
});

mqttClient.subscribe("pi/status");
mqttClient.on("pi/status", message => {
  console.log("Got message: ", message);
  store.lightController.set("lastSeen", Date.now());
  store.lightController.set("online", true);
});
