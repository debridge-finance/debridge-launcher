<br/>
<p align="center">
<a href="https://debridge.finance/" target="_blank">
<img src="https://user-images.githubusercontent.com/10200871/137014801-40decb80-0595-4f0f-8ee5-f0f1ab5c0380.png" width="225" alt="logo">
</a>
</p>
<br/>

[deBridge](https://debridge.finance/) — cross-chain interoperability
 and liquidity transfer protocol that allows the truly decentralized transfer of data and assets between various blockchains. deBridge protocol is an infrastructure platform and a hooking service which aims to become a standard for:
- cross-chain composability of smart contracts
- cross-chain swaps
- bridging of any arbitrary asset
- interoperability and bridging of NFTs

More information about the project can be also found in the [documentation portal](https://docs.debridge.finance/)

deBridge node is a software that is run by deBridge validators who were elected by the protocol governance and perform validation of all cross-chain transactions passed through the protocol. All active validators are listening for events emitted by transactions that pass through deBridge smart contract and once an event achieves its finality validator signs the unique id of the event by private key and stores signature to Orbitdb -  public IPFS database. In order to have transaction executed in the target chain user or arbitrary keeper needs to collect minimal required signatures of deBridge validators from IPFS and pass them alongside all transaction parameters to the deBridge smart contract in the target chain. The smart contract will validate all signatures and execute message/data passed in the transaction

In order to set up the validation node, the following steps should be performed:

## Install prerequisite packages on your server:

  1. docker
    - https://docs.docker.com/engine/install/ubuntu/
  2. docker-compose
    - https://docs.docker.com/compose/install/
  3. nodejs
    - https://github.com/nodesource/distributions/blob/master/README.md
  5. psql
    ``` sudo apt-get install postgresql-client```

## Set up the blockchain infrastructure:
1. Install full testnet nodes
  - [Kovan](https://kovan-testnet.github.io/website/)
  - [BSC](https://docs.binance.org/smart-chain/developer/fullnode.html)
  - [HECO](https://docs.hecochain.com/#/en-us/dev/deploy)
  - Arbitrum
  - [Polygon](https://docs.polygon.technology/docs/validate/technical-requirements/)
2. Update HTTP RPC URL in /config/chains_config.json
3. Copy `.default.env` file and rename it to `.env`. Change default POSTGRES_PASSWORD, POSTGRES_USER credentials in .env file. During the first run (point 9) Postgres database will be automatically created with these credentials.
deBridge node has an embedded API through which node operator can authorize, query last scanned blocks, or rescan blockchain from the specific block. By default deBridge node is deployed on DEBRIDGE_NODE_PORT from .env file. Update JWT_SECRET, API_LOGIN, and API_PASSWORD to randomly generated ones. If you use sentry to track any errors of the node, please update SENTRY_DSN at .env file.

4. Create a keystore file for the validation node. Script from `generate-keystore` folder can be used. To start generating new keystore info:
  - npm i
  - node index.js

The script will show the newly generated Ethereum address, private key, password for keystore, and keystore info. Copy password to `.env KEYSTORE_PASSWORD`, keystore info to /`secrets/keystore.json`

5. Put the keystore file under `secrets/keystore.json`.
6. Store the password that decrypts the key from `keystore` in the .env file KEYSTORE_PASSWORD.
7. Contact deBridge team  to make your wallet address to be whitelisted by deBridge governance
8. Run the command `docker-compose up --build -d`.
9. Backup and do not delete any files from the following directories:
    - `./data/orbitdb`
    - `./data/ipfs`
10. If there is a need to start multiple instances of the node (e.g. one for testnet and one for mainnet) on one server you can:
  - checkout or copy repo to the new directory
  - change DOCKER_ID variable in .env
  - start as described above

## Update debridge node to the latest version
```shell
# Stop the node
docker-compose down -v

# Get latest changes from git
git pull

# Bootstrap and run debridge node
docker-compose up --build -d
```

# Pinners list
  - `/ip4/139.59.164.64/tcp/4001/p2p/12D3KooWA84FLvoJb2QPut134ej9s4hukwmwpZ5DQXbebNBfogdk`
  - `/ip4/161.35.31.27/tcp/4001/p2p/12D3KooWAfR9K7y4Y63dbCJ3io58dgTtFM3F2nycFWLo1LJg3Z1k`
  - `/ip4/164.90.237.61/tcp/4001/p2p/12D3KooWDZxx4TMUjQzqqQAdZKUWNWAamcoBkMWBKfNnfLMSM6mP`
  - `/dnsaddr/londonswarm.debridge.io/p2p/12D3KooWA84FLvoJb2QPut134ej9s4hukwmwpZ5DQXbebNBfogdk`
  
To add node to the bootstrap list manually, you can use the command:
```shell
docker-compose exec ipfs-daemon ipfs bootstrap add "$PINNER_ADDRESS"
```

# Miscellaneous

Connect to the database(if you use docker-compose):

```
docker exec -it $(docker-compose ps | grep postgres | awk '{print $1}') psql -v ON_ERROR_STOP=1 --username postgres -d $DATABASE_NAME
```

# Mandatory monitorings

1. Basic monitoring of the server/virtual machine(CPU, memory, disk space).
2. Availability check:
  - each of the full nodes(heco, bsc, etc). It is also good to check the synchronization status
  - database
  - deBridge node
3. It's recommended to check `docker-compose logs` for ERROR

# Changelog
## v1.0.2 (20.11.2021)
 - debridge-node: add timeout for http requests
 - ipfs-daemon: config node with entrypoint.sh script
 - docker-compose.yml: update env vars for debridge-node service
 - .env: update vars for postgres and add variable `IPFS_URL`
### How to update
```shell
# pull the latest version
git pull

# update .env file as on the screenshot:
# 1. remove  `EI_DATABASE`
# 2. change `POSTGRES_MULTIPLE_DATABASES=${EI_DATABASE}` to `POSTGRES_DATABASE=ei${PG_RANDOM_ID}` 
# 3. add env var `IPFS_URL=http://ipfs-daemon${DOCKER_ID}:5001/api/v0`

# run new version
docker-compose up —build -d
```
![change env vars](./assets/change-env-vars.png)
## v1.0.0 (27.10.2021)
 - Change javascript instance of IPFS to separate service, which runs [go-IPFS](https://github.com/ipfs/go-ipfs) daemon.
 - Move orbitdb mounting directory on the host to the top level at `./data/orbitdb`.
 - Added ARBITRUM testnet to [config/chains_config.json](https://github.com/debridge-finance/debridge-launcher/tree/master/config)
 - Added Sentry. If you are using sentry, please update SENTRY_DSN at .env file.
 - Removed DEBRIDGE_API_ACCESS_KEY. We support validators auth by signing message with private key
