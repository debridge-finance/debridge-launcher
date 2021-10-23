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
import { lastValueFrom } from 'rxjs';

import keystore from '../../keystore.json';
import { ProgressInfoDTO, ValidationProgressDTO } from '../dto/debridge_api/ValidationProgressDTO';
import { createProxy } from '../utils/create.proxy';

@Injectable()
export class DebrdigeApiService {
  private readonly logger = new Logger(DebrdigeApiService.name);
  private account: Account;
  private web3: Web3;
  private accessToken: string;

  constructor(private readonly httpService: HttpService, private readonly configService: ConfigService) {
    this.web3 = createProxy(new Web3(), { logger: this.logger });
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

  private async request<T>(api: string, requestBody: T, headers: any) {
    const url = `${this.configService.get('API_BASE_URL')}${api}`;
    let httpResult;
    try {
      httpResult = await lastValueFrom(
        this.httpService.post(`${this.configService.get('API_BASE_URL')}${api}`, requestBody, {
          headers,
        }),
      );
    } catch (e) {
      const response = e.response;
      this.logger.error(
        `Error request to ${url} (status: ${response.status}, message: ${response.statusText}, data: ${JSON.stringify(response.data)})`,
      );
      throw e;
    }
    return httpResult;
  }

  private async authRequest<T>(api: string, requestBody: T) {
    if (!this.accessToken) {
      this.accessToken = await this.getAuthToken();
    }
    let httpResult;
    try {
      httpResult = await this.request(api, requestBody, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });
    } catch (e) {
      const response = e.response;
      if (response.status === 401) {
        this.accessToken = await this.getAuthToken();
        httpResult = await this.request(api, requestBody, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        });
      }
    }
    return httpResult;
  }

  private async getAuthToken() {
    this.logger.debug('Getting auth token is started');
    const url = `${this.configService.get('API_BASE_URL')}/Account/authenticate`;
    const timeStamp = Math.floor(new Date().getTime() / 1000);
    const requestBody = {
      ethAddress: this.account.address,
      signature: this.account.sign(`${timeStamp}`).signature,
      timeStamp,
      killOtherSessions: false,
    };
    let accessToken = '';
    try {
      const httpResult = await lastValueFrom(this.httpService.post(url, requestBody));
      accessToken = httpResult.data.accessToken;
      this.logger.debug('Getting auth token is finished');
    } catch (e) {
      const response = e.response;
      this.logger.error(
        `Error in getting auth token from ${url} (status: ${response.status}, message: ${response.statusText}, data: ${JSON.stringify(
          response.data,
        )})`,
      );
      throw new Error(`Error in getting auth token`);
    }
    return accessToken;
  }
}
