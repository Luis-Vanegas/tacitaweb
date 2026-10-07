import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { keyframes } from '@emotion/react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import CloseIcon from '@mui/icons-material/Close'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import LogoutIcon from '@mui/icons-material/Logout'
import OpenInFullIcon from '@mui/icons-material/OpenInFull'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import ViewListOutlinedIcon from '@mui/icons-material/ViewListOutlined'
import { tokens } from '@/app/theme/tokens'
import { useAppDispatch, useAppSelector } from '@/shared/hooks/redux'
import { ErrorState } from '@/shared/components/ErrorState'
import { TarjetaActividad } from '@/shared/components/TarjetaActividad'
import { resolverIconoFrente } from '@/shared/utils/iconoFrente'
import { construirSecciones } from '@/shared/utils/agruparProcesos'
import { logoutRequest } from '@/features/auth/authSlice'
import { catalogosRequest } from '@/features/catalogos/catalogosSlice'
import { generalRequest, type FrenteConActividades } from '@/features/general/generalSlice'
import { CompromisosPanel } from '@/features/compromisos/CompromisosPanel'
import type { ProcesoDetalle } from '@/shared/types'

// Landing tipo mapa mental (boceto en papel del cliente): Tacita de Plata al
// centro y los frentes colgando de dos ramas, con sus actividades visibles de
// entrada. Click en una actividad → drawer con sus contratos (TarjetaActividad,
// la misma de la vista general). Datos: el mismo fetch de la vista general.
//
// Layout: en pantalla ancha (lg+) un árbol de 3 columnas [rama | centro | rama]
// dibujado solo con CSS (pseudo-elementos), así se adapta a cualquier altura de
// tarjeta sin calcular posiciones. Debajo de lg: centro arriba + grilla.

const pulso = keyframes`0% { box-shadow: 0 0 0 0 rgba(0,171,238,0.5); } 70% { box-shadow: 0 0 0 24px rgba(0,171,238,0); } 100% { box-shadow: 0 0 0 0 rgba(0,171,238,0); }`
const aparecer = keyframes`from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: none; }`
const subir = keyframes`from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; }`
const crecerX = keyframes`from { transform: scaleX(0); } to { transform: scaleX(1); }`
const crecerY = keyframes`from { transform: scaleY(0); } to { transform: scaleY(1); }`

// ponytail: tope fijo de actividades por tarjeta (SIF tiene 27); el resto se ve en el drawer.
const MAX_VISIBLES = 4
const RAMA = 36 // px: largo del tramo horizontal entre la rama vertical y cada tarjeta
const LINEA = 'rgba(255,255,255,0.28)'

// Actividades únicas del frente: primero las que tienen contrato principal
// (las de interventoría solo supervisan otra), luego por cantidad de procesos.
function actividadesDe(procesos: ProcesoDetalle[]): string[] {
  const info = new Map<string, { total: number; principal: boolean }>()
  for (const p of procesos) {
    const a = info.get(p.actividad) ?? { total: 0, principal: false }
    info.set(p.actividad, { total: a.total + 1, principal: a.principal || p.tipo === 'PRINCIPAL' })
  }
  return [...info.entries()]
    .sort(([na, a], [nb, b]) => Number(b.principal) - Number(a.principal) || b.total - a.total || na.localeCompare(nb))
    .map(([nombre]) => nombre)
}

interface Seleccion {
  slug: string
  actividad?: string
}

