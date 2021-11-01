import { IsNotEmpty, IsString } from 'class-validator';

export class AddDocsConfirmNewAssetsRequestDTO {
  @IsNotEmpty()
  @IsString()
  deployId: string;

  @IsNotEmpty()
  @IsString()
  signature: string;

  @IsNotEmpty()
  sendEvent: any;
}
