import { IsArray, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class SubmissionConfirmationResponse {
  @IsString()
  id: string;

  @IsString()
  submissionId: string;
}

export class SubmissionsConfirmationsResponseDTO {
  @IsArray()
  @Type(() => SubmissionConfirmationResponse)
  confirmations: SubmissionConfirmationResponse[];
}
