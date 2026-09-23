import { call, put, takeLatest } from 'redux-saga/effects'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { AxiosError } from 'axios'
import { http } from '@/shared/api/http'
import { endpoints } from '@/shared/api/endpoints'
import type { PersonalFrenteRespuesta } from '@/shared/types'
import { personalFailure, personalRequest, personalSuccess } from './personalSlice'

function* manejarPersonal(action: PayloadAction<string>) {
  try {
    const { data }: { data: PersonalFrenteRespuesta } = yield call(
      http.get,
      endpoints.frentes.personal(action.payload),
    )
    yield put(personalSuccess(data))
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>
    yield put(
      personalFailure(
        axiosError.response?.data?.message ?? 'No se pudo cargar el personal del frente.',
      ),
    )
  }
}

export function* personalWatcherSaga() {
  yield takeLatest(personalRequest.type, manejarPersonal)
}
