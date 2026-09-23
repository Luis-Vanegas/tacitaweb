// Espejo de GET /frentes/:slug/personal (FrentesService.obtenerPersonal):
// core.v_personal_vigente, core.personal_corte y core.personal_operador.
export interface VPersonalVigente {
  corteId: string
  tipoPersonalId: number
  tipoPersonal: string
  dependenciaId: number
  vigencia: number
  actual: number
  pendiente: number
  meta: number
  fechaFinal: string | null
  observaciones: string | null
  linksSecop: string[]
}

// Histórico completo (todas las vigencias, ej. 2025 y 2026): permite comparar
// año a año agrupando por `vigencia` sin necesitar un endpoint nuevo.
export interface PersonalCorte {
  id: string
  tipoPersonalId: number
  vigencia: number
  actual: number
  pendiente: number | null
  meta: number | null
  fechaFinal: string | null
  observaciones: string | null
  linksSecop: string[]
}

export interface PersonalOperadorContratista {
  id: number
  nombre: string
  nit: string | null
}

export interface PersonalOperador {
  id: string
  corteId: string
  contratistaId: number
  cantidad: number | null
  fechaFinal: string | null
  procesoId: string | null
  contratista: PersonalOperadorContratista
}

export interface PersonalFrenteRespuesta {
  vigente: VPersonalVigente[]
  historico: PersonalCorte[]
  operadores: PersonalOperador[]
}
