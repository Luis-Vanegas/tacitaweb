import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Collapse from '@mui/material/Collapse'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined'
import { tokens } from '@/app/theme/tokens'
import { useAppDispatch, useAppSelector } from '@/shared/hooks/redux'
import { EstadoChip } from '@/shared/components/EstadoChip'
import { formatearFecha } from '@/shared/utils/fecha'
import type { Compromiso } from '@/shared/types'
import { compromisosRequest } from './compromisosSlice'

// Los estados de compromiso no viven en estado_proceso (son de otra tabla):
// su color se fija acá con los tokens semánticos de la app.
const ESTADOS: Record<Compromiso['estado'], { nombre: string; color: string }> = {
  PENDIENTE: { nombre: 'Pendiente', color: '#FD7E14' },
  EN_GESTION: { nombre: 'En gestión', color: tokens.color.info },
  CUMPLIDO: { nombre: 'Cumplido', color: tokens.color.success },
}

// Lista desplegable de compromisos del proyecto (hoja "Compromisos" del Excel).
// Lista y no tabla: en el celular una tabla de 5 columnas no entra. El avance
// de gestión va como línea secundaria solo si existe, para no alargar la lista.
export function CompromisosPanel() {
  const dispatch = useAppDispatch()
  const { estado, items } = useAppSelector((s) => s.compromisos)
  const [abierto, setAbierto] = useState(false)

  useEffect(() => {
    dispatch(compromisosRequest())
  }, [dispatch])

  const pendientes = items.filter((c) => c.estado !== 'CUMPLIDO').length
  if (estado !== 'succeeded' || items.length === 0) return null

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
            const vencido = c.estado !== 'CUMPLIDO' && c.fechaCumplimiento !== null && dayjs(c.fechaCumplimiento).isBefore(dayjs(), 'day')
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
                  <EstadoChip nombre={ESTADOS[c.estado].nombre} color={ESTADOS[c.estado].color} />
                </Stack>
              </Box>
            )
          })}
        </Box>
      </Collapse>
    </Box>
  )
}
