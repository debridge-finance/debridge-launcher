'use strict'
const IPFS = require('ipfs')
// const IPFSRepo = require('ipfs-repo')
// const DatastoreLevel = require('datastore-level')
const OrbitDB = require('orbit-db')
const { isMainThread } = require('worker_threads')


// Metrics
let totalQueries = 0
let seconds = 0
let queriesPerSecond = 0
let lastTenSeconds = 0

// Main loop
const queryLoop = async (db) => {
    const value = {
        id: totalQueries,
        signature: "0x907113e3e19b68bb38ec19ae73db1dcae9a0f8cc64316ecf8ba157eca7bb9657491d2fc25cf35919616dbcfd79042fad2e6a18562b5e3cf478c8fc9b4f8cc7481c",
        type: "submission"
    };
    await db.add(value, { pin: true })
    totalQueries++
    lastTenSeconds++
    queriesPerSecond++
    setImmediate(() => queryLoop(db))
}

// Start
console.log("Starting IPFS daemon...")

// const repoConf = {
//   storageBackends: {
//     blocks: DatastoreLevel,
//   },
// }

let ipfs
async function main() {
    ipfs = await IPFS.create({
        repo: "./ipfs/logstest",
        start: true,
        EXPERIMENTAL: {
            pubsub: true,
        },
    });

    try {
        const orbit = await OrbitDB.createInstance(ipfs, { directory: './orbitdb/logsbenchmarks' })

        const options = {
            // Give write access to ourselves
            accessController: {
                write: [orbit.identity.id],
            },
            overwrite: true, // whether we should overwrite the existing database if it exists
            replicate: true, //replicate (boolean): Replicate the database with peers, requires IPFS PubSub. (Default: true)
        };

        const db = await orbit.eventlog('orbit-db.benchmark', options);
        await db.load();
        console.log(db.address.toString());
        // Metrics output
        setInterval(() => {
            seconds++
            if (seconds % 10 === 0) {
                console.log(`--> Average of ${lastTenSeconds / 10} q/s in the last 10 seconds`)
                if (lastTenSeconds === 0)
                    throw new Error("Problems!")
                lastTenSeconds = 0
            }
            console.log(`${queriesPerSecond} queries per second, ${totalQueries} queries in ${seconds} seconds (Oplog: ${db._oplog.length})`)
            queriesPerSecond = 0
        }, 1000)
        // Start the main loop
        queryLoop(db)
    } catch (e) {
        console.log(e)
        process.exit(1)
    }
}

main();
