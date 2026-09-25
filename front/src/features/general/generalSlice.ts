import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { EstadoCarga, ProcesoDetalle, ResumenFrente } from '@/shared/types'

export interface FrenteConActividades {
  frente: ResumenFrente
  procesos: ProcesoDetalle[]
}

interface GeneralState {
  estado: EstadoCarga
  error: string | null
  frentes: FrenteConActividades[]
}

const initialState: GeneralState = {
  estado: 'idle',
  error: null,
  frentes: [],
}

const generalSlice = createSlice({
  name: 'general',
  initialState,
  reducers: {
    generalRequest: (state) => {
      state.estado = 'loading'
      state.error = null
    },
    generalSuccess: (state, action: PayloadAction<FrenteConActividades[]>) => {
      state.estado = 'succeeded'
      state.frentes = action.payload
    },
    generalFailure: (state, action: PayloadAction<string>) => {
      state.estado = 'failed'
      state.error = action.payload
    },
  },
})

export const { generalRequest, generalSuccess, generalFailure } = generalSlice.actions

export default generalSlice.reducer
