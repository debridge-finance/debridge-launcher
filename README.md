This repo allows to setup the oracles for few chains quickly with the same credentials.
In order to set up a node on the DeBridge network, we need to:

# 1) Install prerequisite packages on your VM: 

  1. docker 
    - https://docs.docker.com/engine/install/ubuntu/
  2. docker-compose 
    - https://docs.docker.com/compose/install/
  3. nodejs 
    - https://github.com/nodesource/distributions/blob/master/README.md
  5. psql
    ``` sudo apt-get install postgresql-client```

# 2) Set up the Chainlink environment:
1. Install full testnet nodes
  - Kovan 
  - [BSC](https://docs.binance.org/smart-chain/developer/fullnode.html)
  - [HECO](https://docs.hecochain.com/#/dev/install)
  Make sure that the nodes are fully synchronized and HTTP/WS ports are opened before proceeding. 
2. Set ETH_URL (use the Websocket Endpoints) in each of the following files: chainlink-eth.env, chainlink-bsc.env, chainlink-heco.env
3. Set providers (use the node RPC Endpoints) ETH_PROVIDER, BSC_PROVIDER, ETH_PROVIDER in file .env
4. Change default (postgreschainlink) postgress password in .env (You can generate a random password by running this command: ``` date +%s | sha256sum | base64 | head -c 32 ; echo ```)
5. Create the apicredentials file with your desired chainlink email and password. [example](https://github.com/debridge-finance/debridge-launcher/blob/master/apicredentials.example) [docs](https://docs.chain.link/docs/miscellaneous/#use-password-and-api-files-on-startup). After that, we need to change CHAINLINK_EMAIL, CHAINLINK_PASSWORD in initiator/.env to match the information written in the apicredentials file.
6. Now, we're going to need to create a keystore for our node, based on a private key.
   - In order to generate a private key, there are multiple ways to do so, but this code snippet seems to be working just fine:
``` 
    const wallet = require('ethereumjs-wallet');
    var addressData = wallet['default'].generate();
    console.log("address: " + addressData.getAddressString());
    console.log("privateKey: " + addressData.getPrivateKeyString()); 
```
  NOTE: You will need to install npm for this. (For Ubuntu machines, apt-get install npm will work)
  - Now that we have our private key, we can move forward and generate our keystore based on it:
    First of all, we need to install web3 using npm (npm install web3).
    Next, use this code snippet inside node, where privateKey is the one generated above and password is an arbitrary string in order to generate your keystore:
```
   var Web3 = require('web3');
   var web3 = new Web3('ws://test.com:8546');
   var JsonWallet = web3.eth.accounts.encrypt(privateKey, password);
   JSON.stringify(JsonWallet)
```
6. Put the keystore file under `secrets/keystore.json`.
7. Store the password that decrypts the key from `keystore` in the `password.txt` file.
8. Make your oracle-operator address to be whitelisted by deBridge governance
9. Run the command `docker-compose up --build -d`.
10. Run the script to create the initiators and prepare the jobs and store main configurations in the database:
```
bash chainlink-init-scripts/setup-initiators-and-jobs.sh
```
11. Run the command `docker-compose restart initiator`.
12. If you want to start multiple instances on one server or one postgresql you can do this:
  - checkout or copy repo to new directory
  - change DOCKER_ID variable in .env
  - start as previously described

# Use separate apicredentials

1. create several apicredentials like apicredentials-bsc and apicredentials-heco
2. create several secrets in docker-compose.conf
3. change start arguments(entrypoint) and secrets of docker-compose chainlink config
4. create initiator/config/credentials.json with custom credentials(please see example initiator/config/credentials_example.json)

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
    container_name: chainlink-[{CHAIN_TICKER}]${DOCKER_ID}
    image: smartcontract/chainlink:0.10.2
    entrypoint: /bin/sh -c "chainlink node import /run/secrets/keystore && chainlink node start -d -p /run/secrets/node_password -a /run/secrets/apicredentials"
    restart: always
    env_file:
      - chainlink-[{CHAIN_TICKER}].env
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${HECO_DATABASE}?sslmode=disable
    secrets:
      - node_password
      - apicredentials
      - keystore
    depends_on:
      - postgres
    networks:
      - chainlink
```

3. Add the new database name specified in `DATABASE_URL` to `.env` at the end of `POSTGRES_MULTIPLE_DATABASES` using coma separator.

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
container_name=$(docker-compose ps | grep [[NETWORK_NAME]] | awk '{print $1}')
cl_url="http://$container_name:6688"
add_initiator $network

echo "Add jobs for $NETWORK"
add_jobs $network

echo "Prepare table for $NETWORK ie"
create_ei_table $chain_id $cl_url $network

echo "Add record for $NETWORK ie"
add_record $network
```


# Miscellaneous

Connect to the database(if you use docker-compose):

```
docker exec -it $(docker-compose ps | grep postgres | awk '{print $1}') psql -v ON_ERROR_STOP=1 --username postgres -d $DATABASE_NAME
```


# Mandatory for monitoring

1. Basic monitoring of the server/virtual machine(cpu, memory, disk space).
2. Availability check(may be connectivity):
  - all of full nodes(heco, bsc, etc). It is also good to check the synchronization status
  - database
  - initiator and chainlinks
3. Strongly recommend to check `docker-compose logs` for ERROR.
