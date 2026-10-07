import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined'
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined'
import SearchIcon from '@mui/icons-material/Search'
import { tokens } from '@/app/theme/tokens'
import { useAppDispatch, useAppSelector } from '@/shared/hooks/redux'
import { EmptyState } from '@/shared/components/EmptyState'
import { ErrorState } from '@/shared/components/ErrorState'
import { KpiCard } from '@/shared/components/KpiCard'
import { formatearFecha } from '@/shared/utils/fecha'
import type { FrenteResumido, PersonalCorte } from '@/shared/types'
import { EditarCorteDialog } from './EditarCorteDialog'
import { personalGeneralRequest } from './personalGeneralSlice'

// Vista general de personal (GET /personal): una fila por tipo de personal con
// sus frentes. Mismo esqueleto visual que la vista general de procesos.
export function PersonalGeneralPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { estado, error, data } = useAppSelector((s) => s.personalGeneral)
  const rol = useAppSelector((s) => s.auth.usuario?.rol)
  const puedeEditar = rol === 'ADMIN' || rol === 'EDITOR'

  const [q, setQ] = useState('')
  const [frenteSeleccionado, setFrenteSeleccionado] = useState('')
  const [edicion, setEdicion] = useState<{
    corte: PersonalCorte
    nombreTipo: string
  } | null>(null)

  useEffect(() => {
    dispatch(personalGeneralRequest())
  }, [dispatch])

  const items = useMemo(() => data?.items ?? [], [data])
  const cortePorId = useMemo(() => new Map((data?.historico ?? []).map((c) => [c.id, c])), [data])

  // Frentes únicos que aparecen en las filas, para el filtro.
  const frentes = useMemo(() => {
    const mapa = new Map<string, FrenteResumido>()
    for (const item of items) for (const f of item.frentes) mapa.set(f.slug, f)
    return [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [items])

  const filas = useMemo(() => {
    const texto = q.trim().toLowerCase()
    return items.filter(
      (item) =>
        (!texto || item.tipoPersonal.toLowerCase().includes(texto)) &&
        (!frenteSeleccionado || item.frentes.some((f) => f.slug === frenteSeleccionado)),
    )
  }, [items, q, frenteSeleccionado])

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
              <IconButton
                aria-label="Refrescar personal"
                onClick={() => dispatch(personalGeneralRequest())}
                sx={{ color: '#fff' }}
              >
                <RefreshOutlinedIcon />
              </IconButton>
            </Tooltip>
          </Stack>

          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
              Personal — vista general
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              El personal vigente de todos los frentes, en un solo lugar.
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Box sx={{ px: { xs: 2, sm: 4, md: 6 }, py: 3 }}>
        {estado === 'failed' && (
          <ErrorState mensaje={error ?? undefined} onReintentar={() => dispatch(personalGeneralRequest())} />
        )}

        {estado === 'loading' && !data && (
          <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 3 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" width={180} height={72} />
            ))}
          </Stack>
        )}

        {data && (
          <>
            {/* Totales del backend: ya cuentan una sola vez los tipos ligados a
                varios frentes; sumarlos acá desde las filas filtradas mentiría. */}
            <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 3, rowGap: 2 }}>
              <KpiCard
                etiqueta="Actual"
                valor={data.totales.actual}
                icono={GroupsOutlinedIcon}
                color={tokens.color.success}
              />
              <KpiCard
                etiqueta="Pendiente"
                valor={data.totales.pendiente}
                icono={PersonAddAltOutlinedIcon}
                color="#FD7E14"
              />
              <KpiCard etiqueta="Meta" valor={data.totales.meta} icono={FlagOutlinedIcon} />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 3 }}>
              <TextField
                size="small"
                placeholder="Buscar por tipo de personal"
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
                }}
                aria-label="Buscar tipo de personal"
              />
              <TextField
                size="small"
                select
                label="Frente"
                value={frenteSeleccionado}
                onChange={(e) => setFrenteSeleccionado(e.target.value)}
                sx={{ minWidth: 200 }}
              >
                <MenuItem value="">Todos los frentes</MenuItem>
                {frentes.map((f) => (
                  <MenuItem key={f.slug} value={f.slug}>
                    {f.nombre}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            {filas.length === 0 ? (
              <EmptyState titulo="Sin personal" mensaje="No hay personal con estos filtros." />
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small" aria-label="Personal vigente por tipo">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tipo de personal</TableCell>
                      <TableCell>Frentes</TableCell>
                      <TableCell align="right">Vigencia</TableCell>
                      <TableCell align="right">Actual</TableCell>
                      <TableCell align="right">Pendiente</TableCell>
                      <TableCell align="right">Meta</TableCell>
                      <TableCell>Fecha final</TableCell>
                      {puedeEditar && <TableCell aria-label="Acciones" />}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filas.map((item) => {
                      // Se edita la fila cruda del histórico (mismo id que corteId).
                      const corteCrudo = cortePorId.get(item.corteId)
                      return (
                        <TableRow key={item.corteId}>
                          <TableCell sx={{ fontWeight: 600 }}>{item.tipoPersonal}</TableCell>
                          <TableCell>
                            <Stack direction="row" flexWrap="wrap" gap={0.5}>
                              {item.frentes.map((f) => (
                                <Chip
                                  key={f.slug}
                                  size="small"
                                  label={f.nombre}
                                  sx={{
                                    backgroundColor: alpha(f.color, 0.14),
                                    color: f.color,
                                    fontWeight: 700,
                                  }}
                                />
                              ))}
                            </Stack>
                          </TableCell>
                          <TableCell align="right">{item.vigencia}</TableCell>
                          <TableCell align="right">{item.actual}</TableCell>
                          <TableCell align="right">{item.pendiente}</TableCell>
                          <TableCell align="right">{item.meta}</TableCell>
                          <TableCell>{formatearFecha(item.fechaFinal)}</TableCell>
                          {puedeEditar && (
                            <TableCell align="right">
                              {corteCrudo && (
                                <Tooltip title="Editar">
                                  <IconButton
                                    size="small"
                                    aria-label={`Editar ${item.tipoPersonal}`}
                                    onClick={() =>
                                      setEdicion({
                                        corte: corteCrudo,
                                        nombreTipo: item.tipoPersonal,
                                      })
                                    }
                                  >
                                    <EditOutlinedIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}
      </Box>

      {edicion && (
        <EditarCorteDialog
          open
          corte={edicion.corte}
          nombreTipo={edicion.nombreTipo}
          onClose={() => setEdicion(null)}
          onGuardado={() => {
            setEdicion(null)
            dispatch(personalGeneralRequest())
          }}
        />
      )}
    </Box>
  )
}
