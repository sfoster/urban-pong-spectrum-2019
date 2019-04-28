#!/usr/bin/python3
# -*- coding: utf-8 -*-

"""
Https based server for controlling Urban_Pong game
"""

import socket
import ssl
import json
import threading
import Urban_Pong_Controller
import http.server
import socketserver
import signal
from sys import exc_info
import traceback

DEBUG = True

class Urban_Pong_Request_Handler (http.server.BaseHTTPRequestHandler):

    max_content_length = 512

    def __init__(self, request, client, server):

        http.server.BaseHTTPRequestHandler.__init__(self, request, client, server)

    def log_message(self, format, *args):
        pass

    def do_POST(self):

        address = str(self.client_address[0])
        port = str(self.client_address[1])

        # print("Received POST request from %s:%s" % (address, port))

        content_type = self.headers.get_content_type()
        content_length_value = None # type: str
        content_length = 0
        post_body = None # type: bytes
        json_data = None # type: dict
        response = None  # type: dict
        response_json = None # type: bytes
        max_content_length = Urban_Pong_Request_Handler.max_content_length

        # check peer certificate
        #client_certificate = self.server.socket.getpeercert()
        #if 'issuer' in client_certificate:
        #    print(client_certificate['issuer'])


        # validate request for content type and content length
        if content_type == 'application/json':
            try:
                content_length_value = self.headers.get('Content-Length')
                content_length = int(content_length_value)
            except:
                self.send_response(http.HTTPStatus.LENGTH_REQUIRED, "Unable to determine content length from %s" % content_length_value)
        else:
            self.send_response(http.HTTPStatus.BAD_REQUEST, "Expected content_type: application/json")
        if 0 < content_length < max_content_length:
            try:
                post_body = self.rfile.read(content_length)
            except:
                self.send_response(http.HTTPStatus.BAD_REQUEST, "Unable to read post body")
        if post_body is not None:
            try:
                json_data = json.loads(post_body.decode('utf-8'))
            except:
                self.send_response(http.HTTPStatus.BAD_REQUEST, "Unable to parse json from post body")
        if json_data is not None:
            # do not validate json structure here, that is done by the Urban_Pong_Controller
            # module. simply send back the response
            try:
                # print("Sending request to process: %s" % (json_data,))
                response = self.server.pong.process(json_data)
                # print("Response returned from process: %s" % (response,))
                response_json = json.dumps(response).encode('utf-8')
                self.send_response(http.HTTPStatus.OK)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', len(response_json))
            except:
                type, value, tb = exc_info()
                print("Unexpected error:", type)
                traceback.print_exception(type, value, tb)
                self.send_response(http.HTTPStatus.BAD_REQUEST, "Internal Error Processing Request")
                response_json = None

        else:
            self.send_response(http.HTTPStatus.BAD_REQUEST, "Content length %d is out-of-bounds" % content_length)

        # print(content_type, content_length, max_content_length, '\n', json_data, '\n', response_json)

        self.end_headers()

        if response_json is not None:
            self.wfile.write(response_json)

    def do_HEAD(self):
        self.send_method_not_allowed()

    def do_GET(self):
        self.send_method_not_allowed()

    def send_method_not_allowed(self):
        """
        Respones with 401 METHOD_NOT_ALLOWED
        :return: None
        """
        self.send_error(http.HTTPStatus.METHOD_NOT_ALLOWED)



class Urban_Pong_Server (socketserver.ThreadingMixIn, http.server.HTTPServer, threading.Thread):

    # lets do ipv4 (note that this is not a instantiated class variable: no self
    address_family = socket.AF_INET6

    def __init__(self, server_address, request_handler, pong_controller):
        socketserver.ThreadingMixIn.__init__(self)
        http.server.HTTPServer.__init__(self, server_address, request_handler)
        threading.Thread.__init__(self)

        self.pong = pong_controller

        #configure ssl
        #self.certificate_chain = "./urbanpong.eug.kerndt.com-chain.crt"
        #self.certificate_key = "./urbanpong.eug.kerndt.com.key"
        #self.context = ssl.SSLContext(ssl.PROTOCOL_SSLv23)
        #self.context.load_cert_chain(self.certificate_chain, keyfile = self.certificate_key)
        #self.context.load_verify_locations(cafile="./urbanpong-ca-chain.crt")
        #self.context.verify_mode = ssl.CERT_REQUIRED
        #self.socket = self.context.wrap_socket(self.socket, server_side=True)

    def run(self):
        self.serve_forever()

def signal_handler(signum, frame):
    """
    Handles sig_int, sig_term, and sig_hup
    :param signum:
    :param frame:
    :return: None
    """
    if signum == signal.SIGINT or signum == signal.SIGTERM:
        MyPong.game.terminate()
        httpd.shutdown()
    elif signum == signal.SIGHUP:
        MyPong.game.restart()


if __name__ == '__main__':

    # the game controller
    MyPong = Urban_Pong_Controller.Controller()

    # the server
    server_address = ('', 8080)
    httpd = Urban_Pong_Server(server_address, Urban_Pong_Request_Handler, MyPong)

    # signal handlers
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGHUP, signal_handler)

    # giddy-up
    MyPong.start()
    httpd.start()

    while not MyPong.terminate_event.is_set():
        signal.pause()

    print("Waiting for MyPong")
    MyPong.join()
    print("Waiting for httpd")
    httpd.join()

