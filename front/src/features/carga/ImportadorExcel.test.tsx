import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@mui/material/styles'
import { theme } from '@/app/theme/theme'
import type { ResultadoImportacion } from '@/shared/types'
import { http } from '@/shared/api/http'
import { ImportadorExcel } from './ImportadorExcel'

// Se mockea el cliente http (no la red): el componente hace las llamadas
// directo, sin saga, así que basta con controlar lo que devuelve axios.
vi.mock('@/shared/api/http', () => ({
  http: { get: vi.fn(), post: vi.fn() },
}))

const postMock = vi.mocked(http.post)

function resultado(parcial: Partial<ResultadoImportacion> = {}): ResultadoImportacion {
  return { total: 2, creados: 1, actualizados: 1, sinCambios: 0, errores: [], confirmado: false, ...parcial }
}

function archivoXlsx(nombre = 'datos.xlsx') {
  return new File(['contenido'], nombre, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

function renderImportador() {
  render(
    <ThemeProvider theme={theme}>
      <ImportadorExcel tipo="procesos" />
    </ThemeProvider>,
  )
}

describe('ImportadorExcel', () => {
  beforeEach(() => {
    postMock.mockReset()
  })

  it('con errores en la vista previa muestra la fila y no deja confirmar', async () => {
    const usuario = userEvent.setup()
    postMock.mockResolvedValueOnce({
      data: resultado({ errores: [{ fila: 3, columna: 'Actividad', mensaje: 'La actividad no existe' }] }),
    })
    renderImportador()

    await usuario.upload(screen.getByLabelText(/seleccionar archivo/i), archivoXlsx())
    expect(screen.getByText('datos.xlsx')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Validar' }))

    expect(await screen.findByText('La actividad no existe')).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Actividad' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '3' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmar carga' })).toBeDisabled()
    expect(postMock).toHaveBeenCalledTimes(1)
    expect(postMock.mock.calls[0][2]).toEqual({ params: { confirmar: false } })
  })

  it('con vista previa limpia confirma con confirmar=true y muestra el resultado', async () => {
    const usuario = userEvent.setup()
    postMock
      .mockResolvedValueOnce({ data: resultado() })
      .mockResolvedValueOnce({ data: resultado({ confirmado: true }) })
    renderImportador()

    await usuario.upload(screen.getByLabelText(/seleccionar archivo/i), archivoXlsx())
    await usuario.click(screen.getByRole('button', { name: 'Validar' }))

    const confirmar = await screen.findByRole('button', { name: 'Confirmar carga' })
    expect(confirmar).toBeEnabled()
    await usuario.click(confirmar)

    expect(await screen.findByText(/carga completada/i)).toBeInTheDocument()
    expect(postMock).toHaveBeenCalledTimes(2)
    const [url, cuerpo, config] = postMock.mock.calls[1]
    expect(url).toBe('/importacion/procesos')
    expect((cuerpo as FormData).get('archivo')).toBeInstanceOf(File)
    expect(config).toEqual({ params: { confirmar: true } })
  })

  it('rechaza archivos de más de 5 MB sin llamar a la API', async () => {
    const usuario = userEvent.setup()
    renderImportador()
    const grande = archivoXlsx('grande.xlsx')
    Object.defineProperty(grande, 'size', { value: 6 * 1024 * 1024 })

    await usuario.upload(screen.getByLabelText(/seleccionar archivo/i), grande)

    expect(screen.getByText(/supera el máximo de 5 MB/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Validar' })).toBeDisabled()
  })
})
