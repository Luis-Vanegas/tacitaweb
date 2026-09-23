// Espejo de core.frente y la vista v_resumen_frente
// (back/src/database/entities/frente.entity.ts y views/resumen-frente.view-entity.ts).
// Nota: los totales llegan como string desde Postgres (bigint/numeric agregados);
// se normalizan a number en frentesSlice antes de guardarlos en el store.
export interface ResumenFrenteApi {
  id: number
  nombre: string
  slug: string
  descripcion: string | null
  color: string
  icono: string
  orden: number
  totalProcesos: string
  precontractual: string
  enEjecucion: string
  terminados: string
  alertas: string
  proximosVencer: string
  personalActual: string
  personalPendiente: string
}

export interface ResumenFrente {
  id: number
  nombre: string
  slug: string
  descripcion: string | null
  color: string
  icono: string
  orden: number
  totalProcesos: number
  precontractual: number
  enEjecucion: number
  terminados: number
  alertas: number
  proximosVencer: number
  personalActual: number
  personalPendiente: number
}

export interface ConteoPorEstado {
  estadoId: number
  estado: string
  color: string
  total: number
}

export interface DependenciaInvolucrada {
  id: number
  nombre: string
}

// GET /frentes/:slug (FrentesService.obtenerDetalle)
export interface FrenteDetalle extends ResumenFrenteApi {
  conteoPorEstado: ConteoPorEstado[]
  dependenciasInvolucradas: DependenciaInvolucrada[]
}
