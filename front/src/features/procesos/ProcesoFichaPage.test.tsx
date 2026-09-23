import { describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { theme } from '@/app/theme/theme'
import type { ProcesoFicha } from '@/shared/types'
import procesoFichaReducer, { procesoFichaFailure } from './procesoFichaSlice'
import procesoMutacionesReducer from './procesoMutacionesSlice'
import catalogosReducer from '@/features/catalogos/catalogosSlice'
import authReducer from '@/features/auth/authSlice'
import { ProcesoFichaPage } from './ProcesoFichaPage'

// @react-pdf/renderer arma PDFs con Yoga/fontkit vía WASM: no aporta nada a
// este test (solo nos importa el contenido de la ficha) y es pesado/inestable
// bajo jsdom, así que se mockea.
vi.mock('@react-pdf/renderer', () => ({
  Document: () => null,
  Page: () => null,
  Text: () => null,
  View: () => null,
  Link: () => null,
  StyleSheet: { create: (styles: unknown) => styles },
  usePDF: () => [{ loading: false, url: null }, vi.fn()],
}))

const rootReducer = combineReducers({
  procesoFicha: procesoFichaReducer,
  procesoMutaciones: procesoMutacionesReducer,
  catalogos: catalogosReducer,
  auth: authReducer,
})

function crearStore(preloadedState: Partial<ReturnType<typeof rootReducer>>) {
  return configureStore({
    reducer: rootReducer,
    // Sin sagaMiddleware: estos tests solo verifican el render según el
    // estado precargado, no el flujo de red (eso ya lo cubre la saga en sí).
    preloadedState: preloadedState as ReturnType<typeof rootReducer>,
  })
}

function renderPagina(preloadedState: Partial<ReturnType<typeof rootReducer>>) {
  const store = crearStore(preloadedState)
  const resultado = render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={['/procesos/proc-1']}>
          <Routes>
            <Route path="/procesos/:id" element={<ProcesoFichaPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>,
  )
  return { ...resultado, store }
}

const fichaBase: ProcesoFicha = {
  id: 'proc-1',
  tipo: 'PRINCIPAL',
  numeroContrato: '123',
  numeroNecesidad: null,
  fechaInicio: '2026-01-01',
  fechaTerminacion: '2026-06-01',
  linkSecop: 'https://secop.gov.co/proc-1',
  observacion: null,
  procesoSupervisadoId: null,
  actividadId: 1,
  actividad: 'Recolección de cambuches',
  dependenciaId: 1,
  dependencia: 'SIF',
  proyectoId: 1,
  proyecto: 'Tacita de Plata',
  estadoId: 2,
  estadoCodigo: 'EJECUCION',
  estado: 'En ejecución',
  fase: 'CONTRACTUAL',
  esAlerta: false,
  estadoColor: '#28A745',
  contratistaId: 1,
  contratista: 'Constructora Ejemplo',
  diasRestantes: 30,
  pctPlazo: 50,
  ultimaNotaFecha: '2026-02-01',
  ultimaNota: 'Avance normal',
  updatedAt: '2026-02-01T00:00:00.000Z',
  bitacora: [
    {
      id: 'seg-1',
      procesoId: 'proc-1',
      fecha: '2026-02-01',
      nota: 'Avance normal',
      estadoId: null,
      autorId: null,
      autor: null,
      estado: null,
      createdAt: '2026-02-01T00:00:00.000Z',
    },
  ],
  interventorias: [],
  frentes: [{ id: 1, nombre: 'SIF', slug: 'sif', criterio: null }],
}

describe('ProcesoFichaPage', () => {
  it('muestra el ErrorState cuando la carga falla', () => {
    // El montaje siempre dispara procesoFichaRequest(id) (fetch real al
    // entrar a la página), así que un estado 'failed' precargado no sirve:
    // se pisa con 'loading' apenas monta. Se simula la falla como lo haría
    // la saga, despachando el failure después del montaje.
    const { store } = renderPagina({})
    act(() => {
      store.dispatch(procesoFichaFailure('No se pudo cargar el proceso.'))
    })
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('No se pudo cargar el proceso.')).toBeInTheDocument()
  })

  it('muestra esqueletos de carga mientras no hay datos', () => {
    const { container } = renderPagina({
      procesoFicha: { estado: 'loading', error: null, data: null },
    })
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('muestra los datos del proceso cuando la carga es exitosa', () => {
    renderPagina({
      procesoFicha: { estado: 'succeeded', error: null, data: fichaBase },
      catalogos: {
        estado: 'succeeded',
        error: null,
        estados: [
          { id: 1, codigo: 'PRECONTRACTUAL', nombre: 'Precontractual', fase: 'PRECONTRACTUAL', orden: 1, esAlerta: false, color: '#17A2B8' },
          { id: 2, codigo: 'EJECUCION', nombre: 'En ejecución', fase: 'CONTRACTUAL', orden: 2, esAlerta: false, color: '#28A745' },
        ],
        dependencias: [],
        proyectos: [],
        contratistas: [],
      },
    })

    expect(screen.getByRole('heading', { name: 'Recolección de cambuches' })).toBeInTheDocument()
    expect(screen.getByText('SIF · Tacita de Plata')).toBeInTheDocument()
    expect(screen.getByText('Constructora Ejemplo')).toBeInTheDocument()
    expect(screen.getByText('Avance normal')).toBeInTheDocument()
    // Sin usuario en sesión (LECTOR implícito): no se pueden disparar mutaciones.
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
  })

  it('muestra las acciones de edición cuando el usuario es ADMIN', () => {
    renderPagina({
      procesoFicha: { estado: 'succeeded', error: null, data: fichaBase },
      auth: {
        estado: 'succeeded',
        bootstrapCompletado: true,
        usuario: { id: 'u1', email: 'admin@tacita.gov.co', nombre: 'Admin', rol: 'ADMIN' },
        error: null,
      },
    })
    expect(screen.getByRole('button', { name: /Editar/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Agregar nota/ })).toBeInTheDocument()
  })
})
