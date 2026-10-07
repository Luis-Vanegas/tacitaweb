import { useEffect } from 'react'
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
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import type { Compromiso, EstadoCompromiso } from '@/shared/types'
import { ESTADOS_COMPROMISO, esquemaCompromiso, valoresDesdeCompromiso, type CompromisoFormValues } from './compromiso'

interface CompromisoDialogProps {
  open: boolean
  // null = crear uno nuevo.
  compromiso: Compromiso | null
  guardando: boolean
  error?: string | null
  onGuardar: (valores: CompromisoFormValues) => void
  onCancelar: () => void
}

// Solo junta los datos: el dispatch y el refetch los hace CompromisosPanel
// (dueño de la mutación), igual que CambiarEstadoDialog con ProcesoFichaPage.
export function CompromisoDialog({ open, compromiso, guardando, error, onGuardar, onCancelar }: CompromisoDialogProps) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CompromisoFormValues>({
    resolver: yupResolver(esquemaCompromiso),
    defaultValues: valoresDesdeCompromiso(compromiso),
  })

  useEffect(() => {
    if (open) reset(valoresDesdeCompromiso(compromiso))
  }, [open, compromiso, reset])

  return (
    <Dialog open={open} onClose={guardando ? undefined : onCancelar} fullWidth maxWidth="sm">
      <Box component="form" onSubmit={handleSubmit(onGuardar)} noValidate>
        <DialogTitle>{compromiso ? 'Editar compromiso' : 'Nuevo compromiso'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <Controller
              name="descripcion"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Descripción"
                  required
                  multiline
                  minRows={2}
                  fullWidth
                  error={!!errors.descripcion}
                  helperText={errors.descripcion?.message}
                />
              )}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Controller
                name="estado"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select label="Estado" fullWidth>
                    {(Object.keys(ESTADOS_COMPROMISO) as EstadoCompromiso[]).map((codigo) => (
                      <MenuItem key={codigo} value={codigo}>
                        {ESTADOS_COMPROMISO[codigo].nombre}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
              <Controller
                name="responsable"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Responsable"
                    fullWidth
                    error={!!errors.responsable}
                    helperText={errors.responsable?.message}
                  />
                )}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              {(['fechaRegistro', 'fechaCumplimiento'] as const).map((nombre) => (
                <Controller
                  key={nombre}
                  name={nombre}
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label={nombre === 'fechaRegistro' ? 'Fecha de registro' : 'Fecha de cumplimiento'}
                      type="date"
                      fullWidth
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  )}
                />
              ))}
            </Stack>
            <Controller
              name="avance"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Avance de gestión"
                  multiline
                  minRows={3}
                  fullWidth
                  error={!!errors.avance}
                  helperText={errors.avance?.message}
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCancelar} disabled={guardando}>
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
