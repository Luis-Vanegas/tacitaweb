import { describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { ThemeProvider } from '@mui/material/styles'
import { theme } from '@/app/theme/theme'
import type { PersonalFrenteRespuesta } from '@/shared/types'
import personalReducer, { personalFailure } from './personalSlice'
import { PersonalTab } from './PersonalTab'

// echarts-for-react renderiza sobre un canvas real: no aporta nada a este
// test (solo nos importa qué serie/datos recibe) y es pesado bajo jsdom, así
// que se mockea devolviendo un div con la option serializada para poder
// inspeccionarla desde el test.
vi.mock('echarts-for-react', () => ({
  default: ({ option }: { option: { series: { name: string; data: number[] }[] } }) => (
    <div data-testid="grafico-personal" data-option={JSON.stringify(option.series)} />
  ),
}))

const rootReducer = combineReducers({ personal: personalReducer })

function crearStore(preloadedState: Partial<ReturnType<typeof rootReducer>>) {
  return configureStore({
    reducer: rootReducer,
    preloadedState: preloadedState as ReturnType<typeof rootReducer>,
  })
}

function renderTab(preloadedState: Partial<ReturnType<typeof rootReducer>>) {
  const store = crearStore(preloadedState)
  const resultado = render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <PersonalTab slug="sif" />
      </ThemeProvider>
    </Provider>,
  )
  return { ...resultado, store }
}

const datosBase: PersonalFrenteRespuesta = {
  vigente: [
    {
      corteId: 'corte-1',
      tipoPersonalId: 1,
      tipoPersonal: 'Operarios',
      dependenciaId: 1,
      vigencia: 2026,
      actual: 8,
      pendiente: 2,
      meta: 10,
      fechaFinal: '2026-12-31',
      observaciones: null,
      linksSecop: [],
    },
  ],
  historico: [
    {
      id: 'corte-1',
      tipoPersonalId: 1,
      vigencia: 2026,
      actual: 8,
      pendiente: 2,
      meta: 10,
      fechaFinal: '2026-12-31',
      observaciones: null,
      linksSecop: [],
    },
    {
      id: 'corte-0',
      tipoPersonalId: 1,
      vigencia: 2025,
      actual: 6,
      pendiente: 4,
      meta: 10,
      fechaFinal: '2025-12-31',
      observaciones: null,
      linksSecop: [],
    },
  ],
  operadores: [
    {
      id: 'op-1',
      corteId: 'corte-1',
      contratistaId: 1,
      cantidad: 3,
      fechaFinal: '2026-12-31',
      procesoId: null,
      contratista: { id: 1, nombre: 'Constructora Ejemplo', nit: '900123456' },
    },
  ],
}

describe('PersonalTab', () => {
  it('muestra esqueletos de carga mientras no hay datos', () => {
    const { container } = renderTab({ personal: { estado: 'loading', error: null, data: null } })
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0)
  })

  it('muestra el ErrorState cuando la carga falla', () => {
    // El montaje siempre dispara personalRequest(slug) (fetch real al activar
    // el tab), así que un estado 'failed' precargado no sirve: se pisa con
    // 'loading' apenas monta (mismo caso que ProcesoFichaPage.test.tsx). Se
    // simula la falla como lo haría la saga, despachándola tras el montaje.
    const { store } = renderTab({})
    act(() => {
      store.dispatch(personalFailure('No se pudo cargar el personal.'))
    })
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('No se pudo cargar el personal.')).toBeInTheDocument()
  })

  it('muestra el EmptyState cuando no hay personal ni operadores', () => {
    renderTab({
      personal: {
        estado: 'succeeded',
        error: null,
        data: { vigente: [], historico: [], operadores: [] },
      },
    })
    expect(screen.getByText('Sin personal')).toBeInTheDocument()
  })

  it('muestra tarjetas por tipo, operadores y el comparativo de vigencias', () => {
    renderTab({ personal: { estado: 'succeeded', error: null, data: datosBase } })

    // "Operarios" aparece tres veces: tarjeta del tipo, grupo de operadores del corte y fila del comparativo.
    expect(screen.getAllByText('Operarios').length).toBe(3)
    expect(screen.getByText('Constructora Ejemplo')).toBeInTheDocument()
    // Dos vigencias en el histórico (2025 y 2026): se fuerza el comparativo.
    expect(screen.getByText('Comparativo por vigencia')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: '2025' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: '2026' })).toBeInTheDocument()
  })

  it('pasa las series correctas (actual/pendiente) al gráfico ECharts', () => {
    renderTab({ personal: { estado: 'succeeded', error: null, data: datosBase } })

    const grafico = screen.getByTestId('grafico-personal')
    const series = JSON.parse(grafico.getAttribute('data-option') ?? '[]') as {
      name: string
      data: number[]
    }[]

    expect(series.map((s) => ({ name: s.name, data: s.data }))).toEqual([
      { name: 'Actual', data: [8] },
      { name: 'Pendiente', data: [2] },
    ])
  })

  it('no fuerza el comparativo cuando solo hay una vigencia', () => {
    renderTab({
      personal: {
        estado: 'succeeded',
        error: null,
        data: { ...datosBase, historico: [datosBase.historico[0]] },
      },
    })
    expect(screen.queryByText('Comparativo por vigencia')).not.toBeInTheDocument()
  })
})
