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

# 2) Set up the infrastructure:
1. Install full testnet nodes
  - Kovan
  - [BSC](https://docs.binance.org/smart-chain/developer/fullnode.html)
  - [HECO](https://docs.hecochain.com/#/en-us/dev/deploy)
  - Arbitrum Testnet
  - Polygon Testnet
2. Update HTTP RPC URL in initiator/src/config/chains_config.json
3. Change default (postgrestestpassword) postgress password in .env.
4. Now, we're going to need to create a keystore for our node, based on a private key. We have script in folder `generate-keystore`. To start generate new keystore info

  - npm i
  - node index.js

  Script will show new generated ethereum address, private key, password for keystore and keystore info. You need to copy pasword to `.env KEYSTORE_PASSWORD`, keystore info to /`initiator/keystore.json`

5. Put the keystore file under `secrets/keystore.json`.
6. Store the password that decrypts the key from `keystore` in the .env file KEYSTORE_PASSWORD.
7. Make your oracle-operator address to be whitelisted by deBridge governance (contact the DeBridge team for that)
8. Contact deBridge team to get DEBRIDGE_API_ACCESS_KEY. Put it in .env
9. Run the command `docker-compose up --build -d`.

10. If you want to start multiple instances on one server or one postgresql you can do this:
  - checkout or copy repo to new directory
  - change DOCKER_ID variable in .env
  - start as previously described

# Add new chain support

1. Configure initiator/src/chains_config.json:

```
 {
    "chainId": 97,
    "name": "BSC",
    "debridgeAddr": "0xFA1C16eA140de187d20413418FB57320144773f1",
    "firstStartBlock": 13146725,
    "provider": "https://data-seed-prebsc-1-s1.binance.org:8545/",
    "interval": 10000,
    "blockConfirmation": 12,
    "maxBlockRange": 5000
  }
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
