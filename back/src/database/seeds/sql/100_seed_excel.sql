-- GENERADO por tools/etl-excel/importar_excel.py. No editar a mano.

do $$ begin
  if exists (select 1 from core.proceso_contratacion) then
    raise exception 'El seed del Excel ya fue aplicado (core.proceso_contratacion no está vacía)';
  end if;
end $$;

-- Dependencias
insert into core.dependencia (nombre, sigla, slug) values
  ('Secretaría de Gestión y Control', 'SGCT', 'gestion-y-control'),
  ('Secretaría de Inclusión Social', 'SIS', 'inclusion-social'),
  ('Secretaría de Infraestructura', 'SIF', 'infraestructura'),
  ('Secretaría de Medio Ambiente', 'SMA', 'medio-ambiente'),
  ('Secretaría de Seguridad', 'SSC', 'seguridad')
on conflict do nothing;

-- Proyectos (hoja Lista)
insert into core.proyecto (nombre) values
  ('Alianza Cero Hambre'),
  ('Buen Comienzo 365'),
  ('Círculos de Cuidado'),
  ('Cultura del Fútbol'),
  ('En el Colegio Contamos con Vos'),
  ('Habilidades Digitales'),
  ('Inglés como Segunda Lengua'),
  ('Mayor Cuidado'),
  ('Medellín Capital Creativa'),
  ('Medellín Es Como Vos'),
  ('Medellín Tacita de Plata'),
  ('Parceros y Parceras'),
  ('Salud Mental y Proyectos de Vida'),
  ('Tejiendo Hogares'),
  ('Turismo Responsable')
on conflict do nothing;

-- Contratistas
insert into core.contratista (nombre) values
  ('Cicloinfraestructura 20005479'),
  ('Comité de Estudios Médicos'),
  ('Consorcio GIS Medellín Víal'),
  ('Consorcio Infradetel'),
  ('Consorcio Inter Iluminación Velnec'),
  ('Consorcio Linar 2025'),
  ('Consorcio Medellín A&R'),
  ('Consorcio NGI Peatonal'),
  ('Consorcio Vial 7J'),
  ('Corporación Obra Social Nuevos Ideales'),
  ('Corporación Semillas del Bienestar'),
  ('DINAMIC'),
  ('EDU'),
  ('EMVARIAS'),
  ('EPM'),
  ('Fundación Pascual Bravo'),
  ('Fundación de Sindicatos'),
  ('ITM'),
  ('Jardín Botánico'),
  ('Metroparques'),
  ('Mincivil S.A'),
  ('Nogaall S.A.S'),
  ('Parque Arví'),
  ('Pintuvial'),
  ('Todico S.A.S'),
  ('UdeA')
on conflict do nothing;

