import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import type { ConteoPorEstado } from '@/shared/types'

interface ProcesoStepperProps {
  conteo: ConteoPorEstado[]
  estadoIdSeleccionado: number | null
  onSeleccionar: (estadoId: number | null) => void
}

// Stepper horizontal con conteo por estado. Clic selecciona/deselecciona
// (toggle) y filtra ProcesosTab a través del estado que mantiene FrenteDetallePage.
export function ProcesoStepper({
  conteo,
  estadoIdSeleccionado,
  onSeleccionar,
}: ProcesoStepperProps) {
  if (conteo.length === 0) return null

  return (
    <Box
      role="group"
      aria-label="Filtrar procesos por estado"
      sx={{
        display: 'flex',
        gap: 1.5,
        overflowX: 'auto',
        pb: 1,
      }}
    >
      {conteo.map((item) => {
        const activo = estadoIdSeleccionado === item.estadoId
        return (
          <ButtonBase
            key={item.estadoId}
            onClick={() => onSeleccionar(activo ? null : item.estadoId)}
            aria-pressed={activo}
            aria-label={`${item.estado}: ${item.total} procesos`}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 0.25,
              px: 2,
              py: 1,
              minWidth: 128,
              borderRadius: 3,
              border: `2px solid ${activo ? item.color : alpha(item.color, 0.25)}`,
              backgroundColor: activo ? alpha(item.color, 0.14) : 'transparent',
              flexShrink: 0,
              textAlign: 'left',
            }}
          >
            <Typography variant="h6" component="span" sx={{ color: item.color, fontWeight: 700 }}>
              {item.total}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
              {item.estado}
            </Typography>
          </ButtonBase>
        )
      })}
    </Box>
  )
}
