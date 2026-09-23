import { useEffect } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Autocomplete from '@mui/material/Autocomplete'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import { Controller, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import type {
  ActualizarUsuarioPayload,
  CrearUsuarioPayload,
  FrenteAsignable,
  RolUsuario,
  UsuarioRespuesta,
} from '@/shared/types'

interface UsuarioFormValues {
  email: string
  nombre: string
  password: string
  rol: RolUsuario
  activo: boolean
  frentes: number[]
}

// Igual que back/src/modules/usuarios/dto/crear-usuario.dto.ts: password
// obligatoria y de mínimo 8 caracteres SOLO al crear. Al editar es opcional,
// pero si se escribe algo también debe cumplir el mínimo (ActualizarUsuarioDto
// extiende CrearUsuarioDto con PartialType, que no relaja el @MinLength).
// El modo se pasa como contexto de yup ($esCreacion) en vez de duplicar el
// schema, así valida contra el mismo objeto según se cree o se edite.
const schema: yup.ObjectSchema<UsuarioFormValues> = yup.object({
  email: yup.string().default('').required('El correo es obligatorio.').email('Correo inválido.'),
  nombre: yup.string().default('').required('El nombre es obligatorio.'),
  password: yup
    .string()
    .default('')
    .when('$esCreacion', {
      is: true,
      then: (s) => s.required('La contraseña es obligatoria.').min(8, 'Debe tener al menos 8 caracteres.'),
      otherwise: (s) =>
        s.test('min-si-hay-valor', 'Debe tener al menos 8 caracteres.', (valor) => !valor || valor.length >= 8),
    }),
  rol: yup.mixed<RolUsuario>().oneOf(['ADMIN', 'EDITOR', 'LECTOR']).default('LECTOR').required(),
  activo: yup.boolean().default(true).required(),
  frentes: yup.array().of(yup.number().required()).default([]),
})

function valoresDesdeUsuario(usuario?: UsuarioRespuesta): UsuarioFormValues {
  return {
    email: usuario?.email ?? '',
    nombre: usuario?.nombre ?? '',
    password: '',
    rol: usuario?.rol ?? 'LECTOR',
    activo: usuario?.activo ?? true,
    frentes: usuario?.frentes.map((f) => f.id) ?? [],
  }
}

interface UsuarioFormDialogProps {
  open: boolean
  modo: 'crear' | 'editar'
  usuarioInicial?: UsuarioRespuesta
  frentesDisponibles: FrenteAsignable[]
  guardando: boolean
  error?: string | null
  onGuardar: (datos: CrearUsuarioPayload | ActualizarUsuarioPayload) => void
  onCancelar: () => void
}

export function UsuarioFormDialog({
  open,
  modo,
  usuarioInicial,
  frentesDisponibles,
  guardando,
  error,
  onGuardar,
  onCancelar,
}: UsuarioFormDialogProps) {
  const esCreacion = modo === 'crear'
  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<UsuarioFormValues>({
    resolver: yupResolver(schema),
    context: { esCreacion },
    defaultValues: valoresDesdeUsuario(usuarioInicial),
  })

  useEffect(() => {
    if (open) reset(valoresDesdeUsuario(usuarioInicial))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset solo al abrir, no en cada cambio de usuarioInicial
  }, [open])

  const rol = watch('rol')

  function enviar(valores: UsuarioFormValues) {
    // Frentes solo aplica a EDITOR. En edición se manda [] si el rol cambió
    // a otro distinto, para que el backend limpie usuario_frente (ver
    // UsuariosService.actualizar: `if (dto.frentes)` borra y reinserta).
    const frentes = valores.rol === 'EDITOR' ? valores.frentes : []
    if (esCreacion) {
      onGuardar({
        email: valores.email,
        nombre: valores.nombre,
        password: valores.password,
        rol: valores.rol,
        activo: valores.activo,
        frentes,
      } satisfies CrearUsuarioPayload)
    } else {
      const payload: ActualizarUsuarioPayload = {
        email: valores.email,
        nombre: valores.nombre,
        rol: valores.rol,
        activo: valores.activo,
        frentes,
      }
      if (valores.password) payload.password = valores.password
      onGuardar(payload)
    }
  }

  return (
    <Dialog open={open} onClose={onCancelar} fullWidth maxWidth="sm">
      <Box component="form" onSubmit={handleSubmit(enviar)} noValidate>
        <DialogTitle>{esCreacion ? 'Nuevo usuario' : 'Editar usuario'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Correo"
                  type="email"
                  required
                  fullWidth
                  autoComplete="off"
                  error={!!errors.email}
                  helperText={errors.email?.message}
                />
              )}
            />

            <Controller
              name="nombre"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Nombre"
                  required
                  fullWidth
                  error={!!errors.nombre}
                  helperText={errors.nombre?.message}
                />
              )}
            />

            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Contraseña"
                  type="password"
                  required={esCreacion}
                  fullWidth
                  autoComplete="new-password"
                  error={!!errors.password}
                  helperText={errors.password?.message ?? (esCreacion ? undefined : 'Dejar en blanco para no cambiarla.')}
                />
              )}
            />

            <Controller
              name="rol"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Rol" required fullWidth>
                  <MenuItem value="ADMIN">Administrador</MenuItem>
                  <MenuItem value="EDITOR">Editor</MenuItem>
                  <MenuItem value="LECTOR">Lector</MenuItem>
                </TextField>
              )}
            />

            {rol === 'EDITOR' && (
              <Controller
                name="frentes"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    multiple
                    options={frentesDisponibles}
                    getOptionLabel={(f) => f.nombre}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    value={frentesDisponibles.filter((f) => field.value.includes(f.id))}
                    onChange={(_e, seleccion) => field.onChange(seleccion.map((f) => f.id))}
                    renderInput={(params) => (
                      <TextField {...params} label="Frentes asignados" placeholder="Elegir frentes" />
                    )}
                  />
                )}
              />
            )}

            <Controller
              name="activo"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                  label="Activo"
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
