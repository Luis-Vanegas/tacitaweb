// Rutas de la API (relativas a la baseURL de http.ts, que ya incluye /api/v1).
// Ver docs/PLAN-IMPLEMENTACION.md § 2 "Contrato de la API".
export const endpoints = {
  auth: {
    login: '/auth/login',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    me: '/auth/me',
  },
  catalogos: '/catalogos',
  frentes: {
    listar: '/frentes',
    detalle: (slug: string) => `/frentes/${slug}`,
    procesos: (slug: string) => `/frentes/${slug}/procesos`,
    personal: (slug: string) => `/frentes/${slug}/personal`,
    // GET /frentes/:slug/export no existe todavía (Fase 5/6): no se referencia acá a propósito.
  },
  procesos: {
    detalle: (id: string) => `/procesos/${id}`,
  },
} as const
