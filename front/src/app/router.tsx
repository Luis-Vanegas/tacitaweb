import { createBrowserRouter } from 'react-router-dom'
import { LoginPage } from '@/features/auth/LoginPage'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { MenuFrentesPage } from '@/features/frentes/MenuFrentesPage'
import { FrenteDetallePage } from '@/features/frentes/FrenteDetallePage'
import { ProcesoFichaPage } from '@/features/procesos/ProcesoFichaPage'
import { AdminPlaceholderPage } from '@/features/admin/AdminPlaceholderPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MenuFrentesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/frentes/:slug',
    element: (
      <ProtectedRoute>
        <FrenteDetallePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/procesos/:id',
    element: (
      <ProtectedRoute>
        <ProcesoFichaPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/*',
    element: (
      <ProtectedRoute rolesPermitidos={['ADMIN']}>
        <AdminPlaceholderPage />
      </ProtectedRoute>
    ),
  },
])
