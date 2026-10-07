import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { theme } from '@/app/theme/theme'
import authReducer from '@/features/auth/authSlice'
import catalogosReducer from '@/features/catalogos/catalogosSlice'
import compromisosReducer from '@/features/compromisos/compromisosSlice'
import generalReducer from '@/features/general/generalSlice'
import type { ProcesoDetalle, ResumenFrente } from '@/shared/types'
import { MapaFrentesPage } from './MapaFrentesPage'

const rootReducer = combineReducers({
  auth: authReducer,
  catalogos: catalogosReducer,
  compromisos: compromisosReducer,
  general: generalReducer,
})

const sif: ResumenFrente = {
  id: 4,
  nombre: 'SIF',
  slug: 'sif',
  descripcion: 'Secretaría de Infraestructura Física',
  color: '#F7941D',
  icono: 'Construction',
  orden: 4,
  totalProcesos: 1,
  totalActividades: 1,
  precontractual: 0,
  enEjecucion: 1,
  terminados: 0,
  alertas: 0,
  proximosVencer: 0,
  personalActual: 0,
  personalPendiente: 0,
}

const proceso = {
  id: 'p1',
  tipo: 'PRINCIPAL',
  numeroContrato: '4600100001',
  numeroNecesidad: null,
  fechaInicio: null,
  fechaTerminacion: null,
  linkSecop: null,
  observacion: null,
  actividad: 'Malla vial',
  categoriaActividad: 'Vial',
  estado: 'En ejecución',
  estadoColor: '#28A745',
  esAlerta: false,
  fase: 'CONTRACTUAL',
  contratista: 'Constructora Uno',
  diasRestantes: null,
  pctPlazo: null,
  ultimaNota: null,
  valorContrato: null,
  ejecucionFinanciera: null,
  rutas: [],
} as unknown as ProcesoDetalle

function renderPagina() {
  // Sin sagaMiddleware: el generalRequest del montaje solo marca "loading",
  // los frentes precargados se siguen mostrando (no se vacían al recargar).
  const store = configureStore({
    reducer: rootReducer,
    preloadedState: {
      general: { estado: 'succeeded', error: null, frentes: [{ frente: sif, procesos: [proceso] }] },
    } as ReturnType<typeof rootReducer>,
  })
  render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <MapaFrentesPage />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>,
  )
}

describe('MapaFrentesPage', () => {
  it('muestra las actividades de entrada y al tocar una abre sus contratos', async () => {
    const user = userEvent.setup()
    renderPagina()

    const actividad = screen.getByRole('button', { name: 'Malla vial' })
    expect(screen.queryByText('Constructora Uno')).not.toBeInTheDocument()

    await user.click(actividad)
    expect(await screen.findByText('Constructora Uno')).toBeInTheDocument()
  })

  it('muestra el acceso a la vista general de personal para cualquier rol', () => {
    renderPagina()
    expect(screen.getByRole('button', { name: 'Personal' })).toBeInTheDocument()
  })
})
