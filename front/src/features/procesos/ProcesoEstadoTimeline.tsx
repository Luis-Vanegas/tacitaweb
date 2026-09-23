import Box from '@mui/material/Box'
import Stepper from '@mui/material/Stepper'
import Step from '@mui/material/Step'
import StepButton from '@mui/material/StepButton'
import StepLabel from '@mui/material/StepLabel'
import Typography from '@mui/material/Typography'
import type { EstadoProceso } from '@/shared/types'

interface ProcesoEstadoTimelineProps {
  estados: EstadoProceso[]
  estadoActualId: number
  puedeEditar: boolean
  onSeleccionarEstado: (estado: EstadoProceso) => void
}

function EstadoStepIcon({ color, actual }: { color: string; actual: boolean }) {
  return (
    <Box
      aria-hidden="true"
      sx={{
        width: 16,
        height: 16,
        borderRadius: '50%',
        backgroundColor: actual ? color : 'transparent',
        border: `2px solid ${color}`,
        boxSizing: 'border-box',
      }}
    />
  )
}

// Línea de tiempo VERTICAL de estado_proceso (ordenada por `orden`), distinta
// del ProcesoStepper HORIZONTAL de FrenteDetallePage (ese filtra la tabla de
// procesos; este vive en la ficha y dispara un cambio de estado real). Los
// colores salen de estado_proceso.color (API), igual que EstadoChip.
export function ProcesoEstadoTimeline({
  estados,
  estadoActualId,
  puedeEditar,
  onSeleccionarEstado,
}: ProcesoEstadoTimelineProps) {
  const ordenados = [...estados].sort((a, b) => a.orden - b.orden)
  const indiceActual = ordenados.findIndex((e) => e.id === estadoActualId)

  return (
    <Stepper activeStep={indiceActual} orientation="vertical" nonLinear>
      {ordenados.map((estadoItem) => {
        const esActual = estadoItem.id === estadoActualId
        const icono = <EstadoStepIcon color={estadoItem.color} actual={esActual} />
        const opcional = estadoItem.esAlerta ? (
          <Typography variant="caption" color="error">
            Alerta
          </Typography>
        ) : undefined
        const contenido = (
          <Typography
            variant="body2"
            sx={{ fontWeight: esActual ? 700 : 400, color: esActual ? estadoItem.color : undefined }}
          >
            {estadoItem.nombre}
          </Typography>
        )
        return (
          <Step key={estadoItem.id}>
            {puedeEditar ? (
              <StepButton
                icon={icono}
                optional={opcional}
                onClick={() => onSeleccionarEstado(estadoItem)}
                aria-label={`Cambiar estado a ${estadoItem.nombre}`}
              >
                {contenido}
              </StepButton>
            ) : (
              <StepLabel icon={icono} optional={opcional}>
                {contenido}
              </StepLabel>
            )}
          </Step>
        )
      })}
    </Stepper>
  )
}
