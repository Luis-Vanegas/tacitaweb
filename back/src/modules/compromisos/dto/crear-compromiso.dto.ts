import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import type { EstadoCompromiso } from '@/database/entities/compromiso.entity';

export const ESTADOS_COMPROMISO: EstadoCompromiso[] = [
  'PENDIENTE',
  'EN_GESTION',
  'CUMPLIDO',
];

// Recorta espacios: el CHECK de core.compromiso exige btrim(descripcion) <> ''.
const recortar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CrearCompromisoDto {
  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  descripcion!: string;

  // Sin valor, la BD aplica su default 'PENDIENTE'. ValidateIf en vez de
  // IsOptional para que un null explícito no llegue al NOT NULL de la BD.
  @ValidateIf((o: CrearCompromisoDto) => o.estado !== undefined)
  @IsIn(ESTADOS_COMPROMISO)
  estado?: EstadoCompromiso;

  // Columnas text sin límite en la BD; el MaxLength solo evita payloads absurdos.
  @IsOptional()
  @Transform(recortar)
  @IsString()
  @MaxLength(500)
  responsable?: string | null;

  @IsOptional()
  @IsDateString()
  fechaRegistro?: string | null;

  @IsOptional()
  @IsDateString()
  fechaCumplimiento?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  avance?: string | null;
}
