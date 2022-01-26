import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateOrbitDbDTO {
  @IsString()
  @IsNotEmpty()
  submissionAddress: string;

  @IsString()
  @IsNotEmpty()
  assetAddress: string;

  @IsString()
  @IsNotEmpty()
  nodeVersion: string;
}
