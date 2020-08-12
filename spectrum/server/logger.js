const config = require("./config");
function noop() {}

module.exports = {
  debug: (/DEBUG/i).test(config.LOG_LEVEL) ? console.log.bind(console, "DEBUG:") : noop,
  info: (/DEBUG|INFO/i).test(config.LOG_LEVEL) ? console.log.bind(console, "INFO:") : noop,
  warn: (/DEBUG|INFO|WARN/i).test(config.LOG_LEVEL) ? console.warn.bind(console) : noop,
  error: (/DEBUG|INFO|WARN|ERROR/i).test(config.LOG_LEVEL) ? console.error.bind(console) : noop,
};

