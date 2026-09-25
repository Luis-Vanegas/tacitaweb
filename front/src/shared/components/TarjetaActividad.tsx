import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { EstadoChip } from './EstadoChip'
import { PlazoBar } from './PlazoBar'
import { formatearFecha } from '@/shared/utils/fecha'
import type { ProcesoDetalle } from '@/shared/types'

function rangoFechas(fechaInicio: string | null, fechaTerminacion: string | null): string {
  if (!fechaInicio && !fechaTerminacion) return 'Sin fechas'
  return `${formatearFecha(fechaInicio)} – ${formatearFecha(fechaTerminacion)}`
}

interface TarjetaActividadProps {
  actividad: string
  procesos: ProcesoDetalle[]
  abierto: boolean
  onToggle: () => void
  onAbrir: (id: string) => void
  soloActividad?: boolean
  // Color de acento del encabezado (borde + fondo). Por defecto el celeste
  // corporativo (`primary.main`), que es lo correcto dentro de la vista de un
  // solo frente. La vista General pasa `frente.color` para poder distinguir
  // de un vistazo a qué frente pertenece cada tarjeta.
  acento?: string
}

export function TarjetaActividad({
  actividad,
  procesos,
  abierto,
  onToggle,
  onAbrir,
  soloActividad,
  acento,
}: TarjetaActividadProps) {
  const colorAcento = acento ?? 'primary.main'
  const fondoAcento = acento ? `${acento}14` : 'rgba(0,171,238,0.08)'
  const fondoAcentoHover = acento ? `${acento}24` : 'rgba(0,171,238,0.14)'

  if (soloActividad) {
    // Desglose de sub-actividades (ej. "Limpieza urbana"), guardado en la
    // observación del proceso — no es dato de contrato, es la única
    // información que puede acompañar a la actividad acá. Mismo lenguaje
    // visual (acento + chevron) que las tarjetas de actividad normales, para
    // que se note de un vistazo cuál tiene más para ver y cuál es solo el nombre.
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
              backgroundColor: fondoAcento,
              borderLeft: '3px solid',
              borderLeftColor: colorAcento,
              transition: 'background-color 120ms ease',
              '&:hover': { backgroundColor: fondoAcentoHover },
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
          backgroundColor: fondoAcento,
          borderLeft: '3px solid',
          borderLeftColor: colorAcento,
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
