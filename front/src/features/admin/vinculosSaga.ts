import { call, put, takeEvery } from 'redux-saga/effects'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { AxiosError } from 'axios'
import { http } from '@/shared/api/http'
import { endpoints } from '@/shared/api/endpoints'
import {
  desvincularProcesoFailure,
  desvincularProcesoRequest,
  desvincularProcesoSuccess,
  vincularProcesoFailure,
  vincularProcesoRequest,
  vincularProcesoSuccess,
  type DesvincularProcesoPayload,
  type VincularProcesoPayload,
} from './vinculosSlice'

function mensajeError(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<{ message?: string }>
  return axiosError.response?.data?.message ?? fallback
}

function* manejarVincular(action: PayloadAction<VincularProcesoPayload>) {
  const { slug, id, nota } = action.payload
  try {
    yield call(http.put, endpoints.frentes.vincularProceso(slug, id), { nota })
    yield put(vincularProcesoSuccess())
  } catch (error) {
    yield put(vincularProcesoFailure(mensajeError(error, 'No se pudo vincular el proceso.')))
  }
}

function* manejarDesvincular(action: PayloadAction<DesvincularProcesoPayload>) {
  const { slug, id } = action.payload
  try {
    yield call(http.delete, endpoints.frentes.desvincularProceso(slug, id))
    yield put(desvincularProcesoSuccess())
  } catch (error) {
    yield put(
      desvincularProcesoFailure(mensajeError(error, 'No se pudo desvincular el proceso.')),
    )
  }
}

export function* vinculosWatcherSaga() {
  yield takeEvery(vincularProcesoRequest.type, manejarVincular)
  yield takeEvery(desvincularProcesoRequest.type, manejarDesvincular)
}
