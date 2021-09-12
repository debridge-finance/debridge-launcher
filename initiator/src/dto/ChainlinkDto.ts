import { Column, PrimaryColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class ChainlinkDto {
  @ApiProperty({
    required: true,
  })
  @IsNumber()
  chainId: number;

  @ApiProperty({
    required: true,
  })
  @IsString()
  cookie: string;

  @ApiProperty({
    required: true,
  })
  @IsString()
  eiChainlinkUrl: string;

  @ApiProperty({
    required: true,
  })
  @IsString()
  eiIcAccesskey: string;

  @ApiProperty({
    required: true,
  })
  @IsString()
  eiIcSecret: string;

  @ApiProperty({
    required: true,
  })
  @IsString()
  eiCiAccesskey: string;

  @ApiProperty({
    required: true,
  })
  @IsString()
  eiCiSecret: string;

  @ApiProperty({
    required: true,
  })
  @IsString()
  submitJobId: string;

  @ApiProperty({
    required: true,
  })
  @IsString()
  submitManyJobId: string;

  @ApiProperty({
    required: true,
  })
  @IsString()
  confirmNewAssetJobId: string;

  @ApiProperty({
    required: true,
  })
  @IsString()
  network: string;
}
