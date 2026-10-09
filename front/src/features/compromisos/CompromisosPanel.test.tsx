import { describe, expect, it } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { combineReducers, configureStore, type Middleware, type UnknownAction } from '@reduxjs/toolkit'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { theme } from '@/app/theme/theme'
import authReducer from '@/features/auth/authSlice'
import type { Compromiso, RolUsuario } from '@/shared/types'
import compromisosReducer, { compromisosSuccess } from './compromisosSlice'
import { CompromisosPanel } from './CompromisosPanel'

const rootReducer = combineReducers({
  auth: authReducer,
  compromisos: compromisosReducer,
})

const compromiso: Compromiso = {
  id: 7,
  descripcion: 'Entregar informe de personal',
  estado: 'PENDIENTE',
  responsable: 'Ana',
  fechaRegistro: '2026-09-01',
  fechaCumplimiento: '2099-12-31',
  avance: null,
}

// Sin sagaMiddleware: se registran las acciones para comprobar qué se
// despacha, y la respuesta del GET se simula despachando el success.
function renderPanel(rol: RolUsuario | null, items: Compromiso[] = [compromiso]) {
  const acciones: UnknownAction[] = []
  const registrar: Middleware = () => (next) => (action) => {
    acciones.push(action as UnknownAction)
    return next(action)
  }
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
    middleware: (getDefault) => getDefault({ thunk: false }).concat(registrar),
  })
  render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <CompromisosPanel />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>,
  )
  act(() => {
    store.dispatch(compromisosSuccess(items))
  })
  return { store, acciones }
}

async function abrirLista() {
  await userEvent.setup().click(screen.getByRole('button', { name: /Compromisos ·/ }))
}

describe('CompromisosPanel', () => {
  it('LECTOR ve la lista sin botones de edición', async () => {
    renderPanel('LECTOR')
    await abrirLista()
    expect(screen.getByText('Entregar informe de personal')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Nuevo compromiso' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Editar compromiso/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Eliminar compromiso/ })).not.toBeInTheDocument()
  })

  it('LECTOR sin compromisos no ve el panel', () => {
    renderPanel('LECTOR', [])
    expect(screen.queryByRole('button', { name: /Compromisos ·/ })).not.toBeInTheDocument()
  })

  it('EDITOR sin compromisos ve el panel y puede crear el primero', async () => {
    const { acciones } = renderPanel('EDITOR', [])
    const usuario = userEvent.setup()

    await usuario.click(screen.getByRole('button', { name: 'Nuevo compromiso' }))
    await usuario.type(screen.getByLabelText(/^Descripción/), '  Revisar contratos  ')
    await usuario.type(screen.getByLabelText(/^Responsable/), 'Luis')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() =>
      expect(acciones).toContainEqual({
        type: 'compromisos/compromisoCrearRequest',
        payload: {
          descripcion: 'Revisar contratos',
          estado: 'PENDIENTE',
          responsable: 'Luis',
        },
      }),
    )
  })

  it('EDITOR edita pero no elimina', async () => {
    renderPanel('EDITOR')
    await abrirLista()
    expect(screen.getByRole('button', { name: 'Nuevo compromiso' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Editar compromiso: Entregar informe de personal',
      }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Eliminar compromiso/ })).not.toBeInTheDocument()
  })

  it('ADMIN elimina tras confirmar', async () => {
    const { acciones } = renderPanel('ADMIN')
    const usuario = userEvent.setup()
    await abrirLista()

    await usuario.click(
      screen.getByRole('button', {
        name: 'Eliminar compromiso: Entregar informe de personal',
      }),
    )
    expect(screen.getByText(/Esta acción no se puede deshacer/)).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(acciones).toContainEqual({
      type: 'compromisos/compromisoEliminarRequest',
      payload: 7,
    })
  })
})
