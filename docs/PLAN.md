# Tacita Web — Plan de implementación

> Fuente de datos inicial: `Personal y contratación Tacita de Plata (3).xlsx` (hojas: Personal 2025, Personal 2026, Contratos, Lista).
> Stack: NestJS 10 + TypeORM 0.3 + PostgreSQL (Supabase) · React 18 + Vite 6 + MUI 6 + Redux Toolkit/saga.

---

## 1. Hallazgos del Excel (lo que condiciona el modelo)

| Hoja | Qué contiene | Problemas detectados |
|---|---|---|
| **Contratos** (47 filas) | Proyecto, Dependencia, N.º contrato, Actividad, Estado, Contratista, Inicio, Terminación, Link SECOP, Observación | • 20 filas **sin número de contrato** (son necesidades en etapa precontractual).<br>• La observación mezcla el **N.º de necesidad** + notas fechadas (`15/09/2026: …`) → debe ser una bitácora.<br>• Espacios sobrantes (`"Ejecución "`, `"Secretaría de Medio Ambiente "`).<br>• Contratistas escritos distinto (`Epm`, `Parque Arví ` vs `Parque Arví`).<br>• Contratista sospechoso: `Cicloinfraestructura 20005479`.<br>• `Necesidad 56173` aparece en dos procesos distintos (posible error de copia).<br>• Interventorías que vigilan a otro contrato, sin vínculo explícito. |
| **Personal 2025 / 2026** | Tipo de personal, actual, pendiente, meta (solo 2025), operador, observaciones, link, fecha final | • **No tiene columna Dependencia** → hay que mapear cada tipo de personal a su secretaría (validar con negocio).<br>• Celdas con varios valores: `UdeA (199) / ITM (16)`, dos fechas en una celda.<br>• Pendientes negativos (2025).<br>• Fila **Total** (no se guarda; se calcula). |
| **Lista** | Catálogo de 15 proyectos y 7 estados | Son dos listas independientes (validación de datos), no una relación proyecto→estado. |

**Dependencias presentes:** Seguridad · Gestión y Control · Medio Ambiente · Inclusión Social · Infraestructura.
**Estados:** Precontractual · Alerta Precontractual · Firmado · Ejecución · Próximo a terminar directo · Próximo a terminar selección · Terminado.

---

## 1.1 Menú: los 7 frentes de Tacita de Plata (boceto de Luis)

El menú **no son las secretarías**, son **frentes** de trabajo. Un mismo contrato o tipo de personal puede aparecer en **varios frentes** (ej. los contratos de EMVARIAS están en Seguridad, Medio Ambiente e Infraestructura, y además tienen su propio frente). Por eso la relación es **N:M** y la tabla puente guarda la información propia de cada frente.

| Frente (menú) | Contratos (según Excel) | Personal | Notas del boceto |
|---|---|---|---|
| Gestión y Control Territorial | Los 5 de Sec. Gestión y Control (promotores ITM, logística reciclaje, 3 de alumbrado) | Gestión y Control (ITM) | "Servicios públicos" (→ alumbrado) |
| Operativa / Seguridad | Los 3 de Sec. Seguridad (Pascual Bravo, 2 de cambuches) | Gestores Operativos | |
| Espacio Público | 4600107540 Pascual Bravo (**compartido** con Operativa; separado de las obras de espacio público de SIF) | Espacio Público | |
| SIF (Infraestructura Física) | Los 34 de Sec. Infraestructura | Jardineros, Cuadrillas EDU | |
| EMVARIAS | 5 procesos con EMVARIAS (cambuches ×2, residuos, poda, lavado) — **compartidos** | EMVARIAS | "H.N.", "Tarifa domiciliar" |
| Habitante de calle | Los 3 de Sec. Inclusión Social (educadores, resocialización, albergue) | Educadores | |
| Medio Ambiente | Los 2 de Sec. Medio Ambiente (residuos EMVARIAS, PP Arví) | Promotores ambientales, Guardaquebradas | |

