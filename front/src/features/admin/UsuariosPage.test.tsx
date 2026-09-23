import { describe, expect, it } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { theme } from '@/app/theme/theme'
import type { UsuarioRespuesta } from '@/shared/types'
import usuariosReducer, { usuariosListarFailure, usuariosListarSuccess } from './usuariosSlice'
import vinculosReducer from './vinculosSlice'
import frentesReducer from '@/features/frentes/frentesSlice'
import { UsuariosPage } from './UsuariosPage'

const rootReducer = combineReducers({
  usuarios: usuariosReducer,
  vinculos: vinculosReducer,
  frentes: frentesReducer,
})

function crearStore(preloadedState: Partial<ReturnType<typeof rootReducer>>) {
  return configureStore({
    reducer: rootReducer,
    // Sin sagaMiddleware: se verifica el render según estado precargado
    // (mismo criterio que ProcesoFichaPage.test.tsx), no el flujo de red.
    preloadedState: preloadedState as ReturnType<typeof rootReducer>,
  })
}

function renderPagina(preloadedState: Partial<ReturnType<typeof rootReducer>> = {}) {
  const store = crearStore(preloadedState)
  const resultado = render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <UsuariosPage />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>,
  )
  return { ...resultado, store }
}

const usuarioBase: UsuarioRespuesta = {
  id: 'u1',
  email: 'ana@tacita.gov.co',
  nombre: 'Ana Editor',
  rol: 'EDITOR',
  activo: true,
  ultimoAcceso: null,
  frentes: [{ id: 1, nombre: 'SIF', slug: 'sif' }],
}

describe('UsuariosPage', () => {
  it('muestra esqueletos mientras carga', () => {
    const { container } = renderPagina({
      usuarios: {
        lista: { estado: 'loading', error: null, items: [] },
        crear: { estado: 'idle', error: null },
        actualizar: { estado: 'idle', error: null },
        eliminar: { estado: 'idle', error: null },
      },
    })
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0)
  })

  it('muestra el ErrorState cuando la carga falla', () => {
    // El montaje dispara usuariosListarRequest() (fetch real al entrar),
    // así que un estado 'failed' precargado se pisaría con 'loading' apenas
    // monta: se simula la falla despachando el failure después del montaje
    // (mismo patrón que ProcesoFichaPage.test.tsx).
    const { store } = renderPagina()
    act(() => {
      store.dispatch(usuariosListarFailure('No se pudieron cargar los usuarios.'))
    })
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('No se pudieron cargar los usuarios.')).toBeInTheDocument()
  })

  it('muestra la tabla con los usuarios cargados', () => {
    // El montaje siempre dispara usuariosListarRequest() (fetch real al
    // entrar), que pisa cualquier lista.estado precargado con 'loading'
    // (mismo motivo que el test de error arriba): se despacha el success
    // después del montaje, como lo haría la saga.
    const { store } = renderPagina()
    act(() => {
      store.dispatch(usuariosListarSuccess([usuarioBase]))
    })
    expect(screen.getByText('ana@tacita.gov.co')).toBeInTheDocument()
    expect(screen.getByText('Ana Editor')).toBeInTheDocument()
    expect(screen.getByText('Editor')).toBeInTheDocument()
    expect(screen.getByText('SIF')).toBeInTheDocument()
  })

  it('exige password al crear pero no al editar', async () => {
    const usuario = userEvent.setup()
    const { store } = renderPagina()
    act(() => {
      store.dispatch(usuariosListarSuccess([usuarioBase]))
    })

    // Crear: dejar password vacía debe bloquear el submit con un error.
    await usuario.click(screen.getByRole('button', { name: 'Nuevo usuario' }))
    await usuario.type(screen.getByLabelText(/Correo/), 'nuevo@tacita.gov.co')
    await usuario.type(screen.getByLabelText('Nombre *'), 'Nuevo Usuario')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByText('La contraseña es obligatoria.')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))

    // Editar: sin tocar la password no debe aparecer ningún error de longitud.
    await usuario.click(screen.getByRole('button', { name: /Editar ana@tacita.gov.co/ }))
    expect(screen.getByText('Dejar en blanco para no cambiarla.')).toBeInTheDocument()
    expect(screen.queryByText('La contraseña es obligatoria.')).not.toBeInTheDocument()
  })
})
