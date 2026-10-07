import { call, put, takeLatest } from 'redux-saga/effects'
import type { AxiosError } from 'axios'
import { http } from '@/shared/api/http'
import { endpoints } from '@/shared/api/endpoints'
import type { PersonalGeneralRespuesta } from '@/shared/types'
import { personalGeneralFailure, personalGeneralRequest, personalGeneralSuccess } from './personalGeneralSlice'

function* manejarPersonalGeneral() {
  try {
    const { data }: { data: PersonalGeneralRespuesta } = yield call(http.get, endpoints.personal.general)
    yield put(personalGeneralSuccess(data))
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>
    yield put(personalGeneralFailure(axiosError.response?.data?.message ?? 'No se pudo cargar el personal.'))
  }
}

export function* personalGeneralWatcherSaga() {
  yield takeLatest(personalGeneralRequest.type, manejarPersonalGeneral)
}
