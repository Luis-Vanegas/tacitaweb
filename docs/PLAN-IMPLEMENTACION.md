# TacitaWeb — Plan de implementación para Claude Code

> Cómo usarlo: abre Claude Code en la raíz `TacitaWeb/`, que ya tiene `CLAUDE.md`.
> Ejecuta **una fase por sesión** pegando el *prompt* de la fase. Cada fase termina
> con lint + tests en verde y los checks marcados aquí.
> Estado: Fase 1 (BD) ✅ · Fase 2 (scaffolding) ✅ · resto ⬜
> Al terminar de pasarlo a tareas, este archivo se puede mover a `docs/archivo/`.

---

## 0. Decisiones ya tomadas

| Tema | Decisión |
|---|---|
| Fuente de datos | Excel importado **una vez**; desde ahí la app es la fuente de verdad (CRUD + bitácora) |
| BD | Supabase `WebAlcaldia`, schema `core`, solo lo accede el backend |
| Auth | JWT propio en NestJS + bcrypt. Roles `ADMIN`, `EDITOR` (edita sus frentes), `LECTOR` |
| Menú | 7 frentes; relación N:M frente↔proceso y frente↔tipo de personal |
| Esquema | Migraciones SQL numeradas, ejecutadas por migraciones TypeORM. `synchronize: false` |
| Fuera de alcance | Chat con IA y mapas: **no se implementan** |

### Pendientes de negocio (no bloquean, se resuelven desde la app)

- Enlazar 10 interventorías con el contrato que vigilan (`proceso_supervisado_id`).
- Necesidad 56173 duplicada (filas 36 y 39 del Excel).
- Contratista «Cicloinfraestructura 20005479» (¿nombre real?).
- Contrato 4600108890 firmado sin fecha de inicio.
- Dependencia de EMVARIAS (hoy nula: tiene contratos en 3 secretarías).

---

## 1. Estructura objetivo

```
TacitaWeb/
├── CLAUDE.md
├── docs/                         PLAN.md, PLAN-IMPLEMENTACION.md, reporte-importacion.md, adr/
├── tools/etl-excel/              importar_excel.py (carga única, ya ejecutada)
├── .github/workflows/ci.yml
├── back/
│   ├── src/
│   │   ├── main.ts               bootstrap: helmet, CORS, ValidationPipe, prefijo /api/v1
│   │   ├── app.module.ts
│   │   ├── config/               env.validation.ts, database.config.ts, jwt.config.ts
│   │   ├── common/
│   │   │   ├── decorators/       @Roles, @UsuarioActual, @Public
│   │   │   ├── guards/           JwtAuthGuard (global), RolesGuard, FrenteScopeGuard
│   │   │   ├── filters/          AllExceptionsFilter (mapea errores pg → HTTP)
│   │   │   ├── interceptors/     logging
│   │   │   ├── dto/              PaginacionQueryDto, PaginadoDto<T>
│   │   │   └── database/         auditoria.helper.ts (transacción + set_config)
│   │   ├── database/
│   │   │   ├── data-source.ts    DataSource para la CLI de TypeORM
│   │   │   ├── migrations/       *.ts que ejecutan migrations/sql/*.sql
│   │   │   ├── migrations/sql/   001, 002, 003 (ya existen)
│   │   │   └── seeds/sql/        100_seed_excel.sql (ya existe)
│   │   └── modules/
│   │       ├── auth/  usuarios/  catalogos/  frentes/  procesos/
│   │       ├── seguimiento/  personal/  reportes/  archivos/  health/
│   │       (cada módulo: *.module, *.controller, *.service, dto/, entities/, *.spec.ts)
│   └── test/                     e2e (Supertest) + utils de BD de prueba
├── front/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── app/                  store.ts, rootSaga.ts, router.tsx, theme/ (tokens, theme.ts)
│   │   ├── shared/
│   │   │   ├── api/              http.ts (axios + interceptores), endpoints.ts
│   │   │   ├── components/       KpiCard, EstadoChip, PlazoBar, EmptyState, ErrorState, PageHeader, ResponsiveTable
│   │   │   ├── hooks/            useAppDispatch/Selector, useDebounce, useBreakpoint
│   │   │   ├── types/            contratos de la API (espejo de los DTOs)
│   │   │   └── utils/            formatos (fechas, números), constantes
│   │   └── features/
│   │       ├── auth/             slice, saga, LoginPage, ProtectedRoute
│   │       ├── frentes/          slice, saga, MenuFrentesPage, FrenteCard, FrenteDetallePage
│   │       ├── procesos/         slice, saga, ProcesosTab, ProcesoStepper, ProcesoFichaPage, ProcesoForm, FichaTecnicaPdf
│   │       ├── seguimiento/      BitacoraTimeline, NotaForm
│   │       ├── personal/         PersonalTab, PersonalChart (ECharts)
│   │       └── admin/            usuarios, catálogos, vínculos frente↔proceso
│   ├── e2e/                      Playwright
│   └── public/
└── docker-compose.test.yml       Postgres 17 local para tests e2e
```

