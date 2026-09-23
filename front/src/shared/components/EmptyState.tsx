import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined'

interface EmptyStateProps {
  titulo?: string
  mensaje?: string
}

export function EmptyState({
  titulo = 'Sin resultados',
  mensaje = 'No hay datos para mostrar con los filtros actuales.',
}: EmptyStateProps) {
  return (
    <Box
      role="status"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        py: 6,
        px: 2,
        textAlign: 'center',
        color: 'text.secondary',
      }}
    >
      <InboxOutlinedIcon aria-hidden="true" sx={{ fontSize: 48, opacity: 0.5 }} />
      <Typography variant="h6" component="p" color="text.primary">
        {titulo}
      </Typography>
      <Typography variant="body2">{mensaje}</Typography>
    </Box>
  )
}
