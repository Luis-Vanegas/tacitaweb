-- =============================================================================
-- 013_actualizacion_excel_8.sql
-- Sincroniza con "Personal y contratación Tacita de Plata (8).xlsx" (corte
-- 29/09/2026), hojas Contratos, Personal 2026 y Compromisos. Requiere 012.
--
-- Cruce Excel → BD: por número de contrato; si no hay, por número de
-- necesidad (+ nombre de actividad solo cuando la necesidad está repetida,
-- caso 56173). El bloque "valores" y "rutas" se generó del Excel con un
-- script (mismas columnas, sin editar a mano). No se tocan observaciones de
-- procesos existentes: las de la BD ya están redactadas desde la 009.
-- =============================================================================

-- --- Procesos que ya existían sin número de contrato y ahora lo tienen -------
update core.proceso_contratacion set numero_contrato = '4600108892'
where numero_necesidad = '56525' and numero_contrato is null;

-- Los tres eran "Alerta precontractual" sin número: se identifican por
-- actividad + contratista (únicos en ese estado).
update core.proceso_contratacion p
set numero_contrato = v.contrato
from (values
  ('Contingencias',                  'EDU',         '4600108920'),
  ('Corredores verdes y jardineros', 'Parque Arví', '4600108884'),
  ('Lavado',                         'EMVARIAS',    '4600108918')
) v(act, contratista, contrato)
join core.actividad a on core.clave_texto(a.nombre) = core.clave_texto(v.act)
join core.contratista c on core.clave_texto(c.nombre) = core.clave_texto(v.contratista)
where p.actividad_id = a.id and p.contratista_id = c.id
  and p.numero_contrato is null
  and p.estado_id = (select id from core.estado_proceso where codigo = 'ALERTA_PRECONTRACTUAL');

-- "Parques Tejiendo Hogares" 4600105638: el Excel corrige el contratista
-- (estaba DINAMIC, igual que el otro contrato de la misma actividad).
insert into core.contratista (nombre) values ('Consorcio Espublico Medellín')
on conflict do nothing;
update core.proceso_contratacion
set contratista_id = (select id from core.contratista
                      where core.clave_texto(nombre) = core.clave_texto('Consorcio Espublico Medellín'))
where numero_contrato = '4600105638';

-- --- Procesos nuevos ------------------------------------------------------------
insert into core.actividad (dependencia_id, proyecto_id, nombre, categoria_id)
select d.id, pr.id,
  'PP - Contrato interadministrativo de mandato sin representación para realizar acciones de paisajismo y complementarias de la Secretaría de Medio Ambiente.',
  ca.id
from core.dependencia d
join core.proyecto pr on core.clave_texto(pr.nombre) = core.clave_texto('Medellín Tacita de Plata')
join core.categoria_actividad ca on ca.nombre = 'Ambiental'
where d.slug = 'medio-ambiente'
on conflict do nothing;

insert into core.proceso_contratacion (actividad_id, estado_id, tipo, numero_necesidad, observacion)
select a.id, e.id, 'PRINCIPAL', '57140', 'Necesidad 57140. 22/09/2026: se encuentra en etapa de estudio.'
from core.actividad a
join core.estado_proceso e on e.codigo = 'PRECONTRACTUAL'
where a.nombre like 'PP - Contrato interadministrativo de mandato sin representación para realizar acciones de paisajismo%'
  and not exists (select 1 from core.proceso_contratacion where numero_necesidad = '57140');

-- Educadores: nuevo proceso precontractual (el actual 4600106984 termina el 04/10/2026).
insert into core.proceso_contratacion (actividad_id, estado_id, contratista_id, tipo, observacion)
select a.id, e.id, c.id, 'PRINCIPAL', 'Aprobado en Comité de contratación'
from core.actividad a
join core.dependencia d on d.id = a.dependencia_id and d.slug = 'inclusion-social'
join core.estado_proceso e on e.codigo = 'PRECONTRACTUAL'
join core.contratista c on core.clave_texto(c.nombre) = core.clave_texto('Comité de Estudios Médicos')
where a.nombre = 'Educadores'
  and not exists (
    select 1 from core.proceso_contratacion p
    where p.actividad_id = a.id and p.estado_id = e.id and p.numero_contrato is null);

