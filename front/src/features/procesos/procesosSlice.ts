import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { EstadoCarga, FiltroProcesosFrente, Paginado, ProcesoDetalle } from '@/shared/types'

export interface ProcesosRequestPayload {
  slug: string
  filtro: FiltroProcesosFrente
}

interface ProcesosState {
  estado: EstadoCarga
  error: string | null
  data: Paginado<ProcesoDetalle> | null
}

const initialState: ProcesosState = {
  estado: 'idle',
  error: null,
  data: null,
}

const procesosSlice = createSlice({
  name: 'procesos',
  initialState,
  reducers: {
    procesosRequest: (state, _action: PayloadAction<ProcesosRequestPayload>) => {
      state.estado = 'loading'
      state.error = null
    },
    procesosSuccess: (state, action: PayloadAction<Paginado<ProcesoDetalle>>) => {
      state.estado = 'succeeded'
      state.data = action.payload
    },
    procesosFailure: (state, action: PayloadAction<string>) => {
      state.estado = 'failed'
      state.error = action.payload
    },
    limpiarProcesos: (state) => {
      state.estado = 'idle'
      state.error = null
      state.data = null
    },
  },
})

export const { procesosRequest, procesosSuccess, procesosFailure, limpiarProcesos } =
  procesosSlice.actions

export default procesosSlice.reducer
