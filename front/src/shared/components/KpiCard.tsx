import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import type { SvgIconComponent } from '@mui/icons-material'

interface KpiCardProps {
  etiqueta: string
  valor: number | string
  icono?: SvgIconComponent
  color?: string
  onClick?: () => void
}

export function KpiCard({ etiqueta, valor, icono: Icono, color, onClick }: KpiCardProps) {
  return (
    <Card
      sx={{
        flex: '1 1 160px',
        minWidth: 160,
        cursor: onClick ? 'pointer' : 'default',
        transition: onClick ? 'box-shadow 120ms ease' : undefined,
        '&:hover': onClick ? { boxShadow: 4 } : undefined,
      }}
      onClick={onClick}
    >
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {Icono && (
          <Box
            aria-hidden="true"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: color ? `${color}1F` : 'rgba(0,171,238,0.12)',
              color: color ?? 'primary.main',
              flexShrink: 0,
            }}
          >
            <Icono fontSize="small" />
          </Box>
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" component="p" sx={{ lineHeight: 1.1 }}>
            {valor}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {etiqueta}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  )
}
