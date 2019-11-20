const store = require('../datastore');

function getQueue() {
  let clientsList = Array.from(store.clients.values());
  clientsList.sort((a, b) => {
    return a.joinedTime > b.joinedTime;
  });
  return clientsList;
}

function queueSummary(clientId) {
  let queue = getQueue();
  let summary = {
    count: queue.length,
  };
  if (clientId) {
    summary.position = queue.findIndex(c => c.id == clientId);
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
    let queue = getQueue();
    let position = queue.findIndex(c => c.id == clientId);
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
    let now = Date.now();
    let clientData;
    if (store.clients.has(clientId)) {
      // client already registered, coming back for more
      clientData = store.clients.get(clientId);
    } else {
      clientData = {
        id: clientId,
      };
    }
    clientData.lastPing = now;
    clientData.joinedTime = Date.now();

    store.clients.set(clientId, clientData);

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
    store.clients.delete(clientId);
    res.json({ status: "ok" });
  },
  hasClient(req, res) {
    return store.clients.has(req.sessionID);
  }
};

