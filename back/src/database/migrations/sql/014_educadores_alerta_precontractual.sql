-- =============================================================================
-- 014_educadores_alerta_precontractual.sql
-- Inclusión Social › Educadores: el proceso nuevo (Comité de Estudios Médicos,
-- sin contrato, creado en 013) pasa de "Precontractual" a "Alerta
-- precontractual", como figura en el Excel. Rutas sin cambios. Requiere 013.
-- =============================================================================

update core.proceso_contratacion p
set estado_id = (select id from core.estado_proceso where codigo = 'ALERTA_PRECONTRACTUAL')
from core.actividad a
join core.dependencia d on d.id = a.dependencia_id and d.slug = 'inclusion-social'
join core.contratista c on core.clave_texto(c.nombre) = core.clave_texto('Comité de Estudios Médicos')
where p.actividad_id = a.id
  and p.contratista_id = c.id
  and a.nombre = 'Educadores'
  and p.numero_contrato is null
  and p.estado_id = (select id from core.estado_proceso where codigo = 'PRECONTRACTUAL');
