// Espejo de core.seguimiento (back/src/database/entities/seguimiento.entity.ts).
// El service carga las relaciones `autor` y `estado` (find({relations:['autor','estado']})),
// así que vienen anidadas además del id crudo — el campo es `autorId`, no `usuarioId`
// (la entidad usa `autor_id` como columna real).
export interface Seguimiento {
  id: string
  procesoId: string
  fecha: string
  nota: string
  estadoId: number | null
  autorId: string | null
  autor: { id: string; nombre: string; email: string } | null
  estado: { id: number; nombre: string; color: string } | null
  createdAt: string
}

// Body de POST /procesos/:procesoId/seguimiento.
export interface CrearSeguimientoPayload {
  nota: string
  fecha?: string
  estadoId?: number
}
