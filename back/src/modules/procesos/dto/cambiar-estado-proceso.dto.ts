import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CambiarEstadoProcesoDto {
  @IsInt()
  estadoId!: number;

  // Obligatoria: cada cambio de estado deja una nota en la bitácora.
  @IsString()
  @MinLength(1)
  nota!: string;

  @IsOptional()
  @IsDateString()
  fecha?: string;
}
