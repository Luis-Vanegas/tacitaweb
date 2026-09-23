import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Stack from '@mui/material/Stack'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import { tokens } from '@/app/theme/tokens'

const TABS = [
  { path: '/admin/usuarios', label: 'Usuarios' },
  { path: '/admin/vinculos', label: 'Vínculos' },
] as const

// Layout de /admin/*: header consistente con FrenteDetallePage (degradado +
// botón volver al inicio) y navegación por rutas anidadas (en vez de Tabs
// internas con estado) para que cada pantalla tenga su propia URL.
export function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const tabActual = TABS.find((t) => location.pathname.startsWith(t.path))?.path ?? TABS[0].path

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
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            Administración
          </Typography>
          <Tooltip title="Volver al inicio">
            <IconButton aria-label="Volver al inicio" onClick={() => navigate('/')} sx={{ color: '#fff' }}>
              <HomeOutlinedIcon />
            </IconButton>
          </Tooltip>
        </Stack>
        <Tabs
          value={tabActual}
          onChange={(_e, valor: string) => navigate(valor)}
          textColor="inherit"
          indicatorColor="secondary"
          sx={{ mt: 2 }}
        >
          {TABS.map((t) => (
            <Tab key={t.path} value={t.path} label={t.label} />
          ))}
        </Tabs>
      </Box>

      <Box sx={{ p: { xs: 2, sm: 4 } }}>
        <Outlet />
      </Box>
    </Box>
  )
}
