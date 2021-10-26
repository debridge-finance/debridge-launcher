import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import config from '../config/ipfs_client_config.json';
import { DebrdigeApiService } from './DebrdigeApiService';

const IPFS = require("ipfs-http-client");
const OrbitDB = require('orbit-db')

@Injectable()
export class OrbitDbService implements OnModuleInit {
  private readonly UPDATE_ORBITDB_INTERVAL = 5000; //5s

  private readonly logger = new Logger(OrbitDbService.name);
  private orbitLogsDb;
  private orbitDocsDb;

  constructor(private readonly debrdigeApiService: DebrdigeApiService) {}

  async onModuleInit() {
    await this.init();
  }

  async init() {
    try {
      this.logger.log(`OrbitDbService init`);
      const ipfs = IPFS.create(config.IPFSNodeAddress);
      this.logger.log(`IPFS is created`);

      // await ipfs.swarm.connect(PINNER_ADDRESS);
      const orbitdb = await OrbitDB.createInstance(ipfs, {
        directory: './orbitdb',
      });
      const options = {
        // Give write access to ourselves
        accessController: {
          write: [orbitdb.identity.id],
        },
        overwrite: false, // whether we should overwrite the existing database if it exists
      };
      this.orbitLogsDb = await orbitdb.eventlog('debridgeLogs', options);
      await this.orbitLogsDb.load();
      this.logger.log(`OrbitDB logs started at: ${this.orbitLogsDb.address}`);

      this.orbitDocsDb = await orbitdb.docs('debridgeDocs', options);
      await this.orbitDocsDb.load();
      this.logger.log(`OrbitDB docs started at: ${this.orbitDocsDb.address}`);

      this.logger.log(`updateOrbitDbInterval interval is started`);
      const updateOrbitDbInterval = setInterval(async () => {
        this.logger.verbose(`updateOrbitDbInterval is working`);
        const orbitDocsDb = this.orbitDocsDb.address?.toString();
        const orbitLogsDb = this.orbitLogsDb.address?.toString();
        if (orbitDocsDb && orbitLogsDb) {
          try {
            await this.debrdigeApiService.updateOrbitDb({ orbitDocsDb, orbitLogsDb });
            clearInterval(updateOrbitDbInterval);
            this.logger.log(`working updateOrbitDbInterval is finished`);
          } catch (e) {
            this.logger.error(`Error in update orbitdb request ${e.message()}`);
          }
        }
      }, this.UPDATE_ORBITDB_INTERVAL);
    } catch (e) {
      this.logger.error(`Error in initialization orbitdb service ${e.message}`);
      process.exit(1);
    }
  }

  async addSignedSubmission(submissionId: string, signature: string, sendEvent: any): Promise<[string, string]> {
    this.logger.log(`addSignedSubmission start submissionId: ${submissionId}, signature: ${signature}`);
    const logHash = await this.addLogSignedSubmission(submissionId, signature, sendEvent);
    const docsHash = await this.addDocsSignedSubmission(submissionId, signature, sendEvent);
    return [logHash, docsHash];
  }

  async addConfirmNewAssets(deployId: string, signature: string, sendEvent: any): Promise<[string, string]> {
    this.logger.log(`addConfirmNewAssets start deployId: ${deployId}, signature: ${signature}`);
    const logHash = await this.addLogConfirmNewAssets(deployId, signature, sendEvent);
    const docsHash = await this.addDocsConfirmNewAssets(deployId, signature, sendEvent);
    return [logHash, docsHash];
  }

  async addLogSignedSubmission(submissionId: string, signature: string, sendEvent: any): Promise<string> {
    const value = {
      id: submissionId,
      signature: signature,
      event: sendEvent,
      type: 'submission',
    };
    this.logger.verbose(value);
    const hash = await this.orbitLogsDb.add(value, { pin: true });
    this.logger.log(`addLogSignedSubmission hash: ${hash}`);
    return hash;
  }

  async addLogConfirmNewAssets(deployId: string, signature: string, sendEvent: any): Promise<string> {
    const value = {
      id: deployId,
      signature: signature,
      event: sendEvent,
      type: 'confirmNewAsset',
    };
    this.logger.verbose(value);
    const hash = await this.orbitLogsDb.add(value, { pin: true });
    this.logger.log(`addLogConfirmNewAssets hash: ${hash}`);
    return hash;
  }

  async addDocsSignedSubmission(submissionId: string, signature: string, sendEvent: any): Promise<string> {
    const value = {
      _id: submissionId,
      signature: signature,
      event: sendEvent,
      type: 'submission',
    };
    this.logger.verbose(value);
    // await db.put({ _id: 'test', name: 'test-doc-db', category: 'distributed' })
    const hash = await this.orbitDocsDb.put(value, { pin: true });
    this.logger.log(`addDocsSignedSubmission hash: ${hash}`);
    return hash;
  }

  async addDocsConfirmNewAssets(deployId: string, signature: string, sendEvent: any): Promise<string> {
    const value = {
      _id: deployId,
      signature: signature,
      event: sendEvent,
      type: 'confirmNewAsset',
    };
    this.logger.verbose(value);
    // await db.put({ _id: 'test', name: 'test-doc-db', category: 'distributed' })
    const hash = await this.orbitDocsDb.put(value, { pin: true });
    this.logger.log(`addDocsConfirmNewAssets hash: ${hash}`);
    return hash;
  }
}
