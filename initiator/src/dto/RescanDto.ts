import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class RescanDto {
  @ApiProperty({
    required: true,
  })
  @IsNumber()
  chainId: number;

  @ApiProperty({
    required: true,
  })
  @IsNumber()
  from: number;

  @ApiProperty({
    required: true,
  })
  @IsNumber()
  to: number;
}
