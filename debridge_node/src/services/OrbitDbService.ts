import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DebrdigeApiService } from './DebrdigeApiService';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { UserLoginDto } from '../api/auth/user.login.dto';
import { HttpAuthService } from './HttpAuthService';
import { GetAddressResponseDTO } from '../dto/orbitdb/output/GetAddressResponseDTO';
import { AddLogConfirmNewAssetsRequestDTO } from '../dto/orbitdb/input/AddLogConfirmNewAssetsRequestDTO';
import { AddLogSignedSubmissionRequestDTO } from '../dto/orbitdb/input/AddLogSignedSubmissionRequestDTO';
import { readFileSync } from 'fs';
import { UploadStatusEnum } from '../enums/UploadStatusEnum';
import { InjectRepository } from '@nestjs/typeorm';
import { SubmissionEntity } from '../entities/SubmissionEntity';
import { In, Repository } from 'typeorm';

@Injectable()
export class OrbitDbService extends HttpAuthService implements OnModuleInit {
  private readonly UPDATE_ORBITDB_INTERVAL = 5000; //5s

  private readonly signedSubmissionsBatchCount = 100;

  private readonly signedSubmissions: AddLogSignedSubmissionRequestDTO[] = [];
  private readonly signedSubmissionsUploadTimeout = 5000; //5s

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

      setInterval(async () => {
        await this.addHashSubmissions(this.signedSubmissions);
        this.signedSubmissions.length = 0;
      }, this.signedSubmissionsUploadTimeout);
    } catch (e) {
      this.logger.error(`Error in initialization orbitdb service ${e.message}`);
      //process.exit(1);
    }
  }

  async addSignedSubmission(
    submissionId: string,
    signature: string,
    debridgeId: string,
    txHash: string,
    chainFrom: number,
    chainTo: number,
    amount: string,
    receiverAddr: string,
  ): Promise<void> {
    this.logger.log(`addSignedSubmission start submissionId: ${submissionId}, signature: ${signature}`);
    this.signedSubmissions.push({
      submissionId,
      signature,
      debridgeId,
      txHash,
      chainFrom,
      chainTo,
      amount,
      receiverAddr,
    } as AddLogSignedSubmissionRequestDTO);
    if (this.signedSubmissions.length === this.signedSubmissionsBatchCount) {
      await this.addHashSubmissions(this.signedSubmissions);
      this.signedSubmissions.length = 0;
    }
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
    const hash = (await this.authRequest('/api/asset', value)).data;
    this.logger.log(`addLogConfirmNewAssets hash: ${hash}`);
    return hash;
  }

  private async addHashSubmissions(data: AddLogSignedSubmissionRequestDTO[]) {
    const hash = (await this.authRequest('/api/submissions', { data })).data;
    const submissions = data.map(submission => submission.submissionId);
    await this.submissionsRepository.update(
      {
        submissionId: In(submissions),
      },
      {
        ipfsStatus: UploadStatusEnum.UPLOADED,
        ipfsHash: hash,
      },
    );
    return hash;
  }
}
