import * as yup from 'yup'
import dayjs from 'dayjs'
import { tokens } from '@/app/theme/tokens'
import type { ActualizarCompromisoPayload, Compromiso, CrearCompromisoPayload, EstadoCompromiso } from '@/shared/types'

// Los estados de compromiso no viven en estado_proceso (son de otra tabla):
// su nombre y color se fijan acá con los tokens semánticos de la app.
export const ESTADOS_COMPROMISO: Record<EstadoCompromiso, { nombre: string; color: string }> = {
  PENDIENTE: { nombre: 'Pendiente', color: '#FD7E14' },
  EN_GESTION: { nombre: 'En gestión', color: tokens.color.info },
  CUMPLIDO: { nombre: 'Cumplido', color: tokens.color.success },
}

// Vencido = sin cumplir y con fecha de cumplimiento anterior a hoy (por día,
// no por hora: lo que vence hoy aún está a tiempo). Una sola regla para el
// panel del mapa y la página, así los dos cuentan lo mismo.
export function esVencido(c: Pick<Compromiso, 'estado' | 'fechaCumplimiento'>, hoy = dayjs()): boolean {
  return c.estado !== 'CUMPLIDO' && c.fechaCumplimiento !== null && dayjs(c.fechaCumplimiento).isBefore(hoy, 'day')
}

// Orden de atención: vencidos primero, luego por fecha de cumplimiento (sin
// fecha al final) y los cumplidos al fondo, porque ya no piden acción.
export function ordenarCompromisos(items: Compromiso[], hoy = dayjs()): Compromiso[] {
  const grupo = (c: Compromiso) => (c.estado === 'CUMPLIDO' ? 2 : esVencido(c, hoy) ? 0 : 1)
  const fecha = (c: Compromiso) => (c.fechaCumplimiento ? dayjs(c.fechaCumplimiento).valueOf() : Number.POSITIVE_INFINITY)
  return [...items].sort((a, b) => grupo(a) - grupo(b) || fecha(a) - fecha(b) || a.id - b.id)
}

export interface CompromisoFormValues {
  descripcion: string
  estado: EstadoCompromiso
  responsable: string
  fechaRegistro: string
  fechaCumplimiento: string
  avance: string
}

// Mismos límites que CrearCompromisoDto (back/src/modules/compromisos/dto).
export const esquemaCompromiso: yup.ObjectSchema<CompromisoFormValues> = yup.object({
  descripcion: yup
    .string()
    .default('')
    .trim()
    .required('La descripción es obligatoria.')
    .max(2000, 'Máximo 2000 caracteres.'),
  estado: yup
    .mixed<EstadoCompromiso>()
    .oneOf(Object.keys(ESTADOS_COMPROMISO) as EstadoCompromiso[])
    .required()
    .default('PENDIENTE'),
  responsable: yup.string().default('').max(500, 'Máximo 500 caracteres.'),
  fechaRegistro: yup.string().default(''),
  fechaCumplimiento: yup.string().default(''),
  avance: yup.string().default('').max(2000, 'Máximo 2000 caracteres.'),
})

function fechaInput(fecha: string | null): string {
  return fecha ? dayjs(fecha).format('YYYY-MM-DD') : ''
}

export function valoresDesdeCompromiso(compromiso: Compromiso | null): CompromisoFormValues {
  return {
    descripcion: compromiso?.descripcion ?? '',
    estado: compromiso?.estado ?? 'PENDIENTE',
    responsable: compromiso?.responsable ?? '',
    fechaRegistro: fechaInput(compromiso?.fechaRegistro ?? null),
    fechaCumplimiento: fechaInput(compromiso?.fechaCumplimiento ?? null),
    avance: compromiso?.avance ?? '',
  }
}

// Al crear, un campo vacío simplemente no se envía. Al editar se manda null
// para poder vaciarlo (el PATCH acepta null salvo descripcion/estado).
export function payloadCompromiso(valores: CompromisoFormValues, editando: false): CrearCompromisoPayload
export function payloadCompromiso(valores: CompromisoFormValues, editando: true): ActualizarCompromisoPayload
export function payloadCompromiso(
  valores: CompromisoFormValues,
  editando: boolean,
): CrearCompromisoPayload | ActualizarCompromisoPayload {
  const opcional = (v: string) => {
    const limpio = v.trim()
    return limpio === '' ? (editando ? null : undefined) : limpio
  }
  const payload: CrearCompromisoPayload = {
    descripcion: valores.descripcion.trim(),
    estado: valores.estado,
    responsable: opcional(valores.responsable),
    fechaRegistro: opcional(valores.fechaRegistro),
    fechaCumplimiento: opcional(valores.fechaCumplimiento),
    avance: opcional(valores.avance),
  }
  // Quita los undefined para que el body no lleve claves vacías.
  return Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined)) as CrearCompromisoPayload
}
