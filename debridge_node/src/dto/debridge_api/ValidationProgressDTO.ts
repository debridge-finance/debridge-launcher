import { IsArray, IsNotEmpty, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class ProgressInfoDTO {
  @IsNumber()
  @IsNotEmpty()
  chainId: number;

  @IsNumber()
  @IsNotEmpty()
  lastBlock: number;
}

export class ValidationProgressDTO {
  @IsArray()
  @Type(() => ProgressInfoDTO)
  progressInfo: ProgressInfoDTO[];
}
