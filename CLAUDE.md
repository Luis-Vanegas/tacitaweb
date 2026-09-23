# CLAUDE.md — TacitaWeb

Contexto permanente para Claude Code. Léelo completo antes de tocar código.

## Qué es

App web para hacer seguimiento a la **contratación y el personal** del proyecto
"Medellín Tacita de Plata" (Alcaldía de Medellín). El menú principal son **7 frentes**
(Gestión y Control Territorial, Operativa/Seguridad, Espacio Público, SIF, EMVARIAS,
Habitante de Calle, Medio Ambiente). Al entrar a un frente se ven sus procesos de
contratación (del precontractual al terminado), su bitácora y su personal.

- Plan completo y fases: `docs/PLAN-IMPLEMENTACION.md` (fuente de verdad del trabajo).
- Contexto del modelo y decisiones: `docs/PLAN.md`.
- Inconsistencias de los datos originales: `docs/reporte-importacion.md`.

## Reglas de trabajo (obligatorias)

0. **Fuera de alcance:** chat con IA y mapas. No se implementan ni se instalan sus librerías.

1. **No inventar datos ni APIs.** Si algo no está en el código, la BD o los docs, pregunta.
   Verifica versiones y firmas de librerías en su documentación antes de usarlas.
2. **Una fase a la vez.** Al terminar: `lint` + `test` en verde, marca los checks en
   `docs/PLAN-IMPLEMENTACION.md` y resume qué cambió.
3. **Sin duplicación.** Antes de crear un componente, hook, DTO o util, busca si ya existe.
4. **Código comentado donde aporta** (el *por qué*, no el *qué*). Nombres en español
   para el dominio (`proceso`, `frente`, `seguimiento`), inglés solo para términos técnicos.
5. **La BD no se cambia a mano.** Todo cambio de esquema = nueva migración SQL numerada
   + migración TypeORM que la ejecuta. Nunca `synchronize: true`.
6. **Secretos solo en `.env`** (nunca en código ni commits). Mantén `.env.example` al día.
7. Commits convencionales (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`).

## Stack

| Capa | Tecnología |
|---|---|
| Backend `back/` | NestJS 10 + TypeScript (Express), TypeORM 0.3 + `pg`, JWT (`@nestjs/jwt`) + bcryptjs, class-validator/transformer, exceljs, Azure Blob (`@azure/storage-blob`) |
| Frontend `front/` | React 18 + TypeScript + Vite 6, MUI 6 + Emotion, Redux Toolkit + redux-saga, React Router 7, ECharts, React Hook Form + Yup, axios, dayjs, jwt-decode, @react-pdf/renderer |
| Base de datos | Supabase (PostgreSQL 17) — proyecto `WebAlcaldia`, **schema `core`** |
| Tests | Back: Jest + Supertest · Front: Vitest + Testing Library + Playwright |

## Base de datos (ya creada y cargada)

- Migraciones aplicadas en Supabase: `001_core_schema`, `002_catalogos_base`,
  `003_core_views`, `100_seed_excel` (SQL en `back/src/database/migrations/sql/` y `seeds/sql/`).
- Schema `core` **no expuesto** por la Data API; RLS activado **sin políticas a propósito**.
  El único cliente es el backend. No crear políticas ni exponer el schema.
- Tablas: `dependencia`, `proyecto`, `estado_proceso`, `contratista`, `frente`,
  `usuario`, `usuario_frente`, `actividad`, `proceso_contratacion`, `seguimiento`,
  `tipo_personal`, `personal_corte`, `personal_operador`, `frente_proceso`,
  `frente_tipo_personal`, `auditoria`.
- Vistas de lectura (úsalas en vez de recalcular): `v_proceso_detalle`,
  `v_personal_vigente`, `v_resumen_frente`.
- Auditoría por trigger: dentro de la transacción de escritura ejecutar
  `select set_config('app.usuario_id', '<uuid>', true)`.
- Lo derivado (días restantes, % plazo, pendientes 2025, totales) **no se guarda**.

## Diseño (tomado de las capturas del Visor)

Tokens en `front/src/app/theme/tokens.ts`:
`navy #00233D` (fondo del menú) · `primary #00ABEE` · header degradado `#009EE8 → #0083DA`
· tarjetas `#FFFFFF` con borde superior del color del frente · éxito `#28A745`
· info `#17A2B8` · oscuro `#343A40`. Fuente: Roboto. Colores de estados y frentes
vienen de la BD (`estado_proceso.color`, `frente.color`), no se duplican en el front.

## Comandos

```bash
# backend
cd back && npm run start:dev        # API en :3000
npm run lint && npm test && npm run test:e2e
npm run migration:run               # aplica migraciones TypeORM

# frontend
cd front && npm run dev             # Vite en :5173
npm run lint && npm test && npx playwright test
```
