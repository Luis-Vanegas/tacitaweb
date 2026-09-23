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
    export: (slug: string) => `/frentes/${slug}/export`,
    vincularProceso: (slug: string, id: string) => `/frentes/${slug}/procesos/${id}`,
    desvincularProceso: (slug: string, id: string) => `/frentes/${slug}/procesos/${id}`,
  },
  procesos: {
    crear: '/procesos',
    detalle: (id: string) => `/procesos/${id}`,
    actualizar: (id: string) => `/procesos/${id}`,
    cambiarEstado: (id: string) => `/procesos/${id}/estado`,
  },
  seguimiento: {
    listar: (procesoId: string) => `/procesos/${procesoId}/seguimiento`,
    crear: (procesoId: string) => `/procesos/${procesoId}/seguimiento`,
  },
  usuarios: {
    listar: '/usuarios',
    obtener: (id: string) => `/usuarios/${id}`,
    crear: '/usuarios',
    actualizar: (id: string) => `/usuarios/${id}`,
    eliminar: (id: string) => `/usuarios/${id}`,
  },
} as const
