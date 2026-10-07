import type { ActualizarCortePayload, CrearCortePayload, PersonalCorte } from '@/shared/types'

// core.personal_corte es único por (tipo_personal, vigencia): si ya hay un
// corte para esa pareja, el formulario lo edita (PATCH) en vez de intentar
// crear uno duplicado (POST), que el backend rechazaría.
export function buscarCorte(
  historico: PersonalCorte[],
  tipoPersonalId: number | null,
  vigencia: number,
): PersonalCorte | null {
  if (tipoPersonalId === null || !Number.isInteger(vigencia)) return null
  return historico.find((c) => c.tipoPersonalId === tipoPersonalId && c.vigencia === vigencia) ?? null
}

// Valores del formulario (strings de los TextField) ya validados por yup.
export interface CorteFormValues {
  actual: string
  pendiente: string
  meta: string
  fechaFinal: string
  observaciones: string
}

export function payloadCorte(valores: CorteFormValues): ActualizarCortePayload
export function payloadCorte(
  valores: CorteFormValues,
  clave: Pick<CrearCortePayload, 'tipoPersonalId' | 'vigencia'>,
): CrearCortePayload
export function payloadCorte(
  valores: CorteFormValues,
  clave?: Pick<CrearCortePayload, 'tipoPersonalId' | 'vigencia'>,
): CrearCortePayload | ActualizarCortePayload {
  const observaciones = valores.observaciones.trim()
  // Vacío = no enviar (undefined), así el PATCH no pisa con null lo que ya hay.
  const opcionales: ActualizarCortePayload = {
    actual: Number(valores.actual),
    ...(valores.pendiente !== '' && { pendiente: Number(valores.pendiente) }),
    ...(valores.meta !== '' && { meta: Number(valores.meta) }),
    ...(valores.fechaFinal && { fechaFinal: valores.fechaFinal }),
    ...(observaciones && { observaciones }),
  }
  return clave ? { ...clave, actual: Number(valores.actual), ...opcionales } : opcionales
}
