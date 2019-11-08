const config = require("./config");
const httpServer = require("./httpServer");
const mqttClient = require("./mqttClient");
const EventEmitter = require("events");
const spectrumApp = new EventEmitter();

httpServer.listen(config.HTTP_PORT, function() {
  console.log('Status app listening on port ' + config.HTTP_PORT + '!');
});

mqttClient.subscribe("pi/status");
mqttClient.on("pi/status", message => {
  console.log("Got message: ", message);
});
