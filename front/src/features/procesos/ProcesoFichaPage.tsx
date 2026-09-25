import { useEffect, useState } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Divider from '@mui/material/Divider'
import Skeleton from '@mui/material/Skeleton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import CircularProgress from '@mui/material/CircularProgress'
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { tokens } from '@/app/theme/tokens'
import { useAppDispatch, useAppSelector } from '@/shared/hooks/redux'
import { ErrorState } from '@/shared/components/ErrorState'
import { EstadoChip } from '@/shared/components/EstadoChip'
import { PlazoBar } from '@/shared/components/PlazoBar'
import { PdfDownloadButton } from '@/shared/components/pdf/PdfDownloadButton'
import { ProcesoPdfDocument } from '@/shared/components/pdf/ProcesoPdfDocument'
import { catalogosRequest } from '@/features/catalogos/catalogosSlice'
import { limpiarProcesoFicha, procesoFichaRequest } from './procesoFichaSlice'
import {
  actualizarProcesoRequest,
  cambiarEstadoRequest,
  crearNotaRequest,
  limpiarActualizarProceso,
  limpiarCambiarEstado,
  limpiarCrearNota,
} from './procesoMutacionesSlice'
import { ProcesoEstadoTimeline } from './ProcesoEstadoTimeline'
import { BitacoraTimeline } from './BitacoraTimeline'
import { ProcesoForm } from './ProcesoForm'
import { CambiarEstadoDialog } from './CambiarEstadoDialog'
import { NotaForm } from './NotaForm'
import type { EstadoProceso } from '@/shared/types'

function dato(valor: string | number | null | undefined): string {
  return valor === null || valor === undefined || valor === '' ? '—' : String(valor)
}

