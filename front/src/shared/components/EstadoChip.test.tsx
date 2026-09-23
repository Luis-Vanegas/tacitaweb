import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { theme } from '@/app/theme/theme'
import { EstadoChip } from './EstadoChip'

function renderConTema(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>)
}

describe('EstadoChip', () => {
  it('muestra el nombre del estado', () => {
    renderConTema(<EstadoChip nombre="En ejecución" color="#28A745" />)
    expect(screen.getByText('En ejecución')).toBeInTheDocument()
  })

  it('agrega "(alerta)" al aria-label cuando esAlerta es true', () => {
    renderConTema(<EstadoChip nombre="Vencido" color="#DC3545" esAlerta />)
    expect(screen.getByLabelText('Estado: Vencido (alerta)')).toBeInTheDocument()
  })

  it('no agrega "(alerta)" cuando esAlerta es false', () => {
    renderConTema(<EstadoChip nombre="Terminado" color="#17A2B8" />)
    expect(screen.getByLabelText('Estado: Terminado')).toBeInTheDocument()
  })
})
