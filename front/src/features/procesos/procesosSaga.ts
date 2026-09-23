import { call, put, takeLatest } from 'redux-saga/effects'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { AxiosError } from 'axios'
import { http } from '@/shared/api/http'
import { endpoints } from '@/shared/api/endpoints'
import type { Paginado, ProcesoDetalle } from '@/shared/types'
import { procesosFailure, procesosRequest, procesosSuccess, type ProcesosRequestPayload } from './procesosSlice'

function* manejarProcesos(action: PayloadAction<ProcesosRequestPayload>) {
  const { slug, filtro } = action.payload
  try {
    const { data }: { data: Paginado<ProcesoDetalle> } = yield call(
      http.get,
      endpoints.frentes.procesos(slug),
      { params: filtro },
    )
    yield put(procesosSuccess(data))
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>
    yield put(
      procesosFailure(
        axiosError.response?.data?.message ?? 'No se pudieron cargar los procesos.',
      ),
    )
  }
}

export function* procesosWatcherSaga() {
  yield takeLatest(procesosRequest.type, manejarProcesos)
}
