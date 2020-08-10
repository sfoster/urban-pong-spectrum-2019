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
  // default lat/long is kesey sq at 44.049772,-123.092554,
  ORIGIN_LATITUDE: process.env.ORIGIN_LATITUDE || "44.049772",
  ORIGIN_LONGITUDE: process.env.ORIGIN_LONGITUDE || "-123.092554",
  ORIGIN_THRESHOLD: process.env.ORIGIN_THRESHOLD || "100000",

  serveStatic: toBool(process.env.SERVE_STATIC),

  appName: process.env.APP_NAME || "spectrum",
  appVersion: process.env.APP_VERSION || "",

  controllerRequired: false,
  LIGHT_CONTROLLER_ID: "spectrum-ctrl",

  MQTT_TOPIC_PREFIX: `${process.env.APP_NAME || "spectrum"}-${process.env.API_VERSION || '0.1.0'}-${process.env.INSTANCE_NAME || 'dev'}`,
  MQTT_BROKER_SPECTRUM_PASSWORD: 'spectrum-app',
};
