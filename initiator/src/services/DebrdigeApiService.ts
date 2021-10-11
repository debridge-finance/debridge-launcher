import { Injectable, Logger } from '@nestjs/common';
import { SubmissionEntity } from 'src/entities/SubmissionEntity';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { SubmissionsConfirmationsRequestDTO } from '../dto/debridge_api/SubmissionsConfirmationsRequestDTO';
import { SubmissionConfirmationResponse, SubmissionsConfirmationsResponseDTO } from '../dto/debridge_api/SubmissionsConfirmationsResponseDTO';

@Injectable()
export class DebrdigeApiService {
  private readonly logger = new Logger(DebrdigeApiService.name);

  constructor(private readonly httpService: HttpService, private readonly configService: ConfigService) {}

  async uploadToApi(submissions: SubmissionEntity[]): Promise<SubmissionConfirmationResponse[]> {
    const requestBody = {
      confirmations: submissions.map(submission => {
        return {
          txHash: submission.txHash,
          signature: submission.signature,
          sumbmissionId: submission.submissionId,
          chainId: submission.chainFrom,
        };
      }),
    } as SubmissionsConfirmationsRequestDTO;
    this.logger.log(`uploadToApi is started`);
    const httpResult = await this.httpService
      .post(`${this.configService.get('API_BASE_URL')}/SubmissionConfirmation/confirmations`, requestBody)
      .toPromise();
    const result = httpResult.data as SubmissionsConfirmationsResponseDTO;
    this.logger.log(`uploadToApi is finished`);
    return result.confirmations;
  }
}
