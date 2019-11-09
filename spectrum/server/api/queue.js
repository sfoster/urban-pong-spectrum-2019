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
    let clientId = req.sessionID;
    if (!clientId) {
      res.status(404).json({
        error: `Unknown client`,
      });
      return;
    }
    let position = queue.indexOf(clientId)
    res.json({ position });
  },
  addClient(req, res) {
    let clientId = req.sessionID;
    if (!clientId) {
      res.status(404).json({
        error: `Unknown client`,
      });
      return;
    }
    if (store.clients.has(clientId)) {
      // client already registered, coming back for more
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
    let clientId = req.sessionID;
    if (!clientId) {
      res.status(404).json({
        error: `Unknown client`,
      });
      return;
    }
    let idx = queue.indexOf(clientId);
    if (idx >= 0) {
      queue.splice(idx, 1);
    }
    store.clients.delete(clientId);
    res.json({ status: "ok" });
  },
  hasClient(req, res) {
    return store.clients.has(req.sessionID);
  }
};

