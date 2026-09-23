import { useEffect, useState, type SyntheticEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined'
import FilterListOutlinedIcon from '@mui/icons-material/FilterListOutlined'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import { tokens } from '@/app/theme/tokens'
import { useAppDispatch, useAppSelector } from '@/shared/hooks/redux'
import { ErrorState } from '@/shared/components/ErrorState'
import { KpiCard } from '@/shared/components/KpiCard'
import { PdfDownloadButton } from '@/shared/components/pdf/PdfDownloadButton'
import { FrentePdfDocument } from '@/shared/components/pdf/FrentePdfDocument'
import { http } from '@/shared/api/http'
import { endpoints } from '@/shared/api/endpoints'
import { catalogosRequest } from '@/features/catalogos/catalogosSlice'
import { frenteDetalleRequest, limpiarFrenteDetalle } from './frentesSlice'
import { ProcesoStepper } from './ProcesoStepper'
import { PersonalTab } from './PersonalTab'
import { ProcesosTab } from '@/features/procesos/ProcesosTab'

type TabId = 'procesos' | 'personal' | 'bitacora'

// Content-Disposition real que manda el backend (FrentesController.exportar):
// `attachment; filename="<slug>-<fecha>.xlsx"`. Se parsea en vez de inventar
// el nombre en el front, por si cambia el formato del lado del servidor.
function nombreDesdeContentDisposition(header: string | undefined, fallback: string): string {
  const match = header?.match(/filename="?([^"; ]+)"?/i)
  return match?.[1] ?? fallback
}

export function FrenteDetallePage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [searchParams, setSearchParams] = useSearchParams()
  const [estadoIdFiltro, setEstadoIdFiltro] = useState<number | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [exportando, setExportando] = useState(false)
  const [errorExportar, setErrorExportar] = useState<string | null>(null)

  const { estado, error, data } = useAppSelector((s) => s.frentes.detalle)

  const tabActual = (searchParams.get('tab') as TabId | null) ?? 'procesos'

  useEffect(() => {
    dispatch(catalogosRequest())
  }, [dispatch])

  useEffect(() => {
    dispatch(frenteDetalleRequest(slug))
    setEstadoIdFiltro(null)
    return () => {
      dispatch(limpiarFrenteDetalle())
    }
  }, [dispatch, slug])

  function cambiarTab(_: SyntheticEvent, valor: TabId) {
    setSearchParams((prev) => {
      prev.set('tab', valor)
      return prev
    })
  }

  function refrescar() {
    dispatch(frenteDetalleRequest(slug))
    setRefreshKey((k) => k + 1)
  }

  // Descarga directa del blob (no hay saga acá: es un side-effect de UI, no
  // estado de dominio que otra parte de la app necesite leer). El nombre de
  // archivo sale del Content-Disposition real del backend, nunca se inventa.
  async function exportar() {
    if (exportando) return // evita doble click mientras se genera
    setExportando(true)
    setErrorExportar(null)
    try {
      const respuesta = await http.get(endpoints.frentes.export(slug), { responseType: 'blob' })
      const nombreArchivo = nombreDesdeContentDisposition(
        respuesta.headers['content-disposition'],
        `${slug}.xlsx`,
      )
      const url = window.URL.createObjectURL(respuesta.data as Blob)
      const enlace = window.document.createElement('a')
      enlace.href = url
      enlace.download = nombreArchivo
      enlace.click()
      window.URL.revokeObjectURL(url)
    } catch {
      setErrorExportar('No se pudo exportar el frente. Intenta de nuevo.')
    } finally {
      setExportando(false)
    }
  }

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
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
              {data?.nombre ?? (estado === 'loading' ? <Skeleton width={220} sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} /> : slug)}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              {data?.descripcion ?? 'Procesos de contratación y personal del frente'}
            </Typography>
          </Box>

          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Ir al menú">
              <IconButton aria-label="Ir al menú de frentes" onClick={() => navigate('/')} sx={{ color: '#fff' }}>
                <HomeOutlinedIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Refrescar">
              <IconButton aria-label="Refrescar frente" onClick={refrescar} sx={{ color: '#fff' }}>
                <RefreshOutlinedIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={estadoIdFiltro ? 'Quitar filtro de estado' : 'Filtros activos en la tabla'}>
              <IconButton
                aria-label="Filtros"
                onClick={() => setEstadoIdFiltro(null)}
                sx={{ color: '#fff' }}
              >
                <FilterListOutlinedIcon />
              </IconButton>
            </Tooltip>
            {data && (
              <PdfDownloadButton
                document={<FrentePdfDocument frente={data} />}
                fileName={`frente-${data.slug}.pdf`}
                label="PDF"
              />
            )}
            <Tooltip title="Exportar a Excel">
              <span>
                <IconButton
                  aria-label="Exportar frente a Excel"
                  onClick={exportar}
                  disabled={exportando}
                  sx={{ color: '#fff' }}
                >
                  {exportando ? (
                    <CircularProgress size={20} sx={{ color: '#fff' }} />
                  ) : (
                    <FileDownloadOutlinedIcon />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ px: { xs: 2, sm: 4, md: 6 }, py: 3 }}>
        {estado === 'failed' && (
          <ErrorState mensaje={error ?? undefined} onReintentar={refrescar} />
        )}

        {estado === 'loading' && !data && (
          <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 3 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" width={180} height={72} />
            ))}
          </Stack>
        )}

        {data && (
          <>
            <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 3, rowGap: 2 }}>
              <KpiCard etiqueta="Total procesos" valor={data.totalProcesos} icono={AssignmentOutlinedIcon} />
              <KpiCard etiqueta="En ejecución" valor={data.enEjecucion} icono={PlayCircleOutlineIcon} color={tokens.color.success} />
              <KpiCard etiqueta="Precontractual" valor={data.precontractual} icono={HourglassEmptyIcon} color={tokens.color.info} />
              <KpiCard etiqueta="Alertas" valor={data.alertas} icono={WarningAmberOutlinedIcon} color="#DC3545" />
              <KpiCard etiqueta="Próximos a vencer (≤30 d)" valor={data.proximosVencer} icono={EventBusyOutlinedIcon} color="#FD7E14" />
              <KpiCard
                etiqueta="Personal actual / pendiente"
                valor={`${data.personalActual} / ${data.personalPendiente}`}
                icono={GroupsOutlinedIcon}
              />
            </Stack>

            <Box sx={{ mb: 3 }}>
              <ProcesoStepper
                conteo={data.conteoPorEstado}
                estadoIdSeleccionado={estadoIdFiltro}
                onSeleccionar={setEstadoIdFiltro}
              />
            </Box>
          </>
        )}

        <Tabs value={tabActual} onChange={cambiarTab} sx={{ mb: 3 }}>
          <Tab label="Procesos" value="procesos" />
          <Tab label="Personal" value="personal" />
          <Tab label="Bitácora" value="bitacora" />
        </Tabs>

        {tabActual === 'procesos' && slug && (
          <ProcesosTab key={refreshKey} slug={slug} estadoIdExterno={estadoIdFiltro} />
        )}
        {tabActual === 'personal' && slug && <PersonalTab slug={slug} />}
        {tabActual === 'bitacora' && (
          <Typography color="text.secondary">Próximamente (Fase 5).</Typography>
        )}
      </Box>

      <Snackbar
        open={!!errorExportar}
        autoHideDuration={6000}
        onClose={() => setErrorExportar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setErrorExportar(null)}>
          {errorExportar}
        </Alert>
      </Snackbar>
    </Box>
  )
}
