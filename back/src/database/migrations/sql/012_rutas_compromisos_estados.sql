-- =============================================================================
-- 012_rutas_compromisos_estados.sql
-- Cambios de esquema pedidos con "Personal y contratación Tacita de Plata
-- (8).xlsx":
--   1. Estados de alerta: faltaban "Alerta próximo a terminar" y "Alerta
--      terminado" (hoja Lista), y ALERTA_PRECONTRACTUAL tenía es_alerta=false
--      → el KPI "Alertas" contaba siempre 0. Los tres ALERTA_* pasan a alerta.
--   2. Rutas del proceso (columnas Traslado recurso / Incorporación / Ruta
--      directo / Ruta selección): catálogo ruta + ruta_paso (pasos en el orden
--      de los desplegables de la hoja Lista; responsable/término/observación
--      de la hoja Ruta cuando el nombre del paso coincide) y proceso_ruta con
--      el paso actual de cada proceso. "No aplica" = sin fila.
--   3. Valor del contrato y ejecución financiera en proceso_contratacion.
--   4. Compromisos (hoja Compromisos): tabla propia, no ligada a frente/proceso.
--   5. Vistas: v_proceso_detalle expone valor, ejecución y rutas;
--      v_resumen_frente.proximos_vencer pasa a contarse por ESTADO
--      ("Próximo a terminar directo/selección"), no por ≤30 días.
-- =============================================================================

-- --- 1. Estados ---------------------------------------------------------------
-- orden es unique: se corre TERMINADO al final antes de insertar los nuevos.
update core.estado_proceso set orden = 8 where codigo = 'TERMINADO';

insert into core.estado_proceso (codigo, nombre, fase, orden, es_alerta, color) values
  ('ALERTA_PROXIMO_TERMINAR', 'Alerta próximo a terminar', 'CONTRACTUAL',    7, true, '#DC3545'),
  ('ALERTA_TERMINADO',        'Alerta terminado',          'POSCONTRACTUAL', 9, true, '#DC3545')
on conflict (codigo) do nothing;

update core.estado_proceso set es_alerta = true where codigo like 'ALERTA\_%';

-- --- 2. Rutas -----------------------------------------------------------------
create table core.ruta (
  id      smallint generated always as identity primary key,
  codigo  varchar(20) not null unique check (codigo ~ '^[A-Z_]+$'),
  nombre  text        not null,
  orden   smallint    not null unique
);

create table core.ruta_paso (
  id           integer  generated always as identity primary key,
  ruta_id      smallint not null references core.ruta (id) on delete restrict,
  orden        smallint not null check (orden > 0),
  nombre       text     not null check (btrim(nombre) <> ''),
  responsable  text,
  termino      text,
  observacion  text,
  unique (ruta_id, orden),
  -- destino de la FK compuesta de proceso_ruta (paso de ESA ruta).
  unique (id, ruta_id)
);

create table core.proceso_ruta (
  proceso_id  bigint   not null references core.proceso_contratacion (id) on delete cascade,
  ruta_id     smallint not null references core.ruta (id) on delete restrict,
  paso_id     integer  not null,
  updated_at  timestamptz not null default now(),
  primary key (proceso_id, ruta_id),
  foreign key (paso_id, ruta_id) references core.ruta_paso (id, ruta_id) on delete restrict
);

insert into core.ruta (codigo, nombre, orden) values
  ('TRASLADO',      'Traslado de recursos',     1),
  ('INCORPORACION', 'Incorporación de recursos', 2),
  ('DIRECTO',       'Contratación directa',     3),
  ('SELECCION',     'Proceso de selección',     4);

