// Envoltorio de respuesta para listas, según §2 de PLAN-IMPLEMENTACION.md:
// { data: T[], meta: { page, pageSize, total } }.
export interface PaginadoMeta {
  page: number;
  pageSize: number;
  total: number;
}

export class PaginadoDto<T> {
  data: T[];
  meta: PaginadoMeta;

  constructor(data: T[], meta: PaginadoMeta) {
    this.data = data;
    this.meta = meta;
  }
}