insert into core.frente_proceso (frente_id, proceso_id, criterio)
select f.id, p.id, 'DEPENDENCIA'
from core.proceso_contratacion p
join core.actividad a on a.id = p.actividad_id
join core.dependencia d on d.id = a.dependencia_id
join core.frente f on f.slug = case d.slug when 'medio-ambiente' then 'medio-ambiente' else 'habitante-de-calle' end
where (p.numero_necesidad = '57140')
   or (a.nombre = 'Educadores' and d.slug = 'inclusion-social' and p.numero_contrato is null)
on conflict do nothing;

-- --- Estado, fechas y plata de cada proceso del Excel --------------------------
-- coalesce: una celda vacía en el Excel no borra lo que la BD ya tiene.
create temporary table excel8 (
  contrato text, necesidad text, actividad text, estado text,
  fi date, ft date, valor numeric, ejecucion numeric
) on commit drop;

insert into excel8 values
  ('4600107540', null, 'Gestores operativos y personal espacio público', 'EJECUCION', '2026-09-29', '2026-12-31', 16976945811, null),
  ('4600105064', null, 'Recolección cambuches', 'TERMINADO', '2025-06-06', '2026-07-09', 1455151592, 1455151592),
  ('4600108892', '56525', 'Recolección cambuches', 'EJECUCION', '2026-09-25', '2026-12-31', 998957520, 0),
  ('4600108237', null, 'Promotores (puntos críticos)', 'EJECUCION', '2026-08-12', '2026-12-31', 5763065650, null),
  ('4600108536', null, 'Operación logística (camapaña Tu separas yo reciclo)', 'EJECUCION', '2026-09-04', '2026-12-31', 724905496, null),
  ('4600106142', null, 'Suministro de alumbrado público', 'EJECUCION', '2026-02-01', '2027-12-31', 68381093723, null),
  ('4600106143', null, 'Mantenimiento e instalación de alumbrado público', 'EJECUCION', '2026-02-01', '2027-12-31', 112217624561, null),
  ('4600107168', null, 'Interventoría de alumbrado público', 'EJECUCION', '2026-02-01', '2027-12-31', 9841669018, null),
  ('4600108257', null, 'Recolección residuos', 'EJECUCION', '2026-07-17', '2026-12-31', 19000000000, null),
  ('4600108068', null, 'PP estrategias de sostenibilidad ambiental', 'EJECUCION', '2026-07-02', '2026-11-30', 12314000000, null),
  ('4600108859', null, 'Economía círcular: orgánicos', 'EJECUCION', '2026-09-21', '2026-12-31', 2965448000, null),
  (null, '57140', 'PP - Contrato interadministrativo de mandato sin representación para realizar acciones de paisajismo y complementarias de la Secretaría de Medio Ambiente.', 'PRECONTRACTUAL', null, null, null, null),
  ('4600106984', null, 'Educadores', 'PROXIMO_TERMINAR_DIRECTO', '2026-01-14', '2026-10-04', 54433836569, null),
  (null, null, 'Educadores', 'PRECONTRACTUAL', null, null, null, null),
  ('4600106699', null, 'Resocialización', 'PROXIMO_TERMINAR_DIRECTO', '2026-01-13', '2026-10-29', 13291190180, null),
  ('4600106837', null, 'Albergue', 'PROXIMO_TERMINAR_DIRECTO', '2026-01-16', '2026-10-15', 3053172255, null),
  ('4600107659', null, 'Corredores verdes y jardineros', 'TERMINADO', '2026-02-04', '2026-08-02', 21000000000, null),
  ('4600108890', '57352', 'Corredores verdes y jardineros', 'EJECUCION', '2026-09-23', '2026-12-31', 9173786391, null),
  ('4600106234', null, 'Contingencias', 'TERMINADO', '2025-12-11', '2026-09-29', 23455000000, null),
  ('4600108920', null, 'Contingencias', 'EJECUCION', '2026-09-29', '2026-12-31', 22000000000, null),
  ('4600104824', null, 'Corredores verdes y jardineros', 'TERMINADO', '2026-05-08', '2026-08-20', 14990277365, null),
  ('4600108884', null, 'Corredores verdes y jardineros', 'EJECUCION', '2026-09-30', '2026-12-31', 10000000000, null),
  (null, null, 'Poda', 'ALERTA_PRECONTRACTUAL', null, null, null, null),
  ('4600108918', null, 'Lavado', 'FIRMADO', null, null, 7559184722, null),
  ('4600107674', null, 'Cicloinfraestructura', 'TERMINADO', '2026-03-25', '2026-09-07', 3270805257, null),
  ('4600107688', null, 'Interventoría a las obras de mantenimiento de la red de cicloinfraestructura de la ciudad', 'EJECUCION', '2026-03-25', '2026-09-29', 602211067, null),
  ('4600107991', null, 'Suministro e instalación de cicloparqueaderos y obras complementarias', 'EJECUCION', '2026-09-09', '2026-11-07', 639853534, null),
  ('4600108269', null, 'Interventoría al suministro e instalación de cicloparqueaderos y obras complementarias', 'EJECUCION', '2026-09-10', '2026-11-22', 185766338, null),
  ('4600105505', null, 'Parque Berrío', 'EJECUCION', '2025-08-29', '2026-12-31', 6500000000, null),
  ('4600105503', null, 'Palacé, Plaza Botero y Plazuela Nutibara', 'EJECUCION', '2025-08-29', '2026-12-31', 6929910954, null),
  ('4600107729', null, 'Mantenimiento de andenes', 'EJECUCION', '2026-05-25', '2026-11-25', 11277173082, null),
  (null, '56185', 'Mantenimiento de andenes', 'PRECONTRACTUAL', null, null, null, null),
  (null, '56186', 'Interventoría para el mantenimiento de andenes y obras complementarias', 'PRECONTRACTUAL', null, null, null, null),
  (null, '56177', 'Construcción y mejoramiento de andenes y obras complementarias', 'PRECONTRACTUAL', null, null, null, null),
  (null, '56178', 'Interventoría para la construcción y mejoramiento de andenes y obras complementarias', 'PRECONTRACTUAL', null, null, null, null),
  ('4600107691', null, 'Mantenimiento de puentes', 'EJECUCION', '2026-04-13', '2026-12-13', 6552224075, null),
  ('4600107715', null, 'Elementos seguridad vial', 'EJECUCION', '2026-07-06', '2026-11-03', 5305338933, null),
  (null, '56238', 'Defensas viales, barandas, pasamanos y otros elementos para la seguridad vial.', 'PRECONTRACTUAL', null, null, null, null),
  (null, '56173', 'Interventoría defensas viales', 'PRECONTRACTUAL', null, null, null, null),
  ('4600107775', null, 'Vías corregimientos', 'EJECUCION', '2026-07-21', '2026-10-21', 17501504051, null),
  (null, '56172', 'Vías corregimientos', 'PRECONTRACTUAL', null, null, null, null),
  (null, '56173', 'Interventoría para la construcción, mejoramiento y mantenimiento de vías y demás obras complementarias en los corregimientos.', 'PRECONTRACTUAL', null, null, null, null),
  ('4600107948', null, 'Construcción, conservación, mantenimiento de la malla vial y obras complementarias', 'EJECUCION', '2026-07-08', '2026-12-31', 51628403876, null),
  ('4600107949', null, 'Interventoría a la construcción, conservación, mantenimiento de la malla vial y obras complementarias.', 'EJECUCION', '2026-07-03', '2026-12-31', 3497236298, null),
  ('4600105638', null, 'Parques Tejiendo Hogares', 'EJECUCION', '2025-10-15', '2026-12-18', 15387452341, null),
  ('4600105557', null, 'Parques Tejiendo Hogares', 'EJECUCION', '2025-10-15', '2026-12-18', 11793333405, null),
  (null, '56182', 'Construcción y mantenimiento espacio público', 'PRECONTRACTUAL', null, null, null, null),
  (null, '56183', 'Interventoría a la construcción y mejoramiento de espacios públicos de encuentro y esparcimiento - Grupo 1', 'PRECONTRACTUAL', null, null, null, null),
  ('4600107838', null, 'Prestar el servicio de disposición final de residuos de construcción, demolición, tierra, pétreos e inertes, que requiera el Distrito', 'EJECUCION', '2026-05-15', '2026-12-31', 119994782, null),
  (null, '56237', 'Contrato interadministrativo de mandato sin representación para la administración, operación y mantenimiento de fuentes de agua e infraestructura asociada.', 'PRECONTRACTUAL', null, null, null, null),
  (null, '57106', 'Obras de construcción y mejoramiento de espacios públicos en el centro de Medellin', 'PRECONTRACTUAL', null, null, null, null),
  (null, '57107', 'Interventoría a las Obras de construcción y mejoramiento de espacios públicos en el centro de Medellin', 'PRECONTRACTUAL', null, null, null, null)
