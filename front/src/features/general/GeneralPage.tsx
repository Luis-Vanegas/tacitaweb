import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined'
import SearchIcon from '@mui/icons-material/Search'
import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined'
import { tokens } from '@/app/theme/tokens'
import { useAppDispatch, useAppSelector } from '@/shared/hooks/redux'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { EmptyState } from '@/shared/components/EmptyState'
import { ErrorState } from '@/shared/components/ErrorState'
import { KpiCard } from '@/shared/components/KpiCard'
import { TarjetaActividad } from '@/shared/components/TarjetaActividad'
import { resolverIconoFrente } from '@/shared/utils/iconoFrente'
import { construirSecciones } from '@/shared/utils/agruparProcesos'
import { catalogosRequest } from '@/features/catalogos/catalogosSlice'
import type { ProcesoDetalle } from '@/shared/types'
import { generalRequest } from './generalSlice'

// Misma definición que "proximos_vencer" en v_resumen_frente / FrentesService.listarProcesos.
function esProximoAVencer(p: ProcesoDetalle): boolean {
  return p.fase === 'CONTRACTUAL' && p.diasRestantes !== null && p.diasRestantes >= 0 && p.diasRestantes <= 30
}

function coincideBusqueda(p: ProcesoDetalle, q: string): boolean {
  if (!q) return true
  const texto = q.toLowerCase()
  return (
    p.actividad.toLowerCase().includes(texto) ||
    (p.contratista?.toLowerCase().includes(texto) ?? false) ||
    (p.numeroContrato?.toLowerCase().includes(texto) ?? false) ||
    (p.numeroNecesidad?.toLowerCase().includes(texto) ?? false)
  )
}

