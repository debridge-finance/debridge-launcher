import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class AddSignedSubmissionRequestDTO {
  @IsNotEmpty()
  @IsString()
  submissionId: string;

  @IsNotEmpty()
  @IsString()
  signature: string;

  @IsNotEmpty()
  @IsString()
  debridgeId: string;

  @IsNotEmpty()
  @IsString()
  txHash: string;

  @IsNotEmpty()
  @IsNumber()
  chainFrom: number;

  @IsNotEmpty()
  @IsNumber()
  chainTo: number;

  @IsNotEmpty()
  @IsString()
  amount: string;

  @IsNotEmpty()
  @IsString()
  receiverAddr: string;
}
