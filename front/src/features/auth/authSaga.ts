import { call, put, takeLatest } from 'redux-saga/effects'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { AxiosError } from 'axios'
import { http } from '@/shared/api/http'
import { endpoints } from '@/shared/api/endpoints'
import { setAccessToken } from '@/shared/api/tokenStore'
import type { LoginRequest, TokensRespuesta, UsuarioMe } from '@/shared/types'
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
// del refresh y, si funciona, trae el usuario. Silencioso: si falla, el
// usuario simplemente queda sin sesión (no se muestra error).
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
    yield put(bootstrapFailure())
  }
}

export function* authWatcherSaga() {
  yield takeLatest(loginRequest.type, manejarLogin)
  yield takeLatest(logoutRequest.type, manejarLogout)
  yield takeLatest(bootstrapRequest.type, manejarBootstrap)
}
