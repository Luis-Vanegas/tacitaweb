// Espejo de back/src/modules/importacion (importacion.controller.ts / .service.ts).
export type TipoImportacion = 'procesos' | 'personal'

export interface ErrorImportacion {
  fila: number
  columna?: string
  mensaje: string
}

// Respuesta de POST /importacion/:tipo. Con confirmar=false es una vista
// previa (nada se escribe); con confirmar=true solo se escribe si no hay errores.
export interface ResultadoImportacion {
  total: number
  creados: number
  actualizados: number
  sinCambios: number
  errores: ErrorImportacion[]
  confirmado: boolean
}