;

-- Proceso destino de cada fila: por contrato, o por necesidad (+ actividad si
-- la necesidad no es única). Los dos procesos sin contrato ni necesidad
-- (Educadores nuevo, Poda) se resuelven por actividad + estado precontractual.
create temporary view excel8_destino as
select p.id as proceso_id, x.*
from excel8 x
join core.proceso_contratacion p on
     (x.contrato is not null and p.numero_contrato = x.contrato)
  or (x.contrato is null and x.necesidad is not null and p.numero_necesidad = x.necesidad
      and ((select count(*) from core.proceso_contratacion z where z.numero_necesidad = x.necesidad) = 1
           or core.clave_texto((select nombre from core.actividad where id = p.actividad_id)) = core.clave_texto(x.actividad)))
  or (x.contrato is null and x.necesidad is null and p.numero_contrato is null and p.numero_necesidad is null
      and p.actividad_id in (select id from core.actividad where core.clave_texto(nombre) = core.clave_texto(x.actividad))
      and (select fase from core.estado_proceso where id = p.estado_id) = 'PRECONTRACTUAL');

update core.proceso_contratacion p
set estado_id            = (select id from core.estado_proceso where codigo = d.estado),
    fecha_inicio         = coalesce(d.fi, p.fecha_inicio),
    fecha_terminacion    = coalesce(d.ft, p.fecha_terminacion),
    valor_contrato       = coalesce(d.valor, p.valor_contrato),
    ejecucion_financiera = coalesce(d.ejecucion, p.ejecucion_financiera)
