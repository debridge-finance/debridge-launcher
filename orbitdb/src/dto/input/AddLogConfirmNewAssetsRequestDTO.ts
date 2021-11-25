import { IsNotEmpty, IsString } from 'class-validator';
import {ApiProperty} from "@nestjs/swagger";

export class AddLogConfirmNewAssetsRequestDTO {
  @ApiProperty({
    example: '123',
  })
  @IsNotEmpty()
  @IsString()
  deployId: string;

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
