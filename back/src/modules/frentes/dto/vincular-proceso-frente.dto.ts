import { IsOptional, IsString } from 'class-validator';

export class VincularProcesoFrenteDto {
  @IsOptional()
  @IsString()
  nota?: string;
}
