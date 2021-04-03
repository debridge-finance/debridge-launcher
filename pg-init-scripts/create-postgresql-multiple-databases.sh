#!/bin/bash

set -e
set -u

function create_user_and_database() {
	local database=$1
	echo "  Creating user and database '$database'"
	psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
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
	psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" -d $EI_DATABASE <<-EOSQL
			create table if not exists $SUPPORTED_CHAINS_DATABASE (
			chainId                 integer primary key,
			network                 varchar(10),
			debridgeAddr            char(42),
			latestBlock             integer,
			provider                varchar(200),
			interval                integer
			);
			create table if not exists $CHAINLINK_CONFIG_DATABASE (
			chainId                 integer primary key,
			cookie                  varchar(1000),
			eiChainlinkurl          varchar(100),
			eiIcAccesskey           char(32),
			eiIcSecret              char(64),
			eiCiAccesskey           char(64),
			eiCiSecret              char(64),
			mintJobId               char(32),
			burntJobId              char(32),
			network                 varchar(10)
			);
			create table if not exists $SUBMISSIONS_DATABASE (
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
				references $SUPPORTED_CHAINS_DATABASE(chainId),
			constraint chainTo
				foreign key(chainTo)
				references $CHAINLINK_CONFIG_DATABASE(chainId)
			);
EOSQL
	echo "Tables created"
	echo "Adding chains configurations"
	psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" -d $EI_DATABASE <<-EOSQL
        insert into $SUPPORTED_CHAINS_DATABASE (
                chainId,
                latestBlock,
                network,
                provider,
                debridgeAddr,
                interval
                ) values(
                56,
                0,
                'bsc',
                $BSC_PROVIDER,
                $BSC_DEBRIDGE_ADDRESS,
                60000
                ) on conflict do nothing;
        insert into $SUPPORTED_CHAINS_DATABASE (
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
                $ETH_PROVIDER,
                $ETH_DEBRIDGE_ADDRESS,
                60000
                ) on conflict do nothing;
EOSQL
	echo "Chain configurations added"
fi

