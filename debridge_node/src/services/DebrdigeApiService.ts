import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { SubmissionsConfirmationsRequestDTO } from '../dto/debridge_api/SubmissionsConfirmationsRequestDTO';
import { SubmissionConfirmationResponse, SubmissionsConfirmationsResponseDTO } from '../dto/debridge_api/SubmissionsConfirmationsResponseDTO';
import { Account } from 'web3-core';
import Web3 from 'web3';
import { readFileSync } from 'fs';
import { ProgressInfoDTO, ValidationProgressDTO } from '../dto/debridge_api/ValidationProgressDTO';
import { createProxy } from '../utils/create.proxy';
import { UpdateOrbirDbDTO } from '../dto/debridge_api/UpdateOrbirDbDTO';
import { HttpAuthService } from './HttpAuthService';
import { SubmissionEntity } from '../entities/SubmissionEntity';
import { ConfirmNewAssetEntity } from '../entities/ConfirmNewAssetEntity';
import { ConfrimNewAssetsResponseDTO } from '../dto/debridge_api/ConfrimNewAssetsResponseDTO';
import { ConfrimNewAssetsRequestDTO } from '../dto/debridge_api/ConfrimNewAssetsRequestDTO';
import { IncorrectNonceNotificationDTO } from '../dto/debridge_api/IncorrectNonceNotificationDTO';

@Injectable()
export class DebrdigeApiService extends HttpAuthService implements OnModuleInit {
  private readonly updateVersionInterval = 60000; //1m
  private account: Account;
  private web3: Web3;

  constructor(readonly httpService: HttpService, private readonly configService: ConfigService) {
    super(httpService, new Logger(DebrdigeApiService.name), configService.get('API_BASE_URL'), '/Account/authenticate');
    this.web3 = createProxy(new Web3(), { logger: this.logger });
    this.account = this.web3.eth.accounts.decrypt(JSON.parse(readFileSync('./keystore.json', 'utf-8')), process.env.KEYSTORE_PASSWORD);
  }

  async onModuleInit() {
    const { version } = JSON.parse(readFileSync('./package.json', { encoding: 'utf8' }));
    const updateVersionInterval = setInterval(async () => {
      try {
        await this.updateVersion(version);
        this.logger.log(`Sending event to update node version is finished`);
        clearInterval(updateVersionInterval);
      } catch (e) {
        this.logger.warn(`Error in sending event to update node version`);
      }
    }, this.updateVersionInterval);
  }

  private getLoginDto() {
    const timeStamp = Math.floor(new Date().getTime() / 1000);
    return {
      ethAddress: this.account.address,
      signature: this.account.sign(`${timeStamp}`).signature,
      timeStamp,
      killOtherSessions: false,
    };
  }

  async updateOrbitDb(requestBody: UpdateOrbirDbDTO) {
    this.logger.log(`updateOrbitDb ${requestBody} is started`);
    const httpResult = await this.authRequest('/Validator/updateOrbitDb', requestBody, this.getLoginDto());
    this.logger.verbose(`response: ${httpResult.data}`);
    this.logger.log(`updateOrbitDb is finished`);
  }

  async updateVersion(version: string) {
    this.logger.log(`updateVersion ${version} is started`);
    const httpResult = await this.authRequest('/Validator/setNodeVersion', { version }, this.getLoginDto());

    this.logger.verbose(`response: ${httpResult.data}`);
    this.logger.log(`updateVersion is finished`);
  }

  async uploadToApi(submissions: SubmissionEntity[]): Promise<SubmissionConfirmationResponse[]> {
    const requestBody = {
      confirmations: submissions.map(submission => {
        return {
          txHash: submission.txHash,
          signature: submission.signature,
          submissionId: submission.submissionId,
          chainId: submission.chainFrom,
        };
      }),
    } as SubmissionsConfirmationsRequestDTO;
    this.logger.log(`uploadToApi is started`);
    const httpResult = await this.authRequest('/SubmissionConfirmation/confirmations', requestBody, this.getLoginDto());

    this.logger.verbose(`response: ${httpResult.data}`);
    const result = httpResult.data as SubmissionsConfirmationsResponseDTO;
    this.logger.log(`uploadToApi is finished`);
    return result.confirmations;
  }

  async uploadStatistic(progressInfo: ProgressInfoDTO[]) {
    const requestBody = {
      progressInfo,
    } as ValidationProgressDTO;
    this.logger.log(`uploadStatisticToApi is started`);
    const httpResult = await this.authRequest('/Validator/updateProgress', requestBody, this.getLoginDto());

    this.logger.verbose(`response: ${httpResult.data}`);
    const result = httpResult.data as SubmissionsConfirmationsResponseDTO;
    this.logger.log(`uploadStatisticToApi is finished`);
    return result.confirmations;
  }

  async uploadConfirmNewAssetsToApi(asset: ConfirmNewAssetEntity): Promise<ConfrimNewAssetsResponseDTO> {
    const requestBody = {
      deployId: asset.deployId,
      signature: asset.signature,
      debridgeId: asset.debridgeId,
      nativeChainId: asset.nativeChainId,
      tokenAddress: asset.tokenAddress,
      tokenName: asset.name,
      tokenSymbol: asset.symbol,
      tokenDecimals: asset.decimals,
    } as ConfrimNewAssetsRequestDTO;
    this.logger.log(`uploadConfirmNewAssetsToApi is started`);
    const httpResult = await this.authRequest('/ConfirmNewAssets/confirm', requestBody, this.getLoginDto());

    this.logger.verbose(`response: ${httpResult.data}`);
    const result = httpResult.data as ConfrimNewAssetsResponseDTO;
    this.logger.log(`uploadConfirmNewAssetsToApi is finished`);
    return result;
  }

  async notifyIncorrectNonce(nonce: number, chainId: number, submissionId: string) {
    const requestBody = {
      nonce,
      chainId,
      submissionId,
    } as IncorrectNonceNotificationDTO;
    this.logger.log(`notifyIncorrectNonce is started; requestBody: ${JSON.stringify(requestBody)}`);
    const httpResult = await this.authRequest('/Validator/notifyIncorrectNonce', requestBody, this.getLoginDto());

    this.logger.verbose(`response: ${httpResult.data}`);
    this.logger.log(`notifyIncorrectNonce is finished`);
  }
}
