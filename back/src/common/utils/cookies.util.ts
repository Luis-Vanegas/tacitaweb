// Lectura mínima de cookies desde el header `Cookie`. No se instala
// `cookie-parser` (dependencia nueva) solo para esto: leer el refresh token
// httpOnly es un parseo de una línea, y para escribir cookies `res.cookie()`
// de Express ya alcanza sin middleware adicional.
import { Request } from 'express';

export function leerCookie(
  request: Request,
  nombre: string,
): string | undefined {
  const header = request.headers.cookie;
  if (!header) {
    return undefined;
  }
  for (const parte of header.split(';')) {
    const indice = parte.indexOf('=');
    if (indice === -1) continue;
    const clave = parte.slice(0, indice).trim();
    if (clave === nombre) {
      return decodeURIComponent(parte.slice(indice + 1).trim());
    }
  }
  return undefined;
}
