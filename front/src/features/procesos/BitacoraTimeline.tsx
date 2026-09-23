import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import dayjs from 'dayjs'
import { tokens } from '@/app/theme/tokens'
import { EmptyState } from '@/shared/components/EmptyState'
import type { Seguimiento } from '@/shared/types'

interface BitacoraTimelineProps {
  notas: Seguimiento[]
}

// Lista cronológica de la bitácora. El backend ya la devuelve ordenada DESC
// (más reciente primero: ver SeguimientoService.listar), así que acá no se
// reordena.
export function BitacoraTimeline({ notas }: BitacoraTimelineProps) {
  if (notas.length === 0) {
    return <EmptyState titulo="Sin notas" mensaje="Todavía no hay notas en la bitácora." />
  }

  return (
    <Stack spacing={0} role="list" aria-label="Bitácora del proceso">
      {notas.map((nota, indice) => {
        const esUltima = indice === notas.length - 1
        return (
          <Box key={nota.id} role="listitem" sx={{ display: 'flex', gap: 2 }}>
            <Stack alignItems="center" sx={{ pt: 0.75 }}>
              <Box
                aria-hidden="true"
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: tokens.color.primary,
                  flexShrink: 0,
                }}
              />
              {!esUltima && (
                <Box sx={{ flex: 1, width: 2, backgroundColor: 'rgba(0,35,61,0.12)', mt: 0.5 }} />
              )}
            </Stack>
            <Box sx={{ pb: esUltima ? 0 : 2.5, minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary">
                {dayjs(nota.fecha).format('DD/MM/YYYY')}
                {nota.autor ? ` · ${nota.autor.nombre}` : ''}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.25, whiteSpace: 'pre-wrap' }}>
                {nota.nota}
              </Typography>
            </Box>
          </Box>
        )
      })}
    </Stack>
  )
}
