import { call, put, takeEvery, takeLatest } from 'redux-saga/effects'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { AxiosError } from 'axios'
import { http } from '@/shared/api/http'
import { endpoints } from '@/shared/api/endpoints'
import type { CrearUsuarioPayload, UsuarioRespuesta } from '@/shared/types'
import {
  usuarioActualizarFailure,
  usuarioActualizarRequest,
  usuarioActualizarSuccess,
  usuarioCrearFailure,
  usuarioCrearRequest,
  usuarioCrearSuccess,
  usuarioEliminarFailure,
  usuarioEliminarRequest,
  usuarioEliminarSuccess,
  usuariosListarFailure,
  usuariosListarRequest,
  usuariosListarSuccess,
  type ActualizarUsuarioPayloadConId,
} from './usuariosSlice'

function mensajeError(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<{ message?: string }>
  return axiosError.response?.data?.message ?? fallback
}

function* manejarListar() {
  try {
    const { data }: { data: UsuarioRespuesta[] } = yield call(
      http.get,
      endpoints.usuarios.listar,
    )
    yield put(usuariosListarSuccess(data))
  } catch (error) {
    yield put(usuariosListarFailure(mensajeError(error, 'No se pudieron cargar los usuarios.')))
  }
}

function* manejarCrear(action: PayloadAction<CrearUsuarioPayload>) {
  try {
    const { data }: { data: UsuarioRespuesta } = yield call(
      http.post,
      endpoints.usuarios.crear,
      action.payload,
    )
    yield put(usuarioCrearSuccess(data))
  } catch (error) {
    yield put(usuarioCrearFailure(mensajeError(error, 'No se pudo crear el usuario.')))
  }
}

function* manejarActualizar(action: PayloadAction<ActualizarUsuarioPayloadConId>) {
  const { id, payload } = action.payload
  try {
    const { data }: { data: UsuarioRespuesta } = yield call(
      http.patch,
      endpoints.usuarios.actualizar(id),
      payload,
    )
    yield put(usuarioActualizarSuccess(data))
  } catch (error) {
    yield put(
      usuarioActualizarFailure(mensajeError(error, 'No se pudo actualizar el usuario.')),
    )
  }
}

function* manejarEliminar(action: PayloadAction<string>) {
  try {
    yield call(http.delete, endpoints.usuarios.eliminar(action.payload))
    yield put(usuarioEliminarSuccess(action.payload))
  } catch (error) {
    yield put(usuarioEliminarFailure(mensajeError(error, 'No se pudo eliminar el usuario.')))
  }
}

export function* usuariosWatcherSaga() {
  yield takeLatest(usuariosListarRequest.type, manejarListar)
  yield takeEvery(usuarioCrearRequest.type, manejarCrear)
  yield takeEvery(usuarioActualizarRequest.type, manejarActualizar)
  yield takeEvery(usuarioEliminarRequest.type, manejarEliminar)
}
