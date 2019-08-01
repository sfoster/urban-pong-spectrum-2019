const store = require('../datastore');
const queue = [];

function queueSummary(clientId) {
  let summary = {
    count: queue.length,
  };
  if (clientId) {
    summary.position = queue.indexOf(clientId);
  }
  return summary;
}
module.exports = {
  getSummary(req, res) {
    res.json({ count: 0 });
  },
  getPosition(req, res) {
    let clientId = req.params.clientId;
    if (!clientId) {
      res.status(500).json({
        error: `Missing required "id" param`,
      });
      return;
    }
    let position = queue.indexOf(clientId)
    res.json({ position });
  },
  addClient(req, res) {
    let clientId = req.body.clientId;
    if (!clientId) {
      res.status(500).json({
        error: `Missing required "clientId" param`,
      });
      return;
    }
    if (store.clients.has(clientId)) {
      res.status(500).json({
        error: `Client ${clientId} already registered`,
      });
      return;
    }
    let clientData = {};
    store.clients.set(clientId, clientData);
    queue.push(clientId);

    let result = queueSummary(clientId);
    res.json(Object.assign(result, {
      status: "ok",
    }));
  },
  removeClient(req, res) {
    let clientId = req.body.clientId;
    if (!clientId) {
      res.status(500).json({
        error: `Missing required "clientId" property`,
      });
      return;
    }
    let idx = queue.indexOf(clientId);
    if (idx >= 0) {
      queue.splice(idx, 1);
    }
    store.clients.delete(clientId);
    res.json({ status: "ok" });
  }
};

