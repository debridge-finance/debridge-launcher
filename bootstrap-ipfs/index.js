const IPFS = require("ipfs-http-client");
const config = require("config");

console.log("Start setting config...");
const url = config.get("daemonUrl");
const ipfsConfig = config.get("ipfs");

const ipfs = IPFS.create(url);

async function setConfig(configs) {
  await Promise.all(
    Object.keys(configs).map(async (key) => {
      console.log(`${key}:\n`, configs[key]);
      await ipfs.config.set(key, configs[key]);
    })
  );
}

async function stopIPFS() {
  return await Promise.resolve(ipfs.stop());
}

function main() {
  setConfig(ipfsConfig);
  stopIPFS();
  console.log("Stop IPFS");
}

main();
