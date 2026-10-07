import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import type { EstadoCompromiso } from '@/database/entities/compromiso.entity';
import { CrearCompromisoDto, ESTADOS_COMPROMISO } from './crear-compromiso.dto';

// descripcion y estado son NOT NULL en la BD: PartialType les pondría
// @IsOptional (que también deja pasar null). Con ValidateIf solo se saltan
// cuando no vienen; un null explícito se rechaza aquí y no como 500 de la BD.
// Los demás campos sí aceptan null para poder vaciarlos.
export class ActualizarCompromisoDto extends PartialType(
  OmitType(CrearCompromisoDto, ['descripcion', 'estado'] as const),
) {
  @ValidateIf((o: ActualizarCompromisoDto) => o.descripcion !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  descripcion?: string;

  @ValidateIf((o: ActualizarCompromisoDto) => o.estado !== undefined)
  @IsIn(ESTADOS_COMPROMISO)
  estado?: EstadoCompromiso;
}
