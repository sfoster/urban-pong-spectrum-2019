module.exports = {
  MQTT_BROKER_URL: process.env.MQTT_BROKER_URL || "mqtt://localhost:1883",
  COOKIE_SECRET: process.env.COOKIE_SECRET || 'somesecret',
  CLIENT_ID: process.env.CLIENT_ID || "spectrum",
  HTTP_PORT: process.env.PORT || 3000,

  serveStatic: true,
};
