import type { FrenteDetalle, ResumenFrente, ResumenFrenteApi } from '@/shared/types'

// Postgres devuelve los agregados (count/sum) como string en JSON; se normalizan
// a number acá, en el borde entre la API y el store, para no repetir Number(...)
// en cada componente.
export function normalizarResumenFrente(api: ResumenFrenteApi): ResumenFrente {
  return {
    id: api.id,
    nombre: api.nombre,
    slug: api.slug,
    descripcion: api.descripcion,
    color: api.color,
    icono: api.icono,
    orden: api.orden,
    totalProcesos: Number(api.totalProcesos),
    totalActividades: Number(api.totalActividades),
    precontractual: Number(api.precontractual),
    enEjecucion: Number(api.enEjecucion),
    terminados: Number(api.terminados),
    alertas: Number(api.alertas),
    proximosVencer: Number(api.proximosVencer),
    personalActual: Number(api.personalActual),
    personalPendiente: Number(api.personalPendiente),
  }
}

export interface FrenteDetalleNormalizado extends Omit<ResumenFrente, never> {
  conteoPorEstado: FrenteDetalle['conteoPorEstado']
  dependenciasInvolucradas: FrenteDetalle['dependenciasInvolucradas']
}

export function normalizarFrenteDetalle(api: FrenteDetalle): FrenteDetalleNormalizado {
  return {
    ...normalizarResumenFrente(api),
    conteoPorEstado: api.conteoPorEstado,
    dependenciasInvolucradas: api.dependenciasInvolucradas,
  }
}
