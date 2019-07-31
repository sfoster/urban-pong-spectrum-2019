const config = require("./config");
const serverTime = require("./serverTime");
const Url = require('url');
const mqtt = require('mqtt');

module.exports = function() {
  let mqttUrl = Url.parse(config.MQTT_BROKER_URL);
  mqttUrl.auth = `concierge:${config.MQTT_BROKER_CONCIERGE_PASSWORD}`;

  let connectUrl = Url.format(mqttUrl);
  mqttClient = mqtt.connect(connectUrl);

  mqttClient.on('connect', function () {
    serverTime.touch();
    console.log("connected on ", mqttUrl);
    status.update('connected');

    // listen for game updates
    console.log("subcribing to: ", positionsTopic);
    console.log("subcribing to: ", gameStateTopic);
    mqttClient.subscribe(positionsTopic);
    mqttClient.subscribe(gameStateTopic);

    // listen for other clients that want to join
    // TODO: define what join means vs. just connecting?
    mqttClient.subscribe(`${config.CLIENT_ID}/+/join`);
    mqttClient.subscribe(`${config.CLIENT_ID}/+/leave`);
    console.log("subcribing to: ", `${config.CLIENT_ID}/+/join`);

    // this isn't a request/response model, but another client may 'nudge' us
    // by publishing on the /concierge/nudge/ topic, causing us to
    // publish current status
    mqttClient.subscribe(`${config.CLIENT_ID}/nudge`);

    // let the world know we are alive and listening
    sendMessage('status', status.get());

    console.log(`signalling client (${config.CLIENT_ID}) connected to ${config.MQTT_BROKER_URL}`);
    console.log(`at time: ${serverTime.utcString}`);
  });

  mqttClient.on('close', function () {
    status.update('closed');
  });

  mqttClient.on('offline', function () {
    status.update('offline');
  });

  mqttClient.on('error', function () {
    status.update('connection-error');
  });

  mqttClient.on('end', function () {
    status.update('end');
  });

  mqttClient.on('message', function (_topic, message) {
    serverTime.touch();
    status.update('receiving');

    if (_topic.startsWith(config.CLIENT_ID)) {
      let [selfId, clientId, name] = _topic.split('/');
      switch (name) {
        case 'join':
          // every client could always publish on clientId-prefixed topics
          // and we could use wildcard: subscribe('/+/join', ....)
          recentClients.update(clientId, serverTime.timestamp);
          sendMessage('recent', recentClients.get());
          break;
        case 'leave':
          recentClients.remove(clientId);
          sendMessage('recent', recentClients.get());
          break;
        case 'nudge':
          sendMessage('status', status.get());
          sendMessage('recent', recentClients.get());
      }
      return;
    }

    if (_topic.startsWith('$SYS')) {
      // system messages from the broker
      console.log(`System message: ${_topic}: ${message.toString()}`);
      return;
    }

    let [prefix, clientId, name] = _topic.split('/').filter(part => !!part);
    switch (name) {
      case 'positions':
      case 'gamestate':
        // update tally of active/recent clients
        recentClients.update(clientId);
        // add a timestamp and re-publish
        rePublishWithTimestamp(prefix, clientId, name, message);
        break;
    }
  });

  function rePublishWithTimestamp(prefix, clientId, name, message) {
    let messageData;
    let receivedTopic = `${prefix}/${clientId}/${name}`;
    let publishTopic  = `${prefix}/${clientId}/${name}-ts`;
    let sendOptions = {
      qos: 0 // default to QOS_LEVEL_AT_MOST_ONCE
    };
    try {
      messageData = JSON.parse(message.toString());
    } catch (ex) {
      console.log('Failed to parse message on topic ' + receivedTopic, message.toString());
    }
    if (typeof messageData == 'object') {
      if (messageData.hasOwnProperty('qos')) {
        // look in the message for a 'qos' property and relay with the same qos
        let qos = isNaN(messageData.qos) ? 0 : clamp(messageData.qos, 0, 2);
        sendOptions.qos = qos;
      }

      for (let [name, values] of Object.entries(messageData)) {
        if (!Array.isArray(values)) {
          continue;
        }
        for (let entry of values) {
          // add a UTC timestamp to help track end-end latency
          entry.serverUTCTime = serverTime.timestamp;
          if (entry.messageType && entry.messageType == 'join') {
            // special-case 'join': we want more assurance that messages containing joins will be delivered
            sendOptions.qos = 2;
          }
        }
      }
      console.log(`rePublishWithTimestamp, received: ${receivedTopic}, publishTopic: ${publishTopic}`,
                  JSON.stringify(messageData));
      mqttClient.publish(publishTopic, JSON.stringify(messageData), sendOptions);
    }
  }
  function sendMessage(name, messageData) {
    let topic = `${topicPrefix}/${config.CLIENT_ID}/${name}`;
    let message = JSON.stringify(messageData);
    mqttClient.publish(topic, message);
  }

  return mqttClient;
}
