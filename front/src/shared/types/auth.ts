// Espejo de back/src/modules/auth (login.dto.ts, auth.controller.ts, auth.service.ts).
export type RolUsuario = 'ADMIN' | 'EDITOR' | 'LECTOR'

export interface UsuarioSesion {
  id: string
  email: string
  nombre: string
  rol: RolUsuario
}

export interface FrenteAsignado {
  id: number
  nombre: string
  slug: string
}

export interface UsuarioMe extends UsuarioSesion {
  activo: boolean
  frentes: FrenteAsignado[]
}

export interface LoginRequest {
  email: string
  password: string
}

// POST /auth/login y POST /auth/refresh devuelven la misma forma
// (el refresh token viaja en cookie httpOnly, nunca en el body).
export interface TokensRespuesta {
  accessToken: string
  usuario: UsuarioSesion
}
