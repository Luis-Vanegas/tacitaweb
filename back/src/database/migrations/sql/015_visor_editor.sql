-- =============================================================================
-- 015_visor_editor.sql
-- El usuario "Visor" (el que usa el auto-login de la demo, VITE_DEMO_EMAIL)
-- pasa de LECTOR a EDITOR con todos los frentes activos asignados, para que
-- pueda cargar y editar información. Eliminar y administrar usuarios sigue
-- siendo solo ADMIN. Decisión del usuario (2026-10-09), consciente de que
-- quien abra el link de la demo puede editar sin identificarse.
-- Idempotente: re-ejecutarla no duplica asignaciones.
-- =============================================================================

update core.usuario
set rol = 'EDITOR'
where nombre = 'Visor' and rol = 'LECTOR';

insert into core.usuario_frente (usuario_id, frente_id)
select u.id, f.id
from core.usuario u
cross join core.frente f
where u.nombre = 'Visor' and f.activo
on conflict do nothing;
