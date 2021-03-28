#!/bin/bash

set -e
set -u

echo "Remove initiator for Binance Smart Chain"
docker exec chainlink-bsc chainlink admin login --file /run/secrets/apicredentials
docker exec chainlink-bsc chainlink initiators destroy debridge

echo "Remove initiator for Ethereum"
docker exec chainlink-eth chainlink admin login --file /run/secrets/apicredentials
docker exec chainlink-eth chainlink initiators destroy debridge
