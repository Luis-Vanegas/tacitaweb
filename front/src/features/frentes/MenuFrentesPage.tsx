import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import LogoutIcon from '@mui/icons-material/Logout'
import { tokens } from '@/app/theme/tokens'
import { useAppDispatch, useAppSelector } from '@/shared/hooks/redux'
import { EmptyState } from '@/shared/components/EmptyState'
import { ErrorState } from '@/shared/components/ErrorState'
import { logoutRequest } from '@/features/auth/authSlice'
import { frentesListarRequest } from './frentesSlice'
import { FrenteCard } from './FrenteCard'

export function MenuFrentesPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { estado, error, items } = useAppSelector((s) => s.frentes.lista)
  const usuario = useAppSelector((s) => s.auth.usuario)

  useEffect(() => {
    dispatch(frentesListarRequest())
  }, [dispatch])

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: tokens.color.navy,
        color: tokens.color.onNavy,
        px: { xs: 2, sm: 4, md: 6 },
        py: { xs: 3, sm: 5 },
      }}
    >
      {usuario && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Typography variant="body2" sx={{ color: tokens.color.onNavyMuted }}>
            {usuario.nombre}
          </Typography>
          <Tooltip title="Cerrar sesión">
            <IconButton
              aria-label="Cerrar sesión"
              onClick={() => dispatch(logoutRequest())}
              sx={{ color: tokens.color.onNavy }}
            >
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      <Box sx={{ textAlign: 'center', mb: { xs: 4, sm: 6 } }}>
        <Box
          sx={{
            display: 'inline-block',
            px: { xs: 3, sm: 5 },
            py: { xs: 1.25, sm: 1.75 },
            borderRadius: 999,
            background: `linear-gradient(135deg, ${tokens.color.headerGradientFrom}, ${tokens.color.headerGradientTo})`,
            boxShadow: `0 8px 30px rgba(0, 171, 238, 0.35)`,
          }}
        >
          <Typography
            component="h1"
            sx={{
              fontWeight: 800,
              fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.75rem' },
              color: '#fff',
              lineHeight: 1.1,
            }}
          >
            Tacita de Plata
          </Typography>
        </Box>
        <Typography variant="body1" sx={{ mt: 2, color: tokens.color.onNavyMuted }}>
          Seguimiento a la contratación y el personal del proyecto.
        </Typography>
      </Box>

      <Box sx={{ maxWidth: 1280, mx: 'auto' }}>
        {estado === 'loading' && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2.5 }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton
                key={i}
                variant="rounded"
                height={168}
                sx={{ borderRadius: 4, ...cardBasis }}
              />
            ))}
          </Box>
        )}

        {estado === 'failed' && (
          <Box sx={{ backgroundColor: tokens.color.cardBackground, borderRadius: 4 }}>
            <ErrorState
              mensaje={error ?? undefined}
              onReintentar={() => dispatch(frentesListarRequest())}
            />
          </Box>
        )}

        {estado === 'succeeded' && items.length === 0 && (
          <Box sx={{ backgroundColor: tokens.color.cardBackground, borderRadius: 4 }}>
            <EmptyState titulo="Sin frentes" mensaje="Todavía no hay frentes configurados." />
          </Box>
        )}

        {estado === 'succeeded' && items.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2.5 }}>
            {items.map((frente) => (
              <Box key={frente.id} sx={cardBasis}>
                <FrenteCard frente={frente} onAbrir={(slug) => navigate(`/frentes/${slug}`)} />
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  )
}

// 4 tarjetas por fila en lg, 3 en md, 2 en sm, 1 en xs — flex (no grid) para que
// la última fila incompleta (ej. 3 de 7) quede centrada en vez de pegada a la izquierda.
const cardBasis = {
  flex: '1 1 260px',
  maxWidth: {
    xs: '100%',
    sm: 'calc(50% - 10px)',
    md: 'calc(33.333% - 13.33px)',
    lg: 'calc(25% - 15px)',
  },
}
