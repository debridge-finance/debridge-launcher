import { IsArray, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class SubmissionConfirmationResponse {
  @IsString()
  id: string;

  @IsString()
  sumbmissionId: string;
}

export class SubmissionsConfirmationsResponseDTO {
  @IsArray()
  @Type(() => SubmissionConfirmationResponse)
  confirmations: SubmissionConfirmationResponse[];
}
