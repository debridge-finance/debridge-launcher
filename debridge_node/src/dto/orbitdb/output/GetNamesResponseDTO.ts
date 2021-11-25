import { IsString } from 'class-validator';

export class GetNamesResponseDTO {
  @IsString()
  orbitLogsDb: string;

  @IsString()
  orbitDocsDb: string;
}