Tablas nuevas:
- `frente` (id, nombre, slug, color, icono, orden, activo)
- `frente_proceso` (frente_id, proceso_id, nota, orden) · PK compuesta
- `frente_tipo_personal` (frente_id, tipo_personal_id, nota) · PK compuesta

`dependencia` (secretaría) se mantiene como dato del proceso: el frente dice **dónde se muestra** y la dependencia dice **quién es responsable**.

---

## 2. Decisiones de arquitectura

**Confirmadas:** proyecto Supabase nuevo · la app es la fuente de verdad (Excel se importa una sola vez; luego CRUD + bitácora) · JWT propio en NestJS.


1. **Supabase solo como PostgreSQL gestionado.** La lógica y la seguridad viven en NestJS (JWT propio + bcrypt, como define el stack).
2. **Tablas en un schema propio `core`** (no expuesto por la Data API de Supabase) + **RLS activado sin políticas** como defensa en profundidad → nadie puede leer datos con la anon key.
3. **Migraciones TypeORM = única fuente de verdad** del esquema (`synchronize: false` siempre).
4. Conexión: **Session pooler (5432)** para el servidor Nest y migraciones; nunca exponer la `service_role` key al frontend.
5. **Catálogos en tablas** (no enums de Postgres) para estados, dependencias, proyectos → se pueden editar sin migración.
6. **Nada calculado se guarda**: totales, días para vencer, % avance → vistas SQL o servicios.
7. **ETL de importación idempotente** (script `seed:excel`) que limpia, normaliza y reporta inconsistencias en vez de ocultarlas.

---

## 3. Modelo de datos (v1)

```
proyecto ─┐
          ├─< actividad >── dependencia ──< tipo_personal ──< personal_corte ──< personal_operador >── contratista
          │       │
          │       └──< proceso_contratacion >── estado_proceso
          │                 │   │     └── contratista
          │                 │   └── proceso_supervisado (self-FK: interventoría → contrato)
          │                 └──< seguimiento (bitácora)
usuario >──< usuario_dependencia        auditoria
```

| Tabla | Campos clave | Notas |
|---|---|---|
| `dependencia` | id, nombre (uq), slug (uq), sigla, color, icono, orden, activo | Alimenta el menú |
| `proyecto` | id, nombre (uq), activo | 15 del catálogo |
| `estado_proceso` | id, codigo (uq), nombre, fase (`PRECONTRACTUAL`/`CONTRACTUAL`/`POSCONTRACTUAL`), orden, es_alerta, color | Para el stepper del proceso |
| `contratista` | id, nombre, nombre_normalizado (uq), nit (null) | Se deduplica en el ETL |
| `actividad` | id, dependencia_id, proyecto_id, nombre · uq(dependencia, nombre) | Agrupa la **historia** de contratos de una misma línea (ej. "Recolección cambuches": terminado + nuevo en alerta) |
| `proceso_contratacion` | id, actividad_id, estado_id, contratista_id (null), numero_necesidad (null), numero_contrato (null, uq parcial), objeto, tipo (`PRINCIPAL`/`INTERVENTORIA`), proceso_supervisado_id (null), fecha_inicio, fecha_terminacion, link_secop, observacion, timestamps | CHECK `fecha_terminacion >= fecha_inicio` |
| `seguimiento` | id, proceso_id, fecha, nota, estado_id (snapshot), autor_id | Sale de parsear las notas `dd/mm/aaaa:` |
| `tipo_personal` | id, dependencia_id, nombre (uq) | Promotores ambientales, Guardaquebradas, … |
| `personal_corte` | id, tipo_personal_id, proceso_id (null), vigencia, fecha_corte, actual, pendiente, meta (null), fecha_final, observaciones, link_secop · uq(tipo, vigencia, fecha_corte) | Histórico por año/corte |
| `personal_operador` | corte_id, contratista_id, cantidad (null), fecha_final (null), proceso_id (null) | Separa "UdeA (199) / ITM (16)" |
| `usuario`, `usuario_dependencia` | email (uq), hash, rol (`ADMIN`/`EDITOR`/`LECTOR`) | Alcance por dependencia |
| `auditoria` | entidad, entidad_id, accion, antes/después (jsonb), usuario, fecha | Trazabilidad |

