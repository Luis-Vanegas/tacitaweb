import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { theme } from '@/app/theme/theme'
import { PlazoBar } from './PlazoBar'

function renderConTema(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>)
}

describe('PlazoBar', () => {
  it('muestra los días restantes cuando el contrato está vigente', () => {
    renderConTema(<PlazoBar pctPlazo={40} diasRestantes={12} />)
    expect(screen.getByText('12 d restantes')).toBeInTheDocument()
  })

  it('muestra "Vencido hace N d" cuando diasRestantes es negativo', () => {
    renderConTema(<PlazoBar pctPlazo={100} diasRestantes={-5} />)
    expect(screen.getByText('Vencido hace 5 d')).toBeInTheDocument()
  })

  it('muestra "Vence hoy" cuando diasRestantes es 0', () => {
    renderConTema(<PlazoBar pctPlazo={99} diasRestantes={0} />)
    expect(screen.getByText('Vence hoy')).toBeInTheDocument()
  })

  it('muestra "Sin fecha" cuando diasRestantes es null', () => {
    renderConTema(<PlazoBar pctPlazo={null} diasRestantes={null} />)
    expect(screen.getByText('Sin fecha')).toBeInTheDocument()
  })

  it('la barra usa color de error cuando el contrato está vencido', () => {
    renderConTema(<PlazoBar pctPlazo={100} diasRestantes={-3} />)
    const barra = screen.getByRole('progressbar')
    expect(barra.className).toMatch(/colorError/)
  })
})
