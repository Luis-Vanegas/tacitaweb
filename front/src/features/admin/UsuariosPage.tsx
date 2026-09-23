import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import Paper from '@mui/material/Paper'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Skeleton from '@mui/material/Skeleton'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import ToggleOffIcon from '@mui/icons-material/ToggleOff'
import ToggleOnIcon from '@mui/icons-material/ToggleOn'
import { useAppDispatch, useAppSelector } from '@/shared/hooks/redux'
import { EmptyState } from '@/shared/components/EmptyState'
import { ErrorState } from '@/shared/components/ErrorState'
import type { ActualizarUsuarioPayload, CrearUsuarioPayload, UsuarioRespuesta } from '@/shared/types'
import { frentesListarRequest } from '@/features/frentes/frentesSlice'
import { UsuarioFormDialog } from './UsuarioFormDialog'
import {
  limpiarUsuarioActualizar,
  limpiarUsuarioCrear,
  usuarioActualizarRequest,
  usuarioCrearRequest,
  usuariosListarRequest,
} from './usuariosSlice'

const ETIQUETA_ROL: Record<UsuarioRespuesta['rol'], string> = {
  ADMIN: 'Administrador',
  EDITOR: 'Editor',
  LECTOR: 'Lector',
}

export function UsuariosPage() {
  const dispatch = useAppDispatch()
  const { lista, crear, actualizar } = useAppSelector((s) => s.usuarios)
  const frentes = useAppSelector((s) => s.frentes.lista.items)

  const [dialogo, setDialogo] = useState<{ modo: 'crear' | 'editar'; usuario?: UsuarioRespuesta } | null>(null)

  useEffect(() => {
    dispatch(usuariosListarRequest())
    dispatch(frentesListarRequest())
  }, [dispatch])

  // Cierra el diálogo cuando la mutación en curso termina bien; el error se
  // muestra dentro del propio diálogo, así que si falla se queda abierto.
  useEffect(() => {
    if (dialogo?.modo === 'crear' && crear.estado === 'succeeded') {
      setDialogo(null)
      dispatch(limpiarUsuarioCrear())
    }
  }, [crear.estado, dialogo, dispatch])

  useEffect(() => {
    if (dialogo?.modo === 'editar' && actualizar.estado === 'succeeded') {
      setDialogo(null)
      dispatch(limpiarUsuarioActualizar())
    }
  }, [actualizar.estado, dialogo, dispatch])

  function cerrarDialogo() {
    setDialogo(null)
    dispatch(limpiarUsuarioCrear())
    dispatch(limpiarUsuarioActualizar())
  }

  function guardar(datos: CrearUsuarioPayload | ActualizarUsuarioPayload) {
    if (dialogo?.modo === 'crear') {
      dispatch(usuarioCrearRequest(datos as CrearUsuarioPayload))
    } else if (dialogo?.usuario) {
      dispatch(usuarioActualizarRequest({ id: dialogo.usuario.id, payload: datos }))
    }
  }

  // "Desactivar" en la UI NO dispara el DELETE físico de /usuarios/:id
  // (usuarios.service.ts lo confirma: es un manager.delete(Usuario, id) real,
  // sin soft-delete). Se prioriza lo menos destructivo con lo que ya expone
  // el backend: un PATCH { activo: false }, reversible con el mismo botón.
  // El DELETE real no se expone en esta pantalla.
  function alternarActivo(usuario: UsuarioRespuesta) {
    dispatch(
      usuarioActualizarRequest({ id: usuario.id, payload: { activo: !usuario.activo } }),
    )
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h6" component="h2">
          Usuarios
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogo({ modo: 'crear' })}
        >
          Nuevo usuario
        </Button>
      </Stack>

      {lista.estado === 'loading' && (
        <Stack spacing={1}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={48} />
          ))}
        </Stack>
      )}

      {lista.estado === 'failed' && (
        <ErrorState
          mensaje={lista.error ?? undefined}
          onReintentar={() => dispatch(usuariosListarRequest())}
        />
      )}

      {lista.estado === 'succeeded' && lista.items.length === 0 && (
        <EmptyState titulo="Sin usuarios" mensaje="Todavía no hay usuarios creados." />
      )}

      {lista.estado === 'succeeded' && lista.items.length > 0 && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" aria-label="Usuarios">
            <TableHead>
              <TableRow>
                <TableCell>Correo</TableCell>
                <TableCell>Nombre</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell>Activo</TableCell>
                <TableCell>Frentes</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lista.items.map((usuario) => (
                <TableRow key={usuario.id} hover>
                  <TableCell>{usuario.email}</TableCell>
                  <TableCell>{usuario.nombre}</TableCell>
                  <TableCell>{ETIQUETA_ROL[usuario.rol]}</TableCell>
                  <TableCell>
                    <Chip
                      label={usuario.activo ? 'Activo' : 'Inactivo'}
                      size="small"
                      color={usuario.activo ? 'success' : 'default'}
                      variant={usuario.activo ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell>
                    {usuario.frentes.length === 0
                      ? '—'
                      : usuario.frentes.map((f) => f.nombre).join(', ')}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Editar">
                      <IconButton
                        size="small"
                        aria-label={`Editar ${usuario.email}`}
                        onClick={() => setDialogo({ modo: 'editar', usuario })}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={usuario.activo ? 'Desactivar' : 'Activar'}>
                      <IconButton
                        size="small"
                        aria-label={usuario.activo ? `Desactivar ${usuario.email}` : `Activar ${usuario.email}`}
                        onClick={() => alternarActivo(usuario)}
                      >
                        {usuario.activo ? <ToggleOnIcon fontSize="small" color="success" /> : <ToggleOffIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {dialogo && (
        <UsuarioFormDialog
          open
          modo={dialogo.modo}
          usuarioInicial={dialogo.usuario}
          frentesDisponibles={frentes}
          guardando={dialogo.modo === 'crear' ? crear.estado === 'loading' : actualizar.estado === 'loading'}
          error={dialogo.modo === 'crear' ? crear.error : actualizar.error}
          onGuardar={guardar}
          onCancelar={cerrarDialogo}
        />
      )}
    </Box>
  )
}
