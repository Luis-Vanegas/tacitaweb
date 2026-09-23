import { createTheme } from '@mui/material/styles'
import { tokens } from './tokens'

// Tema MUI único, modo claro. Los colores de frentes/estados se aplican
// inline en los componentes que los reciben de la API (FrenteCard, EstadoChip),
// no se agregan acá como paleta fija.
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: tokens.color.primary,
      contrastText: '#FFFFFF',
    },
    success: {
      main: tokens.color.success,
    },
    info: {
      main: tokens.color.info,
    },
    text: {
      primary: tokens.color.dark,
    },
    background: {
      default: '#F4F6F8',
      paper: tokens.color.cardBackground,
    },
  },
  typography: {
    fontFamily: tokens.fontFamily,
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: tokens.radius.default,
  },
  shadows: [
    'none',
    '0 1px 2px rgba(0,35,61,0.06)',
    '0 2px 6px rgba(0,35,61,0.08)',
    '0 4px 10px rgba(0,35,61,0.10)',
    '0 6px 14px rgba(0,35,61,0.10)',
    '0 8px 18px rgba(0,35,61,0.12)',
    '0 10px 22px rgba(0,35,61,0.12)',
    '0 12px 26px rgba(0,35,61,0.14)',
    '0 14px 30px rgba(0,35,61,0.14)',
    '0 16px 34px rgba(0,35,61,0.16)',
    '0 16px 34px rgba(0,35,61,0.16)',
    '0 16px 34px rgba(0,35,61,0.16)',
    '0 16px 34px rgba(0,35,61,0.16)',
    '0 16px 34px rgba(0,35,61,0.16)',
    '0 16px 34px rgba(0,35,61,0.16)',
    '0 16px 34px rgba(0,35,61,0.16)',
    '0 16px 34px rgba(0,35,61,0.16)',
    '0 16px 34px rgba(0,35,61,0.16)',
    '0 16px 34px rgba(0,35,61,0.16)',
    '0 16px 34px rgba(0,35,61,0.16)',
    '0 16px 34px rgba(0,35,61,0.16)',
    '0 16px 34px rgba(0,35,61,0.16)',
    '0 16px 34px rgba(0,35,61,0.16)',
    '0 16px 34px rgba(0,35,61,0.16)',
    '0 16px 34px rgba(0,35,61,0.16)',
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // Foco visible AA en toda la app (teclado), color primary.
        '*:focus-visible': {
          outline: `3px solid ${tokens.color.primary}`,
          outlineOffset: 2,
        },
      },
    },
    MuiButtonBase: {
      defaultProps: {
        disableRipple: false,
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.default,
          boxShadow: '0 2px 10px rgba(0,35,61,0.08)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
  },
})
