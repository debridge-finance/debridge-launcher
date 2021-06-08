#!/bin/bash

set -e
set -u
add_record() {
    local network=$1
    file_out=$PWD/chainlink-$network/tables
    source ./.env
    container_name=$(docker-compose ps | grep postgres${DOCKER_ID} | awk '{print $1}')
    if [ $(echo $container_name | wc -c) -ne 1 ]
    then
       postgres_ip=$(docker inspect $container_name | grep IPAddress | tail -n 1 | awk -F\" '{print $(NF-1)}')
       psql -Atx postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$postgres_ip:$POSTGRES_PORT/$EI_DATABASE?sslmode=disable -a -f $file_out
    else
       psql -Atx postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/$EI_DATABASE?sslmode=disable -a -f $file_out 
    fi
}

create_ei_table() {
    local chain_id=$1
    local cl_url=$2
    local network=$3
    local file_in=$PWD/chainlink-$network/eicreds.json
    local submit_file=$PWD/chainlink-$network/submit-job-info.json
    local file_out=$PWD/chainlink-$network/tables
    cat > $file_out <<- EOM
insert into chainlink_config (
    chainId,
    cookie,
    eiChainlinkurl,
    eiIcAccesskey,
    eiIcSecret,
    eiCiAccesskey,
    eiCiSecret,
    submitJobId,
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
    cat $submit_file | grep '"id"' | sed -E 's/.*"id": "?([^,"]*)"?.*/    '\''\1'\'\,'/'  >> $file_out
    cat >> $file_out <<- EOM
    '$network'
    ) on conflict do nothing;
EOM
}

add_initiator() {
    local network=$1
    local container_name=$(docker-compose ps | grep $network | awk '{print $1}')
    docker exec $container_name chainlink admin login --file /run/secrets/apicredentials
    docker exec $container_name chainlink --json initiators create debridge > $PWD/chainlink-$network/eicreds.json
}
add_jobs() {
    local network=$1
    local container_name=$(docker-compose ps | grep $network | awk '{print $1}')
    docker exec $container_name chainlink admin login --file /run/secrets/apicredentials
    docker exec $container_name chainlink  --json job_specs create /chainlink/submit-job.json > $PWD/chainlink-$network/submit-job-info.json 
}

echo "Add initiator for Binance Smart Chain"
network="bsc"
chain_id=97
container_name=$(docker-compose ps | grep bsc | awk '{print $1}')
cl_url="http://$container_name:6688"
add_initiator $network

echo "Add jobs for Binance Smart Chain"
add_jobs $network

echo "Prepare record for Binance Smart Chain ie" 
create_ei_table $chain_id $cl_url $network

echo "Add record for Binance Smart Chain ie" 
add_record $network

echo "Add initiator for Heco"
network="heco"
chain_id=256
container_name=$(docker-compose ps | grep bsc | awk '{print $1}')
cl_url="http://$container_name:6688"
add_initiator $network

echo "Add jobs for Heco"
add_jobs $network

echo "Prepare table for Heco ie" 
create_ei_table $chain_id $cl_url $network

echo "Add record for Heco ie" 
add_record $network
