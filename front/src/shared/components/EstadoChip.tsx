import Chip from '@mui/material/Chip'
import { alpha } from '@mui/material/styles'

interface EstadoChipProps {
  nombre: string
  color: string
  esAlerta?: boolean
}

// Color del chip viene de estado_proceso.color (API): nunca se duplica una
// paleta de estados acá. Si es alerta, se refuerza con borde sólido.
export function EstadoChip({ nombre, color, esAlerta = false }: EstadoChipProps) {
  return (
    <Chip
      label={nombre}
      size="small"
      aria-label={esAlerta ? `Estado: ${nombre} (alerta)` : `Estado: ${nombre}`}
      sx={{
        backgroundColor: alpha(color, 0.14),
        color,
        border: esAlerta ? `1.5px solid ${color}` : '1px solid transparent',
        fontWeight: 700,
      }}
    />
  )
}
