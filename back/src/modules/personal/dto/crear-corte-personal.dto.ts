import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class CrearCortePersonalDto {
  @IsInt()
  tipoPersonalId!: number;

  // Coincide con el CHECK de core.personal_corte.vigencia (between 2020 and 2100).
  @IsInt()
  @Min(2020)
  vigencia!: number;

  @IsInt()
  @Min(0)
  actual!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  pendiente?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  meta?: number;

  @IsOptional()
  @IsDateString()
  fechaFinal?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  linksSecop?: string[];
}
