import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import InputAdornment from '@mui/material/InputAdornment'
import SearchIcon from '@mui/icons-material/Search'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import AddIcon from '@mui/icons-material/Add'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import Paper from '@mui/material/Paper'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'
import Skeleton from '@mui/material/Skeleton'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import CircularProgress from '@mui/material/CircularProgress'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/shared/hooks/redux'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { EmptyState } from '@/shared/components/EmptyState'
import { ErrorState } from '@/shared/components/ErrorState'
import { EstadoChip } from '@/shared/components/EstadoChip'
import { PlazoBar } from '@/shared/components/PlazoBar'
import { formatearFecha } from '@/shared/utils/fecha'
import type {
  ActualizarProcesoPayload,
  ConteoPorEstado,
  FaseProceso,
  ProcesoDetalle,
  TipoProceso,
} from '@/shared/types'
import { ProcesoForm } from './ProcesoForm'
import { crearProcesoRequest, limpiarCrearProceso } from './procesoMutacionesSlice'
import { procesosRequest } from './procesosSlice'

interface ProcesosTabProps {
  slug: string
  conteoPorEstado: ConteoPorEstado[]
  // Disparado por las tarjetas KPI del frente (FrenteDetallePage): valor
  // inicial de los filtros rápidos "Alertas" / "Próximos a vencer". Cambiarlo
  // remonta esta tab (el padre le pasa una `key` distinta), no se sincroniza
  // en caliente.
  filtroInicial?: { esAlerta?: boolean; proximosVencer?: boolean }
}

type GrupoActividad = [string, ProcesoDetalle[]]
type SeccionCategoria = [string, GrupoActividad[]]

// Dos niveles: categoría temática (Vial, Espacio público...) -> actividad ->
// sus procesos. La categoría viene de core.categoria_actividad (clasificación
// de negocio real, no inferida por texto) — ver v_proceso_detalle.
function agruparPorCategoriaYActividad(items: ProcesoDetalle[]): Map<string, Map<string, ProcesoDetalle[]>> {
  const porCategoria = new Map<string, Map<string, ProcesoDetalle[]>>()
  for (const item of items) {
    const actividades = porCategoria.get(item.categoriaActividad) ?? new Map<string, ProcesoDetalle[]>()
    const grupo = actividades.get(item.actividad) ?? []
    grupo.push(item)
    actividades.set(item.actividad, grupo)
    porCategoria.set(item.categoriaActividad, actividades)
  }
  return porCategoria
}

// Sin fecha de terminación al final (no hay plazo que vigilar); entre los que
// sí tienen, el que vence más pronto primero (vencido = días negativos, va
// antes que uno con margen todavía).
function ordenarPorVencimiento(a: ProcesoDetalle, b: ProcesoDetalle): number {
  if (a.diasRestantes === null && b.diasRestantes === null) return 0
  if (a.diasRestantes === null) return 1
  if (b.diasRestantes === null) return -1
  return a.diasRestantes - b.diasRestantes
}

function rangoFechas(fechaInicio: string | null, fechaTerminacion: string | null): string {
  if (!fechaInicio && !fechaTerminacion) return 'Sin fechas'
  return `${formatearFecha(fechaInicio)} – ${formatearFecha(fechaTerminacion)}`
}

