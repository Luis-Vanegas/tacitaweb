import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { TipoProceso } from '@/database/entities/proceso-contratacion.entity';

// Regex de core.proceso_contratacion (001_core_schema.sql): numero_contrato /
// numero_necesidad solo dígitos, link_secop debe empezar con https://.
const SOLO_DIGITOS = /^[0-9]+$/;
const LINK_HTTPS = /^https:\/\//i;

export class CrearProcesoDto {
  @IsInt()
  actividadId!: number;

  @IsInt()
  estadoId!: number;

  @IsOptional()
  @IsInt()
  contratistaId?: number;

  @IsOptional()
  @IsEnum(TipoProceso)
  tipo?: TipoProceso;

  // bigint como string (JS no representa bigint con seguridad en JSON).
  @IsOptional()
  @IsNumberString()
  procesoSupervisadoId?: string;

  @IsOptional()
  @IsString()
  @Matches(SOLO_DIGITOS, {
    message: 'numeroContrato debe contener solo dígitos',
  })
  numeroContrato?: string;

  @IsOptional()
  @IsString()
  @Matches(SOLO_DIGITOS, {
    message: 'numeroNecesidad debe contener solo dígitos',
  })
  numeroNecesidad?: string;

  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaTerminacion?: string;

  @IsOptional()
  @IsString()
  @Matches(LINK_HTTPS, { message: 'linkSecop debe ser una URL https' })
  linkSecop?: string;

  @IsOptional()
  @IsString()
  observacion?: string;

  // ids de core.frente a los que se vincula el proceso recién creado.
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  frentes?: number[];
}
