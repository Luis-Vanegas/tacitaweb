import { describe, expect, it } from 'vitest'
import type { PersonalCorte } from '@/shared/types'
import { buscarCorte, payloadCorte } from './corteExistente'

const corte = (parcial: Partial<PersonalCorte>): PersonalCorte => ({
  id: 'c1',
  tipoPersonalId: 1,
  vigencia: 2026,
  actual: 10,
  pendiente: 2,
  meta: 12,
  fechaFinal: null,
  observaciones: null,
  linksSecop: [],
  ...parcial,
})

describe('buscarCorte', () => {
  const historico = [corte({ id: 'a', vigencia: 2025 }), corte({ id: 'b', vigencia: 2026 }), corte({ id: 'c', tipoPersonalId: 2 })]

  it('encuentra el corte de la misma pareja (tipo, vigencia) → se edita', () => {
    expect(buscarCorte(historico, 1, 2025)?.id).toBe('a')
    expect(buscarCorte(historico, 2, 2026)?.id).toBe('c')
  })

  it('sin coincidencia (o sin tipo/vigencia válidos) → se crea', () => {
    expect(buscarCorte(historico, 1, 2024)).toBeNull()
    expect(buscarCorte(historico, null, 2026)).toBeNull()
    expect(buscarCorte(historico, 1, Number.NaN)).toBeNull()
  })
})

describe('payloadCorte', () => {
  const valores = { actual: '5', pendiente: '', meta: '8', fechaFinal: '', observaciones: '  nota  ' }

  it('crear lleva la clave (tipo, vigencia) y omite opcionales vacíos', () => {
    expect(payloadCorte(valores, { tipoPersonalId: 3, vigencia: 2026 })).toEqual({
      tipoPersonalId: 3,
      vigencia: 2026,
      actual: 5,
      meta: 8,
      observaciones: 'nota',
    })
  })

  it('editar no manda la clave', () => {
    expect(payloadCorte(valores)).toEqual({ actual: 5, meta: 8, observaciones: 'nota' })
  })
})
