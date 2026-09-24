import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
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

  // Tarjetas KPI "Alertas" / "Próximos a vencer" del detalle de frente:
  // misma definición que sus contadores en v_resumen_frente (003_core_views.sql).
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  esAlerta?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  proximosVencer?: boolean;

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
