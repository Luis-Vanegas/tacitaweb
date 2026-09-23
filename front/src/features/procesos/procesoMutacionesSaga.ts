import { call, put, takeEvery } from 'redux-saga/effects'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { AxiosError } from 'axios'
import { http } from '@/shared/api/http'
import { endpoints } from '@/shared/api/endpoints'
import type {
  CrearProcesoPayload,
  ProcesoDetalle,
  Seguimiento,
} from '@/shared/types'
import {
  actualizarProcesoFailure,
  actualizarProcesoRequest,
  actualizarProcesoSuccess,
  cambiarEstadoFailure,
  cambiarEstadoRequest,
  cambiarEstadoSuccess,
  crearNotaFailure,
  crearNotaRequest,
  crearNotaSuccess,
  crearProcesoFailure,
  crearProcesoRequest,
  crearProcesoSuccess,
  type ActualizarProcesoPayloadConId,
  type CambiarEstadoPayloadConId,
  type CrearNotaPayloadConId,
} from './procesoMutacionesSlice'

function mensajeError(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<{ message?: string }>
  return axiosError.response?.data?.message ?? fallback
}

function* manejarCrear(action: PayloadAction<CrearProcesoPayload>) {
  try {
    const { data }: { data: ProcesoDetalle } = yield call(
      http.post,
      endpoints.procesos.crear,
      action.payload,
    )
    yield put(crearProcesoSuccess(data))
  } catch (error) {
    yield put(crearProcesoFailure(mensajeError(error, 'No se pudo crear el proceso.')))
  }
}

function* manejarActualizar(action: PayloadAction<ActualizarProcesoPayloadConId>) {
  const { id, payload } = action.payload
  try {
    const { data }: { data: ProcesoDetalle } = yield call(
      http.patch,
      endpoints.procesos.actualizar(id),
      payload,
    )
    yield put(actualizarProcesoSuccess(data))
  } catch (error) {
    yield put(
      actualizarProcesoFailure(mensajeError(error, 'No se pudo actualizar el proceso.')),
    )
  }
}

function* manejarCambiarEstado(action: PayloadAction<CambiarEstadoPayloadConId>) {
  const { id, payload } = action.payload
  try {
    const { data }: { data: ProcesoDetalle } = yield call(
      http.patch,
      endpoints.procesos.cambiarEstado(id),
      payload,
    )
    yield put(cambiarEstadoSuccess(data))
  } catch (error) {
    yield put(
      cambiarEstadoFailure(mensajeError(error, 'No se pudo cambiar el estado del proceso.')),
    )
  }
}

function* manejarCrearNota(action: PayloadAction<CrearNotaPayloadConId>) {
  const { procesoId, payload } = action.payload
  try {
    const { data }: { data: Seguimiento } = yield call(
      http.post,
      endpoints.seguimiento.crear(procesoId),
      payload,
    )
    yield put(crearNotaSuccess(data))
  } catch (error) {
    yield put(crearNotaFailure(mensajeError(error, 'No se pudo agregar la nota.')))
  }
}

export function* procesoMutacionesWatcherSaga() {
  // takeEvery (no takeLatest): dos guardados seguidos son dos intentos
  // distintos que el usuario espera ver reflejados, no que se cancele el primero.
  yield takeEvery(crearProcesoRequest.type, manejarCrear)
  yield takeEvery(actualizarProcesoRequest.type, manejarActualizar)
  yield takeEvery(cambiarEstadoRequest.type, manejarCambiarEstado)
  yield takeEvery(crearNotaRequest.type, manejarCrearNota)
}
