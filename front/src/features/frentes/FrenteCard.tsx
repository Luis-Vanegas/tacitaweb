import * as Icons from '@mui/icons-material'
import BusinessIcon from '@mui/icons-material/Business'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import type { ResumenFrente } from '@/shared/types'

type IconosMui = typeof Icons

// Resuelve frente.icono (ej. "Construction", "LocalPolice") contra el paquete
// @mui/icons-material. Si el back manda un nombre que no existe (dato mal
// cargado, typo), cae a un ícono genérico en vez de romper el render.
function resolverIcono(nombre: string) {
  const clave = nombre as keyof IconosMui
  return (Icons[clave] as typeof BusinessIcon | undefined) ?? BusinessIcon
}

interface FrenteCardProps {
  frente: ResumenFrente
  onAbrir: (slug: string) => void
}

export function FrenteCard({ frente, onAbrir }: FrenteCardProps) {
  const Icono = resolverIcono(frente.icono)

  function abrir() {
    onAbrir(frente.slug)
  }

  return (
    <Card
      sx={{
        borderTop: `4px solid ${frente.color}`,
        height: '100%',
      }}
    >
      <CardActionArea
        onClick={abrir}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            abrir()
          }
        }}
        aria-label={`Abrir frente ${frente.nombre}: ${frente.totalProcesos} procesos, ${frente.alertas} alertas, ${frente.personalActual} personal`}
        sx={{ height: '100%', p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}
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
            backgroundColor: `${frente.color}1F`,
            color: frente.color,
          }}
        >
          <Icono />
        </Box>

        <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
          {frente.nombre}
        </Typography>

        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 'auto', rowGap: 1 }}>
          <Chip
            size="small"
            icon={<AssignmentOutlinedIcon aria-hidden="true" />}
            label={`${frente.totalProcesos} procesos`}
          />
          <Chip
            size="small"
            icon={<WarningAmberOutlinedIcon aria-hidden="true" />}
            label={`${frente.alertas} alertas`}
            color={frente.alertas > 0 ? 'error' : 'default'}
            variant={frente.alertas > 0 ? 'filled' : 'outlined'}
          />
          <Chip
            size="small"
            icon={<GroupsOutlinedIcon aria-hidden="true" />}
            label={`${frente.personalActual} personal`}
          />
        </Stack>
      </CardActionArea>
    </Card>
  )
}
