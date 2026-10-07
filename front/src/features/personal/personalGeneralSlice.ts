import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { EstadoCarga, PersonalGeneralRespuesta } from '@/shared/types'

// Slice propio (no el de personal por frente): ese lo comparten PersonalTab
// y CortePersonalForm y se limpia al cambiar de frente.
interface PersonalGeneralState {
  estado: EstadoCarga
  error: string | null
  data: PersonalGeneralRespuesta | null
}

const initialState: PersonalGeneralState = {
  estado: 'idle',
  error: null,
  data: null,
}

const personalGeneralSlice = createSlice({
  name: 'personalGeneral',
  initialState,
  reducers: {
    personalGeneralRequest: (state) => {
      state.estado = 'loading'
      state.error = null
    },
    personalGeneralSuccess: (state, action: PayloadAction<PersonalGeneralRespuesta>) => {
      state.estado = 'succeeded'
      state.data = action.payload
    },
    personalGeneralFailure: (state, action: PayloadAction<string>) => {
      state.estado = 'failed'
      state.error = action.payload
    },
  },
})

export const { personalGeneralRequest, personalGeneralSuccess, personalGeneralFailure } = personalGeneralSlice.actions

export default personalGeneralSlice.reducer
