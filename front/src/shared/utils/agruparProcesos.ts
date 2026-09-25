import type { ProcesoDetalle } from '@/shared/types'

export type GrupoActividad = [string, ProcesoDetalle[]]
export type SeccionCategoria = [string, GrupoActividad[]]

// Dos niveles: categoría temática (Vial, Espacio público...) -> actividad ->
// sus procesos. La categoría viene de core.categoria_actividad (clasificación
// de negocio real, no inferida por texto) — ver v_proceso_detalle.
export function agruparPorCategoriaYActividad(items: ProcesoDetalle[]): Map<string, Map<string, ProcesoDetalle[]>> {
  const porCategoria = new Map<string, Map<string, ProcesoDetalle[]>>()
  for (const item of items) {
    const actividades = porCategoria.get(item.categoriaActividad) ?? new Map<string, ProcesoDetalle[]>()
    const grupo = actividades.get(item.actividad) ?? []
    grupo.push(item)
    actividades.set(item.actividad, grupo)
    porCategoria.set(item.categoriaActividad, actividades)
  }
  return porCategoria
}

// Sin fecha de terminación al final (no hay plazo que vigilar); entre los que
// sí tienen, el que vence más pronto primero (vencido = días negativos, va
// antes que uno con margen todavía).
export function ordenarPorVencimiento(a: ProcesoDetalle, b: ProcesoDetalle): number {
  if (a.diasRestantes === null && b.diasRestantes === null) return 0
  if (a.diasRestantes === null) return 1
  if (b.diasRestantes === null) return -1
  return a.diasRestantes - b.diasRestantes
}

// Arma las secciones (categoría -> actividades -> procesos ordenados) en el
// orden real del catálogo (Vial, Espacio público...), no alfabético.
export function construirSecciones(
  items: ProcesoDetalle[],
  ordenCategoria: Map<string, number>,
): SeccionCategoria[] {
  const porCategoria = agruparPorCategoriaYActividad(items)
  return [...porCategoria.entries()]
    .map<SeccionCategoria>(([categoria, actividades]) => [
      categoria,
      [...actividades.entries()].map<GrupoActividad>(([actividad, procesos]) => [
        actividad,
        [...procesos].sort(ordenarPorVencimiento),
      ]),
    ])
    .sort(([a], [b]) => (ordenCategoria.get(a) ?? 99) - (ordenCategoria.get(b) ?? 99))
}
