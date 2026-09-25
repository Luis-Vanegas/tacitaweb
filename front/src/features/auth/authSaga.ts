import { call, put, takeLatest } from 'redux-saga/effects'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { AxiosError } from 'axios'
import { http } from '@/shared/api/http'
import { endpoints } from '@/shared/api/endpoints'
import { setAccessToken } from '@/shared/api/tokenStore'
import type { LoginRequest, TokensRespuesta, UsuarioMe, UsuarioSesion } from '@/shared/types'
import {
  bootstrapFailure,
  bootstrapRequest,
  bootstrapSuccess,
  loginFailure,
  loginRequest,
  loginSuccess,
  logoutRequest,
  sesionCerrada,
} from './authSlice'

function mensajeError(error: unknown): string {
  const axiosError = error as AxiosError<{ message?: string }>
  return axiosError.response?.data?.message ?? 'No se pudo iniciar sesión.'
}

// Demo a directivos: entra directo al menú con un usuario fijo (rol LECTOR)
// en vez de mostrar el login. Sin estas env vars, el comportamiento es el
// normal (login manual). Ver front/.env.example.
const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL as string | undefined
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD as string | undefined

// Devuelve el usuario logueado si el auto-login demo está configurado y
// funciona; null si no aplica (deja que el llamador caiga al comportamiento
// normal, ej. mostrar /login).
function* intentarAutoLoginDemo(): Generator<unknown, UsuarioSesion | null, unknown> {
  if (!DEMO_EMAIL || !DEMO_PASSWORD) return null
  try {
    const { data }: { data: TokensRespuesta } = yield call(http.post, endpoints.auth.login, {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    })
    setAccessToken(data.accessToken)
    return data.usuario
  } catch {
    return null
  }
}

function* manejarLogin(action: PayloadAction<LoginRequest>) {
  try {
    const { data }: { data: TokensRespuesta } = yield call(
      http.post,
      endpoints.auth.login,
      action.payload,
    )
    setAccessToken(data.accessToken)
    yield put(loginSuccess(data.usuario))
  } catch (error) {
    yield put(loginFailure(mensajeError(error)))
  }
}

function* manejarLogout() {
  try {
    yield call(http.post, endpoints.auth.logout)
  } catch {
    // Si /auth/logout falla igual cerramos sesión en el cliente.
  } finally {
    setAccessToken(null)
    yield put(sesionCerrada())
  }
}

// Al montar la app: intenta renovar el access token con la cookie httpOnly
// del refresh y, si funciona, trae el usuario. Si falla y hay auto-login demo
// configurado, entra con ese usuario en vez de mandar a /login.
function* manejarBootstrap() {
  try {
    const { data }: { data: TokensRespuesta } = yield call(
      http.post,
      endpoints.auth.refresh,
    )
    setAccessToken(data.accessToken)
    const me: { data: UsuarioMe } = yield call(http.get, endpoints.auth.me)
    yield put(bootstrapSuccess(me.data))
  } catch {
    setAccessToken(null)
    const usuarioDemo: UsuarioSesion | null = yield call(intentarAutoLoginDemo)
    if (usuarioDemo) {
      yield put(bootstrapSuccess(usuarioDemo))
    } else {
      yield put(bootstrapFailure())
    }
  }
}

// Si la sesión se cierra en medio del uso (refresh fallido, logout manual),
// reintenta el auto-login demo para que la demo quede siempre con sesión.
function* manejarSesionCerrada() {
  const usuarioDemo: UsuarioSesion | null = yield call(intentarAutoLoginDemo)
  if (usuarioDemo) {
    yield put(loginSuccess(usuarioDemo))
  }
}

export function* authWatcherSaga() {
  yield takeLatest(loginRequest.type, manejarLogin)
  yield takeLatest(logoutRequest.type, manejarLogout)
  yield takeLatest(bootstrapRequest.type, manejarBootstrap)
  yield takeLatest(sesionCerrada.type, manejarSesionCerrada)
}
