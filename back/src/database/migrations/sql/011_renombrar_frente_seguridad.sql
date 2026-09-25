-- =============================================================================
-- 011_renombrar_frente_seguridad.sql
-- El frente "Operativa / Seguridad" pasa a llamarse solo "Seguridad": sus 3
-- procesos pertenecen todos a la misma dependencia real (Secretaría de
-- Seguridad, ver core.actividad.dependencia_id), "Operativa" era redundante.
-- El slug no cambia (operativa-seguridad) para no romper rutas del front ni
-- el mapeo del ETL (tools/etl-excel/importar_excel.py usa el slug, no el
-- nombre). El contrato "Gestores operativos y personal espacio público"
-- (Fundación Pascual Bravo) se queda en este frente tal cual: mezcla personal
-- operativo y de espacio público bajo un solo contrato, no son dos contratos
-- separables (decisión explícita del usuario, no mover a Espacio Público).
-- =============================================================================

update core.frente
set nombre = 'Seguridad'
where slug = 'operativa-seguridad';
