import { IsNotEmpty, IsString } from 'class-validator';
import {ApiProperty} from "@nestjs/swagger";

export class AddDocsSignedSubmissionRequestDTO {
  @ApiProperty({
    example: '123',
  })
  @IsNotEmpty()
  @IsString()
  submissionId: string;

  @ApiProperty({
    example: '123',
  })
  @IsNotEmpty()
  @IsString()
  signature: string;

  @ApiProperty({
    example: {},
  })
  @IsNotEmpty()
  sendEvent: any;
}
