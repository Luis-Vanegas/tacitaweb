import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Alert from '@mui/material/Alert'
import { Controller, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import dayjs from 'dayjs'
import type { ActualizarProcesoPayload, Contratista, ProcesoDetalle, TipoProceso } from '@/shared/types'

// Mismos CHECK que la BD (back/src/database/migrations/sql/001_core_schema.sql,
// core.proceso_contratacion): numero_contrato / numero_necesidad solo dígitos,
// link_secop debe empezar con https://, fecha_terminacion >= fecha_inicio.
const SOLO_DIGITOS = /^[0-9]+$/
const LINK_HTTPS = /^https:\/\//i

interface ProcesoFormValues {
  actividadId: string
  contratistaId: string
  tipo: TipoProceso
  procesoSupervisadoId: string
  numeroContrato: string
  numeroNecesidad: string
  fechaInicio: string
  fechaTerminacion: string
  linkSecop: string
  observacion: string
}

const schema: yup.ObjectSchema<ProcesoFormValues> = yup.object({
  actividadId: yup
    .string()
    .default('')
    .required('La actividad es obligatoria.')
    .matches(SOLO_DIGITOS, 'Solo números.'),
  contratistaId: yup.string().default(''),
  tipo: yup
    .mixed<TipoProceso>()
    .oneOf(['PRINCIPAL', 'INTERVENTORIA'])
    .default('PRINCIPAL')
    .required(),
  procesoSupervisadoId: yup
    .string()
    .default('')
    .matches(SOLO_DIGITOS, { message: 'Solo números.', excludeEmptyString: true }),
  numeroContrato: yup
    .string()
    .default('')
    .matches(SOLO_DIGITOS, { message: 'Solo dígitos.', excludeEmptyString: true }),
  numeroNecesidad: yup
    .string()
    .default('')
    .matches(SOLO_DIGITOS, { message: 'Solo dígitos.', excludeEmptyString: true }),
  fechaInicio: yup.string().default(''),
  fechaTerminacion: yup
    .string()
    .default('')
    .test(
      'fecha-coherente',
      'Debe ser igual o posterior a la fecha de inicio.',
      function fechaCoherente(valor) {
        const { fechaInicio } = this.parent as ProcesoFormValues
        if (!valor || !fechaInicio) return true
        return !dayjs(valor).isBefore(dayjs(fechaInicio), 'day')
      },
    ),
  linkSecop: yup
    .string()
    .default('')
    .matches(LINK_HTTPS, { message: 'Debe empezar con https://.', excludeEmptyString: true }),
  observacion: yup.string().default(''),
})

function aFecha(valor: string | null | undefined): string {
  return valor ? dayjs(valor).format('YYYY-MM-DD') : ''
}

function valoresDesdeProceso(proceso?: ProcesoDetalle): ProcesoFormValues {
  return {
    actividadId: proceso ? String(proceso.actividadId) : '',
    contratistaId: proceso?.contratistaId ? String(proceso.contratistaId) : '',
    tipo: proceso?.tipo ?? 'PRINCIPAL',
    procesoSupervisadoId: proceso?.procesoSupervisadoId ?? '',
    numeroContrato: proceso?.numeroContrato ?? '',
    numeroNecesidad: proceso?.numeroNecesidad ?? '',
    fechaInicio: aFecha(proceso?.fechaInicio),
    fechaTerminacion: aFecha(proceso?.fechaTerminacion),
    linkSecop: proceso?.linkSecop ?? '',
    observacion: proceso?.observacion ?? '',
  }
}

interface ProcesoFormProps {
  formId: string
  valoresIniciales?: ProcesoDetalle
  contratistas: Contratista[]
  error?: string | null
  onGuardar: (datos: ActualizarProcesoPayload) => void
}

// Formulario de datos del proceso (crea y edita, ver comentario en
// ProcesoFichaPage sobre quién lo usa hoy). NO incluye estado ni frentes
// vinculados: van por CambiarEstadoDialog y por los endpoints de vínculo
// frente↔proceso respectivamente, a propósito (ver prompt de Fase 5).
//
// Gap conocido: no existe un catálogo de actividades expuesto por el front
// (GET /catalogos no lo trae, y no hay GET /actividades en el backend), así
// que actividadId queda como TextField numérico simple en vez de un selector.
// Lo mismo para procesoSupervisadoId: no hay un endpoint para buscar/listar
// procesos candidatos a "contrato vigilado", así que también es un TextField
// numérico. Ninguno de los dos endpoints se inventó.
export function ProcesoForm({ formId, valoresIniciales, contratistas, error, onGuardar }: ProcesoFormProps) {
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ProcesoFormValues>({
    resolver: yupResolver(schema),
    defaultValues: valoresDesdeProceso(valoresIniciales),
  })

  const tipo = watch('tipo')

  function enviar(valores: ProcesoFormValues) {
    onGuardar({
      actividadId: Number(valores.actividadId),
      contratistaId: valores.contratistaId ? Number(valores.contratistaId) : undefined,
      tipo: valores.tipo,
      procesoSupervisadoId:
        valores.tipo === 'INTERVENTORIA' && valores.procesoSupervisadoId
          ? valores.procesoSupervisadoId
          : undefined,
      numeroContrato: valores.numeroContrato || undefined,
      numeroNecesidad: valores.numeroNecesidad || undefined,
      fechaInicio: valores.fechaInicio || undefined,
      fechaTerminacion: valores.fechaTerminacion || undefined,
      linkSecop: valores.linkSecop || undefined,
      observacion: valores.observacion || undefined,
    })
  }

  return (
    <Box component="form" id={formId} onSubmit={handleSubmit(enviar)} noValidate>
      <Stack spacing={2} sx={{ mt: 0.5 }}>
        {error && <Alert severity="error">{error}</Alert>}

        <Controller
          name="actividadId"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Actividad (id)"
              type="number"
              required
              fullWidth
              error={!!errors.actividadId}
              helperText={errors.actividadId?.message ?? 'Sin catálogo de actividades en el front: id numérico.'}
            />
          )}
        />

        <Controller
          name="contratistaId"
          control={control}
          render={({ field }) => (
            <TextField {...field} select label="Contratista" fullWidth>
              <MenuItem value="">Sin contratista</MenuItem>
              {contratistas.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.nombre}
                </MenuItem>
              ))}
            </TextField>
          )}
        />

        <Controller
          name="tipo"
          control={control}
          render={({ field }) => (
            <TextField {...field} select label="Tipo" required fullWidth>
              <MenuItem value="PRINCIPAL">Principal</MenuItem>
              <MenuItem value="INTERVENTORIA">Interventoría</MenuItem>
            </TextField>
          )}
        />

        <Controller
          name="procesoSupervisadoId"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Contrato vigilado (id)"
              disabled={tipo !== 'INTERVENTORIA'}
              fullWidth
              error={!!errors.procesoSupervisadoId}
              helperText={errors.procesoSupervisadoId?.message ?? 'Solo aplica si el tipo es Interventoría.'}
            />
          )}
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Controller
            name="numeroContrato"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Número de contrato"
                fullWidth
                error={!!errors.numeroContrato}
                helperText={errors.numeroContrato?.message}
              />
            )}
          />
          <Controller
            name="numeroNecesidad"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Número de necesidad"
                fullWidth
                error={!!errors.numeroNecesidad}
                helperText={errors.numeroNecesidad?.message}
              />
            )}
          />
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Controller
            name="fechaInicio"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Fecha de inicio"
                type="date"
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
            )}
          />
          <Controller
            name="fechaTerminacion"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Fecha de terminación"
                type="date"
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                error={!!errors.fechaTerminacion}
                helperText={errors.fechaTerminacion?.message}
              />
            )}
          />
        </Stack>

        <Controller
          name="linkSecop"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Link SECOP"
              placeholder="https://..."
              fullWidth
              error={!!errors.linkSecop}
              helperText={errors.linkSecop?.message}
            />
          )}
        />

        <Controller
          name="observacion"
          control={control}
          render={({ field }) => <TextField {...field} label="Observación" multiline minRows={3} fullWidth />}
        />
      </Stack>
    </Box>
  )
}
