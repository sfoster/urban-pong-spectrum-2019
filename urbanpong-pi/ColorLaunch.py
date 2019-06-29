#!/usr/bin/python3
# -*- coding: utf-8 -*-

"""
XXX based server for controlling Urban_Pong game
"""

import ssl
import json
# import Urban_Pong_Controller
import signal
from sys import exc_info
import traceback

DEBUG = True

"""
subscribe to topic /playanimation on the configured broker


maintain an idle queue of actions/animations
and an active queue of actions/animations


when the active queue is empty for a some time, switch over to playing the idle queue
when a /playanimation message arrives via mqtt, push it into the active queue, and start playing it.

recieve message to play some animation:

Example message:
{
  type: "colorcollide",
  north: {
    speed: ,
    color: "#ff0000",
  },
  south: {
    speed: ,
    color: "#00ff00",
  }
}

"""

if __name__ == '__main__':

    # use COLORLAUNCH_CONFIG to locate and load the config file (JSON)

    # config provides the mqtt_broker for where the broker is
    # load a config to know which lighting controller to start

    # subscribe to /playanimation/ to get the mqtt message which will tell us what light animation to play
    # handle signal to restart if we get killed

    # signal handlers
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGHUP, signal_handler)

    # giddy-up

    #while not MyPong.terminate_event.is_set():
    #    signal.pause()