**Vistas:** `v_resumen_dependencia` (contratos por estado, alertas, próximos a vencer ≤30 días, personal actual/pendiente), `v_proceso_detalle`.

**Mapeo tipo de personal → dependencia → contrato** (deducido cruzando operador + fecha final de *Personal 2026* con *Contratos*; los links SECOP de 2025 son de contratos anteriores y solo 1 coincide):

| Tipo de personal (2026) | Operador | Fecha final | Contrato que coincide | Dependencia | Confianza |
|---|---|---|---|---|---|
| Promotores ambientales | Parque Arví | 30/11/2026 | 4600108068 PP estrategias de sostenibilidad ambiental (fin 30/11/2026) | Medio Ambiente | Alta |
| Guardaquebradas | Parque Arví | 30/11/2026 | 4600108068 (mismo) | Medio Ambiente | Alta |
| Educadores (Inclusión Social) | Comité de Estudios Médicos | 04/10/2026 | 4600106984 Educadores (fin 04/10/2026) | Inclusión Social | Alta |
| Jardineros | Arví y Jardín Botánico | — (en contratación) | 4600108890 Firmado (J. Botánico) + necesidad en alerta (Arví) · 2025: 4600104824 (link coincide) | Infraestructura | Alta |
| Espacio Público | Fundación Pascual Bravo | 31/12/2026 | 4600107540 Gestores operativos y personal espacio público | Seguridad | Alta |
| Gestores Operativos | Fundación Pascual Bravo | 31/12/2026 | 4600107540 (mismo) | Seguridad | Alta |
| Gestión y Control (= "Promotores puntos críticos" en 2025) | ITM | 31/12/2026 | 4600108237 Promotores (puntos críticos) | Gestión y Control | Alta |
| Cuadrillas (EDU) | EDU | 24/09/2026 | 4600106234 Contingencias (fin **29**/09/2026 ≠ 24/09) + necesidad nueva en alerta | Infraestructura | Media (fechas no cuadran) |
| EMVARIAS | — | 31/12/2026 | EMVARIAS tiene contratos en 3 dependencias; por fecha coincide 4600108257 Recolección residuos | Medio Ambiente (probable) | **Baja — confirmar** |

Otros hallazgos al leer el Excel completo:
- En 2025 la columna *Personal pendiente* es **fórmula** (`Meta − Actual`), por eso salen negativos (= personal por encima de la meta). En 2026 es un valor digitado. → En BD se guarda `meta` y `actual`; el pendiente 2025 se calcula.
- Hay **comentarios encadenados** con información de negocio (ej. "Prórroga hasta el 30 de julio… inicia el nuevo contrato el 1 de agosto", "Cierre de año con 200") → se importan como notas de `seguimiento`.
- Las celdas de Link SECOP a veces traen dos URLs → se separan por operador.

---

## 4. Estructura de carpetas

```
TacitaWeb/
├── back/
│   ├── src/
│   │   ├── config/                 # validación de env (Joi/zod), typeorm.config.ts
│   │   ├── common/                 # guards, decorators, filters, interceptors, pipes, dto base (paginación)
│   │   ├── database/
│   │   │   ├── migrations/
│   │   │   ├── seeds/              # catálogos + ETL excel (parsers/, normalizers/, report)
│   │   │   └── data-source.ts
│   │   └── modules/
│   │       ├── auth/  usuarios/
│   │       ├── catalogos/          # dependencias, proyectos, estados, contratistas
│   │       ├── actividades/  procesos/  seguimiento/
│   │       ├── personal/
│   │       ├── reportes/           # resúmenes + exportaciones exceljs
│   │       └── archivos/           # Azure Blob
│   └── test/                       # e2e con Supertest
├── front/
│   └── src/
│       ├── app/                    # store, sagas raíz, router, theme MUI
│       ├── features/
│       │   ├── dependencias/       # menú + detalle (slice, saga, api, components, pages)
│       │   ├── procesos/  personal/  auth/
│       ├── shared/                 # components (KpiCard, StatusChip, Stepper…), hooks, api (axios), utils
│       └── tests/  e2e/
└── docs/                           # PLAN.md, ADRs, diccionario de datos
```

