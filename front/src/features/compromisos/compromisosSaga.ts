import { call, put, takeLatest } from 'redux-saga/effects'
import type { AxiosError } from 'axios'
import { http } from '@/shared/api/http'
import { endpoints } from '@/shared/api/endpoints'
import type { Compromiso } from '@/shared/types'
import { compromisosFailure, compromisosRequest, compromisosSuccess } from './compromisosSlice'

function* manejarCompromisos() {
  try {
    const { data }: { data: Compromiso[] } = yield call(http.get, endpoints.compromisos)
    yield put(compromisosSuccess(data))
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>
    yield put(compromisosFailure(axiosError.response?.data?.message ?? 'No se pudieron cargar los compromisos.'))
  }
}

export function* compromisosWatcherSaga() {
  yield takeLatest(compromisosRequest.type, manejarCompromisos)
}
