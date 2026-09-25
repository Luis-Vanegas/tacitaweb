import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'
import { tokens } from '@/app/theme/tokens'

interface PlazoBarProps {
  pctPlazo: number | null
  diasRestantes: number | null
}

function textoDias(diasRestantes: number | null): string {
  if (diasRestantes === null) return 'Sin fecha'
  if (diasRestantes < 0) return `Vencido hace ${Math.abs(diasRestantes)} d`
  if (diasRestantes === 0) return 'Vence hoy'
  return `${diasRestantes} d restantes`
}

// Barra de avance del plazo del contrato. Roja cuando ya venció
// (dias_restantes < 0), sin importar el pct_plazo calculado por la API.
// Sin fechas asignadas (precontractual): no hay plazo que mostrar, así que no
// se dibuja una barra vacía al 0% que sugeriría "recién empezó".
export function PlazoBar({ pctPlazo, diasRestantes }: PlazoBarProps) {
  if (pctPlazo === null && diasRestantes === null) {
    return (
      <Typography variant="caption" color="text.secondary">
        Sin fecha
      </Typography>
    )
  }

  const vencido = diasRestantes !== null && diasRestantes < 0
  const valor = pctPlazo ?? 0
  const color = vencido ? 'error' : valor >= 85 ? 'warning' : 'primary'

  return (
    <Box sx={{ minWidth: 140 }}>
      <LinearProgress
        variant="determinate"
        value={Math.min(100, Math.max(0, valor))}
        color={color}
        aria-label={`Plazo del contrato: ${textoDias(diasRestantes)}`}
        sx={{
          height: 8,
          borderRadius: 999,
          backgroundColor: 'rgba(0,35,61,0.08)',
        }}
      />
      <Typography
        variant="caption"
        sx={{
          mt: 0.5,
          display: 'block',
          color: vencido ? tokens.color.error : 'text.secondary',
          fontWeight: vencido ? 700 : 400,
        }}
      >
        {textoDias(diasRestantes)}
      </Typography>
    </Box>
  )
}
