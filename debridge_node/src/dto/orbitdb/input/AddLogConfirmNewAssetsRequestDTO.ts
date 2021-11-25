import { IsNotEmpty, IsString } from 'class-validator';

export class AddLogConfirmNewAssetsRequestDTO {
  @IsNotEmpty()
  @IsString()
  deployId: string;

  @IsNotEmpty()
  @IsString()
  signature: string;

  @IsNotEmpty()
  sendEvent: any;
}
