# Vista de compromisos

## Objetivo
Botón "Compromisos" en el header del mapa (como "Vista general" y "Personal")
que abre `/compromisos` con todos los compromisos completos, filtrables y
editables según rol.

## Hallazgo relacionado
"Personal" sale vacío en producción: el backend de Netlify
(`tacitaweb-back.netlify.app`) no tiene desplegado `GET /personal` ni
`/importacion` (404). Se publica manualmente (sitio vinculado en
`back/.netlify`), no por git. Requiere deploy manual autorizado.

## Tareas
- [x] T1 Front: `CompromisosPage` (`/compromisos`), botón en header, panel del
      mapa con enlace "Ver todos", tests. Ruta: delegated (writer trigger).

## Checks
- `front`: `npm run lint && npx vitest run && npx tsc -b`

## Progreso
- Rama `feat/compromisos-vista`.
- T1: lint OK, `npx vitest run` 16 archivos / 66 tests OK, `tsc -b` OK.
  Pendiente: deploy manual del backend en Netlify (autorización del usuario).
