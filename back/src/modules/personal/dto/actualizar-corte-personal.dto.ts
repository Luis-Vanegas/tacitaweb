import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class ActualizarCortePersonalDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  actual?: number;

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
