function toBool(value) {
  // convert some possibly-defined environment variable into boolean
  const t = typeof value;
  switch (t) {
    case "undefined":
      return false;
    case "string":
      value = value.toLowerCase();
      if (value == "true" || value == "1" || value == "yes") {
        return true;
      }
      return false;
    case "number":
      return !!value;
    default:
      return false;
  }
}

module.exports = {
  MQTT_BROKER_URL: process.env.MQTT_BROKER_URL || "mqtt://localhost:1883",
  COOKIE_SECRET: process.env.COOKIE_SECRET || 'somesecret',
  CLIENT_ID: process.env.CLIENT_ID || "clientid",
  HTTP_PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,

  serveStatic: toBool(process.env.SERVE_STATIC),
  pathPrefix: process.env.PATH_PREFIX || "queue/",

  MQTT_COLORS_TOPIC: '/colors',
  MQTT_TOPIC_PREFIX: '/spectrum',
  MQTT_BROKER_SPECTRUM_PASSWORD: 'xyz',
};
