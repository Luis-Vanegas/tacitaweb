import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { CatalogosRespuesta, EstadoCarga } from '@/shared/types'

interface CatalogosState extends CatalogosRespuesta {
  estado: EstadoCarga
  error: string | null
}

const initialState: CatalogosState = {
  estado: 'idle',
  error: null,
  estados: [],
  dependencias: [],
  proyectos: [],
  contratistas: [],
}

const catalogosSlice = createSlice({
  name: 'catalogos',
  initialState,
  reducers: {
    // Se piden una sola vez (ver saga: no vuelve a pedir si ya succeeded).
    catalogosRequest: (state) => {
      if (state.estado === 'succeeded') return
      state.estado = 'loading'
      state.error = null
    },
    catalogosSuccess: (state, action: PayloadAction<CatalogosRespuesta>) => {
      state.estado = 'succeeded'
      state.estados = action.payload.estados
      state.dependencias = action.payload.dependencias
      state.proyectos = action.payload.proyectos
      state.contratistas = action.payload.contratistas
    },
    catalogosFailure: (state, action: PayloadAction<string>) => {
      state.estado = 'failed'
      state.error = action.payload
    },
  },
})

export const { catalogosRequest, catalogosSuccess, catalogosFailure } =
  catalogosSlice.actions

export default catalogosSlice.reducer
