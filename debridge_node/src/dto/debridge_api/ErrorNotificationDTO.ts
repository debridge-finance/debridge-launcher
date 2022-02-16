import { IsString } from 'class-validator';

export class ErrorNotificationDTO {
  @IsString()
  message: string;
}
