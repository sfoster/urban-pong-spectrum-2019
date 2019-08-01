'use strict';
const bodyParser = require('body-parser');
const express = require('express');
const path = require('path');
const store = require('./datastore');
const api = {
  queue: require('./api/queue'),
  colors: require('./api/colors'),
};

const app = express();
let config;
switch (process.env.SPECTRUM_CONFIG) {
  case "prod":
    config = require("./config-prod");
    break;
  default:
    config = require("./config");
}

function isAuthenticated(req, res, next) {
  if (true) {
    return next();
  }
  // send not-authenticated response?
  res.redirect('/');
}

function isActive(req, res, next) {
  if (true) {
    return next();
  }
  // send empty or not-authenticated response?
  res.redirect('/');
}

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

// in production, we'll be behind nginx reverse-proxy and only handle dynamic requests
if (config.serveStatic) {
  app.use(express.static(path.join(__dirname, '../htdocs')));
}

// request for queue details
//   auth?
//   response is JSON like { position: n,  timestamp: "" }
app.get("/queue", api.queue.getSummary);

// request for queue details fpr a given client
//   error unless auth cookie is valid
//   response is JSON like { position: n,  timestamp: "" }
app.get("/queue/:clientId", api.queue.getPosition);

// request to join queue.
//   Request includes geolocation,
//   Handler authenticates request, generates/retrieves clientid, adds clientid to queue
//   response sets auth cookie, body is json object with queue (client?) id and topic
//   the auth cookie and queue id allows the client to subscribe to topic
app.post("/queue/join", isAuthenticated, api.queue.addClient);

// explicitly leave, remove client from any queue, unset any auth cookie
app.post("/queue/leave", isAuthenticated, api.queue.removeClient);

// request to send color values to display
//   Request includes an array of rgb colors,
app.post("/colors", isAuthenticated, isActive, api.colors.sendColors);

app.listen(config.HTTP_PORT, function () {
  console.log('Status app listening on port ' + config.HTTP_PORT + '!');
});
