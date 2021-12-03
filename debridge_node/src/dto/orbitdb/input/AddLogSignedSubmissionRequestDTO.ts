import { IsNotEmpty, IsString } from 'class-validator';

export class AddLogSignedSubmissionRequestDTO {
  @IsNotEmpty()
  @IsString()
  submissionId: string;

  @IsNotEmpty()
  @IsString()
  signature: string;

  @IsNotEmpty()
  sendEvent: any;
}
