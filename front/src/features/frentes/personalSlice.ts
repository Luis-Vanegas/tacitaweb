import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { EstadoCarga, PersonalFrenteRespuesta } from '@/shared/types'

interface PersonalState {
  estado: EstadoCarga
  error: string | null
  data: PersonalFrenteRespuesta | null
}

const initialState: PersonalState = {
  estado: 'idle',
  error: null,
  data: null,
}

const personalSlice = createSlice({
  name: 'personal',
  initialState,
  reducers: {
    personalRequest: (state, _action: PayloadAction<string>) => {
      state.estado = 'loading'
      state.error = null
    },
    personalSuccess: (state, action: PayloadAction<PersonalFrenteRespuesta>) => {
      state.estado = 'succeeded'
      state.data = action.payload
    },
    personalFailure: (state, action: PayloadAction<string>) => {
      state.estado = 'failed'
      state.error = action.payload
    },
    limpiarPersonal: (state) => {
      state.estado = 'idle'
      state.error = null
      state.data = null
    },
  },
})

export const { personalRequest, personalSuccess, personalFailure, limpiarPersonal } =
  personalSlice.actions

export default personalSlice.reducer
