import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CrearProcesoDto } from './crear-proceso.dto';

// Sin estadoId (eso va por PATCH /procesos/:id/estado, que además registra la
// nota de seguimiento) ni frentes (eso va por PUT/DELETE /frentes/:slug/procesos/:id).
export class ActualizarProcesoDto extends PartialType(
  OmitType(CrearProcesoDto, ['estadoId', 'frentes'] as const),
) {}
