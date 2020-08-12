const config = require("./config");
const logger = require("./logger");
const serverTime = require("./serverTime");
const Url = require("url");
const Mqtt = require("mqtt");
const EventEmitter = require('events');

class MqttClient extends EventEmitter {
  constructor() {
    super();
    this._connectedPromise = null;
    this._client = null;
    this._connected = false;
  }
  get connected() {
    return this._connected;
  }
  connect() {
    if (this._connected) {
      return Promise.resolve();
    }
    if (this._connectedPromise) {
      return this._connectedPromise;
    }

    if (this._client) {
      // shut down old client?
    }

    let mqttUrl = Url.parse(config.MQTT_BROKER_URL);
    mqttUrl.auth = `spectrum-app:${config.MQTT_BROKER_SPECTRUM_PASSWORD}`;

    let connectUrl = Url.format(mqttUrl);
    this._client = Mqtt.connect(connectUrl);
    logger.info("mqtt client connecting to: ", connectUrl);

    this._connectedPromise = new Promise((res, rej) => {
      this._resolveConnected = res;
      this._rejectConnected = rej;
    });

    ["connect", "close", "offline", "error", "end"].forEach(name =>{
      let methodName = "on" + name.charAt(0).toUpperCase() + name.substring(1);
      this._client.on(name, (event) => this.handleEvent(name, event));
    });
    this._client.on("message", (topic, message) => {
      let name = topic.substring(config.MQTT_TOPIC_PREFIX.length);
      logger.debug("Got message: ", topic, name, message.toString());
      let messageData;
      try {
        messageData = JSON.parse(message.toString());
      } catch (ex) {
        logger.warn("Failed to parse JSON message: ", message && message.toString());
        return;
      }
      this.emit(name, messageData);
    })
    return this._connectedPromise;
  }
  disconnect() {
    this._client && this._client.end();
  }
  handleEvent(name, event, payload) {
    logger.debug("handleEvent: ", name, event);
    switch(name) {
      case "connect":
        this._connected = true;
        logger.info("mqtt client connected");
        if (this._resolveConnected) {
          this._resolveConnected();
          delete this._resolveConnected;
          this.emit("statuschange", this.connected);
        }
        break;
      case "offline":
      case "error":
        this._connected = false;
        if (this._rejectConnected) {
          this._rejectConnected();
          delete this._resolveConnected;
        }
        this.emit("statuschange", this.connected);
        break;
      case "close":
        this._connected = false;
        this.emit("statuschange", this.connected);
        break;
      case "end":
        break;
    }
  }
  sendMessage(name, messageData) {
    return this.connect().then(() => {
      messageData.timestamp = serverTime.timestamp;
      let topic = `${config.MQTT_TOPIC_PREFIX}/${name}`;
      let message = JSON.stringify(messageData);
      this._client.publish(topic, message);
      logger.debug("publish on topic: ", topic);
    });
  }
  subscribe(name, callback) {
    let topic = `${config.MQTT_TOPIC_PREFIX}/${name}`;
    return this.connect().then(() => {
      this._client.subscribe(topic, err => {
        if (err) {
          logger.warn("Failed to subscribe to topic: " + topic, err);
          return;
        }
        logger.info("Subscribed to topic: " + topic);
      });
    });
  }
}

module.exports = new MqttClient();
