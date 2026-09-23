// Espejo de back/src/modules/usuarios (crear-usuario.dto.ts, actualizar-usuario.dto.ts,
// usuario-respuesta.dto.ts). `RolUsuario` ya vive en auth.ts: no se duplica acá.
import type { RolUsuario } from './auth'

export interface FrenteAsignable {
  id: number
  nombre: string
  slug: string
}

// GET/POST/PATCH /usuarios devuelven esta forma (nunca el hash de password).
export interface UsuarioRespuesta {
  id: string
  email: string
  nombre: string
  rol: RolUsuario
  activo: boolean
  ultimoAcceso: string | null
  frentes: FrenteAsignable[]
}

// Body de POST /usuarios.
export interface CrearUsuarioPayload {
  email: string
  nombre: string
  password: string
  rol: RolUsuario
  activo?: boolean
  frentes?: number[]
}

// Body de PATCH /usuarios/:id — todo opcional, incluida la password.
export type ActualizarUsuarioPayload = Partial<CrearUsuarioPayload>