---

## 2. Contrato de la API (v1, prefijo `/api/v1`)

| Método | Ruta | Rol | Fuente |
|---|---|---|---|
| POST | `/auth/login` | público | `usuario` (bcrypt) → access token (15 min) + refresh en cookie httpOnly (7 d) |
| POST | `/auth/refresh` · `/auth/logout` | cookie | rotación del refresh |
| GET | `/auth/me` | todos | usuario + frentes asignados |
| GET | `/catalogos` | todos | estados, dependencias, proyectos, contratistas (cache 5 min) |
| GET | `/frentes` | todos | `v_resumen_frente` (tarjetas del menú) |
| GET | `/frentes/:slug` | todos | resumen + conteo por estado (stepper) + dependencias involucradas |
| GET | `/frentes/:slug/procesos` | todos | `v_proceso_detalle` ⨝ `frente_proceso`; filtros `estado, fase, dependencia, tipo, q`, orden, paginación |
| GET | `/frentes/:slug/personal` | todos | `v_personal_vigente` + histórico por vigencia + operadores |
| GET | `/frentes/:slug/export` | todos | Excel (exceljs) con procesos y personal del frente |
| GET | `/procesos/:id` | todos | detalle + bitácora + interventorías que lo vigilan + frentes donde aparece |
| POST | `/procesos` | ADMIN/EDITOR | crea proceso (+ vínculo a frentes) |
| PATCH | `/procesos/:id` | ADMIN/EDITOR* | edita datos |
| PATCH | `/procesos/:id/estado` | ADMIN/EDITOR* | cambia estado **y** crea nota de seguimiento en la misma transacción |
| DELETE | `/procesos/:id` | ADMIN | borrado |
| GET/POST | `/procesos/:id/seguimiento` | todos / ADMIN-EDITOR* | bitácora |
| PUT/DELETE | `/frentes/:slug/procesos/:id` | ADMIN | vincular/desvincular (criterio `MANUAL`) |
| PATCH | `/personal/cortes/:id` | ADMIN/EDITOR* | actualizar cifras |
| POST | `/personal/cortes` | ADMIN/EDITOR* | nueva vigencia |
| CRUD | `/usuarios` | ADMIN | usuarios y frentes asignados |
| POST | `/procesos/:id/adjuntos` | ADMIN/EDITOR* | Azure Blob (fase 6) |
| GET | `/health` | público | ping BD |

\* EDITOR solo sobre procesos/personal de sus frentes (`usuario_frente`) → `FrenteScopeGuard`.

Formato: listas `{ data: T[], meta: { page, pageSize, total } }`; errores
`{ statusCode, error, message, details? }`. Fechas ISO `YYYY-MM-DD`.

---

## 3. Fases

### Fase 1 — Base de datos ✅

Hecha en Supabase. Ver `docs/PLAN.md` §7.

---

### Fase 2 — Scaffolding + calidad ✅

- [x] `back/`: `nest new` (npm, strict TS), ESLint + Prettier, alias `@/`.
- [x] `front/`: Vite React-TS, ESLint + Prettier, alias `@/`.
- [x] `.editorconfig`, `.gitignore`, `README.md` raíz.
- [ ] `.env.example` en `back/` y `front/` — bloqueado por permisos del sandbox de
      Claude Code (deniega escritura en rutas `.env*`); contenido listo, crear a mano
      (ver resumen de la sesión que ejecutó esta fase).
- [x] `docker-compose.test.yml` con Postgres 17 para tests.
- [x] CI GitHub Actions: lint + test de back y front en cada PR.
- [x] `git init`, primer commit.

**Criterio de salida:** `npm run lint` y `npm test` pasan en ambos; CI verde.

