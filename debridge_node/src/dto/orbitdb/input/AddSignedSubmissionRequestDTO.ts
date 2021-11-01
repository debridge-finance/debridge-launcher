import { IsNotEmpty, IsString } from 'class-validator';

export class AddSignedSubmissionRequestDTO {
  @IsNotEmpty()
  @IsString()
  submissionId: string;

  @IsNotEmpty()
  @IsString()
  signature: string;

  @IsNotEmpty()
  sendEvent: any;
}
