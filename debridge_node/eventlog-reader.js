'use strict';

const IPFS = require('ipfs');
const Identities = require('orbit-db-identity-provider');
const OrbitDB = require('orbit-db');

console.log('Starting...');
async function main() {
  // Create the second peer
  const ipfs = await IPFS.create({
    repo: './orbitdb/examples/reader/ipfs',
    start: true,
    EXPERIMENTAL: {
      pubsub: true,
    },
    config: {
      Bootstrap: ['/ip4/127.0.0.1/tcp/4001/p2p/12D3KooWNYMSwz5DXD7tY9mWB1p8uBAPuULxhov8hc3GvigJskdL'],
    },
  });

  // Open the first database for the second peer,
  // ie. replicate the database
  console.log(`starting...`);
  const orbitdb = await OrbitDB.createInstance(ipfs, {
    directory: './orbitdb/examples/reader/eventlog',
  });
  const db = orbitdb.log('/orbitdb/zdpuApiZ5KffcYYGQRvs2jvoaVt7Q2azM6anh1NxV1XRqKnkV/debridgeDocs');
  console.log(`db`, db);
  console.log(`db.address`, db.address.toString());
  db.load();
  console.log(`db loaded`);

  const all = db
    .iterator({ limit: -1 })
    .collect()
    .map(e => {
      return e.payload.value;
    });
  console.log('all :>> ', all);
  // When the second database replicated new heads, query the database

  db.events.on('replicated', () => {
    const all = db.iterator({ limit: -1 }).collect();
    console.log('db values amount :>> ', all.length, all[all.length - 1]);
    // console.log('db values :>> ', all);
  });

  // Start adding entries to the first database
  // setInterval(async () => {
  //   await db1.add({ time: new Date().getTime() });
  // }, 30000);
}

main();
