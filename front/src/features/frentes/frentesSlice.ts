import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { EstadoCarga, ResumenFrente } from '@/shared/types'
import type { FrenteDetalleNormalizado } from '@/shared/utils/normalizar'

interface FrentesState {
  lista: {
    estado: EstadoCarga
    error: string | null
    items: ResumenFrente[]
  }
  detalle: {
    estado: EstadoCarga
    error: string | null
    data: FrenteDetalleNormalizado | null
  }
}

const initialState: FrentesState = {
  lista: { estado: 'idle', error: null, items: [] },
  detalle: { estado: 'idle', error: null, data: null },
}

const frentesSlice = createSlice({
  name: 'frentes',
  initialState,
  reducers: {
    frentesListarRequest: (state) => {
      state.lista.estado = 'loading'
      state.lista.error = null
    },
    frentesListarSuccess: (state, action: PayloadAction<ResumenFrente[]>) => {
      state.lista.estado = 'succeeded'
      state.lista.items = action.payload
    },
    frentesListarFailure: (state, action: PayloadAction<string>) => {
      state.lista.estado = 'failed'
      state.lista.error = action.payload
    },
    frenteDetalleRequest: (state, _action: PayloadAction<string>) => {
      state.detalle.estado = 'loading'
      state.detalle.error = null
    },
    frenteDetalleSuccess: (
      state,
      action: PayloadAction<FrenteDetalleNormalizado>,
    ) => {
      state.detalle.estado = 'succeeded'
      state.detalle.data = action.payload
    },
    frenteDetalleFailure: (state, action: PayloadAction<string>) => {
      state.detalle.estado = 'failed'
      state.detalle.error = action.payload
    },
    limpiarFrenteDetalle: (state) => {
      state.detalle = { estado: 'idle', error: null, data: null }
    },
  },
})

export const {
  frentesListarRequest,
  frentesListarSuccess,
  frentesListarFailure,
  frenteDetalleRequest,
  frenteDetalleSuccess,
  frenteDetalleFailure,
  limpiarFrenteDetalle,
} = frentesSlice.actions

export default frentesSlice.reducer
