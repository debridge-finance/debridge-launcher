import { Injectable, Logger } from '@nestjs/common';
import { SubmissionEntity } from 'src/entities/SubmissionEntity';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { SubmissionsConfirmationsRequestDTO } from '../dto/debridge_api/SubmissionsConfirmationsRequestDTO';
import { SubmissionConfirmationResponse, SubmissionsConfirmationsResponseDTO } from '../dto/debridge_api/SubmissionsConfirmationsResponseDTO';
import { ConfirmNewAssetEntity } from 'src/entities/ConfirmNewAssetEntity';
import { ConfrimNewAssetsRequestDTO } from 'src/dto/debridge_api/ConfrimNewAssetsRequestDTO';
import { ConfrimNewAssetsResponseDTO } from 'src/dto/debridge_api/ConfrimNewAssetsResponseDTO';

@Injectable()
export class DebrdigeApiService {
  private readonly logger = new Logger(DebrdigeApiService.name);

  constructor(private readonly httpService: HttpService, private readonly configService: ConfigService) { }

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
      accessKey: this.configService.get('DEBRIDGE_API_ACCESS_KEY')
    } as SubmissionsConfirmationsRequestDTO;
    this.logger.log(`uploadToApi is started`);
    const httpResult = await this.httpService
      .post(`${this.configService.get('API_BASE_URL')}/SubmissionConfirmation/confirmations`, requestBody)
      .toPromise();

    this.logger.verbose(`response: ${httpResult.data}`);
    const result = httpResult.data as SubmissionsConfirmationsResponseDTO;
    this.logger.log(`uploadToApi is finished`);
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
      accessKey: this.configService.get('DEBRIDGE_API_ACCESS_KEY')
    } as ConfrimNewAssetsRequestDTO;
    this.logger.log(`uploadConfirmNewAssetsToApi is started`);
    const httpResult = await this.httpService
      .post(`${this.configService.get('API_BASE_URL')}/ConfirmNewAssets/confirm`, requestBody)
      .toPromise();

    this.logger.verbose(`response: ${httpResult.data}`);
    const result = httpResult.data as ConfrimNewAssetsResponseDTO;
    this.logger.log(`uploadConfirmNewAssetsToApi is finished`);
    return result;
  }
}
