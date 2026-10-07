import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Collapse from '@mui/material/Collapse'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined'
import { tokens } from '@/app/theme/tokens'
import { useAppDispatch, useAppSelector } from '@/shared/hooks/redux'
import { EstadoChip } from '@/shared/components/EstadoChip'
import { formatearFecha } from '@/shared/utils/fecha'
import type { Compromiso } from '@/shared/types'
import { CompromisoDialog } from './CompromisoDialog'
import { ESTADOS_COMPROMISO as ESTADOS, payloadCompromiso, type CompromisoFormValues } from './compromiso'
import {
  compromisoActualizarRequest,
  compromisoCrearRequest,
  compromisoEliminarRequest,
  compromisosRequest,
  limpiarCompromisoMutacion,
} from './compromisosSlice'

// Lista desplegable de compromisos del proyecto (hoja "Compromisos" del Excel).
// Lista y no tabla: en el celular una tabla de 5 columnas no entra. El avance
// de gestión va como línea secundaria solo si existe, para no alargar la lista.
// ADMIN/EDITOR crean y editan; solo ADMIN elimina (mismos @Roles del backend).
export function CompromisosPanel() {
  const dispatch = useAppDispatch()
  const { estado, items, mutacion } = useAppSelector((s) => s.compromisos)
  const rol = useAppSelector((s) => s.auth.usuario?.rol)
  const puedeEditar = rol === 'ADMIN' || rol === 'EDITOR'
  const puedeEliminar = rol === 'ADMIN'
  const [abierto, setAbierto] = useState(false)
  // undefined = cerrado; null = crear; Compromiso = editar ese.
  const [enEdicion, setEnEdicion] = useState<Compromiso | null | undefined>(undefined)
  const [aEliminar, setAEliminar] = useState<Compromiso | null>(null)

  useEffect(() => {
    dispatch(compromisosRequest())
  }, [dispatch])

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

  const pendientes = items.filter((c) => c.estado !== 'CUMPLIDO').length
  const guardando = mutacion.estado === 'loading'
  // Sin compromisos, el LECTOR no ve nada; ADMIN/EDITOR sí, para crear el primero.
  if (items.length === 0 && (estado !== 'succeeded' || !puedeEditar)) return null

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', mb: 1 }}>
      <Button
        size="small"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-controls="lista-compromisos"
        startIcon={<TaskAltOutlinedIcon />}
        endIcon={<ExpandMoreIcon sx={{ transform: abierto ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }} />}
        sx={{ color: tokens.color.onNavy }}
      >
        Compromisos · {pendientes} {pendientes === 1 ? 'pendiente' : 'pendientes'}
      </Button>
      {puedeEditar && (
        <Button size="small" startIcon={<AddIcon />} onClick={() => setEnEdicion(null)} sx={{ color: tokens.color.onNavy }}>
          Nuevo compromiso
        </Button>
      )}

      <Collapse in={abierto} id="lista-compromisos">
        <Box
          component="ul"
          sx={{
            listStyle: 'none',
            m: 0,
            mt: 1,
            p: 0,
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: tokens.color.cardBackground,
            color: 'text.primary',
          }}
        >
          {items.map((c, i) => {
            const vencido = c.estado !== 'CUMPLIDO' && c.fechaCumplimiento !== null && dayjs(c.fechaCumplimiento).isBefore(dayjs(), 'day')
            return (
              <Box
                component="li"
                key={c.id}
                sx={{ px: 2, py: 1.25, borderTop: i === 0 ? 'none' : '1px solid rgb(0 0 0 / 8%)' }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1.5}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>{c.descripcion}</Typography>
                    <Typography variant="caption" sx={{ color: vencido ? tokens.color.error : 'rgb(0 0 0 / 60%)', fontWeight: vencido ? 700 : 400 }}>
                      {c.responsable ?? 'Sin responsable'} · {vencido ? 'Venció' : 'Vence'} {formatearFecha(c.fechaCumplimiento)}
                    </Typography>
                    {c.avance && (
                      <Typography variant="caption" sx={{ display: 'block', color: 'rgb(0 0 0 / 60%)' }}>
                        {c.avance}
                      </Typography>
                    )}
                  </Box>
                  <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
                    <EstadoChip nombre={ESTADOS[c.estado].nombre} color={ESTADOS[c.estado].color} />
                    {puedeEditar && (
                      <Tooltip title="Editar">
                        <IconButton size="small" aria-label={`Editar compromiso: ${c.descripcion}`} onClick={() => setEnEdicion(c)}>
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {puedeEliminar && (
                      <Tooltip title="Eliminar">
                        <IconButton size="small" aria-label={`Eliminar compromiso: ${c.descripcion}`} onClick={() => setAEliminar(c)}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </Stack>
              </Box>
            )
          })}
        </Box>
      </Collapse>

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
    </Box>
  )
}