export function MapaFrentesPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const theme = useTheme()
  const esAncho = useMediaQuery(theme.breakpoints.up('lg'))
  const esMovil = useMediaQuery(theme.breakpoints.down('sm'))
  const { estado, error, frentes } = useAppSelector((s) => s.general)
  const usuario = useAppSelector((s) => s.auth.usuario)
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null)

  useEffect(() => {
    dispatch(catalogosRequest())
    dispatch(generalRequest())
  }, [dispatch])

  const activo = frentes.find((f) => f.frente.slug === seleccion?.slug) ?? null
  const totalProcesos = frentes.reduce((acc, f) => acc + f.frente.totalProcesos, 0)

  const tarjetas = frentes.map((item, i) => (
    <TarjetaFrente
      key={item.frente.slug}
      item={item}
      retraso={(esAncho ? 900 : 250) + i * 90}
      onElegir={setSeleccion}
    />
  ))
  // Mitad y mitad: con 7 frentes quedan 4 a la izquierda y 3 a la derecha.
  const corte = Math.ceil(tarjetas.length / 2)

  return (
    <Box
      sx={{
        minHeight: '100vh',
        color: tokens.color.onNavy,
        background: `radial-gradient(ellipse at 50% 40%, #0A3D62 0%, ${tokens.color.navy} 70%)`,
        px: { xs: 2, sm: 3, lg: 4 },
        pt: 2,
        pb: 4,
      }}
    >
      <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={1.5} sx={{ maxWidth: 1440, mx: 'auto' }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<ViewListOutlinedIcon />}
          onClick={() => navigate('/general')}
          sx={{ color: tokens.color.onNavy, borderColor: 'rgba(255,255,255,0.4)' }}
        >
          Vista general
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<GroupsOutlinedIcon />}
          onClick={() => navigate('/personal')}
          sx={{ color: tokens.color.onNavy, borderColor: 'rgba(255,255,255,0.4)' }}
        >
          Personal
        </Button>
        {(usuario?.rol === 'ADMIN' || usuario?.rol === 'EDITOR') && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<UploadFileOutlinedIcon />}
            onClick={() => navigate('/carga')}
            sx={{ color: tokens.color.onNavy, borderColor: 'rgba(255,255,255,0.4)' }}
          >
            Cargar datos
          </Button>
        )}
        {usuario && (
          <>
            <Typography variant="body2" sx={{ color: tokens.color.onNavyMuted, display: { xs: 'none', sm: 'block' } }}>
              {usuario.nombre}
            </Typography>
            <Tooltip title="Cerrar sesión">
              <IconButton aria-label="Cerrar sesión" onClick={() => dispatch(logoutRequest())} sx={{ color: tokens.color.onNavy }}>
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Stack>

      <CompromisosPanel />

      {estado === 'failed' && frentes.length === 0 && (
        <Box sx={{ maxWidth: 900, mx: 'auto', mt: 2, backgroundColor: tokens.color.cardBackground, borderRadius: '12px', color: 'text.primary' }}>
          <ErrorState mensaje={error ?? undefined} onReintentar={() => dispatch(generalRequest())} />
        </Box>
      )}

      {estado === 'loading' && frentes.length === 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <Skeleton variant="circular" width={180} height={180} sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />
        </Box>
      )}

      {frentes.length > 0 &&
        (esAncho ? (
          <Box
            sx={{
              display: 'grid',
              // Columnas con tope: más anchas solo agregan blanco a la derecha del texto.
              gridTemplateColumns: 'minmax(0, 420px) 220px minmax(0, 420px)',
              justifyContent: 'center',
              alignItems: 'center',
              maxWidth: 1440,
              mx: 'auto',
              minHeight: 'calc(100vh - 130px)',
            }}
          >
            <Rama lado="izq" colores={frentes.slice(0, corte).map((f) => f.frente.color)}>
              {tarjetas.slice(0, corte)}
            </Rama>
            <Centro totalFrentes={frentes.length} totalProcesos={totalProcesos} conLineas />
            <Rama lado="der" colores={frentes.slice(corte).map((f) => f.frente.color)}>
              {tarjetas.slice(corte)}
            </Rama>
          </Box>
        ) : (
          <Box sx={{ maxWidth: 960, mx: 'auto', mt: 1 }}>
            <Centro totalFrentes={frentes.length} totalProcesos={totalProcesos} />
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' },
                gap: 2,
                mt: 3,
                // 7 frentes en 2 columnas: la última no queda huérfana a media fila.
                '& > :last-child:nth-of-type(odd)': { gridColumn: { sm: '1 / -1' } },
              }}
            >
              {tarjetas}
            </Box>
          </Box>
        ))}

      <Drawer
        anchor={esMovil ? 'bottom' : 'right'}
        open={activo !== null}
        onClose={() => setSeleccion(null)}
        slotProps={{
          paper: {
            sx: {
              width: { xs: '100%', sm: 560 },
              maxWidth: '100%',
              maxHeight: { xs: '90vh', sm: '100%' },
              borderTopLeftRadius: { xs: 16, sm: 0 },
              borderTopRightRadius: { xs: 16, sm: 0 },
            },
          },
        }}
      >
        {activo && (
          // key: al cambiar de frente/actividad se remonta → reinicia expandidos y animación.
          <PanelFrente
            key={`${activo.frente.slug}::${seleccion?.actividad ?? ''}`}
            item={activo}
            actividadInicial={seleccion?.actividad}
            onCerrar={() => setSeleccion(null)}
            onVerFrente={() => navigate(`/frentes/${activo.frente.slug}`)}
            onAbrirProceso={(id) => navigate(`/procesos/${id}`)}
          />
        )}
      </Drawer>
    </Box>
  )
}

