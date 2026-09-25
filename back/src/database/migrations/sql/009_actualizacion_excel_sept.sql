-- =============================================================================
-- 009_actualizacion_excel_sept.sql
-- Sincroniza con "Personal y contratación Tacita de Plata (4).xlsx" (corte
-- 15-24/09/2026): 3 contratos nuevos, avances de estado/observación en
-- procesos existentes, y cifras de personal 2026 actualizadas.
-- =============================================================================

-- --- Contratistas nuevos ---------------------------------------------------
insert into core.contratista (nombre) values ('APP'), ('SOCYA')
on conflict do nothing;

-- --- Actividades nuevas -----------------------------------------------------
insert into core.actividad (dependencia_id, proyecto_id, nombre, categoria_id)
select d.id, pr.id, v.nombre, ca.id
from (values
  ('infraestructura', 'Parque Berrío', 'Espacio público / Andenes'),
  ('infraestructura', 'Palacé, Plaza Botero y Plazuela Nutibara', 'Espacio público / Andenes'),
  ('medio-ambiente', 'Economía círcular: orgánicos', 'Aseo / Residuos')
) v(dep, nombre, categoria)
join core.dependencia d on d.slug = v.dep
join core.proyecto pr on core.clave_texto(pr.nombre) = core.clave_texto('Medellín Tacita de Plata')
join core.categoria_actividad ca on ca.nombre = v.categoria
on conflict do nothing;

-- --- Procesos de contratación nuevos -----------------------------------------
insert into core.proceso_contratacion
  (actividad_id, estado_id, contratista_id, tipo, numero_contrato, fecha_inicio, fecha_terminacion, link_secop)
select a.id, e.id, c.id, 'PRINCIPAL', v.contrato, v.fi::date, v.ft::date, v.link
from (values
  ('Parque Berrío', 'EJECUCION', 'APP', '4600105505', '2025-08-29', '2026-12-31',
    'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.8616447&isFromPublicArea=True&isModal=true&asPopupView=true'),
  ('Palacé, Plaza Botero y Plazuela Nutibara', 'EJECUCION', 'APP', '4600105503', '2025-08-29', '2026-12-31',
    'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.8611755&isFromPublicArea=True&isModal=true&asPopupView=true'),
  ('Economía círcular: orgánicos', 'EJECUCION', 'SOCYA', '4600108859', '2026-09-21', '2026-12-31',
    'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.10884584&isFromPublicArea=True&isModal=true&asPopupView=true')
) v(act, estado, contratista, contrato, fi, ft, link)
join core.actividad a on core.clave_texto(a.nombre) = core.clave_texto(v.act)
join core.estado_proceso e on e.codigo = v.estado
join core.contratista c on core.clave_texto(c.nombre) = core.clave_texto(v.contratista)
where not exists (select 1 from core.proceso_contratacion where numero_contrato = v.contrato);

-- Vínculo al frente (mismo criterio DEPENDENCIA que el resto de estas dos secretarías).
insert into core.frente_proceso (frente_id, proceso_id, criterio)
select f.id, p.id, 'DEPENDENCIA'
from core.proceso_contratacion p
join core.actividad a on a.id = p.actividad_id
join core.dependencia d on d.id = a.dependencia_id
join core.frente f on f.slug = case d.slug when 'infraestructura' then 'sif' else 'medio-ambiente' end
where p.numero_contrato in ('4600105505', '4600105503', '4600108859')
on conflict do nothing;

-- --- Avances en procesos existentes -----------------------------------------

-- "Recolección cambuches" (EMVARIAS): pasó a Firmado.
update core.proceso_contratacion
set estado_id = (select id from core.estado_proceso where codigo = 'FIRMADO'),
    observacion = 'Necesidad 56525. 15/09/2026: la necesidad se encuentra en proceso de aprobación de actividades en SAP para proceder con la expedición del SOLPEDIDO.',
    link_secop = 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.10938380'
where numero_necesidad = '56525';

-- "Corredores verdes y jardineros" (contrato firmado con Jardín Botánico): ya tiene fecha de inicio.
update core.proceso_contratacion
set fecha_inicio = '2026-09-23'
where numero_contrato = '4600108890';

-- "Vías corregimientos": se abrió el proceso, baja de Alerta a Precontractual normal.
update core.proceso_contratacion
set estado_id = (select id from core.estado_proceso where codigo = 'PRECONTRACTUAL'),
    observacion = 'El proceso fue aperturado bajo resolución N° SSS202650075591 del 14/09/2026. Fecha probable de inicio 04/11/2026.'
where numero_necesidad = '56172';

-- "Contingencias" (EDU, alerta precontractual): en firma.
update core.proceso_contratacion p
set observacion = 'En firma'
from core.actividad a
where p.actividad_id = a.id and a.nombre = 'Contingencias'
  and p.estado_id = (select id from core.estado_proceso where codigo = 'ALERTA_PRECONTRACTUAL')
  and p.contratista_id = (select id from core.contratista where core.clave_texto(nombre) = core.clave_texto('EDU'));

-- "Corredores verdes y jardineros" (Parque Arví, alerta precontractual): en firma.
update core.proceso_contratacion p
set observacion = 'En firma'
from core.actividad a
where p.actividad_id = a.id and a.nombre = 'Corredores verdes y jardineros'
  and p.estado_id = (select id from core.estado_proceso where codigo = 'ALERTA_PRECONTRACTUAL')
  and p.contratista_id = (select id from core.contratista where core.clave_texto(nombre) = core.clave_texto('Parque Arví'));

-- Notas de seguimiento del 15/09/2026 en procesos precontractuales sin contratista todavía.
update core.proceso_contratacion
set observacion = 'Mantenimiento de andenes y obras complementarias. 15/09/2026: el proceso se encuentra en evaluación de ofertas.'
where numero_necesidad = '56185';

update core.proceso_contratacion
set observacion = '15/09/2026: el proceso se encuentra en evaluación de ofertas.'
where numero_necesidad = '56177';

update core.proceso_contratacion
set observacion = '15/09/2026: el día de hoy se realizará la respectiva publicación del informe de verificación o evaluación.'
where numero_necesidad = '56238';

update core.proceso_contratacion
set observacion = '15/09/2026: el proceso se encuentra en evaluación de ofertas.'
where numero_necesidad = '56182';

-- --- Personal 2026: cifras actualizadas --------------------------------------
update core.personal_corte pc
set actual = v.actual, pendiente = v.pendiente
from (values
  ('Guardaquebradas', 50, 14),
  ('Jardineros', 600, 0),
  ('Espacio Público', 471, 388),
  ('EMVARIAS', 147, 0),
  ('Gestión y Control (promotores puntos críticos)', 198, 23),
  ('Cuadrillas (EDU)', 0, 480)
) v(tipo, actual, pendiente)
join core.tipo_personal t on core.clave_texto(t.nombre) = core.clave_texto(v.tipo)
where pc.tipo_personal_id = t.id and pc.vigencia = 2026;

-- La nota de la prórroga ya quedó vieja frente al contrato nuevo con cifras más altas.
update core.personal_corte pc
set observaciones = 'Fundación Pascual Bravo'
from core.tipo_personal t
where pc.tipo_personal_id = t.id
  and core.clave_texto(t.nombre) = core.clave_texto('Espacio Público')
  and pc.vigencia = 2026;
