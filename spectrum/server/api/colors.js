var store = require('../datastore');
const mqttClient = require('../mqttClient');

module.exports = {
  sendColors(req, res) {
    let colorValues = res.locals.colorValues;
    res.json({ message: "TODO: actually send the colorValues somewhere" });
  }
};
