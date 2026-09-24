import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@mui/material/styles'
import { theme } from '@/app/theme/theme'
import type { ResumenFrente } from '@/shared/types'
import { FrenteCard } from './FrenteCard'

const frenteBase: ResumenFrente = {
  id: 1,
  nombre: 'SIF',
  slug: 'sif',
  descripcion: null,
  color: '#00ABEE',
  icono: 'Construction',
  orden: 1,
  totalProcesos: 34,
  totalActividades: 27,
  precontractual: 5,
  enEjecucion: 20,
  terminados: 9,
  alertas: 3,
  proximosVencer: 2,
  personalActual: 120,
  personalPendiente: 10,
}

function renderConTema(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>)
}

describe('FrenteCard', () => {
  it('muestra el nombre y los conteos del frente', () => {
    renderConTema(<FrenteCard frente={frenteBase} onAbrir={vi.fn()} />)
    expect(screen.getByText('SIF')).toBeInTheDocument()
    expect(screen.getByText('34 procesos')).toBeInTheDocument()
    expect(screen.getByText('3 alertas')).toBeInTheDocument()
    expect(screen.getByText('120 personal')).toBeInTheDocument()
  })

  it('llama a onAbrir con el slug al hacer clic', async () => {
    const onAbrir = vi.fn()
    renderConTema(<FrenteCard frente={frenteBase} onAbrir={onAbrir} />)
    await userEvent.click(screen.getByRole('button', { name: /Abrir frente SIF/ }))
    expect(onAbrir).toHaveBeenCalledWith('sif')
  })

  it('llama a onAbrir al presionar Enter (navegable por teclado)', async () => {
    const onAbrir = vi.fn()
    renderConTema(<FrenteCard frente={frenteBase} onAbrir={onAbrir} />)
    const tarjeta = screen.getByRole('button', { name: /Abrir frente SIF/ })
    tarjeta.focus()
    await userEvent.keyboard('{Enter}')
    expect(onAbrir).toHaveBeenCalledWith('sif')
  })

  it('usa un ícono genérico si frente.icono no existe en @mui/icons-material', () => {
    const frenteConIconoInvalido = { ...frenteBase, icono: 'NoExisteEsteIcono' }
    expect(() =>
      renderConTema(<FrenteCard frente={frenteConIconoInvalido} onAbrir={vi.fn()} />),
    ).not.toThrow()
  })
})
