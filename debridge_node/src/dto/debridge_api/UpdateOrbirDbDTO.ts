import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateOrbirDbDTO {
  @IsString()
  @IsNotEmpty()
  orbitLogsDb: string;

  @IsString()
  @IsNotEmpty()
  orbitDocsDb: string;

  @IsString()
  @IsNotEmpty()
  nodeVersion: string;
}
