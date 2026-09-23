import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { endpoints } from './endpoints'
import { getAccessToken, setAccessToken } from './tokenStore'
import type { TokensRespuesta } from '@/shared/types'

// Base: VITE_API_URL si existe (ej. para apuntar a un backend/mock en otro puerto
// durante desarrollo), si no /api/v1 relativo (proxy de Vite o mismo origen en prod).
const baseURL = import.meta.env.VITE_API_URL ?? '/api/v1'

export const http = axios.create({
  baseURL,
  // El refresh token viaja en cookie httpOnly: hace falta para que
  // POST /auth/refresh la mande al backend.
  withCredentials: true,
})

http.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Callback que el feature de auth registra para reaccionar cuando el refresh
// falla (ej. despachar logout + redirigir a /login). http.ts no conoce Redux.
let onRefreshFallido: (() => void) | null = null
export function registrarOnRefreshFallido(cb: (() => void) | null): void {
  onRefreshFallido = cb
}

type RequestConAuthConfig = InternalAxiosRequestConfig & { _reintentada?: boolean }

// Cola de reintentos: si varias requests reciben 401 al mismo tiempo, solo la
// primera dispara POST /auth/refresh; las demás esperan esa misma promesa.
let refrescandoPromesa: Promise<string> | null = null

async function refrescarToken(): Promise<string> {
  if (!refrescandoPromesa) {
    refrescandoPromesa = axios
      .post<TokensRespuesta>(`${baseURL}${endpoints.auth.refresh}`, null, {
        withCredentials: true,
      })
      .then((res) => {
        setAccessToken(res.data.accessToken)
        return res.data.accessToken
      })
      .finally(() => {
        refrescandoPromesa = null
      })
  }
  return refrescandoPromesa
}

http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const config = error.config as RequestConAuthConfig | undefined
    const esLoginORefresh =
      config?.url === endpoints.auth.login || config?.url === endpoints.auth.refresh

    if (
      error.response?.status === 401 &&
      config &&
      !config._reintentada &&
      !esLoginORefresh
    ) {
      config._reintentada = true
      try {
        const token = await refrescarToken()
        config.headers.Authorization = `Bearer ${token}`
        return http(config)
      } catch (refreshError) {
        setAccessToken(null)
        onRefreshFallido?.()
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  },
)