insert into core.ruta_paso (ruta_id, orden, nombre, responsable, termino, observacion)
select r.id, v.orden, v.nombre, v.responsable, v.termino, v.observacion
from (values
  ('TRASLADO',  1, 'Solicitud de recursos',              'Dependencia',            null::text,       null::text),
  ('TRASLADO',  2, 'Respuesta de dependencia cedente',   null,                     null,             null),
  ('TRASLADO',  3, 'Concepto',                           'DAP',                    null,             null),
  ('TRASLADO',  4, 'Redacción del proyecto de Acuerdo',  'Hacienda',               null,             null),
  ('TRASLADO',  5, 'Revisión',                           'General',                null,             'Angela, líder y Subse'),
  ('TRASLADO',  6, 'Enviar al Concejo',                  null,                     null,             null),
  ('TRASLADO',  7, 'Socialización',                      'Concejo y Gobierno',     null,             null),
  ('TRASLADO',  8, 'Comisión de estudio',                'Concejo y Gobierno',     null,             null),
  ('TRASLADO',  9, 'Primer debate',                      'Concejo y Gobierno',     '3 días hábiles', 'De la Comisión al debate los 3 días'),
  ('TRASLADO', 10, 'Segundo debate',                     'Concejo y Gobierno',     '3 días hábiles', 'No menor a 3 días entre primero y segundo'),
  ('TRASLADO', 11, 'Sanción',                            'Concejo',                null,             null),
  ('TRASLADO', 12, 'Decreto liquidación de traslado',    'Hacienda',               null,             'Presupuesto'),
  ('TRASLADO', 13, 'Revisión y consecutivo',             null,                     null,             null),
  ('TRASLADO', 14, 'Firmas',                             'Hacienda y General',     null,             'Hacienda, General y Alcalde'),
  ('TRASLADO', 15, 'Aplicación',                         'General',                null,             'Juanjose a la General y ellos a Hacienda'),
  ('TRASLADO', 16, 'Recurso disponible',                 null,                     null,             null),

  ('INCORPORACION', 1, 'Solicitud de incorporación',     'Entidad',                null,             'Radica al Distrito. Recomienda en taquilla para tiempos y tomarle copia a la radicación'),
  ('INCORPORACION', 2, 'Proyección del Decreto',         null,                     null,             null),
  ('INCORPORACION', 3, 'Revisión General',               null,                     null,             null),
  ('INCORPORACION', 4, 'Firmas',                         null,                     null,             null),
  ('INCORPORACION', 5, 'Aplicación',                     'General',                null,             'Juanjose a la General y ellos a Hacienda'),
  ('INCORPORACION', 6, 'Recurso disponible',             null,                     null,             null),

  ('DIRECTO',  1, 'CIP',                                 'Dependencia',            null,             null),
  ('DIRECTO',  2, 'Comité Direccionamiento',             'Suministros',            '15 días',        null),
  ('DIRECTO',  3, 'Estructuración técnica',              'Dependencia',            null,             null),
  ('DIRECTO',  4, 'CSC',                                 'Gloria Bonilla',         null,             null),
  ('DIRECTO',  5, 'Reparto',                             'Olga',                   null,             null),
  ('DIRECTO',  6, 'Revisión Suministros',                null,                     null,             null),
  ('DIRECTO',  7, 'Aprobación equipo abastecimiento',    'Suministros',            null,             null),
  ('DIRECTO',  8, 'Solpedido',                           'Dependencia',            null,             null),
  ('DIRECTO',  9, 'Contrato Marco',                      'Dependencia y Hacienda', null,             null),
  ('DIRECTO', 10, 'RP',                                  'Dependencia y Hacienda', null,             null),
  ('DIRECTO', 11, 'Publicación SECOP',                   'Dependencia',            null,             null),
  ('DIRECTO', 12, 'Legalización del contrato',           null,                     null,             null),
  ('DIRECTO', 13, 'Pólizas',                             'Contratista',            null,             null),
  ('DIRECTO', 14, 'CODFIS',                              'Hacienda',               null,             'Depende'),
  ('DIRECTO', 15, 'Inicio',                              null,                     null,             null),

  ('SELECCION',  1, 'CIP',                                          'Dependencia',             null,                                         null),
  ('SELECCION',  2, 'Comité Direccionamiento',                      'Suministros',             '15 días',                                    null),
  ('SELECCION',  3, 'Estructura técnica',                           'Dependencia',             null,                                         null),
  ('SELECCION',  4, 'Revisión logístico y jurídico',                'Suministros',             null,                                         null),
  ('SELECCION',  5, 'Publicación del proyecto de pliego',           'Suministros',             null,                                         null),
  ('SELECCION',  6, 'Observaciones al proyecto de pliego',          'Dependencia-Suministros', '5 o 10 días hábiles dependiendo del proceso', null),
  ('SELECCION',  7, 'Publicación del pliego definitivo y apertura', 'Suministros',             '1 día',                                      null),
  ('SELECCION',  8, 'Observaciones al pliego definitivo',           'Dependencia-Suministros', null,                                         null),
  ('SELECCION',  9, 'Presentación de ofertas',                      'Proponentes',             null,                                         null),
  ('SELECCION', 10, 'Verificación habilitante',                     'Dependencia-Suministros', null,                                         null),
  ('SELECCION', 11, 'Publicación del informe de evaluación',        'Suministros',             '3 a 5 días hábiles',                         null),
  ('SELECCION', 12, 'Adjudicación o declaratoria desierta',         'Suministros',             '1 día mínimo',                               null),
  ('SELECCION', 13, 'Solpedido',                                    null,                      null,                                         null),
  ('SELECCION', 14, 'Contrato Marco',                               null,                      null,                                         null),
  ('SELECCION', 15, 'RP',                                           null,                      null,                                         null),
  ('SELECCION', 16, 'Legalización del contrato',                    'Suministros',             '5 días hábiles',                             null),
  ('SELECCION', 17, 'Pólizas',                                      null,                      null,                                         null),
  ('SELECCION', 18, 'Inicio',                                       null,                      null,                                         null)
) v(ruta, orden, nombre, responsable, termino, observacion)
join core.ruta r on r.codigo = v.ruta;

