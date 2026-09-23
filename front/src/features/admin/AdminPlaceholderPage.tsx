import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

// Placeholder: usuarios, catálogos y vínculos frente↔proceso son Fase 5.
export function AdminPlaceholderPage() {
  return (
    <Box sx={{ p: { xs: 2, sm: 4 } }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Administración
      </Typography>
      <Typography color="text.secondary">Próximamente (Fase 5).</Typography>
    </Box>
  )
}
