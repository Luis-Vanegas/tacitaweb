import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Collapse from '@mui/material/Collapse'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined'
import { tokens } from '@/app/theme/tokens'
import { useAppDispatch, useAppSelector } from '@/shared/hooks/redux'
import { EstadoChip } from '@/shared/components/EstadoChip'
import { formatearFecha } from '@/shared/utils/fecha'
import { ESTADOS_COMPROMISO as ESTADOS, esVencido } from './compromiso'
import { compromisosRequest } from './compromisosSlice'
import { useEdicionCompromisos } from './useEdicionCompromisos'

// Lista desplegable de compromisos del proyecto (hoja "Compromisos" del Excel).
// Lista y no tabla: en el celular una tabla de 5 columnas no entra. El avance
// de gestión va como línea secundaria solo si existe, para no alargar la lista.
// La vista completa (filtros, todos los campos) está en /compromisos.
export function CompromisosPanel() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { estado, items } = useAppSelector((s) => s.compromisos)
  const { puedeEditar, puedeEliminar, crear, editar, eliminar, dialogos } = useEdicionCompromisos()
  const [abierto, setAbierto] = useState(false)

  useEffect(() => {
    dispatch(compromisosRequest())
  }, [dispatch])

  const pendientes = items.filter((c) => c.estado !== 'CUMPLIDO').length
  // Sin compromisos, el LECTOR no ve nada; ADMIN/EDITOR sí, para crear el primero.
  if (items.length === 0 && (estado !== 'succeeded' || !puedeEditar)) return null

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', mb: 1 }}>
      <Button
        size="small"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-controls="lista-compromisos"
        startIcon={<TaskAltOutlinedIcon />}
        endIcon={<ExpandMoreIcon sx={{ transform: abierto ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }} />}
        sx={{ color: tokens.color.onNavy }}
      >
        Compromisos · {pendientes} {pendientes === 1 ? 'pendiente' : 'pendientes'}
      </Button>
      <Button size="small" startIcon={<OpenInNewIcon />} onClick={() => navigate('/compromisos')} sx={{ color: tokens.color.onNavy }}>
        Ver todos
      </Button>
      {puedeEditar && (
        <Button size="small" startIcon={<AddIcon />} onClick={crear} sx={{ color: tokens.color.onNavy }}>
          Nuevo compromiso
        </Button>
      )}

      <Collapse in={abierto} id="lista-compromisos">
        <Box
          component="ul"
          sx={{
            listStyle: 'none',
            m: 0,
            mt: 1,
            p: 0,
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: tokens.color.cardBackground,
            color: 'text.primary',
          }}
        >
          {items.map((c, i) => {
            const vencido = esVencido(c)
            return (
              <Box
                component="li"
                key={c.id}
                sx={{ px: 2, py: 1.25, borderTop: i === 0 ? 'none' : '1px solid rgb(0 0 0 / 8%)' }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1.5}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>{c.descripcion}</Typography>
                    <Typography variant="caption" sx={{ color: vencido ? tokens.color.error : 'rgb(0 0 0 / 60%)', fontWeight: vencido ? 700 : 400 }}>
                      {c.responsable ?? 'Sin responsable'} · {vencido ? 'Venció' : 'Vence'} {formatearFecha(c.fechaCumplimiento)}
                    </Typography>
                    {c.avance && (
                      <Typography variant="caption" sx={{ display: 'block', color: 'rgb(0 0 0 / 60%)' }}>
                        {c.avance}
                      </Typography>
                    )}
                  </Box>
                  <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
                    <EstadoChip nombre={ESTADOS[c.estado].nombre} color={ESTADOS[c.estado].color} />
                    {puedeEditar && (
                      <Tooltip title="Editar">
                        <IconButton size="small" aria-label={`Editar compromiso: ${c.descripcion}`} onClick={() => editar(c)}>
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {puedeEliminar && (
                      <Tooltip title="Eliminar">
                        <IconButton size="small" aria-label={`Eliminar compromiso: ${c.descripcion}`} onClick={() => eliminar(c)}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </Stack>
              </Box>
            )
          })}
        </Box>
      </Collapse>

      {dialogos}
    </Box>
  )
}
