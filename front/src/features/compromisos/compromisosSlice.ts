import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { ActualizarCompromisoConId, Compromiso, CrearCompromisoPayload, EstadoCarga } from '@/shared/types'

interface CompromisosState {
  estado: EstadoCarga
  error: string | null
  items: Compromiso[]
  // Un solo estado para crear/editar/eliminar: el panel solo permite una
  // mutación a la vez (un diálogo abierto), no hace falta uno por operación.
  mutacion: { estado: EstadoCarga; error: string | null }
}

const initialState: CompromisosState = {
  estado: 'idle',
  error: null,
  items: [],
  mutacion: { estado: 'idle', error: null },
}

function iniciarMutacion(state: CompromisosState) {
  state.mutacion = { estado: 'loading', error: null }
}

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

    compromisoCrearRequest: (state, _action: PayloadAction<CrearCompromisoPayload>) => iniciarMutacion(state),
    compromisoActualizarRequest: (state, _action: PayloadAction<ActualizarCompromisoConId>) => iniciarMutacion(state),
    compromisoEliminarRequest: (state, _action: PayloadAction<number>) => iniciarMutacion(state),
    // El éxito no toca `items`: el panel vuelve a pedir la lista (el orden lo
    // decide el backend) en vez de encadenar sagas, igual que ProcesoFichaPage.
    compromisoMutacionSuccess: (state) => {
      state.mutacion = { estado: 'succeeded', error: null }
    },
    compromisoMutacionFailure: (state, action: PayloadAction<string>) => {
      state.mutacion = { estado: 'failed', error: action.payload }
    },
    limpiarCompromisoMutacion: (state) => {
      state.mutacion = { estado: 'idle', error: null }
    },
  },
})

export const {
  compromisosRequest,
  compromisosSuccess,
  compromisosFailure,
  compromisoCrearRequest,
  compromisoActualizarRequest,
  compromisoEliminarRequest,
  compromisoMutacionSuccess,
  compromisoMutacionFailure,
  limpiarCompromisoMutacion,
} = compromisosSlice.actions

export default compromisosSlice.reducer
