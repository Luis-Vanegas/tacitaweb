-- =============================================================================
-- 002_catalogos_base.sql
-- Catálogos fijos que no salen del Excel: estados del proceso y frentes del
-- menú (boceto "Tacita de Plata"). Idempotente.
-- =============================================================================

-- Estados (hoja "Lista", columna Estado), en el orden del ciclo de vida.
insert into core.estado_proceso (codigo, nombre, fase, orden, es_alerta, color) values
  ('PRECONTRACTUAL',             'Precontractual',               'PRECONTRACTUAL', 1, false, '#6C757D'),
  ('ALERTA_PRECONTRACTUAL',      'Alerta precontractual',        'PRECONTRACTUAL', 2, true,  '#DC3545'),
  ('FIRMADO',                    'Firmado',                      'CONTRACTUAL',    3, false, '#17A2B8'),
  ('EJECUCION',                  'Ejecución',                    'CONTRACTUAL',    4, false, '#00ABEE'),
  ('PROXIMO_TERMINAR_DIRECTO',   'Próximo a terminar (directo)', 'CONTRACTUAL',    5, true,  '#FD7E14'),
  ('PROXIMO_TERMINAR_SELECCION', 'Próximo a terminar (selección)','CONTRACTUAL',   6, true,  '#FFC107'),
  ('TERMINADO',                  'Terminado',                    'POSCONTRACTUAL', 7, false, '#28A745')
on conflict (codigo) do nothing;

-- Frentes del menú. icono = nombre del ícono de @mui/icons-material.
insert into core.frente (nombre, slug, descripcion, color, icono, orden) values
  ('Gestión y Control Territorial', 'gestion-control-territorial', 'Servicios públicos, alumbrado y promotores de puntos críticos', '#1B75BC', 'FactCheck',          1),
  ('Operativa / Seguridad',         'operativa-seguridad',         'Gestores operativos y procesos de la Secretaría de Seguridad', '#D62828', 'LocalPolice',        2),
  ('Espacio Público',               'espacio-publico',             'Personal de espacio público',                                  '#00ABEE', 'Streetview',         3),
  ('SIF',                           'sif',                         'Secretaría de Infraestructura Física',                         '#F7941D', 'Construction',       4),
  ('EMVARIAS',                      'emvarias',                    'Procesos y personal operados por EMVARIAS',                    '#17A2B8', 'Recycling',          5),
  ('Habitante de Calle',            'habitante-de-calle',          'Inclusión social: educadores, resocialización y albergue',     '#8C31C9', 'VolunteerActivism',  6),
  ('Medio Ambiente',                'medio-ambiente',              'Promotores ambientales, guardaquebradas y residuos',           '#28A745', 'Forest',             7)
on conflict (slug) do nothing;
