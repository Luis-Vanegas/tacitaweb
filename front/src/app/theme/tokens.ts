// Tokens de diseño de TacitaWeb (ver CLAUDE.md § Diseño).
// Colores de frentes y estados vienen de la API (frente.color, estado_proceso.color):
// nunca se hardcodean acá. Estos tokens son solo el "chasis" visual de la app.
export const tokens = {
  color: {
    navy: '#00233D', // fondo del menú principal
    primary: '#00ABEE',
    headerGradientFrom: '#009EE8',
    headerGradientTo: '#0083DA',
    cardBackground: '#FFFFFF',
    success: '#28A745',
    info: '#17A2B8',
    error: '#DC3545',
    dark: '#343A40',
    // Texto claro para fondos navy: nunca gris claro (falla contraste AA sobre navy).
    onNavy: '#FFFFFF',
    onNavyMuted: '#B7D9E8',
  },
  radius: {
    default: 16,
  },
  fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
} as const
