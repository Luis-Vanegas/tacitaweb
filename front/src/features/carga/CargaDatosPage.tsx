import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import { tokens } from '@/app/theme/tokens'
import { useAppDispatch } from '@/shared/hooks/redux'
import type { TipoImportacion } from '@/shared/types'
import { catalogosRequest } from '@/features/catalogos/catalogosSlice'
import { frentesListarRequest } from '@/features/frentes/frentesSlice'
import { ImportadorExcel } from './ImportadorExcel'
import { ProcesoNuevoForm } from './ProcesoNuevoForm'
import { CortePersonalForm } from './CortePersonalForm'

function Seccion({ titulo, ayuda, children }: { titulo: string; ayuda: string; children: ReactNode }) {
  return (
    <Paper
      variant="outlined"
      sx={{ flex: 1, minWidth: 0, p: { xs: 2, sm: 3 }, borderTop: 4, borderTopColor: 'primary.main' }}
    >
      <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
        {titulo}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {ayuda}
      </Typography>
      {children}
    </Paper>
  )
}

const AYUDA_FORM: Record<TipoImportacion, string> = {
  procesos: 'Registra un proceso a la vez, con su estado inicial y los frentes donde se verá.',
  personal: 'Crea o actualiza el corte de un tipo de personal para una vigencia.',
}

const AYUDA_EXCEL: Record<TipoImportacion, string> = {
  procesos: 'Crea o actualiza muchos procesos a la vez. Se identifican por número de contrato (o necesidad + actividad).',
  personal: 'Crea o actualiza cortes de personal en bloque. Se identifican por tipo de personal y vigencia.',
}

// Pantalla "Cargar datos" (ADMIN/EDITOR). Header y pestañas iguales a
// AdminLayout; aquí las pestañas son estado local (no rutas anidadas) porque
// ambas comparten la misma página y no necesitan URL propia.
export function CargaDatosPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [tipo, setTipo] = useState<TipoImportacion>('procesos')

  useEffect(() => {
    dispatch(catalogosRequest())
    dispatch(frentesListarRequest())
  }, [dispatch])

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#F4F6F8' }}>
      <Box
        sx={{
          background: `linear-gradient(135deg, ${tokens.color.headerGradientFrom}, ${tokens.color.headerGradientTo})`,
          color: '#fff',
          px: { xs: 2, sm: 4, md: 6 },
          py: { xs: 3, sm: 4 },
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
              Cargar datos
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Formularios y carga masiva por Excel de procesos y personal.
            </Typography>
          </Box>
          <Tooltip title="Volver al inicio">
            <IconButton aria-label="Volver al inicio" onClick={() => navigate('/')} sx={{ color: '#fff' }}>
              <HomeOutlinedIcon />
            </IconButton>
          </Tooltip>
        </Stack>
        <Tabs
          value={tipo}
          onChange={(_e, valor: TipoImportacion) => setTipo(valor)}
          textColor="inherit"
          indicatorColor="secondary"
          sx={{ mt: 2 }}
        >
          <Tab value="procesos" label="Procesos" />
          <Tab value="personal" label="Personal" />
        </Tabs>
      </Box>

      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        spacing={3}
        alignItems="flex-start"
        sx={{ p: { xs: 2, sm: 4 }, maxWidth: 1440, mx: 'auto', '& > *': { width: { xs: '100%', lg: 'auto' } } }}
      >
        <Seccion titulo="Formulario" ayuda={AYUDA_FORM[tipo]}>
          {tipo === 'procesos' ? <ProcesoNuevoForm /> : <CortePersonalForm />}
        </Seccion>
        <Seccion titulo="Carga masiva (Excel)" ayuda={AYUDA_EXCEL[tipo]}>
          {/* key: al cambiar de pestaña el importador arranca limpio. */}
          <ImportadorExcel key={tipo} tipo={tipo} />
        </Seccion>
      </Stack>
    </Box>
  )
}
