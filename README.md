This repo allows to setup the oracles for few chains quickly with the same credentials.

# Usage

1. Set api credential in `apicredential` file.
2. Put keystore file to `secrets/keystore.json`. (convert private key to keystore.json: https://iotexscan.io/wallet or other similar resources)
3. Store the password that decrypts the key from `keystore` in `password.txt`
4. Set the addresses of the aggregators in the `chainlink-*/burn-jobs.json` and `chainlink-*/mint-jobs.json`.
5. Configure postgres.env:

```
BSC_DEBRIDGE_ADDRESS=... white debridge address on Binance Smart Chain
ETH_DEBRIDGE_ADDRESS=... wheite debridge address on Ethereum
```

5. Run: `docker-compose up`. The oracles will be started for BSC and Ethereum.
6. Run the initiator.
7. Run script to create the initiators and prepare the jobs and store main configurations for ei to the database:

```
bash chainlink-init-scripts/setup-initiators-and-jobs.sh
```

# Add new chain support

1. Create and configure chainlink-[{CHAIN_TICKER}].env. At least the followed params should be added:

```
ROOT
ETH_CHAIN_ID
LINK_CONTRACT_ADDRESS
CHAINLINK_TLS_PORT
SECURE_COOKIES
GAS_UPDATER_ENABLED
ALLOW_ORIGINS
ETH_URL
DATABASE_URL
CHAINLINK_BASEURL
FEATURE_EXTERNAL_INITIATORS
CHAINLINK_DEV
CHAINLINK_PORT
CLIENT_NODE_URL
```

For more details, see the [docs](https://docs.chain.link/docs/configuration-variables)

2. Add the container to the `docker-compose.yml`

```
  chainlink-[{CHAIN_TICKER}]:
    container_name: chainlink-[{CHAIN_TICKER}]
    image: smartcontract/chainlink:0.10.2
    entrypoint: /bin/sh -c "chainlink node import /run/secrets/keystore && chainlink node start -d -p /run/secrets/node_password -a /run/secrets/apicredentials"
    restart: always
    env_file:
      - chainlink-[{CHAIN_TICKER}].env
    ports:
      - [{PORT}]:6688
    secrets:
      - node_password
      - apicredentials
      - keystore
    depends_on:
      - postgres
    networks:
      - chainlink
```

3. Add the new database name specified in `DATABASE_URL` to `postgres.env` at the end of `POSTGRES_MULTIPLE_DATABASES` using coma separator.

**Note**: if the database already exist the scrypt that creates the database won't be run. So the database either should be created manually or the volume with previous database can be removed:

```
docker volume rm pgdata
```

See **Initialization scripts** section in [docs](https://hub.docker.com/_/postgres).

4. Run the command `docker-compose up`.

5. Extend `setup-initiators-and-jobs.sh`. Add to the end of the file:

```
echo "Add initiator for $NETWORK"
network=[[NETWORK_NAME]]
chain_id=[[NETWORK_CHAIN_ID]]
cl_url=[[CHAINLINK_NODE_URL]]
add_initiator $network

echo "Add jobs for $NETWORK"
add_jobs $network

echo "Prepare table for $NETWORK ie"
create_ei_table $chain_id $cl_url $network

echo "Add record for $NETWORK ie"
add_record $network
```

6. If you want to run initiator:
- create initiator/.env file
- add initiator to the `docker-compose.yml` 

```
  initiator:
    build: ./initiator
    image: initiator
    container_name: initiator
    restart: on-failure
    env_file:
      - initiator/.env
    depends_on:
      - postgres
      - chainlink-heco
      - chainlink-bsc
    networks:
      - chainlink
```

- do restart:

```
docker-compose stop; docker-compose up --build -d
```

# Miscellenious

Connect to the database:

```
docker exec -it debridge-launcher_postgres_1 psql -v ON_ERROR_STOP=1 --username postgres -d $DATABASE_NAME
```
