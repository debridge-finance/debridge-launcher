const IPFS = require('ipfs');
const OrbitDB = require('orbit-db');
const { isMainThread } = require('worker_threads');

// Start
console.log('Starting IPFS daemon...');

let ipfs;
async function main() {
  ipfs = await IPFS.create({
    repo: './ipfs/testreplicate',
    start: true,
    EXPERIMENTAL: {
      pubsub: true,
    },
  });

  try {
    const orbit = await OrbitDB.createInstance(ipfs, { directory: './orbitdb/testReplicate' });

    const db = await orbit.eventlog('/orbitdb/zdpuAue7dLmSfmDFdoPY6Hw56XBPBiR5tREKv5Tgks1T4xYZW/orbit-db.benchmark'); //, options);
    await db.load();
    console.log(db.address);

    const all = db
      .iterator({ limit: -1 })
      .collect()
      .map(e => e.payload.value);
    console.log('all');
    console.log(all);
    // When the second database replicated new heads, query the database
    db.events.on('replicated', () => {
      const result = db2
        .iterator({ limit: -1 })
        .collect()
        .map(e => e.payload.value);
      console.log(result.join('\n'));
    });
    db.events.on('replicate', address => {
      console.log(`replicate ${address}`);
    });
    db.events.on('replicate.progress', (address, hash, entry, progress, have) => {
      console.log(`replicate.progress ${address}, ${hash}, ${entry}, ${progress}, ${have}`);
    });
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
}

main();
