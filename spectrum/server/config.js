module.exports = {
  MQTT_BROKER_URL: process.env.MQTT_BROKER_URL || "mqtt://localhost:1883",
  COOKIE_SECRET: process.env.COOKIE_SECRET || 'somesecret',
  CLIENT_ID: process.env.CLIENT_ID || "clientid",
  HTTP_PORT: process.env.PORT || 3000,

  serveStatic: true,
  MQTT_COLORS_TOPIC: '/colors',
  MQTT_TOPIC_PREFIX: '/spectrum',
  MQTT_BROKER_SPECTRUM_PASSWORD: 'xyz',
};
