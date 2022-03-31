import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { readFileSync } from 'fs';
import { Repository } from 'typeorm';

import { UserLoginDto } from '../api/auth/user.login.dto';
import { AddLogConfirmNewAssetsRequestDTO } from '../dto/orbitdb/input/AddLogConfirmNewAssetsRequestDTO';
import { AddLogSignedSubmissionRequestDTO } from '../dto/orbitdb/input/AddLogSignedSubmissionRequestDTO';
import { GetAddressResponseDTO } from '../dto/orbitdb/output/GetAddressResponseDTO';
import { SubmissionEntity } from '../entities/SubmissionEntity';
import { DebrdigeApiService } from './DebrdigeApiService';
import { HttpAuthService } from './HttpAuthService';

@Injectable()
export class OrbitDbService extends HttpAuthService implements OnModuleInit {
  private readonly UPDATE_ORBITDB_INTERVAL = 5000; //5s

  private readonly signedSubmissionsBatchSize: number;
  private readonly signedSubmissionsUploadTimeout: number;

  private readonly signedSubmissions: AddLogSignedSubmissionRequestDTO[] = [];

  constructor(
    private readonly debrdigeApiService: DebrdigeApiService,
    readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(SubmissionEntity)
    private readonly submissionsRepository: Repository<SubmissionEntity>,
  ) {
    super(httpService, new Logger(OrbitDbService.name), configService.get('ORBITDB_URL'), '/api/auth', {
      login: configService.get('ORBITDB_LOGIN'),
      password: configService.get('ORBITDB_PASSWORD'),
    } as UserLoginDto);
    this.signedSubmissionsBatchSize = parseInt(configService.get('SUBMISSIONS_BATCH_SIZE', '500'));
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
        // const { version } = JSON.parse(readFileSync('./package.json', { encoding: 'utf8' }));

        if (submissionAddress && assetAddress) {
          try {
            // await this.debrdigeApiService.updateOrbitDb({ submissionAddress, assetAddress, nodeVersion: version });
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

  getBatchSize(): number {
    return this.signedSubmissionsBatchSize;
  }

  async addConfirmNewAssets(
    deployId: string,
    signature: string,
    tokenAddress: string,
    name: string,
    symbol: string,
    nativeChainId: number,
    decimals: number,
  ): Promise<string> {
    const value = {
      deployId,
      signature,
      tokenAddress,
      name,
      symbol,
      nativeChainId,
      decimals,
    } as AddLogConfirmNewAssetsRequestDTO;
    this.logger.verbose(value);
    const hash = (await this.authRequest('/api/assets', value)).data;
    this.logger.log(`addLogConfirmNewAssets hash: ${hash}`);
    return hash;
  }

  async addHashSubmissions(submissions: SubmissionEntity[]) {
    this.logger.log(`start addHashSubmissions`);
    if (!submissions) {
      return;
    }
    const data = submissions.map(submission => {
      return {
        submissionId: submission.submissionId,
        signature: submission.signature,
        debridgeId: submission.debridgeId,
        txHash: submission.txHash,
        chainFrom: submission.chainFrom,
        chainTo: submission.chainTo,
        amount: submission.amount,
        receiverAddr: submission.receiverAddr,
      };
    });
    this.logger.log(`start addHashSubmissions; data.length: ${data.length}`);

    const response = (await this.authRequest('/api/submissions', { data })).data;
    const submissionIds = data.map(submission => submission.submissionId);
    return { hash: response.hash, submissionIds };
  }
}