-- Actividades
insert into core.actividad (dependencia_id, proyecto_id, nombre)
select d.id, pr.id, v.nombre from (values
  ('gestion-y-control', 'Interventoría de alumbrado público'),
  ('gestion-y-control', 'Mantenimiento e instalación de alumbrado público'),
  ('gestion-y-control', 'Operación logística (camapaña Tu sepaara yo reciclo)'),
  ('gestion-y-control', 'Promotores (puntos críticos)'),
  ('gestion-y-control', 'Suministro de alumbrado público'),
  ('inclusion-social', 'Albergue'),
  ('inclusion-social', 'Educadores'),
  ('inclusion-social', 'Resocialización'),
  ('infraestructura', 'Cicloinfraestructura'),
  ('infraestructura', 'Construcción y mantenimiento espacio público'),
  ('infraestructura', 'Construcción y mejoramiento de andenes y obras complementarias'),
  ('infraestructura', 'Construcción, conservación, mantenimiento de la malla vial y obras complementarias'),
  ('infraestructura', 'Contingencias'),
  ('infraestructura', 'Contrato interadministrativo de mandato sin representación para la administración, operación y mantenimiento de fuentes de agua e infraestructura asociada.'),
  ('infraestructura', 'Corredores verdes y jardineros'),
  ('infraestructura', 'Defensas viales, barandas, pasamanos y otros elementos para la seguridad vial.'),
  ('infraestructura', 'Elementos seguridad vial'),
  ('infraestructura', 'Interventoría a la construcción y mejoramiento de espacios públicos de encuentro y esparcimiento - Grupo 1'),
  ('infraestructura', 'Interventoría a la construcción, conservación, mantenimiento de la malla vial y obras complementarias.'),
  ('infraestructura', 'Interventoría a las Obras de construcción y mejoramiento de espacios públicos en el centro de Medellin'),
  ('infraestructura', 'Interventoría a las obras de mantenimiento de la red de cicloinfraestructura de la ciudad'),
  ('infraestructura', 'Interventoría al suministro e instalación de cicloparqueaderos y obras complementarias'),
  ('infraestructura', 'Interventoría defensas viales'),
  ('infraestructura', 'Interventoría para el mantenimiento de andenes y obras complementarias'),
  ('infraestructura', 'Interventoría para la construcción y mejoramiento de andenes y obras complementarias'),
  ('infraestructura', 'Interventoría para la construcción, mejoramiento y mantenimiento de vías y demás obras complementarias en los corregimientos.'),
  ('infraestructura', 'Lavado'),
  ('infraestructura', 'Mantenimiento de andenes'),
  ('infraestructura', 'Mantenimiento de puentes'),
  ('infraestructura', 'Obras de construcción y mejoramiento de espacios públicos en el centro de Medellin'),
  ('infraestructura', 'Parques Tejiendo Hogares'),
  ('infraestructura', 'Poda'),
  ('infraestructura', 'Prestar el servicio de disposición final de residuos de construcción, demolición, tierra, pétreos e inertes, que requiera el distrito'),
  ('infraestructura', 'Suministro e instalación de cicloparqueaderos y obras complementarias'),
  ('infraestructura', 'Vías corregimientos'),
  ('medio-ambiente', 'PP estrategias de sostenibilidad ambiental'),
  ('medio-ambiente', 'Recolección residuos'),
  ('seguridad', 'Gestores operativos y personal espacio público'),
  ('seguridad', 'Recolección cambuches')
) v(dep, nombre)
join core.dependencia d on d.slug = v.dep
join core.proyecto pr on core.clave_texto(pr.nombre) = core.clave_texto('Medellín Tacita de Plata')
on conflict do nothing;

-- Procesos de contratación (id = orden de fila del Excel)
insert into core.proceso_contratacion (id, actividad_id, estado_id, contratista_id, tipo, numero_contrato,
  numero_necesidad, fecha_inicio, fecha_terminacion, link_secop, observacion)
