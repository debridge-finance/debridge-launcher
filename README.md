This repo allows to setup the oracles for few chains quickly with the same credentials.

# Usage

1. Set api credential in `apicredential` file.
2. Put keystore file to `secrets/keystore.json`.
3. Store the password that decrypts the key from `keystore` in `password.txt`
4. Run: `docker-compose up`.

The oracles will be started for BSC and Ethereum.

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
