# TacitaWeb — Plan de implementación para Claude Code

> Cómo usarlo: abre Claude Code en la raíz `TacitaWeb/`, que ya tiene `CLAUDE.md`.
> Ejecuta **una fase por sesión** pegando el *prompt* de la fase. Cada fase termina
> con lint + tests en verde y los checks marcados aquí.
> Estado: Fase 1 (BD) ✅ · Fase 2 (scaffolding) ✅ · Fase 3 (backend núcleo, e2e pendiente) ⬜ · Fase 4 (frontend menú+detalle, Playwright real pendiente) ⬜ · resto ⬜
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

### Fase 3 — Backend núcleo ⬜ (config + DataSource + baseline + entidades + common + health + módulos de negocio ✅; e2e contra BD real pendiente)

- [x] `config/`: validación de env al arrancar (falla si falta algo): `DATABASE_URL`, `DATABASE_SSL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`. (`src/config/env.validation.ts`, enganchado en `ConfigModule.forRoot({ validate })`.)
- [x] TypeORM: `schema: 'core'`, `synchronize: false`, `migrationsTableName: 'typeorm_migrations'` en `core`, SSL. (`src/config/database.config.ts` + `TypeOrmModule.forRootAsync` en `app.module.ts`.)
      Conexión por **Session pooler (5432)**: la cadena la trae `back/.env` (no verificada en esta sesión, ver nota abajo).
- [x] Migración TypeORM *baseline* escrita (`src/database/migrations/1790185898686-Baseline.ts`, ejecuta `001–003` + `100_seed_excel`) y `src/database/data-source.ts` para la CLI. **Pendiente registrarla de verdad**: `migration:run --fake` contra Supabase falló por `password authentication failed for user "postgres"` (ver nota abajo) — no se tocó el esquema. Tampoco se pudo probar completa contra Postgres local (Docker Desktop no estaba corriendo en esta sesión).
- [x] Entidades TypeORM mapeando las 16 tablas **tal cual** (nombres snake_case, sin cambiar el esquema) + 3 `@ViewEntity` de solo lectura para las vistas. (`src/database/entities/`.)
- [x] `common/`: `JwtAuthGuard` global + `@Public` ✅, `RolesGuard` ✅ (enganchado ad-hoc con `@UseGuards(RolesGuard)` en los controllers que lo necesitan), `FrenteScopeGuard` ✅ (sigue cubriendo rutas con `:slug`/`:frenteId`; para endpoints cuyo recurso se identifica por su propio `:id` —procesos, cortes de personal— se agregó `common/database/frente-scope.helper.ts` con la misma regla, ver nota de diseño abajo), `AllExceptionsFilter` ✅ (unique → 409, FK → 409, check → 400). `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })`, `helmet` y CORS con lista blanca ya están en `main.ts`. Se agregó `common/dto/{paginacion-query,paginado}.dto.ts` y `common/utils/cookies.util.ts` (lectura de la cookie del refresh token sin instalar `cookie-parser`).
- [x] `auditoria.helper.ts`: `ejecutarConAuditoria(dataSource, usuarioId, fn)` = transacción + `set_config('app.usuario_id', …, true)`. (`src/common/database/auditoria.helper.ts`, con tests.)
- [x] Módulos `auth`, `usuarios`, `catalogos`, `frentes`, `procesos`, `seguimiento`, `personal` con los endpoints de §2 (menos `GET /frentes/:slug/export` y `POST /procesos/:id/adjuntos`, de fases 5/6). Cada uno con `*.module/*.controller/*.service/dto/*.spec.ts` del service. Rate limit de `/auth/login`: guard casero en memoria (`LoginRateLimitGuard`, sin `@nestjs/throttler`, comentario `// ponytail:` con el límite de la instancia única). Cache de `/catalogos`: objeto en memoria con TTL de 5 min (mismo patrón `// ponytail:`).
  - [x] Módulo `health`: `GET /api/v1/health` (público, `SELECT 1` contra el `DataSource`, 503 si falla). Test unitario ✅; test e2e escrito (`test/health.e2e-spec.ts`) pero no corrido (sin Docker en esta sesión).
