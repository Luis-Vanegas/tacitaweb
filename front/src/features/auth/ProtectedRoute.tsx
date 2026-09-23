import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { useAppSelector } from '@/shared/hooks/redux'
import type { RolUsuario } from '@/shared/types'

interface ProtectedRouteProps {
  children: ReactNode
  rolesPermitidos?: RolUsuario[]
}

// Redirige a /login sin sesión. Si la ruta exige rol y el usuario no lo tiene,
// redirige al menú (no hay página de "no autorizado" en esta fase).
export function ProtectedRoute({ children, rolesPermitidos }: ProtectedRouteProps) {
  const { usuario, bootstrapCompletado } = useAppSelector((s) => s.auth)
  const location = useLocation()

  if (!bootstrapCompletado) {
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}
      >
        <CircularProgress aria-label="Cargando sesión" />
      </Box>
    )
  }

  if (!usuario) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (rolesPermitidos && !rolesPermitidos.includes(usuario.rol)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
