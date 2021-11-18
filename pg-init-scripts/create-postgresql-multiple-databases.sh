#!/bin/bash

set -e
set -u

psql -Atx postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@/?sslmode=disable <<-EOSQL
    CREATE DATABASE $POSTGRES_DATABASE;
EOSQL
