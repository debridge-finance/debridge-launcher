#!/bin/bash

set -e
set -u

echo "Remove initiator for Binance Smart Chain"
container_name=$(docker-compose ps | grep bsc | awk '{print $1}')
docker exec $container_name chainlink admin login --file /run/secrets/apicredentials
docker exec $container_name chainlink initiators destroy debridge

echo "Remove initiator for HECO chain"
container_name=$(docker-compose ps | grep heco | awk '{print $1}')
docker exec $container_name chainlink admin login --file /run/secrets/apicredentials
docker exec $container_name chainlink initiators destroy debridge
