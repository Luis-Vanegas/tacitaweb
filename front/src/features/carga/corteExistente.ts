import * as yup from 'yup'
import dayjs from 'dayjs'
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

const ENTERO = /^[0-9]+$/

// Reglas de los valores de un corte, compartidas por CortePersonalForm y
// EditarCorteDialog (mismas que ActualizarCortePersonalDto): un solo lugar
// para que ambos formularios no se desalineen.
export const camposCorte = {
  actual: yup.string().default('').required('Obligatorio.').matches(ENTERO, 'Entero ≥ 0.'),
  pendiente: yup.string().default('').matches(ENTERO, { message: 'Entero ≥ 0.', excludeEmptyString: true }),
  meta: yup.string().default('').matches(ENTERO, { message: 'Entero ≥ 0.', excludeEmptyString: true }),
  fechaFinal: yup.string().default(''),
  observaciones: yup.string().default(''),
}

export const esquemaCorte: yup.ObjectSchema<CorteFormValues> = yup.object(camposCorte)

export const VALORES_CORTE_VACIOS: CorteFormValues = {
  actual: '',
  pendiente: '',
  meta: '',
  fechaFinal: '',
  observaciones: '',
}

// Precarga desde la fila cruda de personal_corte (no desde v_personal_vigente,
// que calcula `pendiente`): así se edita lo que realmente está guardado.
export function valoresDesdeCorte(corte: PersonalCorte): CorteFormValues {
  return {
    actual: String(corte.actual),
    pendiente: corte.pendiente === null ? '' : String(corte.pendiente),
    meta: corte.meta === null ? '' : String(corte.meta),
    fechaFinal: corte.fechaFinal ? dayjs(corte.fechaFinal).format('YYYY-MM-DD') : '',
    observaciones: corte.observaciones ?? '',
  }
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
