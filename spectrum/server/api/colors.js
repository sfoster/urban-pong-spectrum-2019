var store = require('../datastore');
const mqttClient = require('../mqttClient');

module.exports = {
  sendColors(req, res, next) {
    let colorValues = req.body.colorValues;
    mqttClient.sendMessage("colors", {
      colorValues
    }).then(() => {
      res.json({ message: "colors sent" });
    }).catch(err => {
      next(err);
    });
  }
};
