import { IsNumber, IsString } from 'class-validator';

export class IncorrectNonceNotificationDTO {
  @IsString()
  nonce: string;

  @IsNumber()
  chainId: number;

  @IsString()
  submissionId: string;
}