from excel8_destino d
where p.id = d.proceso_id;

-- --- Paso actual de cada ruta ----------------------------------------------------
create temporary table excel8_rutas (
  contrato text, necesidad text, actividad text, ruta text, paso text
) on commit drop;

insert into excel8_rutas values
  ('4600107540', null, 'Gestores operativos y personal espacio público', 'DIRECTO', 'Inicio'),
  ('4600105064', null, 'Recolección cambuches', 'DIRECTO', 'Inicio'),
  ('4600108892', '56525', 'Recolección cambuches', 'DIRECTO', 'Inicio'),
  ('4600108237', null, 'Promotores (puntos críticos)', 'DIRECTO', 'Inicio'),
  ('4600108536', null, 'Operación logística (camapaña Tu separas yo reciclo)', 'DIRECTO', 'Inicio'),
  ('4600106142', null, 'Suministro de alumbrado público', 'DIRECTO', 'Inicio'),
  ('4600106143', null, 'Mantenimiento e instalación de alumbrado público', 'DIRECTO', 'Inicio'),
  ('4600107168', null, 'Interventoría de alumbrado público', 'SELECCION', 'Inicio'),
  ('4600108257', null, 'Recolección residuos', 'DIRECTO', 'Inicio'),
  ('4600108068', null, 'PP estrategias de sostenibilidad ambiental', 'DIRECTO', 'Inicio'),
  ('4600108859', null, 'Economía círcular: orgánicos', 'DIRECTO', 'Inicio'),
  (null, '57140', 'PP - Contrato interadministrativo de mandato sin representación para realizar acciones de paisajismo y complementarias de la Secretaría de Medio Ambiente.', 'DIRECTO', 'Estructuración técnica'),
  ('4600106984', null, 'Educadores', 'DIRECTO', 'Inicio'),
  (null, null, 'Educadores', 'TRASLADO', 'Recurso disponible'),
  (null, null, 'Educadores', 'DIRECTO', 'Estructuración técnica'),
  ('4600106699', null, 'Resocialización', 'DIRECTO', 'Inicio'),
  ('4600106837', null, 'Albergue', 'DIRECTO', 'Inicio'),
  ('4600107659', null, 'Corredores verdes y jardineros', 'DIRECTO', 'Inicio'),
  ('4600108890', '57352', 'Corredores verdes y jardineros', 'DIRECTO', 'Inicio'),
  ('4600106234', null, 'Contingencias', 'DIRECTO', 'Inicio'),
  ('4600108920', null, 'Contingencias', 'DIRECTO', 'Inicio'),
  ('4600104824', null, 'Corredores verdes y jardineros', 'DIRECTO', 'Inicio'),
  ('4600108884', null, 'Corredores verdes y jardineros', 'DIRECTO', 'Inicio'),
  (null, null, 'Poda', 'DIRECTO', 'Estructuración técnica'),
  ('4600108918', null, 'Lavado', 'DIRECTO', 'Legalización del contrato'),
  ('4600107674', null, 'Cicloinfraestructura', 'SELECCION', 'Inicio'),
  ('4600107688', null, 'Interventoría a las obras de mantenimiento de la red de cicloinfraestructura de la ciudad', 'SELECCION', 'Inicio'),
  ('4600107991', null, 'Suministro e instalación de cicloparqueaderos y obras complementarias', 'SELECCION', 'Inicio'),
  ('4600108269', null, 'Interventoría al suministro e instalación de cicloparqueaderos y obras complementarias', 'SELECCION', 'Inicio'),
  ('4600105505', null, 'Parque Berrío', 'DIRECTO', 'Inicio'),
  ('4600105503', null, 'Palacé, Plaza Botero y Plazuela Nutibara', 'DIRECTO', 'Inicio'),
  ('4600107729', null, 'Mantenimiento de andenes', 'SELECCION', 'Inicio'),
  (null, '56185', 'Mantenimiento de andenes', 'SELECCION', 'Publicación del informe de evaluación'),
  (null, '56186', 'Interventoría para el mantenimiento de andenes y obras complementarias', 'SELECCION', 'Observaciones al proyecto de pliego'),
  (null, '56177', 'Construcción y mejoramiento de andenes y obras complementarias', 'SELECCION', 'Publicación del informe de evaluación'),
  (null, '56178', 'Interventoría para la construcción y mejoramiento de andenes y obras complementarias', 'SELECCION', 'Publicación del informe de evaluación'),
  ('4600107691', null, 'Mantenimiento de puentes', 'SELECCION', 'Inicio'),
  ('4600107715', null, 'Elementos seguridad vial', 'SELECCION', 'Inicio'),
  (null, '56238', 'Defensas viales, barandas, pasamanos y otros elementos para la seguridad vial.', 'SELECCION', 'Publicación del informe de evaluación'),
  (null, '56173', 'Interventoría defensas viales', 'SELECCION', 'Verificación habilitante'),
  ('4600107775', null, 'Vías corregimientos', 'SELECCION', 'Inicio'),
  (null, '56172', 'Vías corregimientos', 'SELECCION', 'Presentación de ofertas'),
  (null, '56173', 'Interventoría para la construcción, mejoramiento y mantenimiento de vías y demás obras complementarias en los corregimientos.', 'SELECCION', 'Verificación habilitante'),
  ('4600107948', null, 'Construcción, conservación, mantenimiento de la malla vial y obras complementarias', 'SELECCION', 'Inicio'),
  ('4600107949', null, 'Interventoría a la construcción, conservación, mantenimiento de la malla vial y obras complementarias.', 'SELECCION', 'Inicio'),
  ('4600105638', null, 'Parques Tejiendo Hogares', 'SELECCION', 'Inicio'),
  ('4600105557', null, 'Parques Tejiendo Hogares', 'SELECCION', 'Inicio'),
  (null, '56182', 'Construcción y mantenimiento espacio público', 'SELECCION', 'Publicación del informe de evaluación'),
  (null, '56183', 'Interventoría a la construcción y mejoramiento de espacios públicos de encuentro y esparcimiento - Grupo 1', 'SELECCION', 'Publicación del informe de evaluación'),
  ('4600107838', null, 'Prestar el servicio de disposición final de residuos de construcción, demolición, tierra, pétreos e inertes, que requiera el Distrito', 'SELECCION', 'Inicio'),
  (null, '56237', 'Contrato interadministrativo de mandato sin representación para la administración, operación y mantenimiento de fuentes de agua e infraestructura asociada.', 'DIRECTO', 'Estructuración técnica'),
  (null, '57106', 'Obras de construcción y mejoramiento de espacios públicos en el centro de Medellin', 'SELECCION', 'Observaciones al proyecto de pliego'),
  (null, '57107', 'Interventoría a las Obras de construcción y mejoramiento de espacios públicos en el centro de Medellin', 'SELECCION', 'Observaciones al proyecto de pliego')
