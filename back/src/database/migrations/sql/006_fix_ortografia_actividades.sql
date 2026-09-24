-- =============================================================================
-- 006_fix_ortografia_actividades.sql
-- Corrige errores de tipeo en nombres de actividad importados del Excel
-- original (100_seed_excel.sql). Solo ortografía, no cambia el significado.
-- =============================================================================

update core.actividad
set nombre = 'Operación logística (campaña Tu separas yo reciclo)'
where nombre = 'Operación logística (camapaña Tu sepaara yo reciclo)';

update core.actividad
set nombre = 'Interventoría a las Obras de construcción y mejoramiento de espacios públicos en el centro de Medellín'
where nombre = 'Interventoría a las Obras de construcción y mejoramiento de espacios públicos en el centro de Medellin';

update core.actividad
set nombre = 'Obras de construcción y mejoramiento de espacios públicos en el centro de Medellín'
where nombre = 'Obras de construcción y mejoramiento de espacios públicos en el centro de Medellin';
