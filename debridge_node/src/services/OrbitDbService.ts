import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DebrdigeApiService } from './DebrdigeApiService';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { UserLoginDto } from '../api/auth/user.login.dto';
import { HttpAuthService } from './HttpAuthService';
import { GetNamesResponseDTO } from '../dto/orbitdb/output/GetNamesResponseDTO';
import { AddDocsConfirmNewAssetsRequestDTO } from '../dto/orbitdb/input/AddDocsConfirmNewAssetsRequestDTO';
import { AddDocsSignedSubmissionRequestDTO } from '../dto/orbitdb/input/AddDocsSignedSubmissionRequestDTO';
import { AddLogConfirmNewAssetsRequestDTO } from '../dto/orbitdb/input/AddLogConfirmNewAssetsRequestDTO';
import { AddLogSignedSubmissionRequestDTO } from '../dto/orbitdb/input/AddLogSignedSubmissionRequestDTO';
import { readFileSync } from 'fs';

@Injectable()
export class OrbitDbService extends HttpAuthService implements OnModuleInit {
  private readonly UPDATE_ORBITDB_INTERVAL = 5000; //5s

  constructor(
    private readonly debrdigeApiService: DebrdigeApiService,
    readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    super(httpService, new Logger(OrbitDbService.name), configService.get('ORBITDB_URL'), '/login', {
      login: configService.get('ORBITDB_LOGIN'),
      password: configService.get('ORBITDB_PASSWORD'),
    } as UserLoginDto);
  }

  async onModuleInit() {
    //TODO: comment out when go orbitDb will ready
    // await this.init();
  }

  async init() {
    try {
      this.logger.log(`updateOrbitDbInterval interval is started`);
      const updateOrbitDbInterval = setInterval(async () => {
        this.logger.verbose(`updateOrbitDbInterval is working`);
        let response: GetNamesResponseDTO;
        try {
          response = (await this.authRequest('/names', {})).data as GetNamesResponseDTO;
        } catch (e) {
          this.logger.error(`Error in getNames orbitdb request ${e.message}`);
        }
        const orbitDocsDb = response?.orbitDocsDb;
        const orbitLogsDb = response?.orbitLogsDb;
        const { version } = JSON.parse(readFileSync('./package.json', { encoding: 'utf8' }));

        if (orbitDocsDb && orbitLogsDb) {
          try {
            await this.debrdigeApiService.updateOrbitDb({ orbitDocsDb, orbitLogsDb, nodeVersion: version });
            clearInterval(updateOrbitDbInterval);
            this.logger.log(`working updateOrbitDbInterval is finished`);
          } catch (e) {
            this.logger.error(`Error in update orbitdb request ${e.message}`);
          }
        }
      }, this.UPDATE_ORBITDB_INTERVAL);
    } catch (e) {
      this.logger.error(`Error in initialization orbitdb service ${e.message}`);
      //process.exit(1);
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
      submissionId,
      signature,
      sendEvent,
    } as AddLogSignedSubmissionRequestDTO;
    this.logger.verbose(value);
    const hash = (await this.authRequest('/addLogSignedSubmission', value)).data;
    this.logger.log(`addLogSignedSubmission hash: ${hash}`);
    return hash;
  }

  async addLogConfirmNewAssets(deployId: string, signature: string, sendEvent: any): Promise<string> {
    const value = {
      deployId,
      signature,
      sendEvent,
    } as AddLogConfirmNewAssetsRequestDTO;
    this.logger.verbose(value);
    const hash = (await this.authRequest('/addLogConfirmNewAssets', value)).data;
    this.logger.log(`addLogConfirmNewAssets hash: ${hash}`);
    return hash;
  }

  async addDocsSignedSubmission(submissionId: string, signature: string, sendEvent: any): Promise<string> {
    const value = {
      submissionId,
      signature: signature,
      sendEvent,
    } as AddDocsSignedSubmissionRequestDTO;
    this.logger.verbose(value);
    // await db.put({ _id: 'test', name: 'test-doc-db', category: 'distributed' })
    const hash = (await this.authRequest('/addDocsSignedSubmission', value)).data;
    this.logger.log(`addDocsSignedSubmission hash: ${hash}`);
    return hash;
  }

  async addDocsConfirmNewAssets(deployId: string, signature: string, sendEvent: any): Promise<string> {
    const value = {
      deployId,
      signature,
      sendEvent,
    } as AddDocsConfirmNewAssetsRequestDTO;
    this.logger.verbose(value);
    const hash = (await this.authRequest('/addDocsConfirmNewAssets', value)).data;
    // await db.put({ _id: 'test', name: 'test-doc-db', category: 'distributed' })
    this.logger.log(`addDocsConfirmNewAssets hash: ${hash}`);
    return hash;
  }
}
