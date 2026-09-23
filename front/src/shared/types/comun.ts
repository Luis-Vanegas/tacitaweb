// Espejo de back/src/common/dto/paginado.dto.ts — { data: T[], meta: {...} }.
export interface PaginadoMeta {
  page: number
  pageSize: number
  total: number
}

export interface Paginado<T> {
  data: T[]
  meta: PaginadoMeta
}

// Espejo del formato de error de AllExceptionsFilter (back/src/common/filters).
export interface ErrorApi {
  statusCode: number
  error: string
  message: string
  details?: unknown
}

export type EstadoCarga = 'idle' | 'loading' | 'succeeded' | 'failed'
