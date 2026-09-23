import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type {
  ActualizarUsuarioPayload,
  CrearUsuarioPayload,
  EstadoCarga,
  UsuarioRespuesta,
} from '@/shared/types'

export interface ActualizarUsuarioPayloadConId {
  id: string
  payload: ActualizarUsuarioPayload
}

interface MutacionState {
  estado: EstadoCarga
  error: string | null
}

function estadoInicial(): MutacionState {
  return { estado: 'idle', error: null }
}

interface UsuariosState {
  lista: {
    estado: EstadoCarga
    error: string | null
    items: UsuarioRespuesta[]
  }
  crear: MutacionState
  actualizar: MutacionState
  eliminar: MutacionState
}

const initialState: UsuariosState = {
  lista: { estado: 'idle', error: null, items: [] },
  crear: estadoInicial(),
  actualizar: estadoInicial(),
  eliminar: estadoInicial(),
}

const usuariosSlice = createSlice({
  name: 'usuarios',
  initialState,
  reducers: {
    usuariosListarRequest: (state) => {
      state.lista.estado = 'loading'
      state.lista.error = null
    },
    usuariosListarSuccess: (state, action: PayloadAction<UsuarioRespuesta[]>) => {
      state.lista.estado = 'succeeded'
      state.lista.items = action.payload
    },
    usuariosListarFailure: (state, action: PayloadAction<string>) => {
      state.lista.estado = 'failed'
      state.lista.error = action.payload
    },

    usuarioCrearRequest: (state, _action: PayloadAction<CrearUsuarioPayload>) => {
      state.crear.estado = 'loading'
      state.crear.error = null
    },
    // Éxito agrega el usuario a la lista en memoria: evita un refetch completo
    // de /usuarios tras cada alta (mismo criterio que el resto de la app de no
    // encadenar sagas, ver procesoMutacionesSlice).
    usuarioCrearSuccess: (state, action: PayloadAction<UsuarioRespuesta>) => {
      state.crear.estado = 'succeeded'
      state.lista.items.push(action.payload)
    },
    usuarioCrearFailure: (state, action: PayloadAction<string>) => {
      state.crear.estado = 'failed'
      state.crear.error = action.payload
    },
    limpiarUsuarioCrear: (state) => {
      state.crear = estadoInicial()
    },

    usuarioActualizarRequest: (
      state,
      _action: PayloadAction<ActualizarUsuarioPayloadConId>,
    ) => {
      state.actualizar.estado = 'loading'
      state.actualizar.error = null
    },
    usuarioActualizarSuccess: (state, action: PayloadAction<UsuarioRespuesta>) => {
      state.actualizar.estado = 'succeeded'
      const idx = state.lista.items.findIndex((u) => u.id === action.payload.id)
      if (idx !== -1) state.lista.items[idx] = action.payload
    },
    usuarioActualizarFailure: (state, action: PayloadAction<string>) => {
      state.actualizar.estado = 'failed'
      state.actualizar.error = action.payload
    },
    limpiarUsuarioActualizar: (state) => {
      state.actualizar = estadoInicial()
    },

    usuarioEliminarRequest: (state, _action: PayloadAction<string>) => {
      state.eliminar.estado = 'loading'
      state.eliminar.error = null
    },
    usuarioEliminarSuccess: (state, action: PayloadAction<string>) => {
      state.eliminar.estado = 'succeeded'
      state.lista.items = state.lista.items.filter((u) => u.id !== action.payload)
    },
    usuarioEliminarFailure: (state, action: PayloadAction<string>) => {
      state.eliminar.estado = 'failed'
      state.eliminar.error = action.payload
    },
    limpiarUsuarioEliminar: (state) => {
      state.eliminar = estadoInicial()
    },
  },
})

export const {
  usuariosListarRequest,
  usuariosListarSuccess,
  usuariosListarFailure,
  usuarioCrearRequest,
  usuarioCrearSuccess,
  usuarioCrearFailure,
  limpiarUsuarioCrear,
  usuarioActualizarRequest,
  usuarioActualizarSuccess,
  usuarioActualizarFailure,
  limpiarUsuarioActualizar,
  usuarioEliminarRequest,
  usuarioEliminarSuccess,
  usuarioEliminarFailure,
  limpiarUsuarioEliminar,
} = usuariosSlice.actions

export default usuariosSlice.reducer
