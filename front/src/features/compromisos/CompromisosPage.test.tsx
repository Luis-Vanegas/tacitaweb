import { describe, expect, it } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { theme } from '@/app/theme/theme'
import authReducer from '@/features/auth/authSlice'
import type { Compromiso, RolUsuario } from '@/shared/types'
import compromisosReducer, { compromisosSuccess } from './compromisosSlice'
import { CompromisosPage } from './CompromisosPage'

const rootReducer = combineReducers({
  auth: authReducer,
  compromisos: compromisosReducer,
})

// Textos largos a propósito: la página debe mostrarlos completos, sin recorte.
const descripcionLarga =
  'Entregar el informe consolidado de personal de todos los frentes con los soportes de contratación y las novedades del mes anterior'
const avanceLargo =
  'Se recibió la información de cuatro frentes; faltan EMVARIAS, SIF y Medio Ambiente, que se comprometieron a enviarla esta semana'

const items: Compromiso[] = [
  {
    id: 1,
    descripcion: descripcionLarga,
    estado: 'PENDIENTE',
    responsable: 'Ana',
    fechaRegistro: '2026-01-10',
    fechaCumplimiento: '2099-12-31',
    avance: avanceLargo,
  },
  {
    id: 2,
    descripcion: 'Revisar contratos vencidos',
    estado: 'EN_GESTION',
    responsable: 'Luis',
    fechaRegistro: '2026-01-05',
    fechaCumplimiento: '2020-01-01',
    avance: null,
  },
  {
    id: 3,
    descripcion: 'Publicar actas',
    estado: 'CUMPLIDO',
    responsable: null,
    fechaRegistro: null,
    fechaCumplimiento: '2020-01-01',
    avance: null,
  },
]

// Sin sagaMiddleware: la respuesta del GET se simula despachando el success.
function renderPagina(rol: RolUsuario | null) {
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
          <CompromisosPage />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>,
  )
  act(() => {
    store.dispatch(compromisosSuccess(items))
  })
}

function tarjetas() {
  return within(screen.getByRole('list', { name: 'Compromisos' })).getAllByRole('listitem')
}

describe('CompromisosPage', () => {
  it('muestra descripción y avance completos', () => {
    renderPagina('LECTOR')
    expect(screen.getByText(descripcionLarga)).toBeInTheDocument()
    expect(screen.getByText(avanceLargo)).toBeInTheDocument()
  })

  it('cuenta los KPIs, incluidos los vencidos (el cumplido no cuenta)', () => {
    renderPagina('LECTOR')
    // Dentro del grupo de KPIs: "En gestión" también es el texto de un chip.
    const kpis = within(screen.getByRole('group', { name: 'Indicadores de compromisos' }))
    const valor = (etiqueta: string) => kpis.getByText(etiqueta).previousElementSibling?.textContent
    expect(valor('Total')).toBe('3')
    expect(valor('Pendientes')).toBe('1')
    expect(valor('En gestión')).toBe('1')
    expect(valor('Cumplidos')).toBe('1')
    expect(valor('Vencidos')).toBe('1')
  })

  it('ordena vencidos primero y cumplidos al final', () => {
    renderPagina('LECTOR')
    const orden = tarjetas().map((t) => t.textContent)
    expect(orden[0]).toContain('Revisar contratos vencidos')
    expect(orden[0]).toContain('Vencido')
    expect(orden[2]).toContain('Publicar actas')
  })

  it('filtra por estado y por solo vencidos', async () => {
    const usuario = userEvent.setup()
    renderPagina('LECTOR')

    await usuario.click(screen.getByRole('combobox', { name: 'Estado' }))
    await usuario.click(screen.getByRole('option', { name: 'Cumplido' }))
    expect(tarjetas()).toHaveLength(1)
    expect(screen.getByText('Publicar actas')).toBeInTheDocument()

    await usuario.click(screen.getByRole('combobox', { name: 'Estado' }))
    await usuario.click(screen.getByRole('option', { name: 'Todos' }))
    await usuario.click(screen.getByRole('checkbox', { name: 'Solo vencidos' }))
    expect(tarjetas()).toHaveLength(1)
    expect(screen.getByText('Revisar contratos vencidos')).toBeInTheDocument()

    await usuario.type(screen.getByRole('textbox', { name: 'Buscar compromisos' }), 'no existe')
    expect(screen.getByText('No hay compromisos que coincidan.')).toBeInTheDocument()
  })

  it('LECTOR no ve crear, editar ni eliminar', () => {
    renderPagina('LECTOR')
    expect(screen.queryByRole('button', { name: 'Nuevo compromiso' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Editar compromiso/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Eliminar compromiso/ })).not.toBeInTheDocument()
  })

  it('EDITOR crea y edita pero no elimina', () => {
    renderPagina('EDITOR')
    expect(screen.getByRole('button', { name: 'Nuevo compromiso' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Editar compromiso: Publicar actas' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Eliminar compromiso/ })).not.toBeInTheDocument()
  })

  it('ADMIN puede eliminar con confirmación', async () => {
    renderPagina('ADMIN')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Eliminar compromiso: Publicar actas' }))
    expect(screen.getByText(/Esta acción no se puede deshacer/)).toBeInTheDocument()
  })
})