- [x] Script `npm run crear-admin` (`src/database/scripts/crear-admin.ts`: email + nombre por `readline`, password enmascarado a mano en modo raw de stdin, nunca hardcodeado ni por argumento).
- [x] Rate limit en `/auth/login`: decisión ya tomada por el usuario (guard casero en memoria, ver arriba); no se instaló `@nestjs/throttler`.
- [x] Tests unitarios de servicios (lógica de estado, scope de frentes, paginación, cache de catálogos, transacción de cambio de estado + nota) — 65 tests, todos con mocks de repositorios/DataSource, sin BD real.
- [ ] Tests e2e: login, `GET /frentes` devuelve 7, `GET /frentes/sif/procesos` devuelve 34, EDITOR sin frente recibe 403, cambio de estado crea seguimiento y fila en `auditoria` — **siguen bloqueados**: la conexión a Supabase todavía falla por autenticación y Docker Desktop no estaba disponible en esta sesión tampoco (ver nota de la sesión anterior). No se tocó la BD real ni se intentó levantar Docker.

> **Nota de diseño (esta sesión):** `FrenteScopeGuard` resuelve el frente leyendo `:slug`/`:frenteId` de la URL, que es como está probado (`frente-scope.guard.spec.ts`). Pero `PATCH /procesos/:id`, `PATCH /procesos/:id/estado`, `POST /procesos/:id/seguimiento`, `PATCH /personal/cortes/:id` y `POST /personal/cortes` identifican el recurso por su propio id, no por el frente. En vez de extender el guard existente (con el riesgo de romper su contrato ya probado) se extrajo la misma regla —ADMIN pasa siempre, EDITOR necesita el frente en `usuario_frente`— a `asegurarScopeFrente()` en `common/database/frente-scope.helper.ts`; cada service resuelve primero a qué frente(s) pertenece el recurso (vía `frente_proceso` o `frente_tipo_personal`) y llama al helper. `POST /procesos` no lleva scope de frente porque el contrato de §2 no lo marca con `*` (a diferencia de los `PATCH`).
>
> **Nota de la sesión anterior (sigue vigente):** Docker Desktop no estaba corriendo (el CLI `docker`/`docker compose` sí están instalados), así que no se pudo levantar `docker-compose.test.yml` para correr la migración baseline completa ni el e2e de health. Contra Supabase (producción) se intentó **únicamente** `migration:run --fake` (nunca `migration:run` normal): la conexión llegó hasta el handshake TLS y Postgres respondió `password authentication failed for user "postgres"` — es decir, no se ejecutó ningún DDL/DML, pero tampoco quedó registrada la baseline. Revisar `DATABASE_URL` en `back/.env` (probablemente falta el sufijo `.<project-ref>` en el usuario que exige el Session/Transaction pooler de Supabase, o la contraseña quedó desactualizada). `npm run lint` y `npm test` (unitarios, sin BD) están en verde.

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

### Fase 4 — Frontend: menú de frentes + detalle ⬜ (todo hecho y verificado en navegador contra un mock; Playwright real sigue bloqueado)