function Centro({ totalFrentes, totalProcesos, conLineas = false }: { totalFrentes: number; totalProcesos: number; conLineas?: boolean }) {
  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        // Tramo horizontal que une el círculo con las dos ramas verticales.
        ...(conLineas && {
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            right: 0,
            top: '50%',
            height: 2,
            backgroundColor: LINEA,
            animation: `${crecerX} 400ms ease-out 350ms both`,
          },
        }),
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: conLineas ? 190 : 150,
          aspectRatio: '1',
          borderRadius: '50%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          background: `linear-gradient(135deg, ${tokens.color.headerGradientFrom}, ${tokens.color.headerGradientTo})`,
          border: '4px solid rgba(255,255,255,0.15)',
          animation: `${aparecer} 500ms ease-out both, ${pulso} 3s ease-out 1.2s infinite`,
        }}
      >
        <Typography component="h1" sx={{ fontWeight: 800, lineHeight: 1.05, fontSize: conLineas ? '1.6rem' : '1.3rem' }}>
          Tacita
          <br />
          de Plata
        </Typography>
        <Typography variant="caption" sx={{ mt: 0.75, opacity: 0.9, lineHeight: 1.2 }}>
          {totalFrentes} frentes
          <br />
          {totalProcesos} procesos
        </Typography>
      </Box>
    </Box>
  )
}

// Columna de tarjetas colgando de una línea vertical. Cada tarjeta dibuja su
// propio tramo de la línea (::before) y su conector horizontal (::after): la
// primera arranca en su mitad y la última termina en su mitad → corchete limpio.
function Rama({ lado, colores, children }: { lado: 'izq' | 'der'; colores: string[]; children: ReactNode[] }) {
  const borde = lado === 'izq' ? 'right' : 'left'
  return (
    <Box sx={{ [lado === 'izq' ? 'pr' : 'pl']: `${RAMA}px` }}>
      {children.map((hijo, i) => (
        <Box
          key={i}
          sx={{
            position: 'relative',
            py: 1,
            '&::before': {
              content: '""',
              position: 'absolute',
              [borde]: -RAMA - 1,
              top: i === 0 ? '50%' : 0,
              bottom: i === children.length - 1 ? '50%' : 0,
              width: 2,
              backgroundColor: LINEA,
              transformOrigin: 'center',
              animation: `${crecerY} 450ms ease-out 650ms both`,
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              [borde]: -RAMA,
              top: '50%',
              width: RAMA,
              height: 2,
              backgroundColor: colores[i],
              transformOrigin: borde,
              animation: `${crecerX} 300ms ease-out ${800 + i * 90}ms both`,
            },
          }}
        >
          {hijo}
        </Box>
      ))}
    </Box>
  )
}

interface TarjetaFrenteProps {
  item: FrenteConActividades
  retraso: number
  onElegir: (s: Seleccion) => void
}

