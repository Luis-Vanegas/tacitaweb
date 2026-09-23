import { useEffect, useState, type FormEvent } from 'react'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import type { EstadoProceso } from '@/shared/types'

interface CambiarEstadoDialogProps {
  open: boolean
  estados: EstadoProceso[]
  estadoIdInicial: number | null
  guardando: boolean
  error?: string | null
  onGuardar: (datos: { estadoId: number; nota: string }) => void
  onCancelar: () => void
}

// Diálogo chico: un solo request (PATCH /procesos/:id/estado) con nota
// obligatoria (back/src/modules/procesos/dto/cambiar-estado-proceso.dto.ts:
// @MinLength(1)). El dispatch y el refetch de la ficha los hace
// ProcesoFichaPage (dueño único de procesoMutaciones, ver comentario en
// procesoMutacionesSlice.ts); este componente solo junta los datos.
export function CambiarEstadoDialog({
  open,
  estados,
  estadoIdInicial,
  guardando,
  error,
  onGuardar,
  onCancelar,
}: CambiarEstadoDialogProps) {
  const [estadoId, setEstadoId] = useState<number | ''>('')
  const [nota, setNota] = useState('')
  const [notaTocada, setNotaTocada] = useState(false)

  useEffect(() => {
    if (open) {
      setEstadoId(estadoIdInicial ?? '')
      setNota('')
      setNotaTocada(false)
    }
  }, [open, estadoIdInicial])

  const notaInvalida = notaTocada && nota.trim().length === 0
  const puedeGuardar = estadoId !== '' && nota.trim().length > 0 && !guardando

  function manejarSubmit(evento: FormEvent) {
    evento.preventDefault()
    setNotaTocada(true)
    if (estadoId === '' || nota.trim().length === 0) return
    onGuardar({ estadoId, nota: nota.trim() })
  }

  const ordenados = [...estados].sort((a, b) => a.orden - b.orden)

  return (
    <Dialog open={open} onClose={onCancelar} fullWidth maxWidth="xs">
      <Box component="form" onSubmit={manejarSubmit}>
        <DialogTitle>Cambiar estado</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              select
              label="Nuevo estado"
              required
              fullWidth
              value={estadoId}
              onChange={(evento) => setEstadoId(Number(evento.target.value))}
            >
              {ordenados.map((estadoItem) => (
                <MenuItem key={estadoItem.id} value={estadoItem.id}>
                  {estadoItem.nombre}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Nota"
              required
              multiline
              minRows={3}
              fullWidth
              value={nota}
              onChange={(evento) => setNota(evento.target.value)}
              onBlur={() => setNotaTocada(true)}
              error={notaInvalida}
              helperText={notaInvalida ? 'La nota es obligatoria.' : ' '}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCancelar} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={!puedeGuardar}>
            {guardando ? <CircularProgress size={20} color="inherit" /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
