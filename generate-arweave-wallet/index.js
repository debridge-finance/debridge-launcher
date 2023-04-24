const Arweave = require('arweave');

const arweave = Arweave.init({});

async function main() {
  const privateKey = await arweave.wallets.generate();
  const address = await arweave.wallets.jwkToAddress(privateKey)
  console.log(`address: `, address);
  console.log(`privateKey: `, JSON.stringify(privateKey));
}

main();
