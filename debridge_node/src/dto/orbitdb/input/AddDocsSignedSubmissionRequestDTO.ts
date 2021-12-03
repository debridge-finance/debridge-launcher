import { IsNotEmpty, IsString } from 'class-validator';

export class AddDocsSignedSubmissionRequestDTO {
  @IsNotEmpty()
  @IsString()
  submissionId: string;

  @IsNotEmpty()
  @IsString()
  signature: string;

  @IsNotEmpty()
  sendEvent: any;
}