export function ProcesosTab({ slug, conteoPorEstado, filtroInicial }: ProcesosTabProps) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { estado, error, data } = useAppSelector((s) => s.procesos)
  const catalogos = useAppSelector((s) => s.catalogos)
  const crearProceso = useAppSelector((s) => s.procesoMutaciones.crear)

  const [q, setQ] = useState('')
  const [fase, setFase] = useState<FaseProceso | ''>('')
  const [dependencia, setDependencia] = useState<number | ''>('')
  const [tipo, setTipo] = useState<TipoProceso | ''>('')
  // Reemplaza al viejo ProcesoStepper (fila de círculos grandes fuera de esta
  // tab): mismo filtro por estado, como un select más en esta fila.
  const [estadoIdFiltro, setEstadoIdFiltro] = useState<number | ''>('')
  const [esAlerta, setEsAlerta] = useState(filtroInicial?.esAlerta ?? false)
  const [proximosVencer, setProximosVencer] = useState(filtroInicial?.proximosVencer ?? false)
  const [dialogoCrearAbierto, setDialogoCrearAbierto] = useState(false)
  // Cada actividad arranca colapsada: el usuario ve primero la lista de
  // actividades del frente, no los contratos, y abre la que le interesa.
  const [actividadesAbiertas, setActividadesAbiertas] = useState<Set<string>>(new Set())
  const debouncedQ = useDebounce(q, 350)
  // Pedido explícito: EMVARIAS no muestra detalle de contrato (número,
  // contratista, fechas), ni para los procesos que sí lo tienen cargado —
  // solo la lista de actividades.
  const soloActividad = slug === 'emvarias'

  function toggleActividad(actividad: string) {
    setActividadesAbiertas((prev) => {
      const next = new Set(prev)
      if (next.has(actividad)) next.delete(actividad)
      else next.add(actividad)
      return next
    })
  }

  const estadoCodigoFiltro = useMemo(() => {
    if (estadoIdFiltro === '') return undefined
    return catalogos.estados.find((e) => e.id === estadoIdFiltro)?.codigo
  }, [estadoIdFiltro, catalogos.estados])

  // Estado inicial de un proceso nuevo: el de menor `orden` del catálogo (el
  // primer paso del flujo, típicamente "Precontractual"). ProcesoForm no
  // incluye selector de estado a propósito (ver su comentario), así que hay
  // que resolverlo acá para poder armar el CrearProcesoPayload completo.
  const estadoIdInicial = useMemo(() => {
    if (catalogos.estados.length === 0) return null
    return catalogos.estados.reduce((menor, e) => (e.orden < menor.orden ? e : menor)).id
  }, [catalogos.estados])

  function filtroActual() {
    return {
      page: 1,
      pageSize: 50,
      q: debouncedQ || undefined,
      fase: fase || undefined,
      dependencia: dependencia || undefined,
      tipo: tipo || undefined,
      estado: estadoCodigoFiltro,
      esAlerta: esAlerta || undefined,
      proximosVencer: proximosVencer || undefined,
    }
  }

  useEffect(() => {
    dispatch(procesosRequest({ slug, filtro: filtroActual() }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, slug, debouncedQ, fase, dependencia, tipo, estadoCodigoFiltro, esAlerta, proximosVencer])

  // Tras crear con éxito: cerrar el diálogo, refrescar la tabla (redispatch
  // del mismo fetch que ya usa la tab) y limpiar la mutación para la próxima vez.
  useEffect(() => {
    if (crearProceso.estado === 'succeeded') {
      setDialogoCrearAbierto(false)
      dispatch(procesosRequest({ slug, filtro: filtroActual() }))
      dispatch(limpiarCrearProceso())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crearProceso.estado, dispatch, slug])

  function crearProcesoNuevo(datos: ActualizarProcesoPayload) {
    if (estadoIdInicial === null) return
    dispatch(
      crearProcesoRequest({
        ...datos,
        // ProcesoForm valida actividadId como requerido (yup): siempre viene
        // poblado en runtime aunque ActualizarProcesoPayload lo declare opcional.
        actividadId: datos.actividadId as number,
        estadoId: estadoIdInicial,
      }),
    )
  }

  // Orden de las secciones = orden real del catálogo (Vial, Espacio público...),
  // no alfabético ni "como vinieron los datos".
  const secciones = useMemo<SeccionCategoria[]>(() => {
    const porCategoria = agruparPorCategoriaYActividad(data?.data ?? [])
    const ordenCategoria = new Map(catalogos.categoriasActividad.map((c) => [c.nombre, c.orden]))
    return [...porCategoria.entries()]
      .map<SeccionCategoria>(([categoria, actividades]) => [
        categoria,
        [...actividades.entries()].map<GrupoActividad>(([actividad, procesos]) => [
          actividad,
          [...procesos].sort(ordenarPorVencimiento),
        ]),
      ])
      .sort(([a], [b]) => (ordenCategoria.get(a) ?? 99) - (ordenCategoria.get(b) ?? 99))
  }, [data, catalogos.categoriasActividad])

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 3 }}>
        <TextField
          size="small"
          placeholder={soloActividad ? 'Buscar por actividad' : 'Buscar por contrato, necesidad, contratista o actividad'}
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
          aria-label="Buscar procesos"
        />
        {!soloActividad && (
          <>
            <TextField
              size="small"
              select
              label="Fase"
              value={fase}
              onChange={(e) => setFase(e.target.value as FaseProceso | '')}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">Todas</MenuItem>
              <MenuItem value="PRECONTRACTUAL">Precontractual</MenuItem>
              <MenuItem value="CONTRACTUAL">Contractual</MenuItem>
              <MenuItem value="POSCONTRACTUAL">Poscontractual</MenuItem>
            </TextField>
            <TextField
              size="small"
              select
              label="Dependencia"
              value={dependencia}
              onChange={(e) => setDependencia(e.target.value ? Number(e.target.value) : '')}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">Todas</MenuItem>
              {catalogos.dependencias.map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.sigla ?? d.nombre}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              select
              label="Tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoProceso | '')}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="PRINCIPAL">Principal</MenuItem>
              <MenuItem value="INTERVENTORIA">Interventoría</MenuItem>
            </TextField>
            <TextField
              size="small"
              select
              label="Estado"
              value={estadoIdFiltro}
              onChange={(e) => setEstadoIdFiltro(e.target.value ? Number(e.target.value) : '')}
              sx={{ minWidth: 190 }}
            >
              <MenuItem value="">Todos</MenuItem>
              {conteoPorEstado.map((item) => (
                <MenuItem key={item.estadoId} value={item.estadoId}>
                  {item.estado} ({item.total})
                </MenuItem>
              ))}
            </TextField>
          </>
        )}
        {esAlerta && (
          <Chip label="Alertas" color="error" onDelete={() => setEsAlerta(false)} sx={{ alignSelf: 'center' }} />
        )}
        {proximosVencer && (
          <Chip
            label="Próximos a vencer"
            sx={{ alignSelf: 'center', backgroundColor: '#FD7E14', color: '#fff' }}
            onDelete={() => setProximosVencer(false)}
          />
        )}
        {!soloActividad && (
          <Tooltip title={estadoIdInicial === null ? 'Cargando catálogo de estados…' : ''}>
            <span style={{ marginLeft: 'auto' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                disabled={estadoIdInicial === null}
                onClick={() => setDialogoCrearAbierto(true)}
              >
                Nuevo proceso
              </Button>
            </span>
          </Tooltip>
        )}
      </Stack>

      {estado === 'loading' && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }, gap: 1.5 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={56} />
          ))}
        </Box>
      )}

      {estado === 'failed' && (
        <ErrorState
          mensaje={error ?? undefined}
          onReintentar={() =>
            dispatch(
              procesosRequest({
                slug,
                filtro: { page: 1, pageSize: 50, estado: estadoCodigoFiltro },
              }),
            )
          }
        />
      )}

      {estado === 'succeeded' && secciones.length === 0 && (
        <EmptyState titulo="Sin procesos" mensaje="No hay procesos con estos filtros." />
      )}

      {/* Una sección por categoría temática (Vial, Espacio público...), y
          dentro de cada una el grid de actividades: en pantallas anchas se
          ven 2-3 actividades por fila, mucho menos scroll para recorrerlas
          todas. La tarjeta que se expande ocupa todo el ancho (gridColumn
          1/-1) para que sus contratos tengan lugar de sobra, igual en
          cualquier tamaño de pantalla — por eso no hace falta una versión
          aparte "mobile". */}
      {estado === 'succeeded' && secciones.length > 0 && (
        <Stack spacing={3}>
          {secciones.map(([categoria, grupos]) => (
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
                {grupos.map(([actividad, procesos]) => (
                  <TarjetaActividad
                    key={actividad}
                    actividad={actividad}
                    procesos={procesos}
                    abierto={actividadesAbiertas.has(actividad)}
                    onToggle={() => toggleActividad(actividad)}
                    onAbrir={(id) => navigate(`/procesos/${id}`)}
                    soloActividad={soloActividad}
                  />
                ))}
              </Box>
            </Box>
          ))}
        </Stack>
      )}

      <Dialog open={dialogoCrearAbierto} onClose={() => setDialogoCrearAbierto(false)} fullWidth maxWidth="sm">
        <DialogTitle>Nuevo proceso</DialogTitle>
        <DialogContent>
          <ProcesoForm
            formId="proceso-form-crear"
            contratistas={catalogos.contratistas}
            error={crearProceso.error}
            onGuardar={crearProcesoNuevo}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogoCrearAbierto(false)} disabled={crearProceso.estado === 'loading'}>
            Cancelar
          </Button>
          <Button type="submit" form="proceso-form-crear" variant="contained" disabled={crearProceso.estado === 'loading'}>
            {crearProceso.estado === 'loading' ? <CircularProgress size={20} color="inherit" /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

function TarjetaActividad({
  actividad,
  procesos,
  abierto,
  onToggle,
  onAbrir,
  soloActividad,
}: {
  actividad: string
  procesos: ProcesoDetalle[]
  abierto: boolean
  onToggle: () => void
  onAbrir: (id: string) => void
  soloActividad?: boolean
}) {
  if (soloActividad) {
    // Desglose de sub-actividades (ej. "Limpieza urbana"), guardado en la
    // observación del proceso — no es dato de contrato, es la única
    // información que puede acompañar a la actividad acá. Mismo lenguaje
    // visual (acento celeste + chevron) que las tarjetas de actividad
    // normales, para que se note de un vistazo cuál tiene más para ver y
    // cuál es solo el nombre.
    const desglose = procesos.find((p) => p.observacion)?.observacion
    return (
      <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
        <Box
          onClick={desglose ? onToggle : undefined}
          sx={{
            px: 1.25,
            py: 1,
            cursor: desglose ? 'pointer' : 'default',
            ...(desglose && {
              backgroundColor: 'rgba(0,171,238,0.08)',
              borderLeft: '3px solid',
              borderLeftColor: 'primary.main',
              transition: 'background-color 120ms ease',
              '&:hover': { backgroundColor: 'rgba(0,171,238,0.14)' },
            }),
          }}
        >
          <Stack direction="row" alignItems="center" spacing={0.75}>
            {desglose && (abierto ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />)}
            <Typography
              title={actividad}
              sx={{
                fontWeight: 700,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {actividad}
            </Typography>
          </Stack>
        </Box>
        {desglose && abierto && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 1.25, pb: 1.25, pt: 1 }}>
            {desglose}
          </Typography>
        )}
      </Paper>
    )
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        // La tarjeta abierta ocupa toda la fila del grid: sus contratos
        // necesitan más ancho del que da una sola columna.
        gridColumn: abierto ? '1 / -1' : 'auto',
        overflow: 'hidden',
      }}
    >
      <Box
        onClick={onToggle}
        sx={{
          cursor: 'pointer',
          backgroundColor: 'rgba(0,171,238,0.08)',
          borderLeft: '3px solid',
          borderLeftColor: 'primary.main',
          px: 1.25,
          py: 0.75,
        }}
      >
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
          <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
            {abierto ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
            <Typography
              title={actividad}
              sx={{
                fontWeight: 700,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {actividad}{' '}
              <Typography component="span" variant="caption" color="text.secondary" sx={{ fontWeight: 400 }}>
                ({procesos.length} {procesos.length === 1 ? 'proceso' : 'procesos'})
              </Typography>
            </Typography>
          </Stack>
          <IconosSecop procesos={procesos} />
        </Stack>
      </Box>

      {abierto && (
        <Stack spacing={2} sx={{ p: 1.5 }}>
          {procesos.map((p) => (
            <Card
              key={p.id}
              variant="outlined"
              onClick={() => onAbrir(p.id)}
              sx={{
                cursor: 'pointer',
                transition: 'background-color 120ms ease, border-color 120ms ease',
                '&:hover': { backgroundColor: 'rgba(0,171,238,0.05)', borderColor: 'primary.main' },
              }}
            >
              <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {p.contratista ?? 'Sin contratista'}
                  </Typography>
                  <EstadoChip nombre={p.estado} color={p.estadoColor} esAlerta={p.esAlerta} />
                </Stack>
                <PlazoBar pctPlazo={p.pctPlazo} diasRestantes={p.diasRestantes} />
                <Typography variant="caption" color="text.secondary">
                  {p.numeroContrato ? `Contrato ${p.numeroContrato}` : `Necesidad ${p.numeroNecesidad ?? '—'}`}
                  {/* La barra de plazo ya dice "Sin fecha" cuando no hay fechas: no repetirlo acá. */}
                  {(p.fechaInicio || p.fechaTerminacion) && ` · ${rangoFechas(p.fechaInicio, p.fechaTerminacion)}`}
                </Typography>
                {p.ultimaNota && (
                  <Typography variant="caption" color="text.secondary" noWrap title={p.ultimaNota}>
                    {p.ultimaNota}
                  </Typography>
                )}
                {p.linkSecop && (
                  <Link
                    href={p.linkSecop}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    sx={{ fontSize: 12 }}
                  >
                    Ver en SECOP
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Paper>
  )
}

// Un ícono de SECOP por cada contrato de la actividad, visible sin expandir
// (pedido explícito: ver el link de cada contrato de una, no solo al abrir).
function IconosSecop({ procesos }: { procesos: ProcesoDetalle[] }) {
  const conLink = procesos.filter((p) => p.linkSecop)
  if (conLink.length === 0) return null
  return (
    <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0 }}>
      {conLink.map((p) => (
        <Tooltip key={p.id} title={`SECOP: ${p.numeroContrato ?? p.numeroNecesidad ?? p.contratista ?? p.id}`}>
          <IconButton
            size="small"
            component="a"
            href={p.linkSecop!}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            aria-label={`Abrir en SECOP: ${p.numeroContrato ?? p.numeroNecesidad ?? p.id}`}
            sx={{ p: 0.5 }}
          >
            <OpenInNewIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      ))}
    </Box>
  )
}
