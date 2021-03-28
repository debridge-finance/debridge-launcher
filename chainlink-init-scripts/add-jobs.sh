#!/bin/bash

set -e
set -u

echo "Add jobs for Binance Smart Chain"
docker exec chainlink-bsc chainlink admin login --file /run/secrets/apicredentials
docker exec chainlink-bsc chainlink job_specs create /chainlink/mint-job.json
docker exec chainlink-bsc chainlink job_specs create /chainlink/burn-job.json

echo "Add jobs for Ethereum"
docker exec chainlink-eth chainlink admin login --file /run/secrets/apicredentials
docker exec chainlink-eth chainlink job_specs create /chainlink/mint-job.json
docker exec chainlink-eth chainlink job_specs create /chainlink/burn-job.json
