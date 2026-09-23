import { call, put, select, takeLatest } from 'redux-saga/effects'
import type { AxiosError } from 'axios'
import { http } from '@/shared/api/http'
import { endpoints } from '@/shared/api/endpoints'
import type { CatalogosRespuesta } from '@/shared/types'
import type { RootState } from '@/app/store'
import { catalogosFailure, catalogosRequest, catalogosSuccess } from './catalogosSlice'

function* manejarCatalogos() {
  // Si ya están cargados, no repetir el fetch: los catálogos cambian poco y
  // el backend ya los cachea 5 min (ver catalogos.service.ts).
  // Ojo: acá NO se puede chequear también 'loading' — para cuando este saga
  // corre, el reducer (síncrono, ya corrió antes en el mismo dispatch) ya
  // dejó el estado en 'loading', así que ese chequeo se dispararía siempre
  // y el fetch real nunca saldría (bug real encontrado al verificar en
  // navegador: /catalogos nunca llegaba a pegarle a la API).
  const estadoActual: RootState['catalogos']['estado'] = yield select(
    (s: RootState) => s.catalogos.estado,
  )
  if (estadoActual === 'succeeded') return

  try {
    const { data }: { data: CatalogosRespuesta } = yield call(
      http.get,
      endpoints.catalogos,
    )
    yield put(catalogosSuccess(data))
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>
    yield put(
      catalogosFailure(
        axiosError.response?.data?.message ?? 'No se pudieron cargar los catálogos.',
      ),
    )
  }
}

export function* catalogosWatcherSaga() {
  yield takeLatest(catalogosRequest.type, manejarCatalogos)
}
