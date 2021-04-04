#!/bin/bash

set -e
set -u
add_record() {
    local network=$1
    file_out=$PWD/chainlink-$network/tables
    file_on_ps=/var/lib/postgresql/data/$network-tables
    dir_name=${PWD##*/}
    cp $file_out $PWD/pgdata/$network-tables
    docker exec ${dir_name}_postgres_1 psql -v ON_ERROR_STOP=1 --username postgres -d ei -a -f $file_on_ps 
}

create_ei_table() {
    local chain_id=$1
    local cl_url=$2
    local network=$3
    local file_in=$PWD/chainlink-$network/eicreds.json
    local mint_file=$PWD/chainlink-$network/mint-job-info.json
    local burn_file=$PWD/chainlink-$network/burn-job-info.json
    local file_out=$PWD/chainlink-$network/tables
    cat > $file_out <<- EOM
insert into chain_config (
    chainId,
    cookie,
    eiChainlinkurl,
    eiIcAccesskey,
    eiIcSecret,
    eiCiAccesskey,
    eiCiSecret,
    mintJobId,
    burntJobId,
    network
    ) values(
    $chain_id,
    '',
    '$cl_url',
EOM
    cat $file_in | grep incomingAccessKey | sed -E 's/.*"incomingAccessKey": "?([^,"]*)"?.*/    '\''\1'\'\,'/'  >> $file_out
    cat $file_in | grep incomingSecret | sed -E 's/.*"incomingSecret": "?([^,"]*)"?.*/    '\''\1'\'\,'/'  >> $file_out
    cat $file_in | grep outgoingToken | sed -E 's/.*"outgoingToken": "?([^,"]*)"?.*/    '\''\1'\'\,'/'  >> $file_out
    cat $file_in | grep outgoingSecret | sed -E 's/.*"outgoingSecret": "?([^,"]*)"?.*/    '\''\1'\'\,'/'  >> $file_out
    cat $mint_file | grep '"id"' | sed -E 's/.*"id": "?([^,"]*)"?.*/    '\''\1'\'\,'/'  >> $file_out
    cat $burn_file | grep '"id"' | sed -E 's/.*"id": "?([^,"]*)"?.*/    '\''\1'\'\,'/'  >> $file_out
    cat >> $file_out <<- EOM
    '$network'
    ) on conflict do nothing;
EOM
}

add_initiator() {
    local network=$1
    docker exec chainlink-$network chainlink admin login --file /run/secrets/apicredentials
    docker exec chainlink-$network chainlink --json initiators create debridge http://135.181.82.228:8080/jobs > $PWD/chainlink-$network/eicreds.json
}
add_jobs() {
    local network=$1
    docker exec chainlink-$network chainlink admin login --file /run/secrets/apicredentials
    docker exec chainlink-$network chainlink  --json job_specs create /chainlink/mint-job.json > $PWD/chainlink-$network/mint-job-info.json 
    docker exec chainlink-$network chainlink  --json job_specs create /chainlink/burn-job.json > $PWD/chainlink-$network/burn-job-info.json
}


echo "Add initiator for Binance Smart Chain"
network="bsc"
chain_id=56
cl_url="http://localhost:6689"
add_initiator $network

echo "Add jobs for Binance Smart Chain"
add_jobs $network

echo "Prepare record for Binance Smart Chain ie" 
create_ei_table $chain_id $cl_url $network

echo "Add record for Binance Smart Chain ie" 
add_record $network

echo "Add initiator for Ethereum"
network="eth"
chain_id=42
cl_url="http://localhost:6688"
add_initiator $network

echo "Add jobs for Ethereum"
add_jobs $network

echo "Prepare table for Ethereum ie" 
create_ei_table $chain_id $cl_url $network

echo "Add record for Ethereum ie" 
add_record $network