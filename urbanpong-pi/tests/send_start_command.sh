#!/usr/bin/bash

curl -v -X POST \
    -H "content-type: application/json" \
    -d '{"command":"start"}' \
    --cacert /home/kerndtr/CA/urbanpong-ca/certs/urbanpong-ca-chain.crt \
     https://urbanpong.eug.kerndt.com:8080
 #   -E --cert /home/kerndtr/CA/urbanpong-ca/urbanpong-ios-user.p12 \
