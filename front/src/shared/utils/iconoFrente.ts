import * as Icons from '@mui/icons-material'
import BusinessIcon from '@mui/icons-material/Business'

type IconosMui = typeof Icons

// Resuelve frente.icono (ej. "Construction", "LocalPolice") contra el paquete
// @mui/icons-material. Si el back manda un nombre que no existe (dato mal
// cargado, typo), cae a un ícono genérico en vez de romper el render.
export function resolverIconoFrente(nombre: string) {
  const clave = nombre as keyof IconosMui
  return (Icons[clave] as typeof BusinessIcon | undefined) ?? BusinessIcon
}
