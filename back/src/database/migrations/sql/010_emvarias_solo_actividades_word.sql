-- =============================================================================
-- 010_emvarias_solo_actividades_word.sql
-- El frente EMVARIAS debe mostrar únicamente las 5 actividades nuevas del
-- documento "RESUMEN CLUS" (vínculo MANUAL, ver 007_actividades_emvarias.sql).
-- El seed original (100_seed_excel.sql) además vinculaba automáticamente
-- cualquier proceso cuyo contratista fuera EMVARIAS (criterio CONTRATISTA:
-- Recolección cambuches, Recolección residuos, Poda, Lavado) — esos procesos
-- siguen intactos bajo sus dependencias reales (Seguridad, Medio Ambiente,
-- SIF), solo se les saca el vínculo extra a EMVARIAS.
-- =============================================================================

delete from core.frente_proceso fp
using core.frente f
where fp.frente_id = f.id
  and f.slug = 'emvarias'
  and fp.criterio = 'CONTRATISTA';
