import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'

// Wrapper fino sobre useMediaQuery: true cuando el viewport es menor a "md"
// (breakpoint por defecto de MUI, 900px), umbral usado para tabla vs tarjetas
// en ProcesosTab y para el grid de FrenteCard.
export function useIsMobile(): boolean {
  const theme = useTheme()
  return useMediaQuery(theme.breakpoints.down('md'))
}
