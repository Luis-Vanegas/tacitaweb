-- =============================================================================
-- 005_categoria_actividad.sql
-- Catálogo de categorías temáticas de actividad (Vial, Espacio público,
-- Zonas verdes, etc.), para agrupar/filtrar el listado de actividades de un
-- frente. Clasificación de negocio definida junto con el usuario a partir de
-- las 39 actividades reales de Supabase.
-- =============================================================================

create table core.categoria_actividad (
  id     smallint generated always as identity primary key,
  nombre text     not null unique check (btrim(nombre) <> ''),
  orden  smallint not null unique
);

insert into core.categoria_actividad (nombre, orden) values
  ('Vial / Movilidad', 1),
  ('Espacio público / Andenes', 2),
  ('Zonas verdes / Jardines', 3),
  ('Alumbrado público', 4),
  ('Aseo / Residuos', 5),
  ('Seguridad / Espacio público operativo', 6),
  ('Social / Habitante de calle', 7),
  ('Ambiental', 8);

alter table core.actividad
  add column categoria_id smallint references core.categoria_actividad (id) on delete restrict;

-- Backfill de las 39 actividades existentes (por id real, ya conocido en
-- Supabase) — clasificación revisada y aprobada por el usuario.
update core.actividad set categoria_id = (select id from core.categoria_actividad where nombre = 'Vial / Movilidad')
where id in (35, 32, 28, 27, 25, 23, 22, 21, 18, 10, 9);

-- Incluye el id 30 (Contrato interadministrativo... fuentes de agua), que el
-- usuario pidió mover acá en vez de dejarlo sin clasificar.
update core.actividad set categoria_id = (select id from core.categoria_actividad where nombre = 'Espacio público / Andenes')
where id in (34, 33, 20, 19, 16, 14, 26, 24, 15, 13, 30);

update core.actividad set categoria_id = (select id from core.categoria_actividad where nombre = 'Zonas verdes / Jardines')
where id in (29, 12, 17);

update core.actividad set categoria_id = (select id from core.categoria_actividad where nombre = 'Alumbrado público')
where id in (1, 4, 5);

update core.actividad set categoria_id = (select id from core.categoria_actividad where nombre = 'Aseo / Residuos')
where id in (36, 38, 11, 3);

update core.actividad set categoria_id = (select id from core.categoria_actividad where nombre = 'Seguridad / Espacio público operativo')
where id in (39, 2, 31);

update core.actividad set categoria_id = (select id from core.categoria_actividad where nombre = 'Social / Habitante de calle')
where id in (8, 7, 6);

update core.actividad set categoria_id = (select id from core.categoria_actividad where nombre = 'Ambiental')
where id in (37);

-- Todas las actividades existentes quedaron clasificadas: de acá en adelante
-- toda actividad nueva debe declarar su categoría.
alter table core.actividad alter column categoria_id set not null;

create index actividad_categoria_idx on core.actividad (categoria_id);

-- v_proceso_detalle con la categoría de la actividad, al final de la lista de
-- columnas a propósito (Postgres no permite insertar una columna en medio de
-- una vista con CREATE OR REPLACE VIEW).
create or replace view core.v_proceso_detalle
with (security_invoker = true) as
select
  p.id,
  p.tipo,
  p.numero_contrato,
  p.numero_necesidad,
  p.fecha_inicio,
  p.fecha_terminacion,
  p.link_secop,
  p.observacion,
  p.proceso_supervisado_id,
  a.id            as actividad_id,
  a.nombre        as actividad,
  d.id            as dependencia_id,
  d.nombre        as dependencia,
  pr.id           as proyecto_id,
  pr.nombre       as proyecto,
  e.id            as estado_id,
  e.codigo        as estado_codigo,
  e.nombre        as estado,
  e.fase,
  e.es_alerta,
  e.color         as estado_color,
  c.id            as contratista_id,
  c.nombre        as contratista,
  (p.fecha_terminacion - current_date)                                  as dias_restantes,
  case
    when p.fecha_inicio is null or p.fecha_terminacion is null then null
    when p.fecha_terminacion = p.fecha_inicio then 100
    else greatest(0, least(100, round(
      100.0 * (current_date - p.fecha_inicio) / (p.fecha_terminacion - p.fecha_inicio))))::int
  end                                                                    as pct_plazo,
  ult.fecha       as ultima_nota_fecha,
  ult.nota        as ultima_nota,
  p.updated_at,
  ca.id           as categoria_actividad_id,
  ca.nombre       as categoria_actividad
from core.proceso_contratacion p
join core.actividad      a  on a.id  = p.actividad_id
join core.dependencia    d  on d.id  = a.dependencia_id
join core.proyecto       pr on pr.id = a.proyecto_id
join core.estado_proceso e  on e.id  = p.estado_id
left join core.contratista c on c.id = p.contratista_id
join core.categoria_actividad ca on ca.id = a.categoria_id
left join lateral (
  select s.fecha, s.nota
  from core.seguimiento s
  where s.proceso_id = p.id
  order by s.fecha desc, s.id desc
  limit 1
) ult on true;

revoke all on core.categoria_actividad from public, anon, authenticated;
revoke all on core.v_proceso_detalle from public, anon, authenticated;
