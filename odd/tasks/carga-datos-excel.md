# Carga de datos: formularios + importación Excel

## Objetivo
Una pantalla "Cargar datos" (`/carga`, ADMIN/EDITOR) desde donde se crea/edita
información de **procesos** y **cortes de personal**, y se cargan o actualizan
en bloque mediante Excel (.xlsx).

## Por qué
Hoy solo hay formularios sueltos (proceso desde un frente) y ninguna forma de
editar personal ni de cargar datos masivos; el Excel original se importó una
sola vez con un script.

## Decisiones
- Importación en dos pasos: `dryRun` (vista previa con errores por fila) y
  confirmación. **Todo o nada**: con cualquier error no se escribe nada.
- Clave de upsert: proceso por `numero_contrato`; si viene vacío, por
  `numero_necesidad + actividad`. Personal por `(tipo_personal, vigencia)`
  (unique en BD).
- Nombres (dependencia, actividad, contratista, estado, tipo de personal,
  frente) se resuelven contra la BD con `clave_texto`-like normalización; si no
  existen → error de fila. No se crean catálogos implícitamente.
- Auditoría: todo dentro de `ejecutarConAuditoria`.
- Plantillas generadas por el backend (exceljs), columnas alineadas al export.

## Tareas
- [ ] T1 Backend: catálogos exponen `tiposPersonal` y `actividades`; módulo
      `importacion` (plantilla + import procesos/personal con dryRun) + specs.
- [ ] T2 Frontend: página `/carga` con pestañas Procesos/Personal, formularios
      (proceso con selects de catálogo, corte de personal) e importador Excel
      con vista previa + tests.

## Rutas por tarea
- T1: delegated (2+ archivos no triviales, writer trigger).
- T2: delegated (2+ archivos no triviales, writer trigger).

## Checks
- `back`: `npm run lint && npm test`
- `front`: `npm run lint && npm test`

## Progreso
- Rama `feat/carga-datos-excel` creada.
