// Espejo de core.v_proceso_detalle
// (back/src/database/entities/views/proceso-detalle.view-entity.ts).
import type { FaseProceso } from './catalogos'
import type { Seguimiento } from './seguimiento'

export type TipoProceso = 'PRINCIPAL' | 'INTERVENTORIA'

export interface ProcesoDetalle {
  id: string
  tipo: TipoProceso
  numeroContrato: string | null
  numeroNecesidad: string | null
  fechaInicio: string | null
  fechaTerminacion: string | null
  linkSecop: string | null
  observacion: string | null
  procesoSupervisadoId: string | null
  actividadId: number
  actividad: string
  dependenciaId: number
  dependencia: string
  proyectoId: number
  proyecto: string
  estadoId: number
  estadoCodigo: string
  estado: string
  fase: FaseProceso
  esAlerta: boolean
  estadoColor: string
  contratistaId: number | null
  contratista: string | null
  diasRestantes: number | null
  pctPlazo: number | null
  ultimaNotaFecha: string | null
  ultimaNota: string | null
  updatedAt: string
  categoriaActividadId: number
  categoriaActividad: string
}

// Query params de GET /frentes/:slug/procesos
// (back/src/modules/frentes/dto/filtro-procesos-frente.dto.ts).
export interface FiltroProcesosFrente {
  page?: number
  pageSize?: number
  estado?: string
  fase?: FaseProceso
  dependencia?: number
  tipo?: TipoProceso
  q?: string
  orden?: string
}

// Frente vinculado al proceso, tal como lo devuelve GET /procesos/:id.
export interface ProcesoFrenteVinculado {
  id: number
  nombre: string
  slug: string
  criterio: string | null
}

// GET /procesos/:id (ProcesosService.obtenerDetalle): el detalle completo
// más bitácora, interventorías vinculadas y frentes.
export interface ProcesoFicha extends ProcesoDetalle {
  bitacora: Seguimiento[]
  interventorias: ProcesoDetalle[]
  frentes: ProcesoFrenteVinculado[]
}

// Body de POST /procesos (CrearProcesoDto).
export interface CrearProcesoPayload {
  actividadId: number
  estadoId: number
  contratistaId?: number
  tipo?: TipoProceso
  procesoSupervisadoId?: string
  numeroContrato?: string
  numeroNecesidad?: string
  fechaInicio?: string
  fechaTerminacion?: string
  linkSecop?: string
  observacion?: string
  frentes?: number[]
}

// Body de PATCH /procesos/:id (ActualizarProcesoDto): igual que crear pero
// sin estadoId ni frentes (van por PATCH /procesos/:id/estado y los endpoints
// de vínculo frente↔proceso), todo opcional.
export type ActualizarProcesoPayload = Partial<
  Omit<CrearProcesoPayload, 'estadoId' | 'frentes'>
>

// Body de PATCH /procesos/:id/estado.
export interface CambiarEstadoPayload {
  estadoId: number
  nota: string
  fecha?: string
}
