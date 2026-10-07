import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@mui/material/styles'
import { theme } from '@/app/theme/theme'
import { http } from '@/shared/api/http'
import type { PersonalCorte } from '@/shared/types'
import { EditarCorteDialog } from './EditarCorteDialog'

// El diálogo hace el PATCH directo (sin saga): basta con mockear el cliente.
vi.mock('@/shared/api/http', () => ({
  http: { patch: vi.fn() },
}))

const patchMock = vi.mocked(http.patch)

const corte: PersonalCorte = {
  id: 'corte-1',
  tipoPersonalId: 1,
  vigencia: 2026,
  actual: 8,
  // Valor crudo guardado (null): la vista calcularía otro pendiente.
  pendiente: null,
  meta: 10,
  fechaFinal: '2026-12-31',
  observaciones: 'Nota previa',
  linksSecop: [],
}

function renderDialogo(onGuardado = vi.fn(), onClose = vi.fn()) {
  render(
    <ThemeProvider theme={theme}>
      <EditarCorteDialog open corte={corte} nombreTipo="Operarios" onClose={onClose} onGuardado={onGuardado} />
    </ThemeProvider>,
  )
  return { onGuardado, onClose }
}

describe('EditarCorteDialog', () => {
  beforeEach(() => {
    patchMock.mockReset()
  })

  it('precarga los valores crudos del corte', () => {
    renderDialogo()
    expect(screen.getByText('Editar Operarios · vigencia 2026')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Actual/)).toHaveValue(8)
    expect(screen.getByLabelText(/^Pendiente/)).toHaveValue(null)
    expect(screen.getByLabelText(/^Meta/)).toHaveValue(10)
    expect(screen.getByLabelText(/^Fecha final/)).toHaveValue('2026-12-31')
    expect(screen.getByLabelText(/^Observaciones/)).toHaveValue('Nota previa')
  })

  it('al guardar hace PATCH con el payload del corte y avisa', async () => {
    const usuario = userEvent.setup()
    patchMock.mockResolvedValueOnce({ data: {} })
    const { onGuardado } = renderDialogo()

    const actual = screen.getByLabelText(/^Actual/)
    await usuario.clear(actual)
    await usuario.type(actual, '9')
    await usuario.type(screen.getByLabelText(/^Pendiente/), '1')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(onGuardado).toHaveBeenCalledTimes(1))
    expect(patchMock).toHaveBeenCalledWith('/personal/cortes/corte-1', {
      actual: 9,
      pendiente: 1,
      meta: 10,
      fechaFinal: '2026-12-31',
      observaciones: 'Nota previa',
    })
  })

  it('muestra el error de la API y no avisa guardado', async () => {
    const usuario = userEvent.setup()
    patchMock.mockRejectedValueOnce({
      response: { data: { message: 'Sin permiso sobre el frente.' } },
    })
    const { onGuardado } = renderDialogo()

    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Sin permiso sobre el frente.')).toBeInTheDocument()
    expect(onGuardado).not.toHaveBeenCalled()
  })
})
