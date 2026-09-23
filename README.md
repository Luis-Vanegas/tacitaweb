# TacitaWeb

App web para hacer seguimiento a la **contratación y el personal** del proyecto
"Medellín Tacita de Plata" (Alcaldía de Medellín). El menú principal son **7 frentes**;
al entrar a un frente se ven sus procesos de contratación (del precontractual al
terminado), su bitácora y su personal.

## Stack

| Capa | Tecnología |
|---|---|
| Backend `back/` | NestJS 10 + TypeScript (Express), TypeORM 0.3 + `pg`, JWT (`@nestjs/jwt`) + bcryptjs, class-validator/transformer, exceljs, Azure Blob (`@azure/storage-blob`) |
| Frontend `front/` | React 18 + TypeScript + Vite 6, MUI 6 + Emotion, Redux Toolkit + redux-saga, React Router 7, ECharts, React Hook Form + Yup, axios, dayjs, jwt-decode, @react-pdf/renderer |
| Base de datos | Supabase (PostgreSQL 17) — proyecto `WebAlcaldia`, **schema `core`** |
| Tests | Back: Jest + Supertest · Front: Vitest + Testing Library + Playwright |

## Cómo levantar el proyecto

```bash
# backend
cd back && npm run start:dev        # API en :3000
npm run lint && npm test && npm run test:e2e
npm run migration:run               # aplica migraciones TypeORM

# frontend
cd front && npm run dev             # Vite en :5173
npm run lint && npm test && npx playwright test
```

## Fuente de verdad del trabajo

El plan completo, las fases y los checklists de avance están en
[`docs/PLAN-IMPLEMENTACION.md`](docs/PLAN-IMPLEMENTACION.md).
