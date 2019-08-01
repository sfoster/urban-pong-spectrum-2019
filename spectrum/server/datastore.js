const queue = new Map();
const clients = new Map();
const status = {
  get() {
    return "ok";
  }
};
const store = {
  queue,
  clients,
  status,
};

module.exports = store;
