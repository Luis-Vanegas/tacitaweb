import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type {
  ActualizarProcesoPayload,
  CambiarEstadoPayload,
  CrearProcesoPayload,
  CrearSeguimientoPayload,
  EstadoCarga,
  ProcesoDetalle,
  Seguimiento,
} from '@/shared/types'

// Slice de mutaciones sobre un proceso (crear, editar, cambiar estado, agregar
// nota de bitácora). Vive separado de procesoFichaSlice (que solo lee) para no
// mezclar el estado de "cargando la ficha" con el de "guardando un cambio".
//
// Decisión de diseño (no hay precedente de sagas encadenadas en el repo,
// ver frentesSaga/procesosSaga: cada watcher hace un solo call + put, nunca
// dispara otra acción de otro slice): esta saga tampoco dispara el refetch de
// la ficha. Redux Toolkit no tiene callbacks nativos por acción, así que el
// componente que dispara la mutación debe vigilar `estado === 'succeeded'`
// con un useEffect y volver a despachar `procesoFichaRequest(id)` él mismo.
// Esto mantiene los slices desacoplados (el de mutaciones no conoce al de ficha).

export interface ActualizarProcesoPayloadConId {
  id: string
  payload: ActualizarProcesoPayload
}

export interface CambiarEstadoPayloadConId {
  id: string
  payload: CambiarEstadoPayload
}

export interface CrearNotaPayloadConId {
  procesoId: string
  payload: CrearSeguimientoPayload
}

interface MutacionState<T> {
  estado: EstadoCarga
  error: string | null
  data: T | null
}

function estadoInicial<T>(): MutacionState<T> {
  return { estado: 'idle', error: null, data: null }
}

interface ProcesoMutacionesState {
  crear: MutacionState<ProcesoDetalle>
  actualizar: MutacionState<ProcesoDetalle>
  cambiarEstado: MutacionState<ProcesoDetalle>
  crearNota: MutacionState<Seguimiento>
}

const initialState: ProcesoMutacionesState = {
  crear: estadoInicial(),
  actualizar: estadoInicial(),
  cambiarEstado: estadoInicial(),
  crearNota: estadoInicial(),
}

const procesoMutacionesSlice = createSlice({
  name: 'procesoMutaciones',
  initialState,
  reducers: {
    crearProcesoRequest: (state, _action: PayloadAction<CrearProcesoPayload>) => {
      state.crear.estado = 'loading'
      state.crear.error = null
    },
    crearProcesoSuccess: (state, action: PayloadAction<ProcesoDetalle>) => {
      state.crear.estado = 'succeeded'
      state.crear.data = action.payload
    },
    crearProcesoFailure: (state, action: PayloadAction<string>) => {
      state.crear.estado = 'failed'
      state.crear.error = action.payload
    },
    limpiarCrearProceso: (state) => {
      state.crear = estadoInicial()
    },

    actualizarProcesoRequest: (
      state,
      _action: PayloadAction<ActualizarProcesoPayloadConId>,
    ) => {
      state.actualizar.estado = 'loading'
      state.actualizar.error = null
    },
    actualizarProcesoSuccess: (state, action: PayloadAction<ProcesoDetalle>) => {
      state.actualizar.estado = 'succeeded'
      state.actualizar.data = action.payload
    },
    actualizarProcesoFailure: (state, action: PayloadAction<string>) => {
      state.actualizar.estado = 'failed'
      state.actualizar.error = action.payload
    },
    limpiarActualizarProceso: (state) => {
      state.actualizar = estadoInicial()
    },

    cambiarEstadoRequest: (
      state,
      _action: PayloadAction<CambiarEstadoPayloadConId>,
    ) => {
      state.cambiarEstado.estado = 'loading'
      state.cambiarEstado.error = null
    },
    cambiarEstadoSuccess: (state, action: PayloadAction<ProcesoDetalle>) => {
      state.cambiarEstado.estado = 'succeeded'
      state.cambiarEstado.data = action.payload
    },
    cambiarEstadoFailure: (state, action: PayloadAction<string>) => {
      state.cambiarEstado.estado = 'failed'
      state.cambiarEstado.error = action.payload
    },
    limpiarCambiarEstado: (state) => {
      state.cambiarEstado = estadoInicial()
    },

    crearNotaRequest: (state, _action: PayloadAction<CrearNotaPayloadConId>) => {
      state.crearNota.estado = 'loading'
      state.crearNota.error = null
    },
    crearNotaSuccess: (state, action: PayloadAction<Seguimiento>) => {
      state.crearNota.estado = 'succeeded'
      state.crearNota.data = action.payload
    },
    crearNotaFailure: (state, action: PayloadAction<string>) => {
      state.crearNota.estado = 'failed'
      state.crearNota.error = action.payload
    },
    limpiarCrearNota: (state) => {
      state.crearNota = estadoInicial()
    },
  },
})

export const {
  crearProcesoRequest,
  crearProcesoSuccess,
  crearProcesoFailure,
  limpiarCrearProceso,
  actualizarProcesoRequest,
  actualizarProcesoSuccess,
  actualizarProcesoFailure,
  limpiarActualizarProceso,
  cambiarEstadoRequest,
  cambiarEstadoSuccess,
  cambiarEstadoFailure,
  limpiarCambiarEstado,
  crearNotaRequest,
  crearNotaSuccess,
  crearNotaFailure,
  limpiarCrearNota,
} = procesoMutacionesSlice.actions

export default procesoMutacionesSlice.reducer