// Radios en px explícitos: en sx, `borderRadius: 3` multiplica por
// theme.shape.borderRadius (16) → 48px, y la tarjeta se volvía una píldora.
// Todo arranca en el mismo borde interno (16px): ícono, viñetas y "Ver más".
function TarjetaFrente({ item, retraso, onElegir }: TarjetaFrenteProps) {
  const { frente } = item
  const Icono = resolverIconoFrente(frente.icono)
  const actividades = useMemo(() => actividadesDe(item.procesos), [item.procesos])
  // "Ver 1 más" ocupa lo mismo que la actividad que esconde: en ese caso se muestra.
  const visibles = actividades.length > MAX_VISIBLES + 1 ? actividades.slice(0, MAX_VISIBLES) : actividades
  const resto = actividades.length - visibles.length

  return (
    <Box
      sx={{
        height: '100%',
        borderRadius: '12px',
        overflow: 'hidden',
        backgroundColor: tokens.color.cardBackground,
        color: 'text.primary',
        borderTop: `4px solid ${frente.color}`,
        transition: 'transform 200ms ease',
        animation: `${subir} 400ms ease-out ${retraso}ms both`,
        '@media (hover: hover) and (pointer: fine)': { '&:hover': { transform: 'translateY(-2px)' } },
      }}
    >
      <ButtonBase
        onClick={() => onElegir({ slug: frente.slug })}
        aria-label={`Ver actividades de ${frente.nombre}: ${frente.totalActividades} actividades, ${frente.totalProcesos} procesos`}
        sx={{
          width: '100%',
          justifyContent: 'flex-start',
          gap: 1.5,
          px: 2,
          pt: 1.5,
          pb: 1,
          textAlign: 'left',
          '@media (hover: hover) and (pointer: fine)': {
            '&:hover': { backgroundColor: 'rgb(0 0 0 / 4%)' },
            '&:hover .chevron': { transform: 'translateX(3px)' },
          },
        }}
      >
        <Box
          aria-hidden="true"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            flexShrink: 0,
            borderRadius: '10px',
            backgroundColor: `${frente.color}1F`,
            color: frente.color,
          }}
        >
          <Icono fontSize="small" />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="h2" sx={{ fontWeight: 600, fontSize: '1rem', lineHeight: 1.25 }}>
            {frente.nombre}
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: 'rgb(0 0 0 / 60%)' }}>
            {frente.totalActividades} {frente.totalActividades === 1 ? 'actividad' : 'actividades'} · {frente.totalProcesos}{' '}
            {frente.totalProcesos === 1 ? 'proceso' : 'procesos'}
          </Typography>
        </Box>
        <ChevronRightIcon className="chevron" fontSize="small" sx={{ color: 'rgb(0 0 0 / 44%)', transition: 'transform 150ms ease' }} />
      </ButtonBase>

      <Box component="ul" sx={{ listStyle: 'none', m: 0, px: 1, pt: 0.5, pb: 1, borderTop: '1px solid rgb(0 0 0 / 8%)' }}>
        {visibles.map((actividad, j) => (
          <Box component="li" key={actividad} sx={{ animation: `${subir} 300ms ease-out ${retraso + 150 + j * 60}ms both` }}>
            <ButtonBase
              onClick={() => onElegir({ slug: frente.slug, actividad })}
              sx={{
                width: '100%',
                justifyContent: 'flex-start',
                alignItems: 'flex-start',
                gap: 1.25,
                px: 1,
                py: 0.625,
                borderRadius: '8px',
                fontSize: '0.8125rem',
                lineHeight: 1.4,
                textAlign: 'left',
                color: 'rgb(0 0 0 / 78%)',
                transition: 'background-color 120ms ease',
                '@media (hover: hover) and (pointer: fine)': {
                  '&:hover': { backgroundColor: `${frente.color}14`, color: 'text.primary' },
                },
              }}
            >
              <Box aria-hidden="true" sx={{ width: 6, height: 6, mt: '7px', borderRadius: '50%', flexShrink: 0, backgroundColor: frente.color }} />
              {actividad}
            </ButtonBase>
          </Box>
        ))}
        {resto > 0 && (
          <Box component="li">
            {/* Texto en tinta neutra: el color del frente (ej. naranja SIF) no da contraste AA sobre blanco. */}
            <ButtonBase
              onClick={() => onElegir({ slug: frente.slug })}
              sx={{
                gap: 0.5,
                px: 1,
                py: 0.625,
                borderRadius: '8px',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'text.primary',
                '@media (hover: hover) and (pointer: fine)': { '&:hover': { backgroundColor: 'rgb(0 0 0 / 5%)' } },
              }}
            >
              Ver {resto} actividades más
              <ChevronRightIcon sx={{ fontSize: 16 }} />
            </ButtonBase>
          </Box>
        )}
      </Box>
    </Box>
  )
}