// Ficha completa del proceso: datos, línea de tiempo de estado (vertical),
// bitácora, interventoría↔contrato vigilado, frentes, PDF y las tres
// mutaciones (editar datos, cambiar estado, agregar nota).
//
// Todos los dispatch de procesoMutaciones y su refetch tras éxito viven acá
// (dueño único, ver comentario en procesoMutacionesSlice.ts): ProcesoForm,
// NotaForm y CambiarEstadoDialog son componentes "tontos" que solo juntan
// datos y llaman a un callback.
export function ProcesoFichaPage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const { estado, error, data: ficha } = useAppSelector((s) => s.procesoFicha)
  const catalogos = useAppSelector((s) => s.catalogos)
  const usuario = useAppSelector((s) => s.auth.usuario)
  const mutaciones = useAppSelector((s) => s.procesoMutaciones)

  const puedeEditar = usuario?.rol === 'ADMIN' || usuario?.rol === 'EDITOR'

  const [dialogoEditarAbierto, setDialogoEditarAbierto] = useState(false)
  const [dialogoNotaAbierto, setDialogoNotaAbierto] = useState(false)
  const [dialogoEstadoAbierto, setDialogoEstadoAbierto] = useState(false)
  const [estadoIdPreseleccionado, setEstadoIdPreseleccionado] = useState<number | null>(null)

  useEffect(() => {
    dispatch(catalogosRequest())
  }, [dispatch])

  useEffect(() => {
    if (!id) return
    dispatch(procesoFichaRequest(id))
    return () => {
      dispatch(limpiarProcesoFicha())
    }
  }, [dispatch, id])

  // Cada mutación exitosa cierra su diálogo y refetchea la ficha (ver nota de
  // diseño en procesoMutacionesSlice: el slice no encadena acciones solo).
  useEffect(() => {
    if (mutaciones.actualizar.estado === 'succeeded') {
      setDialogoEditarAbierto(false)
      dispatch(procesoFichaRequest(id))
      dispatch(limpiarActualizarProceso())
    }
  }, [mutaciones.actualizar.estado, dispatch, id])

  useEffect(() => {
    if (mutaciones.cambiarEstado.estado === 'succeeded') {
      setDialogoEstadoAbierto(false)
      dispatch(procesoFichaRequest(id))
      dispatch(limpiarCambiarEstado())
    }
  }, [mutaciones.cambiarEstado.estado, dispatch, id])

  useEffect(() => {
    if (mutaciones.crearNota.estado === 'succeeded') {
      setDialogoNotaAbierto(false)
      dispatch(procesoFichaRequest(id))
      dispatch(limpiarCrearNota())
    }
  }, [mutaciones.crearNota.estado, dispatch, id])

  function abrirCambioEstado(estadoSeleccionado: EstadoProceso) {
    setEstadoIdPreseleccionado(estadoSeleccionado.id)
    setDialogoEstadoAbierto(true)
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
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
              {ficha?.actividad ?? (estado === 'loading' ? <Skeleton width={220} sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} /> : `Proceso ${id}`)}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              {ficha ? `${ficha.dependencia} · ${ficha.proyecto}` : 'Ficha del proceso de contratación'}
            </Typography>
          </Box>

          <Stack direction="row" spacing={0.5} alignItems="center">
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
              <IconButton aria-label="Refrescar proceso" onClick={() => dispatch(procesoFichaRequest(id))} sx={{ color: '#fff' }}>
                <RefreshOutlinedIcon />
              </IconButton>
            </Tooltip>
            {ficha && <PdfDownloadButton document={<ProcesoPdfDocument proceso={ficha} />} fileName={`proceso-${ficha.numeroContrato ?? ficha.id}.pdf`} />}
            {puedeEditar && ficha && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<EditOutlinedIcon />}
                onClick={() => setDialogoEditarAbierto(true)}
                sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.6)' }}
              >
                Editar
              </Button>
            )}
            {puedeEditar && ficha && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<NoteAddOutlinedIcon />}
                onClick={() => setDialogoNotaAbierto(true)}
                sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.6)' }}
              >
                Agregar nota
              </Button>
            )}
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ px: { xs: 2, sm: 4, md: 6 }, py: 3 }}>
        {estado === 'failed' && (
          <ErrorState mensaje={error ?? undefined} onReintentar={() => dispatch(procesoFichaRequest(id))} />
        )}

        {estado === 'loading' && !ficha && (
          <Stack spacing={2}>
            <Skeleton variant="rounded" height={140} />
            <Skeleton variant="rounded" height={220} />
          </Stack>
        )}

        {ficha && (
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={4}>
            <Stack spacing={3} sx={{ flex: 2, minWidth: 0 }}>
              <Paper variant="outlined" sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2} sx={{ mb: 2 }}>
                  <EstadoChip nombre={ficha.estado} color={ficha.estadoColor} esAlerta={ficha.esAlerta} />
                  <PlazoBar pctPlazo={ficha.pctPlazo} diasRestantes={ficha.diasRestantes} />
                </Stack>

                <Stack direction="row" flexWrap="wrap" sx={{ rowGap: 2 }}>
                  <Dato etiqueta="Número de contrato" valor={dato(ficha.numeroContrato)} />
                  <Dato etiqueta="Número de necesidad" valor={dato(ficha.numeroNecesidad)} />
                  <Dato etiqueta="Tipo" valor={ficha.tipo === 'INTERVENTORIA' ? 'Interventoría' : 'Principal'} />
                  <Dato etiqueta="Contratista" valor={dato(ficha.contratista)} />
                  <Dato etiqueta="Fecha de inicio" valor={dato(ficha.fechaInicio)} />
                  <Dato etiqueta="Fecha de terminación" valor={dato(ficha.fechaTerminacion)} />
                  <Dato etiqueta="Dependencia" valor={dato(ficha.dependencia)} />
                  <Dato etiqueta="Proyecto" valor={dato(ficha.proyecto)} />
                  <Dato etiqueta="Actividad" valor={dato(ficha.actividad)} />
                </Stack>

                {ficha.linkSecop && (
                  <Box sx={{ mt: 2 }}>
                    <Link href={ficha.linkSecop} target="_blank" rel="noopener noreferrer" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                      Ver en SECOP <OpenInNewIcon fontSize="inherit" />
                    </Link>
                  </Box>
                )}

                {ficha.observacion && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                      Observación
                    </Typography>
                    <Typography variant="body2">{ficha.observacion}</Typography>
                  </Box>
                )}
              </Paper>

              {(ficha.tipo === 'INTERVENTORIA' || ficha.interventorias.length > 0) && (
                <Paper variant="outlined" sx={{ p: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                    Interventoría
                  </Typography>
                  {ficha.tipo === 'INTERVENTORIA' && ficha.procesoSupervisadoId && (
                    <Chip
                      component={RouterLink}
                      to={`/procesos/${ficha.procesoSupervisadoId}`}
                      clickable
                      label={`Contrato vigilado: ${ficha.procesoSupervisadoId}`}
                      sx={{ mb: ficha.interventorias.length > 0 ? 1.5 : 0 }}
                    />
                  )}
                  {ficha.interventorias.length > 0 && (
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                      {ficha.interventorias.map((interventoria) => (
                        <Chip
                          key={interventoria.id}
                          component={RouterLink}
                          to={`/procesos/${interventoria.id}`}
                          clickable
                          label={`${interventoria.numeroContrato ?? interventoria.id} — ${interventoria.contratista ?? 'Sin contratista'}`}
                        />
                      ))}
                    </Stack>
                  )}
                </Paper>
              )}

              <Paper variant="outlined" sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                  Frentes
                </Typography>
                {ficha.frentes.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No está vinculado a ningún frente.
                  </Typography>
                ) : (
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {ficha.frentes.map((frente) => (
                      <Chip key={frente.id} component={RouterLink} to={`/frentes/${frente.slug}`} clickable label={frente.nombre} />
                    ))}
                  </Stack>
                )}
              </Paper>

              <Paper variant="outlined" sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                  Bitácora
                </Typography>
                <BitacoraTimeline notas={ficha.bitacora} />
              </Paper>
            </Stack>

            <Paper variant="outlined" sx={{ p: 3, flex: 1, alignSelf: 'flex-start' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                Estado del proceso
              </Typography>
              <ProcesoEstadoTimeline
                estados={catalogos.estados}
                estadoActualId={ficha.estadoId}
                puedeEditar={puedeEditar}
                onSeleccionarEstado={abrirCambioEstado}
              />
              {!puedeEditar && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="caption" color="text.secondary">
                    Solo ADMIN/EDITOR pueden cambiar el estado.
                  </Typography>
                </>
              )}
            </Paper>
          </Stack>
        )}
      </Box>

      {ficha && (
        <Dialog open={dialogoEditarAbierto} onClose={() => setDialogoEditarAbierto(false)} fullWidth maxWidth="sm">
          <DialogTitle>Editar proceso</DialogTitle>
          <DialogContent>
            <ProcesoForm
              formId="proceso-form-editar"
              valoresIniciales={ficha}
              contratistas={catalogos.contratistas}
              error={mutaciones.actualizar.error}
              onGuardar={(datos) => dispatch(actualizarProcesoRequest({ id, payload: datos }))}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogoEditarAbierto(false)} disabled={mutaciones.actualizar.estado === 'loading'}>
              Cancelar
            </Button>
            <Button type="submit" form="proceso-form-editar" variant="contained" disabled={mutaciones.actualizar.estado === 'loading'}>
              {mutaciones.actualizar.estado === 'loading' ? <CircularProgress size={20} color="inherit" /> : 'Guardar'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {ficha && (
        <Dialog open={dialogoNotaAbierto} onClose={() => setDialogoNotaAbierto(false)} fullWidth maxWidth="xs">
          <DialogTitle>Agregar nota</DialogTitle>
          <DialogContent>
            <NotaForm
              formId="nota-form"
              error={mutaciones.crearNota.error}
              onGuardar={(datos) => dispatch(crearNotaRequest({ procesoId: id, payload: datos }))}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogoNotaAbierto(false)} disabled={mutaciones.crearNota.estado === 'loading'}>
              Cancelar
            </Button>
            <Button type="submit" form="nota-form" variant="contained" disabled={mutaciones.crearNota.estado === 'loading'}>
              {mutaciones.crearNota.estado === 'loading' ? <CircularProgress size={20} color="inherit" /> : 'Guardar'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      <CambiarEstadoDialog
        open={dialogoEstadoAbierto}
        estados={catalogos.estados}
        estadoIdInicial={estadoIdPreseleccionado}
        guardando={mutaciones.cambiarEstado.estado === 'loading'}
        error={mutaciones.cambiarEstado.error}
        onGuardar={(datos) => dispatch(cambiarEstadoRequest({ id, payload: datos }))}
        onCancelar={() => setDialogoEstadoAbierto(false)}
      />
    </Box>
  )
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <Box sx={{ width: { xs: '50%', sm: '33%' }, pr: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', display: 'block' }}>
        {etiqueta}
      </Typography>
      <Typography variant="body2">{valor}</Typography>
    </Box>
  )
}
