import { Injectable, Logger } from '@nestjs/common';
const IPFS = require('ipfs')
const OrbitDB = require('orbit-db')

@Injectable()
export class OrbitDbService {
    private readonly logger = new Logger(OrbitDbService.name);
    private myOrbitDb;

    async init() {
        this.logger.log(`OrbitDbService init`);
        // await this.uploadConfig();
        // await this.setupCheckEventsTimeout();
        // await this.checkNewEvents();

        const ipfs = await IPFS.create({
            repo: "./orbitdb/examples/writer/ipfs",
            start: true,
            EXPERIMENTAL: {
                pubsub: true,
            },
        });
        // await ipfs.swarm.connect(PINNER_ADDRESS);
        const orbitdb = await OrbitDB.createInstance(ipfs, {
            directory: "./orbitdb/examples/writer/eventlog",
        });
        const options = {
            // Give write access to ourselves
            accessController: {
                write: [orbitdb.identity.id],
            },
            overwrite: true, // todo: cahnge to false on prod
        };
        this.myOrbitDb = await orbitdb.eventlog("signatures", options);
        await this.myOrbitDb.load();
    }

    async addLog(submissionId: string, signature: string): Promise<string> {
        const value = {
            submissionId: submissionId,
            signature: signature,
        };

        let hash = await this.myOrbitDb.add(value);
        this.logger.log(`addLog hash: ${hash}`);
        return hash;
    }
}