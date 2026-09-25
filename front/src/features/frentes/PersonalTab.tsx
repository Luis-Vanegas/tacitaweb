import { useEffect, useMemo } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import ReactECharts from 'echarts-for-react'
import { tokens } from '@/app/theme/tokens'
import { useAppDispatch, useAppSelector } from '@/shared/hooks/redux'
import { EmptyState } from '@/shared/components/EmptyState'
import { ErrorState } from '@/shared/components/ErrorState'
import { KpiCard } from '@/shared/components/KpiCard'
import { formatearFecha } from '@/shared/utils/fecha'
import type { PersonalOperador } from '@/shared/types'
import { personalRequest } from './personalSlice'

interface PersonalTabProps {
  slug: string
}

// Agrupa operadores por corte (personal_corte.id) para listarlos junto al
// tipo de personal y la vigencia del corte al que pertenecen.
function agruparOperadoresPorCorte(operadores: PersonalOperador[]): [string, PersonalOperador[]][] {
  const mapa = new Map<string, PersonalOperador[]>()
  for (const op of operadores) {
    const grupo = mapa.get(op.corteId) ?? []
    grupo.push(op)
    mapa.set(op.corteId, grupo)
  }
  return [...mapa.entries()]
}

// Tab "Personal" de un frente: tarjetas por tipo (vigencia vigente), gráfico
// de actual vs. pendiente, operadores por corte y comparativo entre vigencias
// (solo si el histórico trae más de una). Dispatchea su propio fetch al
// montarse, igual que ProcesosTab con procesosRequest.
export function PersonalTab({ slug }: PersonalTabProps) {
  const dispatch = useAppDispatch()
  const { estado, error, data } = useAppSelector((s) => s.personal)

  useEffect(() => {
    dispatch(personalRequest(slug))
  }, [dispatch, slug])

  // Memoizados (no solo `?? []`) para que las dependencias de los useMemo de
  // abajo no cambien de identidad en cada render por una nueva [] literal.
  const vigente = useMemo(() => data?.vigente ?? [], [data])
  const historico = useMemo(() => data?.historico ?? [], [data])
  const operadores = useMemo(() => data?.operadores ?? [], [data])

  // corteId (vigente) == personal_corte.id (histórico): v_personal_vigente
  // envuelve la fila de personal_corte de la vigencia actual, así que el
  // corte de un operador se resuelve buscando su corteId en el histórico.
  const corteHistoricoPorId = useMemo(() => new Map(historico.map((c) => [c.id, c])), [historico])
  // El nombre del tipo de personal solo viene en la vista (vigente); se
  // resuelve por tipoPersonalId para poder usarlo también con filas
  // históricas/operadores que no tienen el nombre embebido.
  const nombreTipoPorId = useMemo(
    () => new Map(vigente.map((v) => [v.tipoPersonalId, v.tipoPersonal])),
    [vigente],
  )

  const operadoresPorCorte = useMemo(() => agruparOperadoresPorCorte(operadores), [operadores])

  const vigencias = useMemo(
    () => [...new Set(historico.map((h) => h.vigencia))].sort((a, b) => a - b),
    [historico],
  )

  // Comparativo: una fila por tipo de personal, una columna por vigencia.
  // Solo tiene sentido mostrarlo si hay más de una vigencia en el histórico.
  const filasComparativo = useMemo(() => {
    const tiposIds = [...new Set(historico.map((h) => h.tipoPersonalId))]
    return tiposIds.map((tipoPersonalId) => ({
      tipoPersonalId,
      nombre: nombreTipoPorId.get(tipoPersonalId) ?? `Tipo ${tipoPersonalId}`,
      porVigencia: vigencias.map((vigencia) => {
        const fila = historico.find(
          (h) => h.tipoPersonalId === tipoPersonalId && h.vigencia === vigencia,
        )
        return fila?.actual ?? null
      }),
    }))
  }, [historico, vigencias, nombreTipoPorId])

  const opcionesGrafico = useMemo(
    () => ({
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: ['Actual', 'Pendiente'] },
      grid: { left: 8, right: 8, top: 32, bottom: 8, containLabel: true },
      xAxis: { type: 'category', data: vigente.map((v) => v.tipoPersonal) },
      yAxis: { type: 'value' },
      series: [
        {
          name: 'Actual',
          type: 'bar',
          stack: 'total',
          data: vigente.map((v) => v.actual),
          itemStyle: { color: tokens.color.success },
        },
        {
          name: 'Pendiente',
          type: 'bar',
          stack: 'total',
          // Colores de estado (tokens) no cubren "pendiente"; se usa el mismo
          // naranja que KpiCard "Próximos a vencer" en FrenteDetallePage para
          // mantener la semántica de "necesita atención" en toda la app.
          data: vigente.map((v) => v.pendiente),
          itemStyle: { color: '#FD7E14' },
        },
      ],
    }),
    [vigente],
  )

  if ((estado === 'loading' || estado === 'idle') && !data) {
    return (
      <Stack spacing={2}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={100} />
        ))}
      </Stack>
    )
  }

  if (estado === 'failed') {
    return (
      <ErrorState mensaje={error ?? undefined} onReintentar={() => dispatch(personalRequest(slug))} />
    )
  }

  // Se comprueba `data` (no `estado`) porque el propio montaje del tab vuelve
  // a despachar personalRequest y pisa 'succeeded' con 'loading' de inmediato
  // (mismo patrón que ProcesoFichaPage): una vez que llegaron datos una vez,
  // se siguen mostrando mientras se refresca en segundo plano.
  if (data && vigente.length === 0 && operadores.length === 0) {
    return <EmptyState titulo="Sin personal" mensaje="No hay personal registrado para este frente." />
  }

  return (
    <Stack spacing={4}>
      {vigente.length > 0 && (
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
            Personal por tipo (vigencia {vigente[0].vigencia})
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={2}>
            {vigente.map((v) => (
              <Card key={v.corteId} variant="outlined" sx={{ flex: '1 1 260px', minWidth: 260 }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    {v.tipoPersonal}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ rowGap: 1, mb: 1 }}>
                    <KpiCard etiqueta="Actual" valor={v.actual} />
                    <KpiCard etiqueta="Pendiente" valor={v.pendiente} color="#FD7E14" />
                    <KpiCard etiqueta="Meta" valor={v.meta} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Fecha final: {formatearFecha(v.fechaFinal)}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Box>
      )}

      {vigente.length > 0 && (
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
            Actual vs. pendiente por tipo
          </Typography>
          <ReactECharts option={opcionesGrafico} style={{ height: 320 }} notMerge />
        </Box>
      )}

      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
          Operadores
        </Typography>
        {operadoresPorCorte.length === 0 ? (
          <EmptyState titulo="Sin operadores" mensaje="No hay operadores registrados." />
        ) : (
          <Stack spacing={2}>
            {operadoresPorCorte.map(([corteId, ops]) => {
              const corte = corteHistoricoPorId.get(corteId)
              const nombre = corte
                ? (nombreTipoPorId.get(corte.tipoPersonalId) ?? `Tipo ${corte.tipoPersonalId}`)
                : 'Corte no encontrado'
              return (
                <Paper key={corteId} variant="outlined" sx={{ p: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {nombre}
                    </Typography>
                    {corte && <Chip size="small" label={`Vigencia ${corte.vigencia}`} />}
                  </Stack>
                  <Stack spacing={1}>
                    {ops.map((op) => (
                      <Stack
                        key={op.id}
                        direction="row"
                        justifyContent="space-between"
                        flexWrap="wrap"
                        rowGap={0.5}
                      >
                        <Typography variant="body2">{op.contratista.nombre}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {op.cantidad ?? '—'} · Fecha final: {formatearFecha(op.fechaFinal)}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Paper>
              )
            })}
          </Stack>
        )}
      </Box>

      {vigencias.length > 1 && (
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
            Comparativo por vigencia
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small" aria-label="Comparativo de personal por vigencia">
              <TableHead>
                <TableRow>
                  <TableCell>Tipo de personal</TableCell>
                  {vigencias.map((v) => (
                    <TableCell key={v} align="right">
                      {v}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filasComparativo.map((fila) => (
                  <TableRow key={fila.tipoPersonalId}>
                    <TableCell>{fila.nombre}</TableCell>
                    {fila.porVigencia.map((valor, i) => (
                      <TableCell key={vigencias[i]} align="right">
                        {valor ?? '—'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Stack>
  )
}
