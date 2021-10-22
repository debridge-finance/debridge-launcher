import { IsArray, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class SubmissionConfirmationRequest {
  @IsString()
  signature: string;

  @IsString()
  txHash: string;

  @IsNumber()
  chainId: number;

  @IsString()
  submissionId: string;
}

export class SubmissionsConfirmationsRequestDTO {
  @IsArray()
  @Type(() => SubmissionConfirmationRequest)
  confirmations: SubmissionConfirmationRequest[];
}