interface PanelFrenteProps {
  item: FrenteConActividades
  actividadInicial?: string
  onCerrar: () => void
  onVerFrente: () => void
  onAbrirProceso: (id: string) => void
}

function PanelFrente({ item, actividadInicial, onCerrar, onVerFrente, onAbrirProceso }: PanelFrenteProps) {
  const { frente, procesos } = item
  const categorias = useAppSelector((s) => s.catalogos.categoriasActividad)
  const [abiertas, setAbiertas] = useState<Set<string>>(() => new Set(actividadInicial ? [actividadInicial] : []))
  const inicialRef = useRef<HTMLDivElement>(null)
  const Icono = resolverIconoFrente(frente.icono)

  const secciones = useMemo(
    () => construirSecciones(procesos, new Map(categorias.map((c) => [c.nombre, c.orden]))),
    [procesos, categorias],
  )

  // Si se entró por una actividad puntual, llevarla a la vista ya abierta.
  useEffect(() => {
    inicialRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }, [])

  function alternar(actividad: string) {
    setAbiertas((prev) => {
      const next = new Set(prev)
      if (next.has(actividad)) next.delete(actividad)
      else next.add(actividad)
      return next
    })
  }

  let indice = 0 // para escalonar la entrada de las tarjetas a través de las categorías
  return (
    <Box sx={{ borderTop: `5px solid ${frente.color}`, p: { xs: 2, sm: 2.5 } }}>
      <Stack direction="row" alignItems="flex-start" spacing={1.5} sx={{ mb: 2 }}>
        <Box
          aria-hidden="true"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            flexShrink: 0,
            borderRadius: '50%',
            backgroundColor: `${frente.color}1F`,
            color: frente.color,
          }}
        >
          <Icono />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {frente.nombre}
          </Typography>
          {frente.descripcion && (
            <Typography variant="body2" color="text.secondary">
              {frente.descripcion}
            </Typography>
          )}
        </Box>
        <Tooltip title="Ver frente completo">
          <IconButton aria-label={`Ver frente completo: ${frente.nombre}`} onClick={onVerFrente}>
            <OpenInFullIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Cerrar">
          <IconButton aria-label="Cerrar actividades" onClick={onCerrar}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      {secciones.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          Este frente todavía no tiene actividades.
        </Typography>
      )}

      <Stack spacing={2.5}>
        {secciones.map(([categoria, grupos]) => (
          <Box key={categoria}>
            <Typography variant="overline" sx={{ color: frente.color, fontWeight: 700 }}>
              {categoria}
            </Typography>
            <Stack spacing={1}>
              {grupos.map(([actividad, procesosActividad]) => (
                <Box
                  key={actividad}
                  ref={actividad === actividadInicial ? inicialRef : undefined}
                  sx={{ scrollMarginTop: 16, animation: `${subir} 350ms ease-out ${Math.min(indice++, 15) * 40}ms both` }}
                >
                  <TarjetaActividad
                    actividad={actividad}
                    procesos={procesosActividad}
                    abierto={abiertas.has(actividad)}
                    onToggle={() => alternar(actividad)}
                    onAbrir={onAbrirProceso}
                    soloActividad={frente.slug === 'emvarias'}
                    acento={frente.color}
                  />
                </Box>
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>
    </Box>
  )
}
