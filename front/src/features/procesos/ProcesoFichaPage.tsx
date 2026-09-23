import { useParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

// Placeholder: la ficha real (datos, línea de tiempo, bitácora, PDF) es Fase 5.
export function ProcesoFichaPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <Box sx={{ p: { xs: 2, sm: 4 } }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Proceso {id}
      </Typography>
      <Typography color="text.secondary">
        La ficha completa del proceso llega en la Fase 5.
      </Typography>
    </Box>
  )
}