**Prompt:**
```
Lee CLAUDE.md y docs/PLAN-IMPLEMENTACION.md. Ejecuta la Fase 2 (scaffolding).
Crea back/ con NestJS 10 y front/ con Vite 6 + React 18 + TS estricto, ESLint+Prettier,
alias @/, .env.example, docker-compose.test.yml (Postgres 17) y CI en GitHub Actions.
No instales librerías que no estén en el stack de CLAUDE.md sin preguntarme.
Muéstrame el plan antes de ejecutar y marca los checks al terminar.
```

---

### Fase 3 — Backend núcleo ⬜

- [ ] `config/`: validación de env al arrancar (falla si falta algo): `DATABASE_URL`, `DATABASE_SSL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`.
- [ ] TypeORM: `schema: 'core'`, `synchronize: false`, `migrationsTableName: 'typeorm_migrations'` en `core`, SSL.
      Conexión por **Session pooler (5432)** (copiar la cadena desde Supabase → Connect).
- [ ] Migración TypeORM *baseline* que ejecuta `001–003` + `100_seed_excel`. En Supabase ya están aplicadas → registrarla como aplicada (`migration:run --fake`, verificar el flag en la versión instalada). En la BD de tests se ejecuta completa.
- [ ] Entidades TypeORM mapeando las tablas **tal cual** (nombres snake_case, sin cambiar el esquema) + entidades de vista (`@ViewEntity`) para las 3 vistas.
- [ ] `common/`: `JwtAuthGuard` global + `@Public`, `RolesGuard`, `FrenteScopeGuard`, `AllExceptionsFilter` (unique → 409, FK → 409, check → 400), `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })`, `helmet`, CORS con lista blanca.
- [ ] `auditoria.helper.ts`: `ejecutarConAuditoria(usuarioId, fn)` = transacción + `set_config('app.usuario_id', …, true)`. **Toda escritura pasa por aquí.**
- [ ] Módulos `auth`, `usuarios`, `catalogos`, `frentes`, `procesos`, `seguimiento`, `personal`, `health` con los endpoints de §2 (menos export y adjuntos).
- [ ] Script `npm run crear-admin` (email + password por prompt, nunca hardcodeado).
- [ ] Rate limit en `/auth/login` (proponer `@nestjs/throttler`; pedir aprobación por no estar en el stack).
- [ ] Tests unitarios de servicios (lógica de estado, scope de frentes, paginación).
- [ ] Tests e2e: login, `GET /frentes` devuelve 7, `GET /frentes/sif/procesos` devuelve 34, EDITOR sin frente recibe 403, cambio de estado crea seguimiento y fila en `auditoria`.

**Criterio de salida:** e2e en verde contra Postgres local; `GET /frentes` en Supabase devuelve los mismos números que `v_resumen_frente`.

**Prompt:**
```
Lee CLAUDE.md y docs/PLAN-IMPLEMENTACION.md. Ejecuta la Fase 3 (backend núcleo).
La BD ya existe en Supabase (schema core): NO la modifiques; mapea entidades a lo existente
(revisa back/src/database/migrations/sql/*.sql para columnas exactas). Todas las escrituras
deben usar ejecutarConAuditoria. Usa las vistas v_* para lecturas agregadas.
Empieza por config + DataSource + migración baseline y muéstrame el plan de módulos.
```

---

### Fase 4 — Frontend: menú de frentes + detalle ⬜

