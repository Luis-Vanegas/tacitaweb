import { describe, expect, it } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { theme } from '@/app/theme/theme'
import authReducer from '@/features/auth/authSlice'
import type { PersonalGeneralItem, PersonalGeneralRespuesta, RolUsuario } from '@/shared/types'
import personalGeneralReducer, { personalGeneralSuccess } from './personalGeneralSlice'
import { PersonalGeneralPage } from './PersonalGeneralPage'

const rootReducer = combineReducers({
  auth: authReducer,
  personalGeneral: personalGeneralReducer,
})

const espacioPublico = {
  slug: 'espacio-publico',
  nombre: 'Espacio Público',
  color: '#6F42C1',
}
const sif = { slug: 'sif', nombre: 'SIF', color: '#F7941D' }

function item(parcial: Partial<PersonalGeneralItem>): PersonalGeneralItem {
  return {
    corteId: 'c1',
    tipoPersonalId: 1,
    tipoPersonal: 'Guardas',
    dependenciaId: 1,
    vigencia: 2026,
    actual: 5,
    pendiente: 1,
    meta: 6,
    fechaFinal: '2026-12-31',
    observaciones: null,
    linksSecop: [],
    frentes: [],
    ...parcial,
  }
}

const respuesta: PersonalGeneralRespuesta = {
  items: [
    item({
      corteId: 'c1',
      tipoPersonal: 'Guardas',
      frentes: [espacioPublico, sif],
    }),
    item({
      corteId: 'c2',
      tipoPersonalId: 2,
      tipoPersonal: 'Operarios',
      actual: 10,
      frentes: [sif],
    }),
  ],
  // Totales del backend, a propósito distintos de la suma de las filas: la
  // página debe mostrarlos tal cual, sin recalcular.
  totales: { actual: 123, pendiente: 4, meta: 130 },
  historico: [
    {
      id: 'c1',
      tipoPersonalId: 1,
      vigencia: 2026,
      actual: 5,
      pendiente: null,
      meta: 6,
      fechaFinal: null,
      observaciones: null,
      linksSecop: [],
    },
  ],
}

function renderPagina(rol: RolUsuario | null = 'LECTOR') {
  // Sin sagaMiddleware: el request del montaje solo marca "loading" y la
  // respuesta se simula despachando el success.
  const store = configureStore({
    reducer: rootReducer,
    preloadedState: {
      auth: {
        estado: 'succeeded',
        bootstrapCompletado: true,
        usuario: rol ? { id: 'u1', email: 'u@x.co', nombre: 'Usuario', rol } : null,
        error: null,
      },
    } as ReturnType<typeof rootReducer>,
  })
  render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <PersonalGeneralPage />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>,
  )
  act(() => {
    store.dispatch(personalGeneralSuccess(respuesta))
  })
}

describe('PersonalGeneralPage', () => {
  it('muestra las filas con sus frentes y los totales del backend', () => {
    renderPagina()

    expect(screen.getByText('123')).toBeInTheDocument()
    expect(screen.getByText('130')).toBeInTheDocument()

    const filaGuardas = screen.getByRole('row', { name: /Guardas/ })
    expect(within(filaGuardas).getByText('Espacio Público')).toBeInTheDocument()
    expect(within(filaGuardas).getByText('SIF')).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /Operarios/ })).toBeInTheDocument()
  })

  it('filtra por frente', async () => {
    const usuario = userEvent.setup()
    renderPagina()

    await usuario.click(screen.getByRole('combobox', { name: 'Frente' }))
    await usuario.click(screen.getByRole('option', { name: 'Espacio Público' }))

    expect(screen.getByRole('row', { name: /Guardas/ })).toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /Operarios/ })).not.toBeInTheDocument()
  })

  it('solo ADMIN/EDITOR ven el botón de editar, y solo si el corte está en el histórico', () => {
    renderPagina('EDITOR')
    expect(screen.getByRole('button', { name: 'Editar Guardas' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar Operarios' })).not.toBeInTheDocument()
  })

  it('LECTOR no ve botones de editar', () => {
    renderPagina('LECTOR')
    expect(screen.queryByRole('button', { name: /^Editar/ })).not.toBeInTheDocument()
  })
})
