import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import { useAppDispatch, useAppSelector } from '@/shared/hooks/redux'
import { frentesListarRequest } from '@/features/frentes/frentesSlice'
import {
  desvincularProcesoRequest,
  limpiarDesvincularProceso,
  limpiarVincularProceso,
  vincularProcesoRequest,
} from './vinculosSlice'

// No existe un endpoint de búsqueda global de procesos (GET /procesos solo
// trae el detalle de uno por id, ver docs/PLAN-IMPLEMENTACION.md § 2), así
// que el proceso se identifica escribiendo su id directamente. No se inventó
// un selector porque no hay de dónde listarlos fuera de un frente.
export function VinculosPage() {
  const dispatch = useAppDispatch()
  const frentes = useAppSelector((s) => s.frentes.lista.items)
  const { vincular: estadoVincular, desvincular: estadoDesvincular } = useAppSelector(
    (s) => s.vinculos,
  )

  const [procesoId, setProcesoId] = useState('')
  const [slug, setSlug] = useState('')
  const [nota, setNota] = useState('')

  useEffect(() => {
    dispatch(frentesListarRequest())
  }, [dispatch])

  useEffect(() => {
    // Limpia el resultado de la mutación anterior en cuanto el usuario
    // vuelve a tocar el formulario, para no mostrar un Alert viejo.
    dispatch(limpiarVincularProceso())
    dispatch(limpiarDesvincularProceso())
  }, [procesoId, slug, dispatch])

  const puedeEnviar = procesoId.trim().length > 0 && slug.trim().length > 0

  function manejarVincular() {
    dispatch(vincularProcesoRequest({ slug, id: procesoId.trim(), nota: nota.trim() || undefined }))
  }

  function manejarDesvincular() {
    dispatch(desvincularProcesoRequest({ slug, id: procesoId.trim() }))
  }

  return (
    <Box>
      <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
        Vínculos manuales frente ↔ proceso
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Vincula o desvincula un proceso de contratación a un frente (criterio MANUAL,
        ver <code>PUT/DELETE /frentes/:slug/procesos/:id</code>).
      </Typography>

      <Paper variant="outlined" sx={{ p: 3, maxWidth: 480 }}>
        <Stack spacing={2}>
          {estadoVincular.estado === 'succeeded' && <Alert severity="success">Proceso vinculado.</Alert>}
          {estadoVincular.estado === 'failed' && <Alert severity="error">{estadoVincular.error}</Alert>}
          {estadoDesvincular.estado === 'succeeded' && <Alert severity="success">Proceso desvinculado.</Alert>}
          {estadoDesvincular.estado === 'failed' && <Alert severity="error">{estadoDesvincular.error}</Alert>}

          <TextField
            label="Id del proceso"
            required
            fullWidth
            value={procesoId}
            onChange={(e) => setProcesoId(e.target.value)}
            helperText="No hay buscador de procesos: pega el id (uuid) del proceso."
          />

          <TextField
            select
            label="Frente"
            required
            fullWidth
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
          >
            {frentes.map((f) => (
              <MenuItem key={f.slug} value={f.slug}>
                {f.nombre}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Nota (opcional)"
            fullWidth
            multiline
            minRows={2}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
          />

          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              disabled={!puedeEnviar || estadoVincular.estado === 'loading'}
              onClick={manejarVincular}
            >
              {estadoVincular.estado === 'loading' ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                'Vincular'
              )}
            </Button>
            <Button
              variant="outlined"
              color="error"
              disabled={!puedeEnviar || estadoDesvincular.estado === 'loading'}
              onClick={manejarDesvincular}
            >
              {estadoDesvincular.estado === 'loading' ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                'Desvincular'
              )}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  )
}
