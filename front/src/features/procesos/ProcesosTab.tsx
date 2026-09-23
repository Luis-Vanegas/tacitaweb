import { useEffect, useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import InputAdornment from '@mui/material/InputAdornment'
import SearchIcon from '@mui/icons-material/Search'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import Paper from '@mui/material/Paper'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'
import Skeleton from '@mui/material/Skeleton'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/shared/hooks/redux'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { useIsMobile } from '@/shared/hooks/useBreakpoint'
import { EmptyState } from '@/shared/components/EmptyState'
import { ErrorState } from '@/shared/components/ErrorState'
import { EstadoChip } from '@/shared/components/EstadoChip'
import { PlazoBar } from '@/shared/components/PlazoBar'
import type { FaseProceso, ProcesoDetalle, TipoProceso } from '@/shared/types'
import { procesosRequest } from './procesosSlice'

interface ProcesosTabProps {
  slug: string
  estadoIdExterno: number | null
}

function agruparPorActividad(items: ProcesoDetalle[]): [string, ProcesoDetalle[]][] {
  const mapa = new Map<string, ProcesoDetalle[]>()
  for (const item of items) {
    const grupo = mapa.get(item.actividad) ?? []
    grupo.push(item)
    mapa.set(item.actividad, grupo)
  }
  return [...mapa.entries()]
}

function formatearFecha(fecha: string | null): string {
  if (!fecha) return '—'
  return fecha
}

export function ProcesosTab({ slug, estadoIdExterno }: ProcesosTabProps) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { estado, error, data } = useAppSelector((s) => s.procesos)
  const catalogos = useAppSelector((s) => s.catalogos)

  const [q, setQ] = useState('')
  const [fase, setFase] = useState<FaseProceso | ''>('')
  const [dependencia, setDependencia] = useState<number | ''>('')
  const [tipo, setTipo] = useState<TipoProceso | ''>('')
  const debouncedQ = useDebounce(q, 350)

  const estadoCodigoExterno = useMemo(() => {
    if (estadoIdExterno === null) return undefined
    return catalogos.estados.find((e) => e.id === estadoIdExterno)?.codigo
  }, [estadoIdExterno, catalogos.estados])

  useEffect(() => {
    dispatch(
      procesosRequest({
        slug,
        filtro: {
          page: 1,
          pageSize: 50,
          q: debouncedQ || undefined,
          fase: fase || undefined,
          dependencia: dependencia || undefined,
          tipo: tipo || undefined,
          estado: estadoCodigoExterno,
        },
      }),
    )
  }, [dispatch, slug, debouncedQ, fase, dependencia, tipo, estadoCodigoExterno])

  const grupos = useMemo(() => agruparPorActividad(data?.data ?? []), [data])

  return (
    <Box>
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
          aria-label="Buscar procesos"
        />
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
      </Stack>

      {estado === 'loading' && (
        <Stack spacing={1.5}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={56} />
          ))}
        </Stack>
      )}

      {estado === 'failed' && (
        <ErrorState
          mensaje={error ?? undefined}
          onReintentar={() =>
            dispatch(
              procesosRequest({
                slug,
                filtro: { page: 1, pageSize: 50, estado: estadoCodigoExterno },
              }),
            )
          }
        />
      )}

      {estado === 'succeeded' && grupos.length === 0 && (
        <EmptyState titulo="Sin procesos" mensaje="No hay procesos con estos filtros." />
      )}

      {estado === 'succeeded' && grupos.length > 0 && !isMobile && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" aria-label="Procesos de contratación">
            <TableHead>
              <TableRow>
                <TableCell>Contratista</TableCell>
                <TableCell>Contrato / Necesidad</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Inicio – Fin</TableCell>
                <TableCell>Plazo</TableCell>
                <TableCell align="center">SECOP</TableCell>
                <TableCell>Última nota</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {grupos.map(([actividad, procesos]) => (
                <FragmentoGrupo key={actividad} actividad={actividad} procesos={procesos} onAbrir={(id) => navigate(`/procesos/${id}`)} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {estado === 'succeeded' && grupos.length > 0 && isMobile && (
        <Stack spacing={2.5}>
          {grupos.map(([actividad, procesos]) => (
            <Box key={actividad}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                {actividad}
              </Typography>
              <Stack spacing={1.5}>
                {procesos.map((p) => (
                  <Card
                    key={p.id}
                    variant="outlined"
                    onClick={() => navigate(`/procesos/${p.id}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {p.contratista ?? 'Sin contratista'}
                        </Typography>
                        <EstadoChip nombre={p.estado} color={p.estadoColor} esAlerta={p.esAlerta} />
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {p.numeroContrato ? `Contrato ${p.numeroContrato}` : `Necesidad ${p.numeroNecesidad ?? '—'}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatearFecha(p.fechaInicio)} – {formatearFecha(p.fechaTerminacion)}
                      </Typography>
                      <PlazoBar pctPlazo={p.pctPlazo} diasRestantes={p.diasRestantes} />
                      {p.ultimaNota && (
                        <Typography variant="caption" color="text.secondary" noWrap>
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
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  )
}

function FragmentoGrupo({
  actividad,
  procesos,
  onAbrir,
}: {
  actividad: string
  procesos: ProcesoDetalle[]
  onAbrir: (id: string) => void
}) {
  return (
    <>
      <TableRow>
        <TableCell colSpan={7} sx={{ backgroundColor: 'rgba(0,35,61,0.04)', fontWeight: 700 }}>
          {actividad}
        </TableCell>
      </TableRow>
      {procesos.map((p) => (
        <TableRow
          key={p.id}
          hover
          onClick={() => onAbrir(p.id)}
          sx={{ cursor: 'pointer' }}
        >
          <TableCell>{p.contratista ?? '—'}</TableCell>
          <TableCell>{p.numeroContrato ?? p.numeroNecesidad ?? '—'}</TableCell>
          <TableCell>
            <EstadoChip nombre={p.estado} color={p.estadoColor} esAlerta={p.esAlerta} />
          </TableCell>
          <TableCell>
            {formatearFecha(p.fechaInicio)} – {formatearFecha(p.fechaTerminacion)}
          </TableCell>
          <TableCell>
            <PlazoBar pctPlazo={p.pctPlazo} diasRestantes={p.diasRestantes} />
          </TableCell>
          <TableCell align="center">
            {p.linkSecop && (
              <Tooltip title="Ver en SECOP">
                <IconButton
                  size="small"
                  component="a"
                  href={p.linkSecop}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Abrir proceso en SECOP"
                >
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </TableCell>
          <TableCell sx={{ maxWidth: 220 }}>
            <Typography variant="caption" noWrap component="div">
              {p.ultimaNota ?? '—'}
            </Typography>
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}
