import { Navigate, createBrowserRouter } from 'react-router-dom'
import { LoginPage } from '@/features/auth/LoginPage'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { MenuFrentesPage } from '@/features/frentes/MenuFrentesPage'
import { MapaFrentesPage } from '@/features/frentes/MapaFrentesPage'
import { FrenteDetallePage } from '@/features/frentes/FrenteDetallePage'
import { GeneralPage } from '@/features/general/GeneralPage'
import { PersonalGeneralPage } from '@/features/personal/PersonalGeneralPage'
import { CompromisosPage } from '@/features/compromisos/CompromisosPage'
import { ProcesoFichaPage } from '@/features/procesos/ProcesoFichaPage'
import { AdminLayout } from '@/features/admin/AdminLayout'
import { UsuariosPage } from '@/features/admin/UsuariosPage'
import { VinculosPage } from '@/features/admin/VinculosPage'
import { CargaDatosPage } from '@/features/carga/CargaDatosPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MapaFrentesPage />
      </ProtectedRoute>
    ),
  },
  {
    // ponytail: menú de tarjetas anterior, oculto (sin links) mientras se valida el mapa.
    path: '/frentes',
    element: (
      <ProtectedRoute>
        <MenuFrentesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/general',
    element: (
      <ProtectedRoute>
        <GeneralPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/personal',
    element: (
      <ProtectedRoute>
        <PersonalGeneralPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/compromisos',
    element: (
      <ProtectedRoute>
        <CompromisosPage />
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
    path: '/carga',
    element: (
      <ProtectedRoute rolesPermitidos={['ADMIN', 'EDITOR']}>
        <CargaDatosPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute rolesPermitidos={['ADMIN']}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="usuarios" replace /> },
      { path: 'usuarios', element: <UsuariosPage /> },
      { path: 'vinculos', element: <VinculosPage /> },
    ],
  },
])