overriding system value
select v.id, a.id, e.id, c.id, v.tipo, v.num, v.nec, v.fi::date, v.ft::date, v.link, v.obs from (values
  (1, 'seguridad', 'Gestores operativos y personal espacio público', 'PRECONTRACTUAL', 'Fundación Pascual Bravo', 'PRINCIPAL', '4600107540', null, '2026-09-29', '2026-12-31', 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.9816643&isFromPublicArea=True&isModal=False', 'Contratación personal Espacio Público y Gestores'),
  (2, 'seguridad', 'Recolección cambuches', 'TERMINADO', 'EMVARIAS', 'PRINCIPAL', '4600105064', null, '2025-06-06', '2026-07-09', 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.8232942&isFromPublicArea=True&isModal=true&asPopupView=true', null),
  (3, 'seguridad', 'Recolección cambuches', 'ALERTA_PRECONTRACTUAL', 'EMVARIAS', 'PRINCIPAL', null, '56525', null, null, null, null),
  (4, 'gestion-y-control', 'Promotores (puntos críticos)', 'EJECUCION', 'ITM', 'PRINCIPAL', '4600108237', null, '2026-08-12', '2026-12-31', 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.10546732&isFromPublicArea=True&isModal=False', null),
  (5, 'gestion-y-control', 'Operación logística (camapaña Tu sepaara yo reciclo)', 'EJECUCION', 'Metroparques', 'PRINCIPAL', '4600108536', null, '2026-09-04', '2026-12-31', 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.10705437&isFromPublicArea=True&isModal=False', null),
  (6, 'gestion-y-control', 'Suministro de alumbrado público', 'EJECUCION', 'EPM', 'PRINCIPAL', '4600106142', null, '2026-02-01', '2027-12-31', 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.9044822&isFromPublicArea=True&isModal=False', null),
  (7, 'gestion-y-control', 'Mantenimiento e instalación de alumbrado público', 'EJECUCION', 'EPM', 'PRINCIPAL', '4600106143', null, '2026-02-01', '2027-12-31', 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.9044923&isFromPublicArea=True&isModal=False', null),
  (8, 'gestion-y-control', 'Interventoría de alumbrado público', 'EJECUCION', 'Consorcio Inter Iluminación Velnec', 'INTERVENTORIA', '4600107168', null, '2026-02-01', '2027-12-31', 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.9149275&isFromPublicArea=True&isModal=False', null),
  (9, 'medio-ambiente', 'Recolección residuos', 'EJECUCION', 'EMVARIAS', 'PRINCIPAL', '4600108257', null, '2026-07-17', '2026-12-31', 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.10530134&isFromPublicArea=True&isModal=False', 'Pendiente de ejecución recurso'),
  (10, 'medio-ambiente', 'PP estrategias de sostenibilidad ambiental', 'EJECUCION', 'Parque Arví', 'PRINCIPAL', '4600108068', null, '2026-07-02', '2026-11-30', 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.10422904&isFromPublicArea=True&isModal=False', null),
  (11, 'inclusion-social', 'Educadores', 'PROXIMO_TERMINAR_DIRECTO', 'Comité de Estudios Médicos', 'PRINCIPAL', '4600106984', null, '2026-01-14', '2026-10-04', 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.9496025&isFromPublicArea=True&isModal=true&asPopupView=true', null),
  (12, 'inclusion-social', 'Resocialización', 'PROXIMO_TERMINAR_DIRECTO', 'Corporación Obra Social Nuevos Ideales', 'PRINCIPAL', '4600106699', null, '2026-01-13', '2026-10-29', 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.9439517&isFromPublicArea=True&isModal=true&asPopupView=true', null),
  (13, 'inclusion-social', 'Albergue', 'PROXIMO_TERMINAR_DIRECTO', 'Corporación Semillas del Bienestar', 'PRINCIPAL', '4600106837', null, '2026-01-16', '2026-10-15', 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.9527723&isFromPublicArea=True&isModal=true&asPopupView=true', null),
  (14, 'infraestructura', 'Corredores verdes y jardineros', 'TERMINADO', 'Jardín Botánico', 'PRINCIPAL', '4600107659', null, '2026-02-04', '2026-08-02', 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.9885625&isFromPublicArea=True&isModal=true&asPopupView=true', null),
  (15, 'infraestructura', 'Corredores verdes y jardineros', 'FIRMADO', 'Jardín Botánico', 'PRINCIPAL', '4600108890', '57352', null, '2026-12-31', 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.10921380&isFromPublicArea=True&isModal=true&asPopupView=true', null),
  (16, 'infraestructura', 'Contingencias', 'PROXIMO_TERMINAR_DIRECTO', 'EDU', 'PRINCIPAL', '4600106234', null, '2025-12-11', '2026-09-29', 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.9086184&isFromPublicArea=True&isModal=true&asPopupView=true', null),
  (17, 'infraestructura', 'Contingencias', 'ALERTA_PRECONTRACTUAL', 'EDU', 'PRINCIPAL', null, null, null, null, null, 'Pendiente de Comité de Contratación EDU'),
  (18, 'infraestructura', 'Corredores verdes y jardineros', 'TERMINADO', 'Parque Arví', 'PRINCIPAL', '4600104824', null, '2026-05-08', '2026-08-20', 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.8057338&isFromPublicArea=True&isModal=true&asPopupView=true', null),
  (19, 'infraestructura', 'Corredores verdes y jardineros', 'ALERTA_PRECONTRACTUAL', 'Parque Arví', 'PRINCIPAL', null, null, null, null, null, 'Pendiente Junta Directiva Arví'),
  (20, 'infraestructura', 'Poda', 'ALERTA_PRECONTRACTUAL', 'EMVARIAS', 'PRINCIPAL', null, null, null, null, null, null),
  (21, 'infraestructura', 'Lavado', 'ALERTA_PRECONTRACTUAL', 'EMVARIAS', 'PRINCIPAL', null, null, null, null, null, null),
  (22, 'infraestructura', 'Cicloinfraestructura', 'TERMINADO', 'Pintuvial', 'PRINCIPAL', '4600107674', null, '2026-03-25', '2026-09-07', 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.9243237&isFromPublicArea=True&isModal=true&asPopupView=true', null),
  (23, 'infraestructura', 'Interventoría a las obras de mantenimiento de la red de cicloinfraestructura de la ciudad', 'EJECUCION', 'Cicloinfraestructura 20005479', 'INTERVENTORIA', '4600107688', null, '2026-03-25', '2026-09-29', 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.9316307&isFromPublicArea=True&isModal=true&asPopupView=true', null),
  (24, 'infraestructura', 'Suministro e instalación de cicloparqueaderos y obras complementarias', 'EJECUCION', 'Todico S.A.S', 'PRINCIPAL', '4600107991', null, '2026-09-09', '2026-11-07', 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.10255594&isFromPublicArea=True&isModal=true&asPopupView=true', null),
  (25, 'infraestructura', 'Interventoría al suministro e instalación de cicloparqueaderos y obras complementarias', 'EJECUCION', 'Nogaall S.A.S', 'INTERVENTORIA', '4600108269', null, '2026-09-10', '2026-11-22', 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.10374625&isFromPublicArea=True&isModal=true&asPopupView=true', null),
  (26, 'infraestructura', 'Mantenimiento de andenes', 'EJECUCION', 'Consorcio NGI Peatonal', 'PRINCIPAL', '4600107729', null, '2026-05-25', '2026-11-25', 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.9241956&isFromPublicArea=True&isModal=true&asPopupView=true', null),
  (27, 'infraestructura', 'Mantenimiento de andenes', 'PRECONTRACTUAL', null, 'PRINCIPAL', null, '56185', null, null, null, 'Mantenimiento de andenes y obras complementarias'),
  (28, 'infraestructura', 'Interventoría para el mantenimiento de andenes y obras complementarias', 'PRECONTRACTUAL', null, 'INTERVENTORIA', null, '56186', null, null, null, null),
  (29, 'infraestructura', 'Construcción y mejoramiento de andenes y obras complementarias', 'PRECONTRACTUAL', null, 'PRINCIPAL', null, '56177', null, null, null, null),
  (30, 'infraestructura', 'Interventoría para la construcción y mejoramiento de andenes y obras complementarias', 'PRECONTRACTUAL', null, 'INTERVENTORIA', null, '56178', null, null, null, null),
  (31, 'infraestructura', 'Mantenimiento de puentes', 'EJECUCION', 'Consorcio Linar 2025', 'PRINCIPAL', '4600107691', null, '2026-04-13', '2026-12-13', 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.9242988&isFromPublicArea=True&isModal=true&asPopupView=true', null),
  (32, 'infraestructura', 'Elementos seguridad vial', 'EJECUCION', 'Consorcio Medellín A&R', 'PRINCIPAL', '4600107715', null, '2026-07-06', '2026-11-03', 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.9243349&isFromPublicArea=True&isModal=true&asPopupView=true', null),
  (33, 'infraestructura', 'Defensas viales, barandas, pasamanos y otros elementos para la seguridad vial.', 'PRECONTRACTUAL', null, 'PRINCIPAL', null, '56238', null, null, null, null),
  (34, 'infraestructura', 'Interventoría defensas viales', 'PRECONTRACTUAL', null, 'INTERVENTORIA', null, '56173', null, null, null, 'Fecha probable de inicio 09/11/2026'),
  (35, 'infraestructura', 'Vías corregimientos', 'EJECUCION', 'Consorcio Vial 7J', 'PRINCIPAL', '4600107775', null, '2026-07-21', '2026-10-21', 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.9738805&isFromPublicArea=True&isModal=true&asPopupView=true', null),
  (36, 'infraestructura', 'Vías corregimientos', 'ALERTA_PRECONTRACTUAL', null, 'PRINCIPAL', null, '56172', null, null, null, 'Fecha probable de inicio 04/11/2026'),
  (37, 'infraestructura', 'Interventoría para la construcción, mejoramiento y mantenimiento de vías y demás obras complementarias en los corregimientos.', 'ALERTA_PRECONTRACTUAL', null, 'INTERVENTORIA', null, '56173', null, null, null, null),
  (38, 'infraestructura', 'Construcción, conservación, mantenimiento de la malla vial y obras complementarias', 'EJECUCION', 'Consorcio Infradetel', 'PRINCIPAL', '4600107948', null, '2026-07-08', '2026-12-31', 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.10154596', null),
  (39, 'infraestructura', 'Interventoría a la construcción, conservación, mantenimiento de la malla vial y obras complementarias.', 'EJECUCION', 'Consorcio GIS Medellín Víal', 'INTERVENTORIA', '4600107949', null, '2026-07-03', '2026-12-31', 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.10160706&isFromPublicArea=True&isModal=true&asPopupView=true', null),
  (40, 'infraestructura', 'Parques Tejiendo Hogares', 'EJECUCION', 'DINAMIC', 'PRINCIPAL', '4600105638', null, '2025-10-15', '2026-12-18', 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.8288285&isFromPublicArea=True&isModal=true&asPopupView=true', null),
  (41, 'infraestructura', 'Parques Tejiendo Hogares', 'EJECUCION', 'DINAMIC', 'PRINCIPAL', '4600105557', null, '2025-10-15', '2026-12-18', 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.8288285&isFromPublicArea=True&isModal=true&asPopupView=true', null),
  (42, 'infraestructura', 'Construcción y mantenimiento espacio público', 'PRECONTRACTUAL', null, 'PRINCIPAL', null, '56182', null, null, null, null),
  (43, 'infraestructura', 'Interventoría a la construcción y mejoramiento de espacios públicos de encuentro y esparcimiento - Grupo 1', 'PRECONTRACTUAL', null, 'INTERVENTORIA', null, '56183', null, null, null, null),
  (44, 'infraestructura', 'Prestar el servicio de disposición final de residuos de construcción, demolición, tierra, pétreos e inertes, que requiera el distrito', 'EJECUCION', 'Mincivil S.A', 'PRINCIPAL', '4600107838', null, '2026-05-15', '2026-12-31', 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.10210978&isFromPublicArea=True&isModal=true&asPopupView=true', null),
  (45, 'infraestructura', 'Contrato interadministrativo de mandato sin representación para la administración, operación y mantenimiento de fuentes de agua e infraestructura asociada.', 'PRECONTRACTUAL', null, 'PRINCIPAL', null, '56237', null, null, null, 'en estructuración'),
  (46, 'infraestructura', 'Obras de construcción y mejoramiento de espacios públicos en el centro de Medellin', 'PRECONTRACTUAL', null, 'PRINCIPAL', null, '57106', null, null, null, 'en publicación en SECOP
Fecha de inicio PAA: 15/08/2026'),
  (47, 'infraestructura', 'Interventoría a las Obras de construcción y mejoramiento de espacios públicos en el centro de Medellin', 'PRECONTRACTUAL', null, 'INTERVENTORIA', null, '57107', null, null, null, 'Pendiente publicación obra')
) v(id, dep, act, estado, contratista, tipo, num, nec, fi, ft, link, obs)
join core.dependencia d on d.slug = v.dep
join core.actividad a on a.dependencia_id = d.id and core.clave_texto(a.nombre) = core.clave_texto(v.act)
join core.estado_proceso e on e.codigo = v.estado
left join core.contratista c on core.clave_texto(c.nombre) = core.clave_texto(v.contratista)
order by v.id;
select setval(pg_get_serial_sequence('core.proceso_contratacion', 'id'),
  (select max(id) from core.proceso_contratacion));

-- Bitácora extraída de las observaciones
insert into core.seguimiento (proceso_id, fecha, nota, estado_id, origen)
select p.id, v.fecha::date, v.nota, p.estado_id, 'EXCEL' from (values
  (3, '2026-09-15', 'La necesidad se encuentra en proceso de aprobacion de actividades en SAP paar proceder con la expedicion del SOLPEDIDO'),
  (27, '2026-09-15', 'El proceso se encuentra en evaluación de ofertas'),
  (28, '2026-09-15', 'El proceso fue publicado el dia 09/09/2026'),
  (29, '2026-09-15', 'El proceso se encuentra en evaluacion de ofertas'),
  (30, '2026-09-15', 'El proceso se encuentra en evaluacion de ofertas'),
  (33, '2026-09-15', 'El día de hoy se realizará la respectiva publicación del informe de verificación o evaluación'),
  (34, '2026-09-15', 'El día 14/09/2026 fueron publicadas las respuestas a las observaciones del proyecto de pliego de condiciones definitivos, el día de hoy se proyecta aperturar el proceso'),
  (36, '2026-09-15', 'El proceso fue aperturado bajo resolución N° SSS202650075591 del 14/09/2026'),
  (37, '2026-09-15', 'El día 14/09/2026 fueron publicadas las respuestas a las observaciones del proyecto de pliego de condiciones definitivos, el día de hoy se proyecta aperturar el proceso'),
  (42, '2026-09-15', 'El proceso se encuentra en evaluación de ofertas'),
  (43, '2026-09-15', 'El proceso se encuentra en evaluación de ofertas')
) v(proceso_id, fecha, nota)
join core.proceso_contratacion p on p.id = v.proceso_id;

-- Tipos de personal
insert into core.tipo_personal (nombre, dependencia_id)
select v.nombre, d.id from (values
  ('Cuadrillas (EDU)', 'infraestructura'),
  ('EMVARIAS', null),
  ('Educadores (Inclusión Social)', 'inclusion-social'),
  ('Espacio Público', 'seguridad'),
  ('Gestión y Control (promotores puntos críticos)', 'gestion-y-control'),
  ('Gestores Operativos', 'seguridad'),
  ('Guardaquebradas', 'medio-ambiente'),
  ('Jardineros', 'infraestructura'),
  ('Promotores ambientales', 'medio-ambiente')
) v(nombre, dep)
left join core.dependencia d on d.slug = v.dep
on conflict do nothing;

-- Cortes de personal
insert into core.personal_corte (tipo_personal_id, vigencia, actual, pendiente, meta, fecha_final, observaciones, links_secop)
select t.id, v.vig, v.actual, v.pend, v.meta, v.ff::date, v.obs, v.links from (values
  ('Promotores ambientales', 2025, 214, null, 214, null, 'Arví
[Comentario Excel] De 200 a 300 / Cierre de año con 200
[Comentario Excel] Julio uno nuevo UdeA', array['https://community.secop.gov.co/Public/Common/GoogleReCaptcha/Index?previousUrl=https%3a%2f%2fcommunity.secop.gov.co%2fPublic%2fTendering%2fOpportunityDetail%2fIndex%3fnoticeUID%3dCO1.NTC.8074686%26isFromPublicArea%3dTrue%26isModal%3dFalse', 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.5588699&isFromPublicArea=True&isModal=False']::text[]),
  ('Guardaquebradas', 2025, 82, null, 75, null, null, '{}'::text[]),
  ('Educadores (Inclusión Social)', 2025, 560, null, 409, '2025-12-31', '[Comentario Excel] Prestación de servicios con persona jurídica', array['https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.8664095&isFromPublicArea=True&isModal=true&asPopupView=true']::text[]),
  ('Jardineros', 2025, 600, null, 600, null, null, array['https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.7639295&isFromPublicArea=True&isModal=true&asPopupView=true', 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.8057338&isFromPublicArea=True&isModal=true&asPopupView=true']::text[]),
  ('Espacio Público', 2025, 145, null, 145, '2025-12-30', 'Cubre ley de garantías
[Comentario Excel] Prórroga hasta el 30 de julio, con recurso disponible, inicia el nuevo contrato el 1 de agosto', array['https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.8617373&isFromPublicArea=True&isModal=true&asPopupView=true']::text[]),
  ('Gestores Operativos', 2025, 227, null, null, null, null, '{}'::text[]),
  ('EMVARIAS', 2025, 212, null, 212, null, null, '{}'::text[]),
  ('Gestión y Control (promotores puntos críticos)', 2025, 238, null, 338, '2025-12-31', null, array['https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.8143632&isFromPublicArea=True&isModal=true&asPopupView=true']::text[]),
  ('Cuadrillas (EDU)', 2025, 480, null, 480, '2025-12-31', null, array['https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.7954439']::text[]),
  ('Promotores ambientales', 2026, 211, 35, null, '2026-11-30', 'Parque Arví', '{}'::text[]),
  ('Guardaquebradas', 2026, 50, 5, null, '2026-11-30', 'Parque Arví', '{}'::text[]),
  ('Educadores (Inclusión Social)', 2026, 150, 410, null, '2026-10-04', 'Comité de Estudios Médicos
Adición y prórroga
Solo Educadores 6.000 millones mensuales con todos .
2.000 solo equipo de calle con los 560', '{}'::text[]),
  ('Jardineros', 2026, 0, 600, null, null, 'Arví y Jardín Botánico 
En proceso de contratación', '{}'::text[]),
  ('Espacio Público', 2026, 59, null, null, '2026-12-31', 'Fundación Pascual Bravo
[Comentario Excel] Prórroga hasta el 30 de julio, con recurso disponible, inicia el nuevo contrato el 1 de agosto', '{}'::text[]),
  ('Gestores Operativos', 2026, 228, 43, null, '2026-12-31', 'Fundación Pascual Bravo', '{}'::text[]),
  ('EMVARIAS', 2026, 147, 147, null, '2026-12-31', null, '{}'::text[]),
  ('Gestión y Control (promotores puntos críticos)', 2026, 196, 25, null, '2026-12-31', 'ITM', '{}'::text[]),
  ('Cuadrillas (EDU)', 2026, 16, 464, null, '2026-09-24', 'EDU- Pendiente contrato nuevo para aumentar personal', '{}'::text[])
) v(tipo, vig, actual, pend, meta, ff, obs, links)
join core.tipo_personal t on core.clave_texto(t.nombre) = core.clave_texto(v.tipo);

-- Operadores por corte
insert into core.personal_operador (corte_id, contratista_id, cantidad, fecha_final)
select pc.id, c.id, v.cant::int, v.ff::date from (values
  ('Promotores ambientales', 2025, 'UdeA', 199, '2025-09-07'),
  ('Promotores ambientales', 2025, 'ITM', 16, '2025-07-31'),
  ('Guardaquebradas', 2025, 'Parque Arví', null, null),
  ('Educadores (Inclusión Social)', 2025, 'Comité de Estudios Médicos', null, null),
  ('Jardineros', 2025, 'Jardín Botánico', null, '2025-12-31'),
  ('Jardineros', 2025, 'Parque Arví', null, '2025-12-31'),
  ('Espacio Público', 2025, 'Fundación Pascual Bravo', null, null),
  ('EMVARIAS', 2025, 'UdeA', null, null),
  ('EMVARIAS', 2025, 'Fundación de Sindicatos', null, null),
  ('Gestión y Control (promotores puntos críticos)', 2025, 'ITM', null, null),
  ('Cuadrillas (EDU)', 2025, 'EDU', null, null),
  ('Promotores ambientales', 2026, 'Parque Arví', null, null),
  ('Guardaquebradas', 2026, 'Parque Arví', null, null),
  ('Educadores (Inclusión Social)', 2026, 'Comité de Estudios Médicos', null, null),
  ('Jardineros', 2026, 'Parque Arví', null, null),
  ('Jardineros', 2026, 'Jardín Botánico', null, null),
  ('Espacio Público', 2026, 'Fundación Pascual Bravo', null, null),
  ('Gestores Operativos', 2026, 'Fundación Pascual Bravo', null, null),
  ('Gestión y Control (promotores puntos críticos)', 2026, 'ITM', null, null),
  ('Cuadrillas (EDU)', 2026, 'EDU', null, null)
) v(tipo, vig, contratista, cant, ff)
join core.tipo_personal t on core.clave_texto(t.nombre) = core.clave_texto(v.tipo)
join core.personal_corte pc on pc.tipo_personal_id = t.id and pc.vigencia = v.vig
join core.contratista c on core.clave_texto(c.nombre) = core.clave_texto(v.contratista);

-- Frentes ↔ personal
insert into core.frente_tipo_personal (frente_id, tipo_personal_id)
select f.id, t.id from (values
  ('gestion-control-territorial', 'Gestión y Control (promotores puntos críticos)'),
  ('operativa-seguridad', 'Gestores Operativos'),
  ('espacio-publico', 'Espacio Público'),
  ('sif', 'Jardineros'),
  ('sif', 'Cuadrillas (EDU)'),
  ('emvarias', 'EMVARIAS'),
  ('habitante-de-calle', 'Educadores (Inclusión Social)'),
  ('medio-ambiente', 'Promotores ambientales'),
  ('medio-ambiente', 'Guardaquebradas')
) v(frente, tipo)
join core.frente f on f.slug = v.frente
join core.tipo_personal t on core.clave_texto(t.nombre) = core.clave_texto(v.tipo)
on conflict do nothing;

-- Frentes ↔ procesos (reglas FRENTE_REGLA del ETL)
insert into core.frente_proceso (frente_id, proceso_id, criterio)
select f.id, r.id, r.criterio from (
  select 'gestion-control-territorial' as frente, p.id, 'DEPENDENCIA' as criterio from core.proceso_contratacion p
    join core.actividad a on a.id = p.actividad_id join core.dependencia d on d.id = a.dependencia_id
    left join core.contratista c on c.id = p.contratista_id where d.slug = 'gestion-y-control'
  union all
  select 'operativa-seguridad' as frente, p.id, 'DEPENDENCIA' as criterio from core.proceso_contratacion p
    join core.actividad a on a.id = p.actividad_id join core.dependencia d on d.id = a.dependencia_id
    left join core.contratista c on c.id = p.contratista_id where d.slug = 'seguridad'
  union all
  select 'sif' as frente, p.id, 'DEPENDENCIA' as criterio from core.proceso_contratacion p
    join core.actividad a on a.id = p.actividad_id join core.dependencia d on d.id = a.dependencia_id
    left join core.contratista c on c.id = p.contratista_id where d.slug = 'infraestructura'
  union all
  select 'habitante-de-calle' as frente, p.id, 'DEPENDENCIA' as criterio from core.proceso_contratacion p
    join core.actividad a on a.id = p.actividad_id join core.dependencia d on d.id = a.dependencia_id
    left join core.contratista c on c.id = p.contratista_id where d.slug = 'inclusion-social'
  union all
  select 'medio-ambiente' as frente, p.id, 'DEPENDENCIA' as criterio from core.proceso_contratacion p
    join core.actividad a on a.id = p.actividad_id join core.dependencia d on d.id = a.dependencia_id
    left join core.contratista c on c.id = p.contratista_id where d.slug = 'medio-ambiente'
  union all
  select 'emvarias' as frente, p.id, 'CONTRATISTA' as criterio from core.proceso_contratacion p
    join core.actividad a on a.id = p.actividad_id join core.dependencia d on d.id = a.dependencia_id
    left join core.contratista c on c.id = p.contratista_id where core.clave_texto(c.nombre) = 'emvarias'
  union all
  select 'espacio-publico' as frente, p.id, 'ACTIVIDAD' as criterio from core.proceso_contratacion p
    join core.actividad a on a.id = p.actividad_id join core.dependencia d on d.id = a.dependencia_id
    left join core.contratista c on c.id = p.contratista_id where core.clave_texto(a.nombre) like '%espacio público%' and d.slug not in ('infraestructura')
) r join core.frente f on f.slug = r.frente
on conflict do nothing;
