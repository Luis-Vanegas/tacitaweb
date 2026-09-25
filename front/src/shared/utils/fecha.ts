import dayjs from 'dayjs'

// La API devuelve columnas `date` de Postgres como datetime completo
// (ej. "2026-09-23T05:00:00.000Z"): se formatea acá para no mostrar la hora/Z
// cruda en ningún lugar de la UI.
export function formatearFecha(fecha: string | null | undefined): string {
  return fecha ? dayjs(fecha).format('DD/MM/YYYY') : '—'
}
