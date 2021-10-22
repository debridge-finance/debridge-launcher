import { Injectable, Logger } from '@nestjs/common';
import { SubmissionEntity } from 'src/entities/SubmissionEntity';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { SubmissionsConfirmationsRequestDTO } from '../dto/debridge_api/SubmissionsConfirmationsRequestDTO';
import { SubmissionConfirmationResponse, SubmissionsConfirmationsResponseDTO } from '../dto/debridge_api/SubmissionsConfirmationsResponseDTO';
import { ConfirmNewAssetEntity } from 'src/entities/ConfirmNewAssetEntity';
import { ConfrimNewAssetsRequestDTO } from 'src/dto/debridge_api/ConfrimNewAssetsRequestDTO';
import { ConfrimNewAssetsResponseDTO } from 'src/dto/debridge_api/ConfrimNewAssetsResponseDTO';
import { Account } from 'web3-core';
import Web3 from 'web3';

import keystore from '../../keystore.json';
import { ProgressInfoDTO, ValidationProgressDTO } from '../dto/debridge_api/ValidationProgressDTO';

@Injectable()
export class DebrdigeApiService {
  private readonly logger = new Logger(DebrdigeApiService.name);
  private account: Account;
  private web3: Web3;
  private accessToken: string;


  constructor(private readonly httpService: HttpService, private readonly configService: ConfigService) {
    this.web3 = new Web3();
    this.account = this.web3.eth.accounts.decrypt(keystore, process.env.KEYSTORE_PASSWORD);
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
    const httpResult = await this.authRequest('/SubmissionConfirmation/confirmations', requestBody);

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
    const httpResult = await this.authRequest('/Validator/updateProgress', requestBody);

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
    const httpResult = await this.authRequest('/ConfirmNewAssets/confirm', requestBody);


    this.logger.verbose(`response: ${httpResult.data}`);
    const result = httpResult.data as ConfrimNewAssetsResponseDTO;
    this.logger.log(`uploadConfirmNewAssetsToApi is finished`);
    return result;
  }

  private async authRequest<T>(api: string, requestBody: T) {
    if (!this.accessToken) {
      this.accessToken = await this.getAuthToken();
    }
    let httpResult = await this.httpService
      .post(`${this.configService.get('API_BASE_URL')}${api}`, requestBody, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      })
      .toPromise();
    if (httpResult.status === 401) {
      this.accessToken = await this.getAuthToken();
      httpResult = await this.httpService
        .post(`${this.configService.get('API_BASE_URL')}${api}`, requestBody, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        })
        .toPromise();
    }
    return httpResult;
  }

  private async getAuthToken() {
    const timeStamp = Math.floor(new Date().getTime() / 1000);
    const requestBody = {
      ethAddress: this.account.address,
      signature: this.account.sign(`${timeStamp}`),
      timeStamp,
      killOtherSessions: false,
    };
    const httpResult = await this.httpService.post(`${this.configService.get('API_BASE_URL')}/Account/authenticate`, requestBody).toPromise();
    return httpResult.data.accessToken;
  }
}
