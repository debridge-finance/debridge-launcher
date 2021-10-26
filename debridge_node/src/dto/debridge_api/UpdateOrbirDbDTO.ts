import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateOrbirDbDTO {
  @IsString()
  @IsNotEmpty()
  orbitLogsDb: number;

  @IsString()
  @IsNotEmpty()
  orbitDocsDb: number;
}
