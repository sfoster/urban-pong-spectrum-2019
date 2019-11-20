const queue = new Map();
const clients = new Map();
const lightController = new Map();
var _status = "ok";

const store = {
  queue,
  clients,
  get status(){
    return _status;
  },
  set status(value) {
    _status = value;
  },
  lightController,
};

module.exports = store;
