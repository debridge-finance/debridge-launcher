import { IsNumber, IsString } from 'class-validator';

export class IncorrectNonceNotificationDTO {
  @IsString()
  nonce: number;

  @IsNumber()
  chainId: number;

  @IsString()
  submissionId: string;
}
