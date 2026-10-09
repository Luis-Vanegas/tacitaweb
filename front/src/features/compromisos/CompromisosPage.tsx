import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined'
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import HourglassEmptyOutlinedIcon from '@mui/icons-material/HourglassEmptyOutlined'
import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined'
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined'
import SearchIcon from '@mui/icons-material/Search'
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined'
import { tokens } from '@/app/theme/tokens'
import { useAppDispatch, useAppSelector } from '@/shared/hooks/redux'
import { EmptyState } from '@/shared/components/EmptyState'
import { ErrorState } from '@/shared/components/ErrorState'
import { EstadoChip } from '@/shared/components/EstadoChip'
import { KpiCard } from '@/shared/components/KpiCard'
import { formatearFecha } from '@/shared/utils/fecha'
import type { EstadoCompromiso } from '@/shared/types'
import { ESTADOS_COMPROMISO as ESTADOS, esVencido, ordenarCompromisos } from './compromiso'
import { compromisosRequest } from './compromisosSlice'
import { useEdicionCompromisos } from './useEdicionCompromisos'

// Vista completa de compromisos: todos los campos sin recortar (el panel del
// mapa es solo un resumen). Tarjetas y no tabla: descripción y avance son
// textos largos (hasta 2000 caracteres) que en columnas quedarían ilegibles,
// y la misma tarjeta sirve en celular y escritorio.
export function CompromisosPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { estado, error, items } = useAppSelector((s) => s.compromisos)
  const { puedeEditar, puedeEliminar, crear, editar, eliminar, dialogos } = useEdicionCompromisos()

  const [q, setQ] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoCompromiso | ''>('')
  const [soloVencidos, setSoloVencidos] = useState(false)

  useEffect(() => {
    dispatch(compromisosRequest())
  }, [dispatch])

  // KPIs sobre el total, no sobre lo filtrado: son el estado del proyecto.
  const kpis = useMemo(
    () => ({
      total: items.length,
      pendientes: items.filter((c) => c.estado === 'PENDIENTE').length,
      enGestion: items.filter((c) => c.estado === 'EN_GESTION').length,
      cumplidos: items.filter((c) => c.estado === 'CUMPLIDO').length,
      vencidos: items.filter((c) => esVencido(c)).length,
    }),
    [items],
  )

  const filas = useMemo(() => {
    const texto = q.trim().toLowerCase()
    const coincide = (v: string | null) => (v ?? '').toLowerCase().includes(texto)
    return ordenarCompromisos(
      items.filter(
        (c) =>
          (!texto || coincide(c.descripcion) || coincide(c.responsable) || coincide(c.avance)) &&
          (!estadoFiltro || c.estado === estadoFiltro) &&
          (!soloVencidos || esVencido(c)),
      ),
    )
  }, [items, q, estadoFiltro, soloVencidos])

  const cargado = estado === 'succeeded' || items.length > 0

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#F4F6F8' }}>
      <Box
        sx={{
          background: `linear-gradient(135deg, ${tokens.color.headerGradientFrom}, ${tokens.color.headerGradientTo})`,
          color: '#fff',
          px: { xs: 2, sm: 4, md: 6 },
          py: { xs: 3, sm: 4 },
        }}
      >
        <Stack direction="row" alignItems="flex-start" flexWrap="wrap" gap={2}>
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Volver">
              <IconButton
                aria-label="Volver a la pantalla anterior"
                onClick={() => navigate(-1)}
                sx={{
                  color: '#fff',
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' },
                }}
              >
                <ArrowBackOutlinedIcon sx={{ fontSize: 30 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Ir al menú">
              <IconButton aria-label="Ir al menú de frentes" onClick={() => navigate('/')} sx={{ color: '#fff' }}>
                <HomeOutlinedIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Refrescar">
              <IconButton aria-label="Refrescar compromisos" onClick={() => dispatch(compromisosRequest())} sx={{ color: '#fff' }}>
                <RefreshOutlinedIcon />
              </IconButton>
            </Tooltip>
          </Stack>

          <Box sx={{ flex: 1, minWidth: 220 }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
              Compromisos
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              Los compromisos del proyecto, con su responsable, fechas y avance.
            </Typography>
          </Box>

          {puedeEditar && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={crear}
              sx={{ backgroundColor: '#fff', color: tokens.color.headerGradientTo, '&:hover': { backgroundColor: 'rgba(255,255,255,0.9)' } }}
            >
              Nuevo compromiso
            </Button>
          )}
        </Stack>
      </Box>

      <Box sx={{ px: { xs: 2, sm: 4, md: 6 }, py: 3 }}>
        {estado === 'failed' && <ErrorState mensaje={error ?? undefined} onReintentar={() => dispatch(compromisosRequest())} />}

        {!cargado && estado !== 'failed' && (
          <Stack spacing={2}>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} variant="rounded" width={160} height={72} />
              ))}
            </Stack>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={120} />
            ))}
          </Stack>
        )}

        {cargado && (
          <>
            <Stack role="group" aria-label="Indicadores de compromisos" direction="row" flexWrap="wrap" useFlexGap spacing={2} sx={{ mb: 3 }}>
              <KpiCard etiqueta="Total" valor={kpis.total} icono={ListAltOutlinedIcon} />
              <KpiCard etiqueta="Pendientes" valor={kpis.pendientes} icono={HourglassEmptyOutlinedIcon} color={ESTADOS.PENDIENTE.color} />
              <KpiCard etiqueta="En gestión" valor={kpis.enGestion} icono={AssignmentTurnedInOutlinedIcon} color={ESTADOS.EN_GESTION.color} />
              <KpiCard etiqueta="Cumplidos" valor={kpis.cumplidos} icono={TaskAltOutlinedIcon} color={ESTADOS.CUMPLIDO.color} />
              <KpiCard etiqueta="Vencidos" valor={kpis.vencidos} icono={EventBusyOutlinedIcon} color={tokens.color.error} />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} sx={{ mb: 3 }}>
              <TextField
                size="small"
                placeholder="Buscar por descripción, responsable o avance"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                sx={{ flex: 2, minWidth: 220 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon aria-hidden="true" fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                  htmlInput: { 'aria-label': 'Buscar compromisos' },
                }}
              />
              <TextField
                size="small"
                select
                label="Estado"
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value as EstadoCompromiso | '')}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="">Todos</MenuItem>
                {(Object.keys(ESTADOS) as EstadoCompromiso[]).map((clave) => (
                  <MenuItem key={clave} value={clave}>
                    {ESTADOS[clave].nombre}
                  </MenuItem>
                ))}
              </TextField>
              <FormControlLabel
                control={<Checkbox checked={soloVencidos} onChange={(e) => setSoloVencidos(e.target.checked)} />}
                label="Solo vencidos"
              />
            </Stack>

            {filas.length === 0 ? (
              <EmptyState titulo="Sin compromisos" mensaje="No hay compromisos que coincidan." />
            ) : (
              <Stack component="ul" spacing={1.5} sx={{ listStyle: 'none', m: 0, p: 0 }} aria-label="Compromisos">
                {filas.map((c) => {
                  const vencido = esVencido(c)
                  return (
                    <Paper
                      component="li"
                      key={c.id}
                      variant="outlined"
                      sx={{ p: 2, borderLeft: `4px solid ${vencido ? tokens.color.error : ESTADOS[c.estado].color}` }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1.5}>
                        <Typography sx={{ fontWeight: 600, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                          {c.descripcion}
                        </Typography>
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

                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
                          gap: 1.5,
                          mt: 1.5,
                        }}
                      >
                        <Campo etiqueta="Responsable">{c.responsable ?? 'Sin responsable'}</Campo>
                        <Campo etiqueta="Fecha de registro">{formatearFecha(c.fechaRegistro)}</Campo>
                        <Campo etiqueta="Fecha de cumplimiento">
                          <Box component="span" sx={vencido ? { color: tokens.color.error, fontWeight: 700 } : undefined}>
                            {formatearFecha(c.fechaCumplimiento)}
                            {vencido && ' · Vencido'}
                          </Box>
                        </Campo>
                      </Box>

                      <Box sx={{ mt: 1.5 }}>
                        <Campo etiqueta="Avance">{c.avance ?? 'Sin avance registrado'}</Campo>
                      </Box>
                    </Paper>
                  )
                })}
              </Stack>
            )}
          </>
        )}
      </Box>

      {dialogos}
    </Box>
  )
}

function Campo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" component="p">
        {etiqueta}
      </Typography>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
        {children}
      </Typography>
    </Box>
  )
}
