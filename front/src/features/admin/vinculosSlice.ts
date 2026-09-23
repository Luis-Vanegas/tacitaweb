import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { EstadoCarga } from '@/shared/types'

export interface VincularProcesoPayload {
  slug: string
  id: string
  nota?: string
}

export interface DesvincularProcesoPayload {
  slug: string
  id: string
}

interface MutacionState {
  estado: EstadoCarga
  error: string | null
}

function estadoInicial(): MutacionState {
  return { estado: 'idle', error: null }
}

interface VinculosState {
  vincular: MutacionState
  desvincular: MutacionState
}

const initialState: VinculosState = {
  vincular: estadoInicial(),
  desvincular: estadoInicial(),
}

const vinculosSlice = createSlice({
  name: 'vinculos',
  initialState,
  reducers: {
    vincularProcesoRequest: (state, _action: PayloadAction<VincularProcesoPayload>) => {
      state.vincular.estado = 'loading'
      state.vincular.error = null
    },
    vincularProcesoSuccess: (state) => {
      state.vincular.estado = 'succeeded'
    },
    vincularProcesoFailure: (state, action: PayloadAction<string>) => {
      state.vincular.estado = 'failed'
      state.vincular.error = action.payload
    },
    limpiarVincularProceso: (state) => {
      state.vincular = estadoInicial()
    },

    desvincularProcesoRequest: (
      state,
      _action: PayloadAction<DesvincularProcesoPayload>,
    ) => {
      state.desvincular.estado = 'loading'
      state.desvincular.error = null
    },
    desvincularProcesoSuccess: (state) => {
      state.desvincular.estado = 'succeeded'
    },
    desvincularProcesoFailure: (state, action: PayloadAction<string>) => {
      state.desvincular.estado = 'failed'
      state.desvincular.error = action.payload
    },
    limpiarDesvincularProceso: (state) => {
      state.desvincular = estadoInicial()
    },
  },
})

export const {
  vincularProcesoRequest,
  vincularProcesoSuccess,
  vincularProcesoFailure,
  limpiarVincularProceso,
  desvincularProcesoRequest,
  desvincularProcesoSuccess,
  desvincularProcesoFailure,
  limpiarDesvincularProceso,
} = vinculosSlice.actions

export default vinculosSlice.reducer
