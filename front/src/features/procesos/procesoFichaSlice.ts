import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { EstadoCarga, ProcesoFicha } from '@/shared/types'

interface ProcesoFichaState {
  estado: EstadoCarga
  error: string | null
  data: ProcesoFicha | null
}

const initialState: ProcesoFichaState = {
  estado: 'idle',
  error: null,
  data: null,
}

const procesoFichaSlice = createSlice({
  name: 'procesoFicha',
  initialState,
  reducers: {
    // Misma acción sirve para la carga inicial y para refetch tras una mutación
    // exitosa (ver procesoMutacionesSlice): el componente vuelve a despachar
    // esto con el mismo id, no hace falta una acción "refetch" separada.
    procesoFichaRequest: (state, _action: PayloadAction<string>) => {
      state.estado = 'loading'
      state.error = null
    },
    procesoFichaSuccess: (state, action: PayloadAction<ProcesoFicha>) => {
      state.estado = 'succeeded'
      state.data = action.payload
    },
    procesoFichaFailure: (state, action: PayloadAction<string>) => {
      state.estado = 'failed'
      state.error = action.payload
    },
    limpiarProcesoFicha: (state) => {
      state.estado = 'idle'
      state.error = null
      state.data = null
    },
  },
})

export const {
  procesoFichaRequest,
  procesoFichaSuccess,
  procesoFichaFailure,
  limpiarProcesoFicha,
} = procesoFichaSlice.actions

export default procesoFichaSlice.reducer
