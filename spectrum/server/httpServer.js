'use strict';
const bodyParser = require('body-parser');
const express = require('express');
const path = require('path');
const store = require('./datastore');
const haversine = require('./haversine');

const api = {
  queue: require('./api/queue'),
  colors: require('./api/colors'),
  status: require('./api/status'),
};
const session = require('express-session');
const maxClientTimeoutMS = 60000;

function isAuthenticated(req, res, next) {
  if (req.session.nearby) {
    console.log("isAuthenticated, allowing this request");
    return next();
  }
  let now = Date.now();
  let message = "nope";

  let client = store.clients.get(req.sessionID);
  if (client && now - client.lastPing < maxClientTimeoutMS) {
    client.lastPing = now;
    return next();
  } else {
    message = "timed-out";
  }
  denyRequest({ status: 401, message });
}

function denyRequest(reason, req, res) {
  store.clients.delete(req.sessionID);
  req.session.destroy(function(err) {
    // cannot access session here
    res.status(reason.status);
    res.json(reason);
  });
}

function getDistance(coords) {
  let targetCoord = {
    latitude: config.ORIGIN_LATITUDE,
    longitude: config.ORIGIN_LONGITUDE,
  }
  return haversine(coords, targetCoord, {
    unit: "meter",
  });
}

const app = express();
const config = require("./config");

app.use(session({secret: "Shh, its a secret!"}));

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
app.get("/queue/position", isAuthenticated, api.queue.getPosition);

// request for high-level service status
//   response is JSON like { clients: n,  timestamp: "" }
app.get("/queue/status", api.status.getStatus);

// request to join queue.
//   Request includes geolocation,
//   Handler authenticates request, generates/retrieves clientid, adds clientid to queue
//   response sets auth cookie, body is json object with queue (client?) id and topic
//   the auth cookie and queue id allows the client to subscribe to topic
app.post("/queue/join", function(req, res, next) {
  console.log("/join");
  let distanceMeters;
  if (req.body.coords) {
    distanceMeters = getDistance(req.body.coords);
    if (!isNaN(distanceMeters) && distanceMeters < config.ORIGIN_THRESHOLD) {
      req.session.nearby = true;
      console.log("/join, set nearby");
      api.queue.addClient(req, res, next);
      return next();
    }
  }
  return denyRequest({
    status: 401,
    message: "not-nearby",
    data: distanceMeters,
  }, req, res);
});

// explicitly leave, remove client from any queue, unset any auth cookie
app.post("/queue/leave", isAuthenticated, api.queue.removeClient);

// request to send color values to display
//   Request includes an array of rgb colors,
app.post("/queue/colors", isAuthenticated, api.colors.sendColors);

module.exports = app;
