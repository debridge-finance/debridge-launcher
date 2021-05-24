#!/bin/bash

set -e
set -u

function create_user_and_database() {
	local database=$1
	echo "  Creating user and database '$database'"
	psql -Atx postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@/?sslmode=disable <<-EOSQL
	    CREATE USER $database;
	    CREATE DATABASE $database;
	    GRANT ALL PRIVILEGES ON DATABASE $database TO $database;
EOSQL
}

if [ -n "$POSTGRES_MULTIPLE_DATABASES" ]; then
	echo "Multiple database creation requested: $POSTGRES_MULTIPLE_DATABASES"
	for db in $(echo $POSTGRES_MULTIPLE_DATABASES | tr ',' ' '); do
		create_user_and_database $db
	done
	echo "Multiple databases created"
	echo "Adding tables"
	psql -Atx postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@/$EI_DATABASE?sslmode=disable <<-EOSQL
			create table if not exists supported_chains (
			chainId                 integer primary key,
			network                 varchar(10),
			debridgeAddr            char(42),
			latestBlock             integer,
			provider                varchar(200),
			interval                integer
			);
			create table if not exists chainlink_config (
			chainId                 integer primary key,
			cookie                  varchar(1000),
			eiChainlinkurl          varchar(100),
			eiIcAccesskey           char(32),
			eiIcSecret              char(64),
			eiCiAccesskey           char(64),
			eiCiSecret              char(64),
			submitJobId             char(32),
			network                 varchar(10)
			);
			create table if not exists submissions (
			submissionId            char(66) primary key,
			txHash                  char(66),
			runId                   varchar(64),
			chainFrom               integer,
			chainTo                 integer,
			debridgeId              char(66),
			receiverAddr            char(42),
			amount                  varchar(100),
			status                  integer,
			constraint chainFrom
				foreign key(chainFrom)
				references supported_chains(chainId)
			);
			create table if not exists aggregator_chains (
			chainTo			         integer primary key,
			aggregatorChain          integer
			);
EOSQL
	echo "Tables created"
	echo "Adding chains configurations"
	psql -Atx postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@/$EI_DATABASE?sslmode=disable <<-EOSQL
        insert into supported_chains (
                chainId,
                latestBlock,
                network,
                provider,
                debridgeAddr,
                interval
                ) values(
                42,
                0,
                'eth',
                '$ETH_PROVIDER',
                '$ETH_DEBRIDGE_ADDRESS',
                60000
                ) on conflict do nothing;
        insert into supported_chains (
                chainId,
                latestBlock,
                network,
                provider,
                debridgeAddr,
                interval
                ) values(
                256,
                0,
                'heco',
                '$HECO_PROVIDER',
                '$HECO_DEBRIDGE_ADDRESS',
                60000
                ) on conflict do nothing;
		insert into aggregator_chains (
                chainTo,
                aggregatorChain
                ) values(
                97,
                97
                ) on conflict do nothing;
        insert into aggregator_chains (
                chainTo,
                aggregatorChain
                ) values(
                42,
                97
                ) on conflict do nothing;
        insert into aggregator_chains (
                chainTo,
                aggregatorChain
                ) values(
                256,
                256
                ) on conflict do nothing;
        insert into supported_chains (
                chainId,
                latestBlock,
                network,
                provider,
                debridgeAddr,
                interval
                ) values(
                97,
                0,
                'bsc',
                '$BSC_PROVIDER',
                '$BSC_DEBRIDGE_ADDRESS',
                60000
                ) on conflict do nothing;
EOSQL
	echo "Chain configurations added"
fi

