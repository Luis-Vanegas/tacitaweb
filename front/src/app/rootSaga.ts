import { all } from 'redux-saga/effects'
import { authWatcherSaga } from '@/features/auth/authSaga'
import { catalogosWatcherSaga } from '@/features/catalogos/catalogosSaga'
import { frentesWatcherSaga } from '@/features/frentes/frentesSaga'
import { procesosWatcherSaga } from '@/features/procesos/procesosSaga'

export function* rootSaga() {
  yield all([
    authWatcherSaga(),
    catalogosWatcherSaga(),
    frentesWatcherSaga(),
    procesosWatcherSaga(),
  ])
}
