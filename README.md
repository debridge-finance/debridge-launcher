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

deBridge launcher is a software that is run by deBridge validators who were elected by the protocol governance and perform validation of all cross-chain transactions passed through the protocol. to set up a validation node, the following steps should be performed:

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
3. Change default (postgrestestpassword) Postgres password in .env
4. Create a keystore file for the validation node. Script from `generate-keystore` folder can be used. To start generating new keystore info:
  - npm i
  - node index.js

The script will show the newly generated Ethereum address, private key, password for keystore, and keystore info. Copy password to `.env KEYSTORE_PASSWORD`, keystore info to /`secrets/keystore.json`

5. Put the keystore file under `secrets/keystore.json`.
6. Store the password that decrypts the key from `keystore` in the .env file KEYSTORE_PASSWORD.
7. Make your wallet public address to be whitelisted by deBridge governance (contact the deBridge team for that)
8. Contact deBridge team to get DEBRIDGE_API_ACCESS_KEY. Put it in .env
9. Run the command `docker-compose up --build -d`.
10. Backup and do not delete any files from the following directories:
    - `./initiator/orbitdb`
    - `./initiator/ipfs`
11. Run `docker-compose logs | grep  "started at: /orbitdb/"` command that will show two addresses of orbitdb databases.
Send the output to deBridge team so that your database addresses can be reflected in deBridge explorer and be pinned by other nodes for persistency

11. If there is a need to start multiple instances of the launcher (e.g. one for testnet and one for mainnet) on one server you can:
  - checkout or copy repo to the new directory
  - change DOCKER_ID variable in .env
  - start as described above

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
  - initiator
3. It's recommended to check `docker-compose logs` for ERROR
