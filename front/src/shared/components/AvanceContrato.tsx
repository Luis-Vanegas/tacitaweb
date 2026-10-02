import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { ProcesoDetalle } from '@/shared/types'

const pesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

const barra = { height: 6, borderRadius: 999, backgroundColor: 'rgba(0,35,61,0.08)' }

// "Cómo va" un contrato más allá del plazo: valor, ejecución financiera y el
// paso en que está cada ruta que le aplica (traslado, incorporación, directo,
// selección — columnas del Excel). Sin nada de eso cargado no dibuja nada.
export function AvanceContrato({ proceso }: { proceso: ProcesoDetalle }) {
  const { valorContrato: valor, ejecucionFinanciera: ejecucion, rutas } = proceso
  const pctEjecucion = valor && ejecucion !== null ? Math.round((100 * ejecucion) / valor) : null

  if (valor === null && rutas.length === 0) return null

  return (
    <Stack spacing={1.25}>
      {valor !== null && (
        <Box>
          <Stack direction="row" justifyContent="space-between" gap={1} flexWrap="wrap">
            <Typography variant="caption" color="text.secondary">
              Valor del contrato
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              {pesos.format(valor)}
            </Typography>
          </Stack>
          {pctEjecucion !== null && (
            <>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, pctEjecucion)}
                color="success"
                aria-label={`Ejecución financiera: ${pctEjecucion}%`}
                sx={{ ...barra, mt: 0.5 }}
              />
              <Typography variant="caption" color="text.secondary">
                Ejecutado {pesos.format(ejecucion!)} ({pctEjecucion}%)
              </Typography>
            </>
          )}
        </Box>
      )}

      {rutas.map((r) => {
        const completa = r.orden === r.total
        const detalle = [r.responsable, r.termino].filter(Boolean).join(' · ')
        return (
          <Box key={r.codigo}>
            <Stack direction="row" justifyContent="space-between" gap={1} flexWrap="wrap">
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                {r.ruta}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Paso {r.orden} de {r.total}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={(100 * r.orden) / r.total}
              color={completa ? 'success' : 'primary'}
              aria-label={`${r.ruta}: paso ${r.orden} de ${r.total}, ${r.paso}`}
              sx={{ ...barra, my: 0.5 }}
            />
            <Typography variant="caption" sx={{ display: 'block' }}>
              {completa ? `Completada · ${r.paso}` : r.paso}
            </Typography>
            {detalle && !completa && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Responsable: {detalle}
              </Typography>
            )}
          </Box>
        )
      })}
    </Stack>
  )
}
