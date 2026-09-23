import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { PaginacionQueryDto } from '@/common/dto/paginacion-query.dto';
import { FaseProceso } from '@/database/entities/estado-proceso.entity';
import { TipoProceso } from '@/database/entities/proceso-contratacion.entity';

export class FiltroProcesosFrenteDto extends PaginacionQueryDto {
  // Código de core.estado_proceso (ej. "EN_EJECUCION"), no el id numérico.
  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsEnum(FaseProceso)
  fase?: FaseProceso;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  dependencia?: number;

  @IsOptional()
  @IsEnum(TipoProceso)
  tipo?: TipoProceso;

  @IsOptional()
  @IsString()
  q?: string;

  // "campo:asc" | "campo:desc". Campos permitidos: ver ordenPermitido en el service.
  @IsOptional()
  @IsString()
  orden?: string;
}
