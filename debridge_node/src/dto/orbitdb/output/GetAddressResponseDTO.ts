import { IsString } from 'class-validator';

export class GetAddressResponseDTO {
  @IsString()
  address: string;
}
