#!/bin/bash

set -e
set -u

echo "Creating user and database $POSTGRES_DATABASE"
psql -Atx postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@/?sslmode=disable -c "CREATE DATABASE $POSTGRES_DATABASE"