- [ ] `theme/`: tokens de CLAUDE.md, tema MUI (tipografía Roboto, radios 16, sombras suaves), modo claro.
- [ ] `shared/api/http.ts`: axios con base `/api/v1`, access token en memoria (no localStorage), refresh automático en 401 con cola de reintentos.
- [ ] Store: `auth`, `catalogos`, `frentes`, `procesos` (slices + sagas; estados `idle/loading/succeeded/failed`).
- [ ] Router: `/login`, `/` (menú), `/frentes/:slug`, `/procesos/:id`, `/admin/*`; `ProtectedRoute` por rol.
- [ ] **MenuFrentesPage** (estilo captura "Proyectos Estratégicos"): fondo navy, pill azul "Tacita de Plata", grid de 7 `FrenteCard` (borde superior con `frente.color`, ícono MUI de `frente.icono`, nombre, chips: procesos, alertas, personal). Grid 4→3→2→1 columnas.
- [ ] **FrenteDetallePage** (estilo "Reporte General"): header degradado con botones (inicio, refrescar, filtros, exportar); fila de `KpiCard` (total procesos, en ejecución, precontractual, alertas, próximos a vencer ≤30 d, personal actual/pendiente); `ProcesoStepper` horizontal con conteo por estado (clic = filtra); pestañas **Procesos · Personal · Bitácora**.
- [ ] **ProcesosTab**: tabla (desktop) / tarjetas (móvil) agrupadas por actividad; columnas: actividad, contratista, N.º contrato / necesidad, estado (`EstadoChip` con color de BD), inicio–fin, `PlazoBar` (pct_plazo + días restantes, rojo si vencido), SECOP (link externo `rel="noopener noreferrer"`), última nota. Filtros + búsqueda con debounce.
- [ ] Estados de carga (skeletons), vacío y error en todas las vistas.
- [ ] Accesibilidad: contraste AA, foco visible, tarjetas navegables con teclado, `aria-label` en íconos.
- [ ] Tests Vitest de componentes clave; Playwright: login → menú → SIF → filtrar "Alerta precontractual" → abrir proceso, en 1440 px y 390 px.

**Prompt:**
```
Lee CLAUDE.md y docs/PLAN-IMPLEMENTACION.md. Ejecuta la Fase 4 (menú de frentes + detalle).
Replica el estilo de las capturas descritas (tokens en CLAUDE.md). Colores de estados y
frentes vienen de la API, no los dupliques. Mobile-first y accesible (AA).
Antes de codificar, propón el árbol de componentes y qué va en Redux vs estado local.
```

---

### Fase 5 — Ficha del proceso, edición y personal ⬜

- [ ] **ProcesoFichaPage**: datos, línea de tiempo del estado (stepper vertical), `BitacoraTimeline`, interventoría ↔ contrato vigilado, frentes donde aparece.
- [ ] `ProcesoForm` (RHF + Yup, mismas reglas que la BD: fechas coherentes, número solo dígitos, link https).
- [ ] Cambio de estado con nota obligatoria (un solo request → `PATCH /procesos/:id/estado`).
- [ ] `NotaForm` para la bitácora.
- [ ] **PersonalTab**: tarjetas por tipo (actual, pendiente, meta, fecha final, operadores), ECharts barras apiladas actual vs pendiente y comparativo 2025 vs 2026.
- [ ] `FichaTecnicaPdf` (@react-pdf/renderer) del proceso y del frente.
- [ ] Export Excel del frente (`GET /frentes/:slug/export`).
- [ ] Admin: usuarios + frentes asignados; vínculos manuales frente↔proceso; **resolver los pendientes de negocio de §0** desde aquí (enlazar interventorías, corregir contratista).

**Prompt:**
```
Lee CLAUDE.md y docs/PLAN-IMPLEMENTACION.md. Ejecuta la Fase 5.
Reutiliza componentes de shared/ antes de crear nuevos. Validaciones del form deben
coincidir con los CHECK de la BD (revisa 001_core_schema.sql).
```

---

### Fase 6 — Adjuntos (Azure Blob) ⬜

- [ ] Migración `004_adjuntos.sql`: tabla `core.adjunto` (proceso_id, nombre, blob_path, mime, tamaño, subido_por, created_at) + RLS + auditoría.
- [ ] Subida vía backend (no SAS de escritura al cliente), límite de tamaño y lista blanca de MIME; descarga con SAS de lectura de corta duración.
- [ ] UI de adjuntos en la ficha.

---

### Fase 7 — QA, seguridad y despliegue ⬜

- [ ] Revisión de seguridad: OWASP top 10, dependencias (`npm audit`), headers, CORS, cookies `Secure/SameSite`.
- [ ] Advisors de Supabase sin WARN/ERROR.
- [ ] Cobertura mínima: back 80 % servicios, front 70 % features.
- [ ] Lighthouse ≥ 90 (performance/accesibilidad) en menú y detalle.
- [ ] Destino de despliegue (front y API): **por definir**.
- [ ] Runbook en `docs/`: variables, cómo crear admin, cómo agregar una migración.

---

## 4. Definición de terminado (cada tarea)

- Compila sin warnings, lint limpio, tests nuevos para la lógica nueva.
- Sin código duplicado ni `any` injustificado.
- Errores manejados y mostrados al usuario con mensaje claro.
- Responsive verificado (390 px y 1440 px).
- Docs actualizados si cambió un contrato de API o el esquema.
