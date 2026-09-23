import { call, put, takeLatest } from 'redux-saga/effects'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { AxiosError } from 'axios'
import { http } from '@/shared/api/http'
import { endpoints } from '@/shared/api/endpoints'
import type { FrenteDetalle, ResumenFrenteApi } from '@/shared/types'
import { normalizarFrenteDetalle, normalizarResumenFrente } from '@/shared/utils/normalizar'
import {
  frenteDetalleFailure,
  frenteDetalleRequest,
  frenteDetalleSuccess,
  frentesListarFailure,
  frentesListarRequest,
  frentesListarSuccess,
} from './frentesSlice'

function mensajeError(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<{ message?: string }>
  return axiosError.response?.data?.message ?? fallback
}

function* manejarListar() {
  try {
    const { data }: { data: ResumenFrenteApi[] } = yield call(
      http.get,
      endpoints.frentes.listar,
    )
    yield put(frentesListarSuccess(data.map(normalizarResumenFrente)))
  } catch (error) {
    yield put(
      frentesListarFailure(mensajeError(error, 'No se pudieron cargar los frentes.')),
    )
  }
}

function* manejarDetalle(action: PayloadAction<string>) {
  try {
    const { data }: { data: FrenteDetalle } = yield call(
      http.get,
      endpoints.frentes.detalle(action.payload),
    )
    yield put(frenteDetalleSuccess(normalizarFrenteDetalle(data)))
  } catch (error) {
    yield put(
      frenteDetalleFailure(mensajeError(error, 'No se pudo cargar el frente.')),
    )
  }
}

export function* frentesWatcherSaga() {
  yield takeLatest(frentesListarRequest.type, manejarListar)
  yield takeLatest(frenteDetalleRequest.type, manejarDetalle)
}