-- --- 3. Plata del contrato ----------------------------------------------------
alter table core.proceso_contratacion
  add column valor_contrato       numeric(18, 2) check (valor_contrato >= 0),
  add column ejecucion_financiera numeric(18, 2) check (ejecucion_financiera >= 0);

-- --- 4. Compromisos -----------------------------------------------------------
create table core.compromiso (
  id                  integer generated always as identity primary key,
  descripcion         text        not null check (btrim(descripcion) <> ''),
  estado              varchar(12) not null default 'PENDIENTE'
                        check (estado in ('PENDIENTE', 'EN_GESTION', 'CUMPLIDO')),
  responsable         text,
  fecha_registro      date,
  fecha_cumplimiento  date,
  avance              text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger compromiso_updated_at before update on core.compromiso
  for each row execute function core.set_updated_at();
create trigger proceso_ruta_updated_at before update on core.proceso_ruta
  for each row execute function core.set_updated_at();
create trigger proceso_ruta_auditoria after insert or update or delete on core.proceso_ruta
  for each row execute function core.registrar_auditoria();
create trigger compromiso_auditoria after insert or update or delete on core.compromiso
  for each row execute function core.registrar_auditoria();

-- Mismo criterio que 001: RLS sin políticas, solo el backend accede.
do $$
declare
  t text;
begin
  foreach t in array array['ruta', 'ruta_paso', 'proceso_ruta', 'compromiso'] loop
    execute format('alter table core.%I enable row level security', t);
    execute format('revoke all on core.%I from public, anon, authenticated', t);
  end loop;
end;
$$;

-- --- 5. Vistas ----------------------------------------------------------------
-- Columnas nuevas al final (CREATE OR REPLACE VIEW solo permite agregar al final).
-- rutas: una entrada por ruta que aplica, con el paso actual y el total de
-- pasos (para la barra de avance). [] si el proceso no tiene rutas cargadas.
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
  ca.nombre       as categoria_actividad,
  p.valor_contrato,
  p.ejecucion_financiera,
  coalesce(rt.rutas, '[]'::jsonb) as rutas
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
) ult on true
left join lateral (
  select jsonb_agg(jsonb_build_object(
           'codigo',      r.codigo,
           'ruta',        r.nombre,
           'paso',        rp.nombre,
           'orden',       rp.orden,
           'total',       (select count(*) from core.ruta_paso x where x.ruta_id = r.id),
           'responsable', rp.responsable,
           'termino',     rp.termino
         ) order by r.orden) as rutas
  from core.proceso_ruta prt
  join core.ruta      r  on r.id  = prt.ruta_id
  join core.ruta_paso rp on rp.id = prt.paso_id
  where prt.proceso_id = p.id
) rt on true;

revoke all on core.v_proceso_detalle from public, anon, authenticated;

create or replace view core.v_resumen_frente
with (security_invoker = true) as
select
  f.id,
  f.nombre,
  f.slug,
  f.descripcion,
  f.color,
  f.icono,
  f.orden,
  coalesce(pp.total_procesos, 0)       as total_procesos,
  coalesce(pp.precontractual, 0)       as precontractual,
  coalesce(pp.en_ejecucion, 0)         as en_ejecucion,
  coalesce(pp.terminados, 0)           as terminados,
  coalesce(pp.alertas, 0)              as alertas,
  coalesce(pp.proximos_vencer, 0)      as proximos_vencer,
  coalesce(pe.personal_actual, 0)      as personal_actual,
  coalesce(pe.personal_pendiente, 0)   as personal_pendiente,
  coalesce(pp.total_actividades, 0)    as total_actividades
from core.frente f
left join lateral (
  select
    count(*)                                                     as total_procesos,
    count(distinct v.actividad_id)                                as total_actividades,
    count(*) filter (where v.fase = 'PRECONTRACTUAL')            as precontractual,
    count(*) filter (where v.fase = 'CONTRACTUAL')               as en_ejecucion,
    count(*) filter (where v.fase = 'POSCONTRACTUAL')            as terminados,
    count(*) filter (where v.es_alerta)                          as alertas,
    -- Por estado, no por días: "próximo a terminar" lo marca quien hace el
    -- seguimiento (puede ser a más de 30 días). Los ALERTA_* van a "alertas".
    count(*) filter (where v.estado_codigo in
                     ('PROXIMO_TERMINAR_DIRECTO', 'PROXIMO_TERMINAR_SELECCION')) as proximos_vencer
  from core.frente_proceso fp
  join core.v_proceso_detalle v on v.id = fp.proceso_id
  where fp.frente_id = f.id
) pp on true
left join lateral (
  select
    sum(pv.actual)                        as personal_actual,
    sum(greatest(pv.pendiente, 0))        as personal_pendiente
  from core.frente_tipo_personal ftp
  join core.v_personal_vigente pv on pv.tipo_personal_id = ftp.tipo_personal_id
  where ftp.frente_id = f.id
) pe on true
where f.activo;

revoke all on core.v_resumen_frente from public, anon, authenticated;