Módulos Nest por dominio con capas `controller → service → repository`, DTOs con class-validator, respuestas tipadas compartidas.

---

## 5. UI — Menú de frentes

**Paleta (tomada de las capturas):**
`--navy #00233D` (fondo) · `--primary #00ABEE` (pill título, acentos) · gradiente header `#009EE8 → #0083DA` · `--white #FFFFFF` (tarjetas) · verde `#28A745` · teal `#17A2B8` · oscuro `#343A40`.

- **Home**: fondo navy, pill azul "Tacita de Plata", 7 tarjetas blancas (una por frente) con borde superior de color, icono + nombre + resumen (n.º contratos, alertas, personal).
- **Detalle del frente** (estilo "Reporte General"): header con gradiente azul · fila de KPIs (Contratos, En ejecución, Precontractual, Alertas, Próximos a vencer, Personal actual/pendiente) · **stepper del proceso** con conteo por estado · tabla/tarjetas de actividades → expandir para ver sus procesos (contratista, fechas, barra de plazo, link SECOP, bitácora) · pestaña Personal.
- Responsive: grid 5 → 3 → 2 → 1 columnas; tabla → tarjetas en móvil.

---

## 6. Fases

| Fase | Entregable | Criterio de salida |
|---|---|---|
| **0. Setup** | Monorepo, lint/prettier, env, proyecto Supabase | `npm run lint` y conexión OK |
| **1. Base de datos** ✅ *hecha (23/09/2026)* | Entidades, migraciones, vistas, seeds de catálogos, ETL del Excel + reporte de inconsistencias | Conteos Excel = BD; tests del ETL |
| **2. API núcleo** | Auth JWT, catálogos, dependencias/resumen, procesos, seguimiento | Tests unit + e2e |
| **3. Front menú + detalle** | Home de dependencias y vista de detalle | Vitest + Playwright en desktop/móvil |
| **4. Personal y exportaciones** | Vista de personal, Excel export | — |
| **5. Archivos** | Azure Blob | — |
| **6. QA y despliegue** | Checklist seguridad, advisors Supabase, deploy | — |

---

## 7. Estado Fase 1 — Base de datos (Supabase `WebAlcaldia`, schema `core`)

| Migración | Contenido |
|---|---|
| `001_core_schema` | 16 tablas, índices por FK, triggers `updated_at` y auditoría, RLS en todo |
| `002_catalogos_base` | 7 estados del proceso + 7 frentes del menú |
| `003_core_views` | `v_proceso_detalle`, `v_personal_vigente`, `v_resumen_frente` |
| `100_seed_excel` | Generado por `tools/etl-excel/importar_excel.py` |

**Verificación contra el Excel:** 47 procesos (29 con contrato), 5 dependencias, 39 actividades, 11 notas de bitácora, 18 cortes de personal. Personal 2025 = 2.758 · Personal 2026 actual = 1.057 / pendiente = 1.729 (igual a los totales del Excel).
Advisors de Supabase: solo avisos INFO esperados (RLS sin políticas a propósito; índices aún sin uso).

Pendiente de revisión humana: ver `docs/reporte-importacion.md` (10 interventorías por enlazar, necesidad 56173 duplicada, contratista «Cicloinfraestructura 20005479», contrato 4600108890 firmado sin fecha de inicio).
