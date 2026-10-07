// Espejo de las entidades reales que expone GET /catalogos
// (back/src/database/entities/{estado-proceso,dependencia,proyecto,contratista}.entity.ts).
export type FaseProceso = 'PRECONTRACTUAL' | 'CONTRACTUAL' | 'POSCONTRACTUAL'

export interface EstadoProceso {
  id: number
  codigo: string
  nombre: string
  fase: FaseProceso
  orden: number
  esAlerta: boolean
  color: string
}

export interface Dependencia {
  id: number
  nombre: string
  sigla: string | null
  slug: string
  activo: boolean
}

export interface Proyecto {
  id: number
  nombre: string
  activo: boolean
}

export interface Contratista {
  id: number
  nombre: string
  nit: string | null
}

export interface CategoriaActividad {
  id: number
  nombre: string
  orden: number
}

// Formas planas de CatalogosService (TipoPersonalCatalogo, ActividadCatalogo):
// no la entidad completa, solo lo que necesitan los selects.
export interface TipoPersonalCatalogo {
  id: number
  nombre: string
}

export interface ActividadCatalogo {
  id: number
  nombre: string
  dependenciaId: number
  dependencia: string
}

export interface CatalogosRespuesta {
  estados: EstadoProceso[]
  dependencias: Dependencia[]
  proyectos: Proyecto[]
  contratistas: Contratista[]
  categoriasActividad: CategoriaActividad[]
  tiposPersonal: TipoPersonalCatalogo[]
  actividades: ActividadCatalogo[]
}
