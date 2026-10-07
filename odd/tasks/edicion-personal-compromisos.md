# Edición de personal y compromisos + vista general de personal

## Objetivo
- Editar cortes de personal directamente desde la pestaña Personal del frente.
- Crear/editar/eliminar compromisos.
- Vista general `/personal` con todo el personal de todos los frentes.

## Decisiones
- Compromisos: escritura ADMIN/EDITOR, eliminar solo ADMIN; sin scope de
  frente (la tabla no tiene FK a frente). Escrituras con `ejecutarConAuditoria`.
- Vista general: nuevo `GET /personal` que lee `v_personal_vigente` una vez
  por tipo y adjunta `frentes[]`; evita contar doble los tipos ligados a
  varios frentes (p. ej. Espacio Público).
- Edición de corte: diálogo `EditarCorteDialog` reutilizando
  `payloadCorte` de `features/carga/corteExistente.ts`; precarga la fila cruda
  de `historico`, no la de `vigente` (pendiente calculado en la vista).

## Tareas
- [x] T1 Backend: compromisos CRUD (service + DTOs + specs) y `GET /personal`
      global con frentes por tipo.
- [x] T2 Frontend: `EditarCorteDialog` en PersonalTab, edición de compromisos
      en `CompromisosPanel`, página `/personal` + botón en el header.

## Rutas por tarea
- T1: delegated (writer trigger, 2+ archivos no triviales).
- T2: delegated (writer trigger, 2+ archivos no triviales).

## Checks
- `back`: `npm run lint && npm test`
- `front`: `npm run lint && npx vitest run && npx tsc -b`

## Progreso
- Rama `feat/carga-datos-excel` (continúa sobre la carga de datos).
- T1: `npm run lint` limpio, `npm test` 19 suites / 99 tests OK, `tsc` OK.
  `GET /personal` → `{items (VPersonalVigente + frentes[]), totales, historico}`;
  compromisos POST/PATCH (ADMIN/EDITOR), DELETE (ADMIN, 204).
- T2: `npm run lint` limpio, `npx tsc -b` OK, `npx vitest run` 15 archivos / 58 tests OK.
  No verificado en navegador (backend no levanta en local). Pendiente: no se
  puede vaciar pendiente/meta de un corte (payloadCorte omite vacíos).
