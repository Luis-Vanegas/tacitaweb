-- =============================================================================
-- 007_actividades_emvarias.sql
-- Actividades nuevas del frente EMVARIAS que todavía no tienen contrato
-- asociado (fuente: documento "RESUMEN CLUS" sobre qué cubre la tarifa de
-- aseo). EMVARIAS no es una dependencia real de la Alcaldía -hoy solo existe
-- como contratista (core.contratista) y como frente (core.frente)-, pero
-- core.actividad exige una dependencia (NOT NULL) y ninguna de las 5
-- dependencias existentes es la dueña real de estas actividades: reusar una
-- (ej. Medio Ambiente) las haría aparecer también en el frente de esa
-- secretaría por la regla de auto-vínculo DEPENDENCIA (ver 100_seed_excel.sql,
-- bloque final de frente_proceso). Por eso se crea una dependencia dedicada,
-- y el vínculo al frente EMVARIAS se hace manual (criterio MANUAL).
-- =============================================================================

insert into core.dependencia (nombre, sigla, slug) values
  ('EMVARIAS', 'EMVARIAS', 'emvarias')
on conflict do nothing;

insert into core.actividad (dependencia_id, proyecto_id, nombre, categoria_id)
select d.id, pr.id, v.nombre, ca.id
from (values
  ('Recolección de residuos y transporte'),
  ('Barrido y limpieza de vías y áreas públicas'),
  ('Limpieza urbana'),
  ('Aprovechamiento de residuos'),
  ('Disposición final')
) v(nombre)
join core.dependencia d on d.slug = 'emvarias'
join core.proyecto pr on core.clave_texto(pr.nombre) = core.clave_texto('Medellín Tacita de Plata')
join core.categoria_actividad ca on ca.nombre = 'Aseo / Residuos'
on conflict do nothing;

-- Un proceso "placeholder" en estado Precontractual por actividad, sin
-- contratista ni número de contrato: así la actividad aparece en el frente
-- (frente_proceso vincula por proceso, no por actividad) mientras se le
-- asigna el contrato real.
insert into core.proceso_contratacion (actividad_id, estado_id, tipo)
select a.id, e.id, 'PRINCIPAL'
from core.actividad a
join core.dependencia d on d.id = a.dependencia_id and d.slug = 'emvarias'
join core.estado_proceso e on e.codigo = 'PRECONTRACTUAL'
where not exists (
  select 1 from core.proceso_contratacion p where p.actividad_id = a.id
);

insert into core.frente_proceso (frente_id, proceso_id, criterio, nota)
select f.id, p.id, 'MANUAL', 'Actividad nueva de EMVARIAS sin contrato todavía'
from core.proceso_contratacion p
join core.actividad a on a.id = p.actividad_id
join core.dependencia d on d.id = a.dependencia_id and d.slug = 'emvarias'
join core.frente f on f.slug = 'emvarias'
on conflict do nothing;
