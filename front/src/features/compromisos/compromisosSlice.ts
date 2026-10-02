import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Compromiso, EstadoCarga } from '@/shared/types'

interface CompromisosState {
  estado: EstadoCarga
  error: string | null
  items: Compromiso[]
}

const initialState: CompromisosState = { estado: 'idle', error: null, items: [] }

const compromisosSlice = createSlice({
  name: 'compromisos',
  initialState,
  reducers: {
    compromisosRequest: (state) => {
      state.estado = 'loading'
      state.error = null
    },
    compromisosSuccess: (state, action: PayloadAction<Compromiso[]>) => {
      state.estado = 'succeeded'
      state.items = action.payload
    },
    compromisosFailure: (state, action: PayloadAction<string>) => {
      state.estado = 'failed'
      state.error = action.payload
    },
  },
})

export const { compromisosRequest, compromisosSuccess, compromisosFailure } = compromisosSlice.actions

export default compromisosSlice.reducer
