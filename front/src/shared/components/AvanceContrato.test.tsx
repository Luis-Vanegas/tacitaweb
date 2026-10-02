import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { ProcesoDetalle } from '@/shared/types'
import { AvanceContrato } from './AvanceContrato'

const base = { valorContrato: null, ejecucionFinanciera: null, rutas: [] } as unknown as ProcesoDetalle

describe('AvanceContrato', () => {
  it('no dibuja nada sin valor ni rutas', () => {
    const { container } = render(<AvanceContrato proceso={base} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('muestra el % ejecutado y el paso actual de la ruta con su responsable', () => {
    render(
      <AvanceContrato
        proceso={{
          ...base,
          valorContrato: 1000,
          ejecucionFinanciera: 250,
          rutas: [
            { codigo: 'SELECCION', ruta: 'Proceso de selección', paso: 'Verificación habilitante', orden: 10, total: 18, responsable: 'Dependencia-Suministros', termino: null },
          ],
        }}
      />,
    )
    expect(screen.getByText(/\(25%\)/)).toBeInTheDocument()
    expect(screen.getByText('Paso 10 de 18')).toBeInTheDocument()
    expect(screen.getByText('Verificación habilitante')).toBeInTheDocument()
    expect(screen.getByText('Responsable: Dependencia-Suministros')).toBeInTheDocument()
  })

  it('marca la ruta como completada en el último paso', () => {
    render(
      <AvanceContrato
        proceso={{
          ...base,
          rutas: [{ codigo: 'DIRECTO', ruta: 'Contratación directa', paso: 'Inicio', orden: 15, total: 15, responsable: null, termino: null }],
        }}
      />,
    )
    expect(screen.getByText('Completada · Inicio')).toBeInTheDocument()
  })
})
