import { all, call, put, takeLatest } from 'redux-saga/effects'
import type { AxiosError } from 'axios'
import { http } from '@/shared/api/http'
import { endpoints } from '@/shared/api/endpoints'
import { normalizarResumenFrente } from '@/shared/utils/normalizar'
import type { Paginado, ProcesoDetalle, ResumenFrenteApi } from '@/shared/types'
import { generalFailure, generalRequest, generalSuccess, type FrenteConActividades } from './generalSlice'

// Sin endpoint agregado en el backend: la relación frente↔proceso es N:M
// (un proceso puede estar en más de un frente), así que traer todo de una
// vez y deduplicar es más riesgo que reutilizar lo que ya existe. Se golpea
// el mismo GET /frentes/:slug/procesos que usa cada frente por separado, una
// vez por frente y en paralelo — con 7 frentes el costo de red es mínimo.
// ponytail: pageSize fijo en 100 (el máximo que acepta el backend); subir si
// algún frente supera esa cantidad de procesos activos.
function* manejarGeneral() {
  try {
    const { data: frentesApi }: { data: ResumenFrenteApi[] } = yield call(
      http.get,
      endpoints.frentes.listar,
    )
    const frentes = frentesApi.map(normalizarResumenFrente).sort((a, b) => a.orden - b.orden)

    const respuestas: { data: Paginado<ProcesoDetalle> }[] = yield all(
      frentes.map((frente) =>
        call(http.get, endpoints.frentes.procesos(frente.slug), { params: { pageSize: 100 } }),
      ),
    )

    const resultado: FrenteConActividades[] = frentes.map((frente, i) => ({
      frente,
      procesos: respuestas[i].data.data,
    }))
    yield put(generalSuccess(resultado))
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>
    yield put(
      generalFailure(
        axiosError.response?.data?.message ?? 'No se pudieron cargar las actividades.',
      ),
    )
  }
}

export function* generalWatcherSaga() {
  yield takeLatest(generalRequest.type, manejarGeneral)
}
