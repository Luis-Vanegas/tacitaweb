import { useEffect, useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { useAppDispatch, useAppSelector } from '@/shared/hooks/redux'
import type { ActualizarProcesoPayload, ResumenFrente } from '@/shared/types'
import { ProcesoForm } from '@/features/procesos/ProcesoForm'
import { crearProcesoRequest, limpiarCrearProceso } from '@/features/procesos/procesoMutacionesSlice'

const FORM_ID = 'carga-proceso-nuevo'

// Alta de proceso desde /carga. Reusa ProcesoForm (datos del proceso) y le
// suma lo que ese form deja afuera a propósito: estado inicial y frentes, que
// POST /procesos sí acepta (CrearProcesoPayload). Se guarda por el mismo saga
// que el diálogo de ProcesosTab.
export function ProcesoNuevoForm() {
  const dispatch = useAppDispatch()
  const catalogos = useAppSelector((s) => s.catalogos)
  const frentes = useAppSelector((s) => s.frentes.lista.items)
  const crear = useAppSelector((s) => s.procesoMutaciones.crear)

  // Mismo default que ProcesosTab: el estado de menor `orden` (primer paso).
  const estadoInicial = useMemo(
    () =>
      catalogos.estados.length === 0
        ? ''
        : String(catalogos.estados.reduce((menor, e) => (e.orden < menor.orden ? e : menor)).id),
    [catalogos.estados],
  )
  const [estadoId, setEstadoId] = useState('')
  const [frentesElegidos, setFrentesElegidos] = useState<ResumenFrente[]>([])
  // Cambiar la key remonta ProcesoForm: es la forma de resetearlo sin
  // exponerle un método `reset` hacia afuera.
  const [versionForm, setVersionForm] = useState(0)
  const [exito, setExito] = useState(false)

  const estadoEfectivo = estadoId || estadoInicial

  useEffect(() => {
    dispatch(limpiarCrearProceso())
  }, [dispatch])

  useEffect(() => {
    if (crear.estado !== 'succeeded') return
    setExito(true)
    setEstadoId('')
    setFrentesElegidos([])
    setVersionForm((v) => v + 1)
    dispatch(limpiarCrearProceso())
  }, [crear.estado, dispatch])

  function guardar(datos: ActualizarProcesoPayload) {
    if (!estadoEfectivo) return
    setExito(false)
    dispatch(
      crearProcesoRequest({
        ...datos,
        // ProcesoForm valida actividadId como requerido (yup).
        actividadId: datos.actividadId as number,
        estadoId: Number(estadoEfectivo),
        frentes: frentesElegidos.length > 0 ? frentesElegidos.map((f) => f.id) : undefined,
      }),
    )
  }

  const guardando = crear.estado === 'loading'

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          select
          label="Estado inicial"
          value={estadoEfectivo}
          onChange={(e) => setEstadoId(e.target.value)}
          required
          fullWidth
          disabled={catalogos.estados.length === 0}
        >
          {catalogos.estados.map((e) => (
            <MenuItem key={e.id} value={String(e.id)}>
              {e.nombre}
            </MenuItem>
          ))}
        </TextField>
        <Autocomplete
          multiple
          fullWidth
          options={frentes}
          value={frentesElegidos}
          onChange={(_e, valor) => setFrentesElegidos(valor)}
          getOptionLabel={(f) => f.nombre}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          noOptionsText="Sin frentes"
          renderInput={(params) => (
            <TextField {...params} label="Frentes" helperText="Opcional: frentes donde se verá el proceso." />
          )}
        />
      </Stack>

      <ProcesoForm
        key={versionForm}
        formId={FORM_ID}
        contratistas={catalogos.contratistas}
        actividades={catalogos.actividades}
        error={crear.error}
        onGuardar={guardar}
      />

      {exito && <Alert severity="success">Proceso creado.</Alert>}

      <Box>
        <Button type="submit" form={FORM_ID} variant="contained" disabled={guardando || !estadoEfectivo}>
          {guardando ? <CircularProgress size={20} color="inherit" /> : 'Crear proceso'}
        </Button>
      </Box>
    </Stack>
  )
}
