var store = require('../datastore');
const mqttClient = require('../mqttClient');

module.exports = {
  sendColors(req, res, next) {
    let colorValues = req.body.colorValues;
    mqttClient.sendMessage("colors", {
      "north_color": colorValues[0],
      "south_color": colorValues[1],
      "result_color": colorValues[2],
    }).then(() => {
      res.json({ message: "colors sent" });
    }).catch(err => {
      next(err);
    });
  }
};
