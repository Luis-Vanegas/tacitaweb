import { useEffect, useMemo, useState } from 'react'
import type { AxiosError } from 'axios'
import { Controller, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import dayjs from 'dayjs'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import { useAppDispatch, useAppSelector } from '@/shared/hooks/redux'
import { http } from '@/shared/api/http'
import { endpoints } from '@/shared/api/endpoints'
import type { ErrorApi } from '@/shared/types'
import { personalRequest, limpiarPersonal } from '@/features/frentes/personalSlice'
import { buscarCorte, payloadCorte, type CorteFormValues } from './corteExistente'

const ENTERO = /^[0-9]+$/

interface FormValues extends CorteFormValues {
  tipoPersonalId: string
  vigencia: string
}

// Mismas reglas que CrearCortePersonalDto / ActualizarCortePersonalDto y el
// CHECK de core.personal_corte.vigencia (2020..2100).
const schema: yup.ObjectSchema<FormValues> = yup.object({
  tipoPersonalId: yup.string().default('').required('Elige el tipo de personal.'),
  vigencia: yup
    .string()
    .default('')
    .required('La vigencia es obligatoria.')
    .test('rango', 'Debe ser un año entre 2020 y 2100.', (v) => {
      const n = Number(v)
      return Number.isInteger(n) && n >= 2020 && n <= 2100
    }),
  actual: yup.string().default('').required('Obligatorio.').matches(ENTERO, 'Entero ≥ 0.'),
  pendiente: yup.string().default('').matches(ENTERO, { message: 'Entero ≥ 0.', excludeEmptyString: true }),
  meta: yup.string().default('').matches(ENTERO, { message: 'Entero ≥ 0.', excludeEmptyString: true }),
  fechaFinal: yup.string().default(''),
  observaciones: yup.string().default(''),
})

const VALORES_VACIOS: CorteFormValues = { actual: '', pendiente: '', meta: '', fechaFinal: '', observaciones: '' }

// Formulario de un corte de personal. El frente solo sirve para cargar sus
// cortes (GET /frentes/:slug/personal, mismo saga que PersonalTab): no hay un
// endpoint global de lectura de cortes. Con eso se decide crear vs. editar.
// Las escrituras van directo por http (no hay saga de mutaciones de personal
// y nadie más necesita ese estado): tras guardar se recarga el personal.
export function CortePersonalForm() {
  const dispatch = useAppDispatch()
  const frentes = useAppSelector((s) => s.frentes.lista.items)
  const tiposPersonal = useAppSelector((s) => s.catalogos.tiposPersonal)
  const personal = useAppSelector((s) => s.personal)
  const [slug, setSlug] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    watch,
    reset,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: { tipoPersonalId: '', vigencia: String(dayjs().year()), ...VALORES_VACIOS },
  })

  // El slice de personal es compartido con FrenteDetallePage: se limpia al
  // entrar para no decidir crear/editar con cortes de otro frente.
  useEffect(() => {
    dispatch(limpiarPersonal())
  }, [dispatch])

  const tipoPersonalId = watch('tipoPersonalId')
  const vigencia = watch('vigencia')
  const listo = slug !== '' && personal.estado === 'succeeded'
  const corte = useMemo(
    () =>
      listo
        ? buscarCorte(personal.data?.historico ?? [], tipoPersonalId ? Number(tipoPersonalId) : null, Number(vigencia))
        : null,
    [listo, personal.data, tipoPersonalId, vigencia],
  )

  // Al cambiar de corte (o pasar a "nuevo") se precargan sus valores; la
  // clave (tipo, vigencia) que eligió el usuario se conserva.
  useEffect(() => {
    const { tipoPersonalId: tipo, vigencia: anio } = getValues()
    reset({
      tipoPersonalId: tipo,
      vigencia: anio,
      ...(corte
        ? {
            actual: String(corte.actual),
            pendiente: corte.pendiente === null ? '' : String(corte.pendiente),
            meta: corte.meta === null ? '' : String(corte.meta),
            fechaFinal: corte.fechaFinal ? dayjs(corte.fechaFinal).format('YYYY-MM-DD') : '',
            observaciones: corte.observaciones ?? '',
          }
        : VALORES_VACIOS),
    })
  }, [corte, getValues, reset])

  function elegirFrente(nuevo: string) {
    setSlug(nuevo)
    setExito(null)
    setError(null)
    if (nuevo) dispatch(personalRequest(nuevo))
  }

  async function guardar(valores: FormValues) {
    setGuardando(true)
    setError(null)
    setExito(null)
    try {
      if (corte) {
        await http.patch(endpoints.personal.actualizarCorte(corte.id), payloadCorte(valores))
      } else {
        await http.post(
          endpoints.personal.crearCorte,
          payloadCorte(valores, { tipoPersonalId: Number(valores.tipoPersonalId), vigencia: Number(valores.vigencia) }),
        )
      }
      setExito(corte ? 'Corte actualizado.' : 'Corte creado.')
      dispatch(personalRequest(slug))
    } catch (e) {
      setError((e as AxiosError<Partial<ErrorApi>>).response?.data?.message ?? 'No se pudo guardar el corte.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit(guardar)} noValidate>
      <Stack spacing={2}>
        <TextField
          select
          label="Frente"
          value={slug}
          onChange={(e) => elegirFrente(e.target.value)}
          helperText="Se cargan los cortes del frente para saber si se crea o se edita."
          fullWidth
        >
          {frentes.map((f) => (
            <MenuItem key={f.slug} value={f.slug}>
              {f.nombre}
            </MenuItem>
          ))}
        </TextField>

        {slug && personal.estado === 'loading' && <CircularProgress size={24} aria-label="Cargando personal" />}
        {slug && personal.estado === 'failed' && <Alert severity="error">{personal.error}</Alert>}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Controller
            name="tipoPersonalId"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Tipo de personal"
                required
                fullWidth
                disabled={!listo}
                error={!!errors.tipoPersonalId}
                helperText={errors.tipoPersonalId?.message}
              >
                {tiposPersonal.map((t) => (
                  <MenuItem key={t.id} value={String(t.id)}>
                    {t.nombre}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          <Controller
            name="vigencia"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Vigencia"
                type="number"
                required
                disabled={!listo}
                sx={{ minWidth: { sm: 140 } }}
                error={!!errors.vigencia}
                helperText={errors.vigencia?.message}
              />
            )}
          />
        </Stack>

        {listo && tipoPersonalId && (
          <Box>
            <Chip
              size="small"
              color={corte ? 'info' : 'success'}
              variant="outlined"
              label={corte ? 'Ya existe un corte: se editará' : 'No hay corte: se creará uno nuevo'}
            />
          </Box>
        )}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          {(['actual', 'pendiente', 'meta'] as const).map((nombre) => (
            <Controller
              key={nombre}
              name={nombre}
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label={{ actual: 'Actual', pendiente: 'Pendiente', meta: 'Meta' }[nombre]}
                  type="number"
                  required={nombre === 'actual'}
                  disabled={!listo}
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
              disabled={!listo}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
          )}
        />

        <Controller
          name="observaciones"
          control={control}
          render={({ field }) => (
            <TextField {...field} label="Observaciones" multiline minRows={3} disabled={!listo} fullWidth />
          )}
        />

        {error && <Alert severity="error">{error}</Alert>}
        {exito && <Alert severity="success">{exito}</Alert>}

        <Box>
          <Button type="submit" variant="contained" disabled={!listo || guardando}>
            {guardando ? <CircularProgress size={20} color="inherit" /> : corte ? 'Guardar cambios' : 'Crear corte'}
          </Button>
        </Box>
      </Stack>
    </Box>
  )
}
