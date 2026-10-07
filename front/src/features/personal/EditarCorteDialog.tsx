import { useEffect, useState } from 'react'
import type { AxiosError } from 'axios'
import { Controller, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { http } from '@/shared/api/http'
import { endpoints } from '@/shared/api/endpoints'
import type { ErrorApi, PersonalCorte } from '@/shared/types'
import { esquemaCorte, payloadCorte, valoresDesdeCorte, type CorteFormValues } from '@/features/carga/corteExistente'

interface EditarCorteDialogProps {
  open: boolean
  corte: PersonalCorte
  nombreTipo: string
  onClose: () => void
  onGuardado: () => void
}

const ETIQUETAS = {
  actual: 'Actual',
  pendiente: 'Pendiente',
  meta: 'Meta',
} as const

// Edición rápida de un corte desde PersonalTab y la vista general de personal.
// PATCH directo por http (igual que CortePersonalForm: no hay saga de
// mutaciones de personal); quien lo abre decide qué recargar en onGuardado.
export function EditarCorteDialog({ open, corte, nombreTipo, onClose, onGuardado }: EditarCorteDialogProps) {
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CorteFormValues>({
    resolver: yupResolver(esquemaCorte),
    defaultValues: valoresDesdeCorte(corte),
  })

  // Al (re)abrir se vuelve a precargar: el mismo diálogo puede reutilizarse
  // con otro corte o tras un guardado que cambió los valores.
  useEffect(() => {
    if (open) {
      reset(valoresDesdeCorte(corte))
      setError(null)
    }
  }, [open, corte, reset])

  async function guardar(valores: CorteFormValues) {
    setGuardando(true)
    setError(null)
    try {
      await http.patch(endpoints.personal.actualizarCorte(corte.id), payloadCorte(valores))
      onGuardado()
    } catch (e) {
      setError((e as AxiosError<Partial<ErrorApi>>).response?.data?.message ?? 'No se pudo guardar el corte.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onClose={guardando ? undefined : onClose} fullWidth maxWidth="sm">
      <Box component="form" onSubmit={handleSubmit(guardar)} noValidate>
        <DialogTitle>
          Editar {nombreTipo} · vigencia {corte.vigencia}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              {(['actual', 'pendiente', 'meta'] as const).map((nombre) => (
                <Controller
                  key={nombre}
                  name={nombre}
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label={ETIQUETAS[nombre]}
                      type="number"
                      required={nombre === 'actual'}
                      fullWidth
                      slotProps={{ htmlInput: { min: 0, step: 1 } }}
                      error={!!errors[nombre]}
                      helperText={errors[nombre]?.message}
                    />
                  )}
                />
              ))}
            </Stack>
            <Controller
              name="fechaFinal"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Fecha final"
                  type="date"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              )}
            />
            <Controller
              name="observaciones"
              control={control}
              render={({ field }) => <TextField {...field} label="Observaciones" multiline minRows={3} fullWidth />}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={guardando}>
            {guardando ? <CircularProgress size={20} color="inherit" /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  )
}
