import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@mui/material/styles'
import { theme } from '@/app/theme/theme'
import type { ActividadCatalogo } from '@/shared/types'
import { ProcesoForm } from './ProcesoForm'

const actividades: ActividadCatalogo[] = [
  { id: 7, nombre: 'Recolección de cambuches', dependenciaId: 2, dependencia: 'Secretaría de Seguridad' },
  { id: 3, nombre: 'Atención en calle', dependenciaId: 1, dependencia: 'Inclusión Social' },
]

function renderForm(onGuardar = vi.fn()) {
  render(
    <ThemeProvider theme={theme}>
      <ProcesoForm formId="f" contratistas={[]} actividades={actividades} onGuardar={onGuardar} />
      <button type="submit" form="f">
        Guardar
      </button>
    </ThemeProvider>,
  )
  return onGuardar
}

describe('ProcesoForm', () => {
  it('exige la actividad antes de guardar', async () => {
    const usuario = userEvent.setup()
    const onGuardar = renderForm()

    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('La actividad es obligatoria.')).toBeInTheDocument()
    expect(onGuardar).not.toHaveBeenCalled()
  })

  it('la actividad se elige del catálogo y se envía su id numérico', async () => {
    const usuario = userEvent.setup()
    const onGuardar = renderForm()

    await usuario.click(screen.getByRole('combobox', { name: /actividad/i }))
    await usuario.click(await screen.findByRole('option', { name: 'Recolección de cambuches' }))
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    await vi.waitFor(() => expect(onGuardar).toHaveBeenCalledTimes(1))
    expect(onGuardar.mock.calls[0][0]).toMatchObject({ actividadId: 7, tipo: 'PRINCIPAL' })
  })
})
