-- =============================================================================
-- 003_core_views.sql
-- Vistas de lectura para la API. Todo lo derivado se calcula aquí.
-- security_invoker = true: la vista respeta los permisos de quien consulta.
-- =============================================================================

-- Proceso con todos sus datos de catálogo + métricas de plazo + última nota.
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
  -- Días que faltan para terminar (negativo = vencido). Nulo sin fecha.
  (p.fecha_terminacion - current_date)                                  as dias_restantes,
  -- % del plazo transcurrido, acotado a 0..100.
  case
    when p.fecha_inicio is null or p.fecha_terminacion is null then null
    when p.fecha_terminacion = p.fecha_inicio then 100
    else greatest(0, least(100, round(
      100.0 * (current_date - p.fecha_inicio) / (p.fecha_terminacion - p.fecha_inicio))))::int
  end                                                                    as pct_plazo,
  ult.fecha       as ultima_nota_fecha,
  ult.nota        as ultima_nota,
  p.updated_at
from core.proceso_contratacion p
join core.actividad      a  on a.id  = p.actividad_id
join core.dependencia    d  on d.id  = a.dependencia_id
join core.proyecto       pr on pr.id = a.proyecto_id
join core.estado_proceso e  on e.id  = p.estado_id
left join core.contratista c on c.id = p.contratista_id
left join lateral (
  select s.fecha, s.nota
  from core.seguimiento s
  where s.proceso_id = p.id
  order by s.fecha desc, s.id desc
  limit 1
) ult on true;

-- Último corte de personal por tipo, con pendiente calculado cuando es 2025
-- (meta - actual; negativo = por encima de la meta).
create or replace view core.v_personal_vigente
with (security_invoker = true) as
select distinct on (pc.tipo_personal_id)
  pc.id               as corte_id,
  tp.id               as tipo_personal_id,
  tp.nombre           as tipo_personal,
  tp.dependencia_id,
  pc.vigencia,
  pc.actual,
  coalesce(pc.pendiente, pc.meta - pc.actual) as pendiente,
  pc.meta,
  pc.fecha_final,
  pc.observaciones,
  pc.links_secop
from core.personal_corte pc
join core.tipo_personal tp on tp.id = pc.tipo_personal_id
where tp.activo
order by pc.tipo_personal_id, pc.vigencia desc;

-- Resumen de cada frente para las tarjetas del menú y los KPIs del detalle.
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
  coalesce(pe.personal_pendiente, 0)   as personal_pendiente
from core.frente f
left join lateral (
  select
    count(*)                                                     as total_procesos,
    count(*) filter (where v.fase = 'PRECONTRACTUAL')            as precontractual,
    count(*) filter (where v.fase = 'CONTRACTUAL')               as en_ejecucion,
    count(*) filter (where v.fase = 'POSCONTRACTUAL')            as terminados,
    count(*) filter (where v.es_alerta)                          as alertas,
    count(*) filter (where v.fase = 'CONTRACTUAL'
                       and v.dias_restantes between 0 and 30)    as proximos_vencer
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

revoke all on core.v_proceso_detalle, core.v_personal_vigente, core.v_resumen_frente
  from public, anon, authenticated;
