// Access token en memoria (módulo singleton), nunca en localStorage: se pierde
// al recargar la página a propósito (el refresh token en cookie httpOnly lo
// repone vía POST /auth/refresh, ver http.ts).
let accessToken: string | null = null

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null): void {
  accessToken = token
}
