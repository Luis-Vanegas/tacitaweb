import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import { tokens } from '@/app/theme/tokens'
import type { ResumenFrente } from '@/shared/types'

interface GeneralCardProps {
  frentes: ResumenFrente[]
  onAbrir: () => void
}

// Mismo lenguaje visual que FrenteCard (borde superior de color, círculo de
// ícono, chips de resumen), pero como franja destacada arriba de la grilla:
// es la entrada a "todos los frentes juntos", no uno más entre los siete.
export function GeneralCard({ frentes, onAbrir }: GeneralCardProps) {
  const totalActividades = frentes.reduce((acc, f) => acc + f.totalActividades, 0)
  const totalAlertas = frentes.reduce((acc, f) => acc + f.alertas, 0)

  return (
    <Card sx={{ borderTop: `4px solid ${tokens.color.primary}` }}>
      <CardActionArea
        onClick={onAbrir}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onAbrir()
          }
        }}
        aria-label={`Ver vista general: ${totalActividades} actividades, ${totalAlertas} alertas en todos los frentes`}
        sx={{
          p: 2.5,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: { xs: 1.5, sm: 2.5 },
        }}
      >
        <Box
          aria-hidden="true"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: '50%',
            backgroundColor: `${tokens.color.primary}1F`,
            color: tokens.color.primary,
            flexShrink: 0,
          }}
        >
          <DashboardOutlinedIcon />
        </Box>

        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
            Vista general
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Todas las actividades de los frentes, en un solo lugar.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Chip
            size="small"
            icon={<AssignmentOutlinedIcon aria-hidden="true" />}
            label={`${totalActividades} actividades`}
          />
          <Chip
            size="small"
            icon={<WarningAmberOutlinedIcon aria-hidden="true" />}
            label={`${totalAlertas} alertas`}
            color={totalAlertas > 0 ? 'error' : 'default'}
            variant={totalAlertas > 0 ? 'filled' : 'outlined'}
          />
        </Stack>
      </CardActionArea>
    </Card>
  )
}
