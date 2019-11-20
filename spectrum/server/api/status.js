var store = require('../datastore');

module.exports = {
  getStatus(req, res) {
    let result = {
      lightController: store.lightController.get("online") ? "online" : "offline",
      clients: store.clients.size,
      timestamp: Date.now(),
    };
    // connect, close, end, message??
    res.send(result);
  }
};
