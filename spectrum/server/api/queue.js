var store = require('../datastore');

module.exports = {
  getSummary(req, res) {
    res.json({ count: 0 });
  },
  getPosition(req, res) {
    res.json({ position: 0 });
  },
  getClient(req, res) {
    let clientId = req.params.id;
    let result = store.clients.get(clientId);
    if (result) {
      res.json(result);
    } else {
      res.status(404).json({
        error: `Client "${clientId}" not found.`,
      });
    }
  },
  registerClient(req, res) {
    let clientId = res.locals.id;
    let clientData = {};
    if (!clientId) {
      res.status(500).json({
        error: `Missing required "id" param`,
      });
      return;
    }
    if (store.client.has(clientId)) {
      res.status(500).json({
        error: `Client ${clientId} already registered`,
      });
      return;
    }
    store.client.set(clientId, clientData);
    res.json({ status: "ok" });
  },
  removeClient(req, res) {
    let clientId = res.locals.id;
    if (!clientId) {
      res.status(500).json({
        error: `Missing required "id" param`,
      });
      return;
    }
    store.client.delete(clientId);
    res.json({ status: "ok" });
  }
};

