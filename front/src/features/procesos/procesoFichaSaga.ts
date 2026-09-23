import { call, put, takeLatest } from 'redux-saga/effects'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { AxiosError } from 'axios'
import { http } from '@/shared/api/http'
import { endpoints } from '@/shared/api/endpoints'
import type { ProcesoFicha } from '@/shared/types'
import {
  procesoFichaFailure,
  procesoFichaRequest,
  procesoFichaSuccess,
} from './procesoFichaSlice'

function* manejarProcesoFicha(action: PayloadAction<string>) {
  try {
    const { data }: { data: ProcesoFicha } = yield call(
      http.get,
      endpoints.procesos.detalle(action.payload),
    )
    yield put(procesoFichaSuccess(data))
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>
    yield put(
      procesoFichaFailure(
        axiosError.response?.data?.message ?? 'No se pudo cargar el proceso.',
      ),
    )
  }
}

export function* procesoFichaWatcherSaga() {
  yield takeLatest(procesoFichaRequest.type, manejarProcesoFicha)
}
