#!/bin/bash

set -e
set -u

echo "Add initiator for Binance Smart Chain"
docker exec chainlink-bsc chainlink admin login --file /run/secrets/apicredentials
docker exec chainlink-bsc chainlink initiators create debridge http://localhost:8080/jobs

echo "Add initiator for Ethereum"
docker exec chainlink-eth chainlink admin login --file /run/secrets/apicredentials
docker exec chainlink-eth chainlink initiators create debridge http://localhost:8080/jobs
