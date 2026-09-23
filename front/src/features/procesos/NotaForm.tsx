import { useState, type FormEvent } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import dayjs from 'dayjs'
import type { CrearSeguimientoPayload } from '@/shared/types'

interface NotaFormProps {
  formId: string
  error?: string | null
  onGuardar: (datos: CrearSeguimientoPayload) => void
}

// Agrega una nota de bitácora sin cambiar estado (POST
// /procesos/:procesoId/seguimiento). ProcesoFichaPage lo envuelve en un
// Dialog y dispara el submit vía el atributo `form` del botón (mismo patrón
// que ProcesoForm), así el botón de Guardar vive en el DialogActions.
export function NotaForm({ formId, error, onGuardar }: NotaFormProps) {
  const [fecha, setFecha] = useState(() => dayjs().format('YYYY-MM-DD'))
  const [nota, setNota] = useState('')
  const [notaTocada, setNotaTocada] = useState(false)

  const notaInvalida = notaTocada && nota.trim().length === 0

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    setNotaTocada(true)
    if (nota.trim().length === 0) return
    onGuardar({ nota: nota.trim(), fecha })
  }

  return (
    <Box component="form" id={formId} onSubmit={enviar} noValidate>
      <Stack spacing={2} sx={{ mt: 0.5 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="Fecha"
          type="date"
          required
          fullWidth
          value={fecha}
          onChange={(evento) => setFecha(evento.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
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
    </Box>
  )
}
