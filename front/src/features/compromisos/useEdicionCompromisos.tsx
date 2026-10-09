import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useAppDispatch, useAppSelector } from '@/shared/hooks/redux'
import type { Compromiso } from '@/shared/types'
import { CompromisoDialog } from './CompromisoDialog'
import { payloadCompromiso, type CompromisoFormValues } from './compromiso'
import {
  compromisoActualizarRequest,
  compromisoCrearRequest,
  compromisoEliminarRequest,
  compromisosRequest,
  limpiarCompromisoMutacion,
} from './compromisosSlice'

// Crear/editar/eliminar compromisos, compartido por el panel del mapa y la
// página /compromisos: los dos usan la misma mutación del slice, así que el
// manejo de diálogos y el refresco tras guardar viven en un solo lugar.
// ADMIN/EDITOR crean y editan; solo ADMIN elimina (mismos @Roles del backend).
export function useEdicionCompromisos() {
  const dispatch = useAppDispatch()
  const mutacion = useAppSelector((s) => s.compromisos.mutacion)
  const rol = useAppSelector((s) => s.auth.usuario?.rol)
  const puedeEditar = rol === 'ADMIN' || rol === 'EDITOR'
  const puedeEliminar = rol === 'ADMIN'
  // undefined = cerrado; null = crear; Compromiso = editar ese.
  const [enEdicion, setEnEdicion] = useState<Compromiso | null | undefined>(undefined)
  const [aEliminar, setAEliminar] = useState<Compromiso | null>(null)

  // Tras una mutación exitosa se cierran los diálogos y se vuelve a pedir la
  // lista; si falla, el error se muestra dentro del diálogo, que sigue abierto.
  useEffect(() => {
    if (mutacion.estado === 'succeeded') {
      setEnEdicion(undefined)
      setAEliminar(null)
      dispatch(limpiarCompromisoMutacion())
      dispatch(compromisosRequest())
    }
  }, [mutacion.estado, dispatch])

  function cerrarDialogos() {
    setEnEdicion(undefined)
    setAEliminar(null)
    dispatch(limpiarCompromisoMutacion())
  }

  function guardar(valores: CompromisoFormValues) {
    if (enEdicion) {
      dispatch(compromisoActualizarRequest({ id: enEdicion.id, payload: payloadCompromiso(valores, true) }))
    } else {
      dispatch(compromisoCrearRequest(payloadCompromiso(valores, false)))
    }
  }

  const guardando = mutacion.estado === 'loading'

  const dialogos = (
    <>
      {puedeEditar && (
        <CompromisoDialog
          open={enEdicion !== undefined}
          compromiso={enEdicion ?? null}
          guardando={guardando}
          error={mutacion.error}
          onGuardar={guardar}
          onCancelar={cerrarDialogos}
        />
      )}

      <Dialog open={aEliminar !== null} onClose={guardando ? undefined : cerrarDialogos} fullWidth maxWidth="xs">
        <DialogTitle>Eliminar compromiso</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {mutacion.error && <Alert severity="error">{mutacion.error}</Alert>}
            <Typography variant="body2">
              ¿Eliminar «{aEliminar?.descripcion}»? Esta acción no se puede deshacer.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={cerrarDialogos} disabled={guardando}>
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={guardando}
            onClick={() => aEliminar && dispatch(compromisoEliminarRequest(aEliminar.id))}
          >
            {guardando ? <CircularProgress size={20} color="inherit" /> : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )

  return {
    puedeEditar,
    puedeEliminar,
    crear: () => setEnEdicion(null),
    editar: (c: Compromiso) => setEnEdicion(c),
    eliminar: (c: Compromiso) => setAEliminar(c),
    dialogos,
  }
}
