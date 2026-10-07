import { call, put, takeEvery, takeLatest } from 'redux-saga/effects'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { AxiosError } from 'axios'
import { http } from '@/shared/api/http'
import { endpoints } from '@/shared/api/endpoints'
import type { ActualizarCompromisoConId, Compromiso, CrearCompromisoPayload } from '@/shared/types'
import {
  compromisoActualizarRequest,
  compromisoCrearRequest,
  compromisoEliminarRequest,
  compromisoMutacionFailure,
  compromisoMutacionSuccess,
  compromisosFailure,
  compromisosRequest,
  compromisosSuccess,
} from './compromisosSlice'

function mensajeError(error: unknown, fallback: string): string {
  return (error as AxiosError<{ message?: string }>).response?.data?.message ?? fallback
}

function* manejarCompromisos() {
  try {
    const { data }: { data: Compromiso[] } = yield call(http.get, endpoints.compromisos.listar)
    yield put(compromisosSuccess(data))
  } catch (error) {
    yield put(compromisosFailure(mensajeError(error, 'No se pudieron cargar los compromisos.')))
  }
}

function* manejarCrear(action: PayloadAction<CrearCompromisoPayload>) {
  try {
    yield call(http.post, endpoints.compromisos.crear, action.payload)
    yield put(compromisoMutacionSuccess())
  } catch (error) {
    yield put(compromisoMutacionFailure(mensajeError(error, 'No se pudo crear el compromiso.')))
  }
}

function* manejarActualizar(action: PayloadAction<ActualizarCompromisoConId>) {
  try {
    yield call(http.patch, endpoints.compromisos.actualizar(action.payload.id), action.payload.payload)
    yield put(compromisoMutacionSuccess())
  } catch (error) {
    yield put(compromisoMutacionFailure(mensajeError(error, 'No se pudo actualizar el compromiso.')))
  }
}

function* manejarEliminar(action: PayloadAction<number>) {
  try {
    yield call(http.delete, endpoints.compromisos.eliminar(action.payload))
    yield put(compromisoMutacionSuccess())
  } catch (error) {
    yield put(compromisoMutacionFailure(mensajeError(error, 'No se pudo eliminar el compromiso.')))
  }
}

export function* compromisosWatcherSaga() {
  yield takeLatest(compromisosRequest.type, manejarCompromisos)
  yield takeEvery(compromisoCrearRequest.type, manejarCrear)
  yield takeEvery(compromisoActualizarRequest.type, manejarActualizar)
  yield takeEvery(compromisoEliminarRequest.type, manejarEliminar)
}
