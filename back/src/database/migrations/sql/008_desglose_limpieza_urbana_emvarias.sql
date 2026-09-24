-- =============================================================================
-- 008_desglose_limpieza_urbana_emvarias.sql
-- Desglose de sub-actividades de "Limpieza urbana" (EMVARIAS), tal como
-- aparece en el documento "RESUMEN CLUS". Se guarda en la observación del
-- proceso placeholder (007_actividades_emvarias.sql) en vez de crear una
-- tabla de subtareas: ya existe el campo, no hay que inventar esquema nuevo.
-- =============================================================================

update core.proceso_contratacion p
set observacion = 'Incluye: Instalación y mantenimiento de cestas públicas; Corte de césped en áreas públicas; Poda de árboles; Lavado de áreas públicas.'
from core.actividad a
join core.dependencia d on d.id = a.dependencia_id and d.slug = 'emvarias'
where p.actividad_id = a.id and a.nombre = 'Limpieza urbana';
