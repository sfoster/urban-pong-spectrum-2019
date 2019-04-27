#!/usr/bin/python3
# -*- coding: utf-8 -*-

"""
For testing http TLS client authentication with user certificates
"""

import ssl
import urllib.request
import json

certificate_chain = "./certs/urbanpong-ca-chain.crt"
user_certificate = "./certs/urbanpong-ios-user.pem"
user_key = "./certs/urbanpong-ios-user.key"
url = "https://urbanpong.eug.kerndt.com:8080"
data = {"command":"start"}

myContext = ssl.SSLContext(ssl.PROTOCOL_SSLv23)
myContext.load_cert_chain(user_certificate, keyfile=user_key)
myContext.verify_mode = ssl.CERT_REQUIRED
myContext.load_verify_locations(certificate_chain)

request = urllib.request.Request(url)
request.add_header('Content-Type', 'application/json; charset=utf-8')
json_data = json.dumps(data).encode('utf-8')
request.add_header('Content-Length', len(json_data))

if __name__ == '__main__':
    response = urllib.request.urlopen(request, json_data, context=myContext)
    print(response)

