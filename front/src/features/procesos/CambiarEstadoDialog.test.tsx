import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@mui/material/styles'
import { theme } from '@/app/theme/theme'
import type { EstadoProceso } from '@/shared/types'
import { CambiarEstadoDialog } from './CambiarEstadoDialog'

const estados: EstadoProceso[] = [
  { id: 1, codigo: 'PRECONTRACTUAL', nombre: 'Precontractual', fase: 'PRECONTRACTUAL', orden: 1, esAlerta: false, color: '#17A2B8' },
  { id: 2, codigo: 'EJECUCION', nombre: 'En ejecución', fase: 'CONTRACTUAL', orden: 2, esAlerta: false, color: '#28A745' },
]

function renderDialogo(onGuardar = vi.fn(), onCancelar = vi.fn()) {
  render(
    <ThemeProvider theme={theme}>
      <CambiarEstadoDialog
        open
        estados={estados}
        estadoIdInicial={null}
        guardando={false}
        error={null}
        onGuardar={onGuardar}
        onCancelar={onCancelar}
      />
    </ThemeProvider>,
  )
  return { onGuardar, onCancelar }
}

describe('CambiarEstadoDialog', () => {
  it('el botón Guardar arranca deshabilitado (falta estado y nota)', () => {
    renderDialogo()
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
  })

  it('la nota vacía sigue bloqueando el submit aunque haya estado seleccionado', async () => {
    const usuario = userEvent.setup()
    renderDialogo()

    await usuario.click(screen.getByLabelText(/Nuevo estado/))
    await usuario.click(await screen.findByRole('option', { name: 'En ejecución' }))

    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()

    // Tocar y dejar la nota vacía muestra el error visible.
    await usuario.click(screen.getByLabelText(/Nota/))
    await usuario.tab()
    expect(await screen.findByText('La nota es obligatoria.')).toBeInTheDocument()
  })

  it('habilita el submit y llama a onGuardar con estado y nota cuando ambos están completos', async () => {
    const usuario = userEvent.setup()
    const { onGuardar } = renderDialogo()

    await usuario.click(screen.getByLabelText(/Nuevo estado/))
    await usuario.click(await screen.findByRole('option', { name: 'En ejecución' }))
    await usuario.type(screen.getByLabelText(/Nota/), 'Avance según cronograma')

    const boton = screen.getByRole('button', { name: 'Guardar' })
    expect(boton).toBeEnabled()

    await usuario.click(boton)
    expect(onGuardar).toHaveBeenCalledWith({ estadoId: 2, nota: 'Avance según cronograma' })
  })
})
