import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DebrdigeApiService } from './DebrdigeApiService';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { UserLoginDto } from '../api/auth/user.login.dto';
import { HttpAuthService } from './HttpAuthService';

import { GetAddressResponseDTO } from '../dto/orbitdb/output/GetAddressResponseDTO';
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
    super(httpService, new Logger(OrbitDbService.name), configService.get('ORBITDB_URL'), '/api/auth', {
      login: configService.get('ORBITDB_LOGIN'),
      password: configService.get('ORBITDB_PASSWORD'),
    } as UserLoginDto);
  }

  async onModuleInit() {
    await this.init();
  }

  async init() {
    try {
      this.logger.log(`updateOrbitDbInterval interval is started`);
      const updateOrbitDbInterval = setInterval(async () => {
        this.logger.verbose(`updateOrbitDbInterval is working`);
        let responseSubmission: GetAddressResponseDTO;
        let responseAsset: GetAddressResponseDTO;
        try {
          responseSubmission = (await this.authRequest('/api/submission/address', {})).data as GetAddressResponseDTO;
          responseAsset = (await this.authRequest('/api/asset/address', {})).data as GetAddressResponseDTO;
        } catch (e) {
          this.logger.error(`Error in getNames orbitdb request ${e.message}`);
        }
        const submissionAddress = responseSubmission?.address;
        const assetAddress = responseAsset?.address;
        const { version } = JSON.parse(readFileSync('./package.json', { encoding: 'utf8' }));

        if (submissionAddress && assetAddress) {
          try {
            await this.debrdigeApiService.updateOrbitDb({ submissionAddress, assetAddress, nodeVersion: version });
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

  async addSignedSubmission(submissionId: string, signature: string, payload: any): Promise<string> {
    this.logger.log(`addSignedSubmission start submissionId: ${submissionId}, signature: ${signature}`);
    const hash = await this.addLogSignedSubmission(submissionId, signature, payload);
    return hash;
  }

  async addConfirmNewAssets(deployId: string, signature: string, payload: any): Promise<string> {
    this.logger.log(`addConfirmNewAssets start deployId: ${deployId}, signature: ${signature}`);
    const hash = await this.addLogConfirmNewAssets(deployId, signature, payload);

    return hash;
  }

  async addLogSignedSubmission(submissionId: string, signature: string, payload: any): Promise<string> {
    const value = {
      submissionId,
      signature,
      payload,
    } as AddLogSignedSubmissionRequestDTO;
    this.logger.verbose(value);
    const hash = (await this.authRequest('/api/submission', value)).data;
    this.logger.log(`addLogSignedSubmission hash: ${hash}`);
    return hash;
  }

  async addLogConfirmNewAssets(deployId: string, signature: string, payload: any): Promise<string> {
    const value = {
      deployId,
      signature,
      payload,
    } as AddLogConfirmNewAssetsRequestDTO;
    this.logger.verbose(value);
    const hash = (await this.authRequest('/api/asset', value)).data;
    this.logger.log(`addLogConfirmNewAssets hash: ${hash}`);
    return hash;
  }
}