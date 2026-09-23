import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'

interface ErrorStateProps {
  titulo?: string
  mensaje?: string
  onReintentar?: () => void
}

export function ErrorState({
  titulo = 'Algo salió mal',
  mensaje = 'No pudimos cargar la información. Intenta de nuevo.',
  onReintentar,
}: ErrorStateProps) {
  return (
    <Box
      role="alert"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1.5,
        py: 6,
        px: 2,
        textAlign: 'center',
      }}
    >
      <ErrorOutlineIcon aria-hidden="true" color="error" sx={{ fontSize: 48 }} />
      <Typography variant="h6" component="p" color="text.primary">
        {titulo}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {mensaje}
      </Typography>
      {onReintentar && (
        <Button variant="outlined" onClick={onReintentar} sx={{ mt: 1 }}>
          Reintentar
        </Button>
      )}
    </Box>
  )
}
