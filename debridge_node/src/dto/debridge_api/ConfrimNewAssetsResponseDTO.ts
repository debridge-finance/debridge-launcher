import { IsString } from 'class-validator';

export class ConfrimNewAssetsResponseDTO {
  @IsString()
  deployId: string;

  @IsString()
  registrationId: string;
}
