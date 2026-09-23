import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { EstadoCarga, LoginRequest, UsuarioSesion } from '@/shared/types'

interface AuthState {
  estado: EstadoCarga
  // El bootstrap (restaurar sesión al recargar via /auth/refresh + /auth/me)
  // tiene su propio estado: no debe mostrar el error de login en pantalla.
  bootstrapCompletado: boolean
  usuario: UsuarioSesion | null
  error: string | null
}

const initialState: AuthState = {
  estado: 'idle',
  bootstrapCompletado: false,
  usuario: null,
  error: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginRequest: (state, _action: PayloadAction<LoginRequest>) => {
      state.estado = 'loading'
      state.error = null
    },
    loginSuccess: (state, action: PayloadAction<UsuarioSesion>) => {
      state.estado = 'succeeded'
      state.usuario = action.payload
      state.error = null
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.estado = 'failed'
      state.error = action.payload
    },
    logoutRequest: () => {},
    sesionCerrada: (state) => {
      state.estado = 'idle'
      state.usuario = null
      state.error = null
      state.bootstrapCompletado = true
    },
    bootstrapRequest: (state) => {
      state.bootstrapCompletado = false
    },
    bootstrapSuccess: (state, action: PayloadAction<UsuarioSesion>) => {
      state.usuario = action.payload
      state.estado = 'succeeded'
      state.bootstrapCompletado = true
    },
    bootstrapFailure: (state) => {
      state.usuario = null
      state.bootstrapCompletado = true
    },
  },
})

export const {
  loginRequest,
  loginSuccess,
  loginFailure,
  logoutRequest,
  sesionCerrada,
  bootstrapRequest,
  bootstrapSuccess,
  bootstrapFailure,
} = authSlice.actions

export default authSlice.reducer