- [x] `theme/`: tokens de CLAUDE.md, tema MUI (tipografía Roboto, radios 16, sombras suaves), modo claro. (`front/src/app/theme/{tokens,theme}.ts`.)
- [x] `shared/api/http.ts`: axios con base `/api/v1` (`VITE_API_URL` si existe), access token en memoria (`shared/api/tokenStore.ts`, no localStorage), refresh automático en 401 con cola de reintentos (una sola promesa de refresh compartida entre requests concurrentes).
- [x] Store: `auth`, `catalogos`, `frentes`, `procesos` (slices + sagas; estados `idle/loading/succeeded/failed`). `auth` agrega bootstrap (refresh silencioso + `/auth/me` al montar la app) para restaurar sesión tras un reload.
- [x] Router (`app/router.tsx`, `createBrowserRouter`): `/login`, `/` (menú), `/frentes/:slug`, `/procesos/:id` (placeholder Fase 5), `/admin/*` (placeholder Fase 5); `ProtectedRoute` redirige a `/login` sin sesión y valida `rolesPermitidos`.
- [x] **MenuFrentesPage**: fondo navy, pill azul "Tacita de Plata", grid de 7 `FrenteCard` (borde superior con `frente.color`, ícono MUI resuelto dinámicamente desde `frente.icono` con fallback si no existe, chips procesos/alertas/personal). Grid 4→3→2→1 columnas responsive, tarjetas con `tabIndex`/`onKeyDown` Enter-Espacio y `aria-label`.
- [x] **FrenteDetallePage**: header degradado con botones inicio/refrescar/filtros y exportar deshabilitado (tooltip "Próximamente", el endpoint no existe); fila de `KpiCard` (6 KPIs de §4); `ProcesoStepper` horizontal con conteo por estado (clic filtra `ProcesosTab`, toggle); tabs Procesos/Personal/Bitácora sincronizadas con `?tab=` en la URL (deep-linking), Personal y Bitácora como placeholder "Próximamente" (Fase 5).
- [x] **ProcesosTab**: tabla agrupada por actividad (desktop) / tarjetas agrupadas (móvil, `useIsMobile`), columnas según §4 (`EstadoChip`, `PlazoBar` con rojo si `diasRestantes < 0`, link SECOP `target="_blank" rel="noopener noreferrer"`). Filtros fase/dependencia/tipo + búsqueda con `useDebounce`.
- [x] Estados de carga (skeletons MUI), vacío (`EmptyState`) y error (`ErrorState` con reintentar) en Menú, Detalle y ProcesosTab.
- [x] Accesibilidad: foco visible AA (`:focus-visible` con outline `primary` vía `CssBaseline` overrides), texto claro sobre navy (nunca gris claro), tarjetas navegables por teclado, `aria-label` en iconos e inputs.
- [x] Tests Vitest: `EstadoChip`, `PlazoBar`, `FrenteCard` (12 tests, todos en verde).
- [ ] Playwright (`front/e2e/login-menu-sif.spec.ts` + `front/playwright.config.ts`, 1440 px y 390 px): **escrito pero NO corrido** — el backend real (NestJS + Supabase) sigue sin poder levantar en esta sesión (misma causa que Fase 3: password auth contra Supabase, Docker Desktop no disponible). Correr `npm run test:e2e` en `front/` en cuanto el backend esté arriba, con un usuario creado por `npm run crear-admin`.

**Verificación manual en navegador (esta sesión):** como el backend real no levantaba, se armó un servidor `http` descartable (solo módulo nativo, fuera del repo, en el scratchpad de la sesión) que sirve JSON con la forma exacta de `/auth/login`, `/auth/refresh`, `/auth/me`, `/catalogos`, `/frentes`, `/frentes/:slug`, `/frentes/:slug/procesos`, apuntado desde un `front/.env.local` temporal (gitignorado, borrado al terminar). Con eso se navegó el flujo completo (login automático vía bootstrap, menú de 7 frentes, detalle de SIF, stepper filtrando la tabla, responsive en 390 px) y aparecieron dos bugs reales que NO se habrían visto solo compilando:
1. `catalogosSaga` nunca pegaba a `GET /catalogos`: el guard comparaba contra `estado === 'loading'`, pero el reducer síncrono ya deja el estado en `'loading'` antes de que el saga corra, así que el guard se disparaba siempre. Corregido en `front/src/features/catalogos/catalogosSaga.ts` (el guard ahora solo chequea `'succeeded'`).
2. El `index.css` heredado del scaffold de Vite (`body { display:flex; place-items:center }`, sin ancho en `#root`) encogía toda la app a ~430 px centrados en vez de full-bleed — invisible en cualquier layout de ejemplo con `<div className="card">`, pero rompía el fondo navy de `LoginPage`/`MenuFrentesPage`. Corregido en `front/src/index.css` (reset mínimo, `html/body/#root` a 100% de ancho/alto) y se aprovechó para cargar Roboto real (`front/index.html`, antes solo caía al sans-serif del sistema) y limpiar `App.css`/`assets/react.svg` sin uso.

**Prompt:**
```
Lee CLAUDE.md y docs/PLAN-IMPLEMENTACION.md. Ejecuta la Fase 4 (menú de frentes + detalle).
Replica el estilo de las capturas descritas (tokens en CLAUDE.md). Colores de estados y
frentes vienen de la API, no los dupliques. Mobile-first y accesible (AA).
Antes de codificar, propón el árbol de componentes y qué va en Redux vs estado local.
```

---

### Fase 5 — Ficha del proceso, edición y personal ⬜ (todo hecho y verificado en navegador contra un mock; Playwright real sigue bloqueado)