;

insert into core.proceso_ruta (proceso_id, ruta_id, paso_id)
select distinct d.proceso_id, r.id, rp.id
from excel8_rutas x
join excel8_destino d
  on d.contrato is not distinct from x.contrato
 and d.necesidad is not distinct from x.necesidad
 and d.actividad = x.actividad
join core.ruta r on r.codigo = x.ruta
join core.ruta_paso rp on rp.ruta_id = r.id and core.clave_texto(rp.nombre) = core.clave_texto(x.paso)
on conflict (proceso_id, ruta_id) do update set paso_id = excluded.paso_id;

drop view excel8_destino;

-- --- Personal 2026 ---------------------------------------------------------------
update core.personal_corte pc
set actual = v.actual, pendiente = v.pendiente
from (values
  ('Espacio Público', 541, 318),
  ('Gestores Operativos', 228, 272),
  ('Gestión y Control (promotores puntos críticos)', 197, 24),
  ('Cuadrillas (EDU)', 245, 235)
) v(tipo, actual, pendiente)
join core.tipo_personal t on core.clave_texto(t.nombre) = core.clave_texto(v.tipo)
where pc.tipo_personal_id = t.id and pc.vigencia = 2026;

-- El Excel ubica el personal de Espacio Público en la Secretaría de Seguridad,
-- junto a Gestores Operativos: el frente Seguridad muestra los dos tipos, cada
-- uno por separado (no se suman entre sí en la pestaña Personal).
insert into core.frente_tipo_personal (frente_id, tipo_personal_id)
select f.id, t.id
from core.frente f, core.tipo_personal t
where f.slug = 'operativa-seguridad' and t.nombre = 'Espacio Público'
on conflict do nothing;

-- --- Compromisos -----------------------------------------------------------------
insert into core.compromiso (descripcion, estado, responsable, fecha_registro, fecha_cumplimiento)
select v.descripcion, 'PENDIENTE', v.responsable, '2026-09-25', '2026-10-02'
from (values
  ('Revisión financiera de cierre 2026 y proyección 2027', 'Todos'),
  ('Estrategia territorial', 'Mario'),
  ('Proyecto para la adquisición de vehículos y programación de rutas', 'EMVARIAS'),
  ('Campaña comunicaciones', 'Comunicaciones'),
  ('Plan de medios territorio', 'Todos')
) v(descripcion, responsable)
where not exists (select 1 from core.compromiso c where c.descripcion = v.descripcion);
