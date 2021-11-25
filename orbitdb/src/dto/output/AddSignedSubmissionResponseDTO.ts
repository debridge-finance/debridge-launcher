import { IsString } from 'class-validator';

export class AddSignedSubmissionResponseDTO {
  @IsString()
  logHash: string;

  @IsString()
  docsHash: string;
}
