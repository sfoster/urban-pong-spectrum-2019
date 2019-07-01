Test MQTT-over-websockets client
================================

Quick proof of concept for sending RGB values over MQTT to a remote HTML-based "display".
I'm not sure this is a *good* idea, but might work well enough for testing during development

The RGBDisplay class just renders what it receives as a line of colored dots. It doesn't do any animation, so you would need to pump messages on the /displaycolors topic with the array of values

The message payload is expected to be an array of RGBA values, each packed into a 32-bit number (see encoddecode functions for details.)

Setup
-----

* Install mosquitto and enable websockets support
  - [mosquitto.org](http://mosquitto.org/)
  - [guide for mqtt & websockets](http://www.steves-internet-guide.com/mqtt-websockets/)

* Check/amend config by editing config.js, which has hostname and port for the MQTT broker, as well as ledCount and potentially other stuff we might want to vary

Try it out
----------

* Serve index.html from a regular webserver, and load it in a modern browser e.g.
`python -m SimpleHTTPServer 8000`

* (start mosquitto broker on hostname/port to match values in config.js)

* publish a test mesage to get it rendered to HTML canvas by the RGBDisplay instance:
`mosquitto_pub -t "/displaycolors" -f ./test-payload.txt`
