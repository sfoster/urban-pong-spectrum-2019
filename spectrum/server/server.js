const config = require("./config");
const logger = require("./logger");
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
    logger.debug(`client:${id}, lastPing: ${client.lastPing}, elapsed: ${now - client.lastPing}`);
    if (now - client.lastPing >= CLIENT_INACTIVE_THRESHOLD) {
      store.clients.delete(id);
      logger.info("deleting inactive client: ", id);
    }
  }
});

logger.debug(`Connecting httpServer on port ${config.HTTP_PORT}, with HTTP_ROUTE_PREFIX: ${config.HTTP_ROUTE_PREFIX}`);
httpServer.listen(config.HTTP_PORT, function() {
  logger.info(`App listening on port ${config.HTTP_PORT}, with HTTP_ROUTE_PREFIX: ${config.HTTP_ROUTE_PREFIX}`);
});

mqttClient.subscribe(`${config.LIGHT_CONTROLLER_ID}/status`);
mqttClient.on(`${config.LIGHT_CONTROLLER_ID}/status`, message => {
  logger.debug("Got message: ", message);
  store.lightController.set("name", `${config.LIGHT_CONTROLLER_ID}`);
  store.lightController.set("lastSeen", Date.now());
  store.lightController.set("online", true);
});
mqttClient.on(`statuschange`, connected => {
    store.mqttBroker.set("connected", connected);
});