export function GeneralPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { estado, error, frentes } = useAppSelector((s) => s.general)
  const catalogos = useAppSelector((s) => s.catalogos)

  const [q, setQ] = useState('')
  const [frenteSeleccionado, setFrenteSeleccionado] = useState('')
  const [soloAlertas, setSoloAlertas] = useState(false)
  const [soloProximos, setSoloProximos] = useState(false)
  const [actividadesAbiertas, setActividadesAbiertas] = useState<Set<string>>(new Set())
  const debouncedQ = useDebounce(q, 350)

  useEffect(() => {
    dispatch(catalogosRequest())
    dispatch(generalRequest())
  }, [dispatch])

  function toggleActividad(clave: string) {
    setActividadesAbiertas((prev) => {
      const next = new Set(prev)
      if (next.has(clave)) next.delete(clave)
      else next.add(clave)
      return next
    })
  }

  function aplicarFiltroRapido(filtro: 'alertas' | 'proximos' | null) {
    setSoloAlertas(filtro === 'alertas')
    setSoloProximos(filtro === 'proximos')
  }

  // Totales reales del backend (v_resumen_frente), no recalculados sobre los
  // datos ya cargados en el front — así las tarjetas KPI no dependen del tope
  // de pageSize de cada fetch por frente.
  const totales = useMemo(
    () =>
      frentes.reduce(
        (acc, { frente }) => ({
          actividades: acc.actividades + frente.totalActividades,
          procesos: acc.procesos + frente.totalProcesos,
          alertas: acc.alertas + frente.alertas,
          proximosVencer: acc.proximosVencer + frente.proximosVencer,
        }),
        { actividades: 0, procesos: 0, alertas: 0, proximosVencer: 0 },
      ),
    [frentes],
  )

  const ordenCategoria = useMemo(
    () => new Map(catalogos.categoriasActividad.map((c) => [c.nombre, c.orden])),
    [catalogos.categoriasActividad],
  )

  const secciones = useMemo(
    () =>
      frentes
        .filter(({ frente }) => !frenteSeleccionado || frente.slug === frenteSeleccionado)
        .map(({ frente, procesos }) => ({
          frente,
          secciones: construirSecciones(
            procesos.filter(
              (p) =>
                coincideBusqueda(p, debouncedQ) &&
                (!soloAlertas || p.esAlerta) &&
                (!soloProximos || esProximoAVencer(p)),
            ),
            ordenCategoria,
          ),
        }))
        .filter((s) => s.secciones.length > 0),
    [frentes, frenteSeleccionado, debouncedQ, soloAlertas, soloProximos, ordenCategoria],
  )

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
                aria-label="Refrescar vista general"
                onClick={() => dispatch(generalRequest())}
                sx={{ color: '#fff' }}
              >
                <RefreshOutlinedIcon />
              </IconButton>
            </Tooltip>
          </Stack>

          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
              Vista general
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              Todas las actividades de los frentes, en un solo lugar.
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Box sx={{ px: { xs: 2, sm: 4, md: 6 }, py: 3 }}>
        {estado === 'failed' && (
          <ErrorState mensaje={error ?? undefined} onReintentar={() => dispatch(generalRequest())} />
        )}

        {estado === 'loading' && frentes.length === 0 && (
          <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 3 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" width={180} height={72} />
            ))}
          </Stack>
        )}

        {frentes.length > 0 && (
          <>
            <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 3, rowGap: 2 }}>
              <KpiCard etiqueta="Actividades" valor={totales.actividades} icono={ListAltOutlinedIcon} />
              <KpiCard
                etiqueta="Total procesos"
                valor={totales.procesos}
                icono={AssignmentOutlinedIcon}
                onClick={() => aplicarFiltroRapido(null)}
              />
              <KpiCard
                etiqueta="Alertas"
                valor={totales.alertas}
                icono={WarningAmberOutlinedIcon}
                color="#DC3545"
                onClick={() => aplicarFiltroRapido('alertas')}
              />
              <KpiCard
                etiqueta="Próximos a vencer (≤30 d)"
                valor={totales.proximosVencer}
                icono={EventBusyOutlinedIcon}
                color="#FD7E14"
                onClick={() => aplicarFiltroRapido('proximos')}
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 3 }}>
              <TextField
                size="small"
                placeholder="Buscar por contrato, necesidad, contratista o actividad"
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
                aria-label="Buscar actividades"
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
                {frentes.map(({ frente }) => (
                  <MenuItem key={frente.slug} value={frente.slug}>
                    {frente.nombre}
                  </MenuItem>
                ))}
              </TextField>
              {soloAlertas && (
                <Chip label="Alertas" color="error" onDelete={() => setSoloAlertas(false)} sx={{ alignSelf: 'center' }} />
              )}
              {soloProximos && (
                <Chip
                  label="Próximos a vencer"
                  sx={{ alignSelf: 'center', backgroundColor: '#FD7E14', color: '#fff' }}
                  onDelete={() => setSoloProximos(false)}
                />
              )}
            </Stack>
          </>
        )}

        {estado === 'succeeded' && secciones.length === 0 && (
          <EmptyState titulo="Sin actividades" mensaje="No hay actividades con estos filtros." />
        )}

        <Stack spacing={5}>
          {secciones.map(({ frente, secciones: seccionesFrente }) => {
            const Icono = resolverIconoFrente(frente.icono)
            return (
              <Box key={frente.slug}>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1.25}
                  onClick={() => navigate(`/frentes/${frente.slug}`)}
                  sx={{ cursor: 'pointer', mb: 2, '&:hover .nombre-frente': { textDecoration: 'underline' } }}
                >
                  <Box
                    aria-hidden="true"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      backgroundColor: `${frente.color}1F`,
                      color: frente.color,
                      flexShrink: 0,
                    }}
                  >
                    <Icono fontSize="small" />
                  </Box>
                  <Typography variant="h6" component="h2" className="nombre-frente" sx={{ fontWeight: 700 }}>
                    {frente.nombre}
                  </Typography>
                </Stack>

                <Stack spacing={3}>
                  {seccionesFrente.map(([categoria, grupos]) => (
                    <Box key={categoria}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                        {categoria}
                        <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1, fontWeight: 400 }}>
                          ({grupos.length} {grupos.length === 1 ? 'actividad' : 'actividades'})
                        </Typography>
                      </Typography>
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' },
                          gap: 1.5,
                          alignItems: 'start',
                        }}
                      >
                        {grupos.map(([actividad, procesos]) => {
                          const clave = `${frente.slug}::${actividad}`
                          return (
                            <TarjetaActividad
                              key={clave}
                              actividad={actividad}
                              procesos={procesos}
                              abierto={actividadesAbiertas.has(clave)}
                              onToggle={() => toggleActividad(clave)}
                              onAbrir={(id) => navigate(`/procesos/${id}`)}
                              soloActividad={frente.slug === 'emvarias'}
                              acento={frente.color}
                            />
                          )
                        })}
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )
          })}
        </Stack>
      </Box>
    </Box>
  )
}
