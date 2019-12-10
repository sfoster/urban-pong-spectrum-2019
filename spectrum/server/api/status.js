var store = require('../datastore');

module.exports = {
  getStatus(req, res) {
  	let controllerRequired = req.app.get("controllerRequired");
    let ok = (
      (controllerRequired ? store.lightController.get("online") : true) &&
      store.mqttBroker.get("connected")
    );
    let result = {
      lightController: store.lightController.get("online") ? "online" : "offline",
      mqttBroker: store.mqttBroker.get("connected") ? "connected" : "not-connected",
      ok, 
      clients: store.clients.size,
      timestamp: Date.now(),
    };
    // connect, close, end, message??
    res.send(result);
  }
};
