let Url = require('url');

module.exports = function(model) {
  return {
    getConfigAsJs(req, res) {
      let content =`// templated output from browser-config.js

export {config as default};
let config = {
  VERBOSE: false,
}
`;
     res.setHeader('Content-Type', 'application/x-javascript');
      res.send(content);
    }
  };
};