- [x] **ProcesoFichaPage** (`front/src/features/procesos/ProcesoFichaPage.tsx`): datos del proceso + `PlazoBar`, `ProcesoEstadoTimeline` (stepper vertical de `estado_proceso` ordenado por `orden`, resalta el estado actual, clic abre `CambiarEstadoDialog` solo para ADMIN/EDITOR), `BitacoraTimeline` (bitácora cronológica con autor real), sección "Interventoría" (contrato vigilado si `tipo==='INTERVENTORIA'`, o interventorías que vigilan al proceso), chips de `frentes` que linkean a `/frentes/:slug`, botones Editar/Agregar nota y descarga de PDF.
- [x] `ProcesoForm` (`ProcesoForm.tsx`, RHF + Yup) para crear/editar: validaciones 1:1 contra `001_core_schema.sql` (`numeroContrato`/`numeroNecesidad` solo dígitos, `linkSecop` con `^https://`, `fechaTerminacion >= fechaInicio`). Sin campo de estado ni de frentes (van por otros flujos, a propósito).
- [x] Cambio de estado con nota obligatoria: `CambiarEstadoDialog.tsx`, un solo request a `PATCH /procesos/:id/estado` con `{estadoId, nota}`; el botón "Guardar" queda deshabilitado hasta que la nota tiene contenido.
- [x] `NotaForm.tsx` para la bitácora (`POST /procesos/:id/seguimiento`, fecha + nota obligatoria).
- [x] **PersonalTab** (`front/src/features/frentes/PersonalTab.tsx`): tarjetas por tipo (actual, pendiente, meta, fecha final), operadores agrupados por corte/vigencia, gráfico ECharts de barras apiladas actual vs pendiente, y tabla comparativa por vigencia (2025 vs 2026) armada agrupando `historico` (`GET /frentes/:slug/personal` trae **todas** las vigencias, no solo la más reciente — el comparativo sí es posible con los datos actuales, sin endpoint nuevo). El comparativo solo se muestra si hay más de una vigencia en los datos reales.
- [x] `front/src/shared/components/pdf/` (`@react-pdf/renderer`, agregado a `front/package.json`): `ProcesoPdfDocument.tsx` y `FrentePdfDocument.tsx` + `PdfDownloadButton.tsx` reutilizable (usa `usePDF` de `@react-pdf/renderer`, no `PDFDownloadLink`, para poder envolver un `Button` de MUI sin anidar `<button>` dentro de `<a>`). Botón de descarga en `ProcesoFichaPage` y en el header de `FrenteDetallePage`.
- [x] Export Excel del frente (`GET /frentes/:slug/export`). Implementado en el
      módulo `frentes` existente (`frentes.controller.ts`/`frentes.service.ts`),
      sin módulo nuevo. Rol: todos los autenticados. `exceljs` (no estaba
      instalado pese a figurar en el stack de `CLAUDE.md`; se agregó
      `"exceljs": "^4.4.0"` a `back/package.json`). Dos hojas: "Procesos"
      (`v_proceso_detalle` ⨝ `frente_proceso`, ordenada por actividad/fecha
      inicio para lectura humana — no reusa el orden por defecto de
      `GET /frentes/:slug/procesos`) y "Personal" (`v_personal_vigente` ⨝
      `frente_tipo_personal`, mismo join que `obtenerPersonal()`). Respuesta
      vía `StreamableFile` con `Content-Type`
      `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` y
      `Content-Disposition: attachment; filename="<slug>-<fecha-ISO>.xlsx"`.
      404 si el slug no existe (mismo `resolverFrente()` que el resto del
      controller). Test unitario del service con mocks de repositorio: arma
      el buffer, lo vuelve a leer con `ExcelJS.Workbook#load` y verifica
      encabezados y datos de ambas hojas. **Fase 5 (frontend)**: botón "Exportar"
      de `FrenteDetallePage` habilitado, descarga el blob con el nombre de
      archivo real leído del header `Content-Disposition` (nunca inventado).
