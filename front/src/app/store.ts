import { configureStore } from '@reduxjs/toolkit'
import createSagaMiddleware from 'redux-saga'
import authReducer, { sesionCerrada } from '@/features/auth/authSlice'
import catalogosReducer from '@/features/catalogos/catalogosSlice'
import frentesReducer from '@/features/frentes/frentesSlice'
import procesosReducer from '@/features/procesos/procesosSlice'
import { registrarOnRefreshFallido } from '@/shared/api/http'
import { rootSaga } from './rootSaga'

const sagaMiddleware = createSagaMiddleware()

export const store = configureStore({
  reducer: {
    auth: authReducer,
    catalogos: catalogosReducer,
    frentes: frentesReducer,
    procesos: procesosReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ thunk: false }).concat(sagaMiddleware),
})

sagaMiddleware.run(rootSaga)

// http.ts no conoce Redux: cuando el refresh automático de un 401 falla,
// avisa acá para limpiar la sesión (ver shared/api/http.ts).
registrarOnRefreshFallido(() => store.dispatch(sesionCerrada()))

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
