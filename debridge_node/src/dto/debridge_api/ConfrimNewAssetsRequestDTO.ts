import { IsNumber, IsString } from 'class-validator';

export class ConfrimNewAssetsRequestDTO {
  @IsString()
  deployId: string;

  @IsString()
  signature: string;

  @IsString()
  debridgeId: string;

  @IsNumber()
  nativeChainId: number;

  @IsString()
  tokenAddress: string;

  @IsString()
  tokenName: string;

  @IsString()
  tokenSymbol: string;

  @IsNumber()
  tokenDecimals: number;
}