- [x] Admin (`front/src/features/admin/`): `UsuariosPage.tsx` (CRUD completo — crear/editar con `UsuarioFormDialog`, password obligatorio solo al crear, asignación de `frentes` solo visible para rol EDITOR; "Desactivar" mapea a `PATCH {activo:false}` y no al `DELETE` físico, porque `usuarios.service.ts` hace un `delete` real sin soft-delete y la UI dice "desactivar", no "eliminar" — reversible con el mismo botón) y `VinculosPage.tsx` (vincula/desvincula proceso↔frente vía `PUT/DELETE /frentes/:slug/procesos/:id`; sin buscador de procesos porque no hay endpoint de búsqueda, se pega el id manualmente — documentado en la propia UI). Rutas anidadas `/admin/usuarios` y `/admin/vinculos` (`AdminLayout.tsx`).
  - **Pendientes de negocio de §0**: de los 5 ítems, 3 son datos que ya se pueden corregir editando el proceso correspondiente con el `ProcesoForm` de esta fase (enlazar las 10 interventorías vía `procesoSupervisadoId`, la necesidad 56173 duplicada, el contrato sin fecha de inicio) — no requieren pantalla nueva. Los otros 2 (renombrar el contratista «Cicloinfraestructura 20005479», corregir la dependencia nula de EMVARIAS) **siguen bloqueados**: se verificó con grep sobre `back/src/modules/**/*.controller.ts` que no existe ningún `POST/PUT/PATCH` sobre `contratista` ni `dependencia` — falta un endpoint de escritura sobre esos catálogos, decisión de backend pendiente (no se inventó ni se forzó por otro lado).

**Gaps de datos encontrados (no inventados)**:
- No existe catálogo de actividades en el front (`CatalogosRespuesta` solo trae `estados/dependencias/proyectos/contratistas`) ni endpoint de búsqueda de procesos — `actividadId` en `ProcesoForm` y "Id del proceso" en `VinculosPage` quedaron como campo de texto simple, documentado en el propio código/UI.
- El tipo `Seguimiento` del front usaba `usuarioId`; la entidad real del backend expone `autorId` + relación `autor` (`seguimiento.entity.ts`). Corregido en `front/src/shared/types/seguimiento.ts` y `BitacoraTimeline.tsx` antes del commit final — se verificó en el navegador que el nombre del autor aparece bien en la bitácora.
- La tab "Bitácora" de `FrenteDetallePage` (agregada de todos los procesos del frente) sigue en placeholder: no hay endpoint que devuelva la bitácora agregada de un frente completo (la bitácora por proceso, que sí pide el checklist de Fase 5, está resuelta en `ProcesoFichaPage`).

**Verificación manual en navegador (esta sesión):** mismo enfoque que Fase 4 — el backend real sigue sin poder levantar. Se amplió el mock del scratchpad (solo módulo `http` nativo, fuera del repo) para cubrir `GET/PATCH /procesos/:id`, `PATCH /procesos/:id/estado`, `POST /procesos/:id/seguimiento`, `GET /frentes/:slug/personal` (con dos vigencias, 2025 y 2026, para poder ver el comparativo real), `GET /frentes/:slug/export` y el CRUD de `/usuarios`. Como escribir `front/.env.local` está bloqueado por el sistema de permisos de esta sesión, se usó el `.env` ya existente del proyecto (`VITE_API_URL=http://localhost:3000/api/v1`) sirviendo el mock en el puerto 3000 en lugar de tocar archivos `.env`; no se dejó ningún cambio de configuración persistente (se verificó `git diff` limpio en `vite.config.ts`/`.env`). Se navegó: login automático (bootstrap), ficha de un proceso (datos, stepper vertical, interventoría, chips de frentes), cambio de estado con nota (bloqueaba el submit sin nota; al guardar la nota nueva apareció al tope de la bitácora), agregar nota suelta (con validación Yup visible), descarga de PDF (sin errores en consola), tab Personal (tarjetas, gráfico ECharts con tooltip funcionando, tabla comparativa 2025 vs 2026 con datos reales), botón Exportar (request 200 real), y Admin (tabla de usuarios, diálogo "Nuevo usuario", pantalla de Vínculos). Se cerraron los mocks y se revirtió `vite.config.ts` al terminar.

**Verificación automática:** `npx tsc --noEmit -p tsconfig.app.json` limpio, `npm run lint` limpio, `npx vitest run` → **29/29 tests en verde** (7 archivos) sobre el árbol completo (incluye los tests nuevos de `ProcesoFichaPage`, `CambiarEstadoDialog`, `PersonalTab`, `UsuariosPage`).

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
