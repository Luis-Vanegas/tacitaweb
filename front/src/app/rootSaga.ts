import { all } from 'redux-saga/effects'
import { usuariosWatcherSaga } from '@/features/admin/usuariosSaga'
import { vinculosWatcherSaga } from '@/features/admin/vinculosSaga'
import { authWatcherSaga } from '@/features/auth/authSaga'
import { catalogosWatcherSaga } from '@/features/catalogos/catalogosSaga'
import { frentesWatcherSaga } from '@/features/frentes/frentesSaga'
import { personalWatcherSaga } from '@/features/frentes/personalSaga'
import { procesoFichaWatcherSaga } from '@/features/procesos/procesoFichaSaga'
import { procesoMutacionesWatcherSaga } from '@/features/procesos/procesoMutacionesSaga'
import { procesosWatcherSaga } from '@/features/procesos/procesosSaga'

export function* rootSaga() {
  yield all([
    authWatcherSaga(),
    catalogosWatcherSaga(),
    frentesWatcherSaga(),
    procesosWatcherSaga(),
    procesoFichaWatcherSaga(),
    procesoMutacionesWatcherSaga(),
    personalWatcherSaga(),
    usuariosWatcherSaga(),
    vinculosWatcherSaga(),
  ])
}
