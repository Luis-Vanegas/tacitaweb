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
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4,
        }}
      >
        <Box
          sx={{
            display: 'inline-block',
            px: 2,
            py: 0.75,
            borderRadius: 999,
            backgroundColor: tokens.color.primary,
            color: '#fff',
            fontWeight: 700,
          }}
        >
          Tacita de Plata
        </Box>

        {usuario && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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
      </Box>

      <Typography variant="h4" component="h1" sx={{ mb: 0.5, fontWeight: 700 }}>
        Frentes
      </Typography>
      <Typography variant="body1" sx={{ mb: 4, color: tokens.color.onNavyMuted }}>
        Seguimiento a la contratación y el personal del proyecto.
      </Typography>

      {estado === 'loading' && (
        <Box
          sx={{
            display: 'grid',
            gap: 2.5,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
          }}
        >
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={168} sx={{ borderRadius: 4 }} />
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
        <Box
          sx={{
            display: 'grid',
            gap: 2.5,
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)',
            },
          }}
        >
          {items.map((frente) => (
            <FrenteCard
              key={frente.id}
              frente={frente}
              onAbrir={(slug) => navigate(`/frentes/${slug}`)}
            />
          ))}
        </Box>
      )}
    </Box>
  )
}
