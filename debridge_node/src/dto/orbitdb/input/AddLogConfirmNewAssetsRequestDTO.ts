import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class AddLogConfirmNewAssetsRequestDTO {
  @IsNotEmpty()
  @IsString()
  deployId: string;

  @IsNotEmpty()
  @IsString()
  signature: string;

  @IsNotEmpty()
  @IsString()
  tokenAddress: string

  @IsNotEmpty()
  @IsString()
  name: string

  @IsNotEmpty()
  @IsString()
  symbol: string

  @IsNotEmpty()
  @IsNumber()
  nativeChainId: number

  @IsNotEmpty()
  @IsNumber()
  decimals: number
}
