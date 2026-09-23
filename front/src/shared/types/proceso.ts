// Espejo de core.v_proceso_detalle
// (back/src/database/entities/views/proceso-detalle.view-entity.ts).
import type { FaseProceso } from './catalogos'

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
