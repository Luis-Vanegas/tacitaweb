-- =============================================================================
-- 001_core_schema.sql
-- Esquema base de TacitaWeb (Medellín Tacita de Plata).
--
-- Decisiones:
--   * Todo vive en el schema `core`, que NO se expone por la Data API de
--     Supabase. El único cliente es el backend NestJS.
--   * RLS activado en todas las tablas y sin políticas: defensa en
--     profundidad (anon/authenticated no pueden leer nada aunque se exponga).
--   * Catálogos en tablas (no ENUM) para poder editarlos sin migraciones.
--   * Nada derivado se guarda: días restantes, totales, pendientes 2025, etc.
--     se calculan en vistas (ver 003_core_views.sql).
-- =============================================================================

create schema if not exists core;
revoke all on schema core from public;
revoke all on schema core from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Utilidades
-- -----------------------------------------------------------------------------

-- Mantiene updated_at en cada UPDATE.
create or replace function core.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Clave de comparación de textos: minúsculas, sin espacios extremos ni dobles.
-- IMMUTABLE para poder usarla en índices únicos.
create or replace function core.clave_texto(p text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(regexp_replace(btrim(p), '\s+', ' ', 'g'));
$$;

-- -----------------------------------------------------------------------------
-- Catálogos
-- -----------------------------------------------------------------------------

-- Secretaría responsable de los procesos (columna "Dependencia" del Excel).
create table core.dependencia (
  id          integer generated always as identity primary key,
  nombre      text        not null check (btrim(nombre) <> ''),
  sigla       varchar(12),
  slug        varchar(60) not null unique check (slug ~ '^[a-z0-9-]+$'),
  activo      boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index dependencia_nombre_uq on core.dependencia (core.clave_texto(nombre));

-- Proyectos estratégicos (hoja "Lista").
create table core.proyecto (
  id          integer generated always as identity primary key,
  nombre      text        not null check (btrim(nombre) <> ''),
  activo      boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index proyecto_nombre_uq on core.proyecto (core.clave_texto(nombre));

-- Estados del proceso de contratación, ordenados para el stepper.
create table core.estado_proceso (
  id          smallint generated always as identity primary key,
  codigo      varchar(40) not null unique check (codigo ~ '^[A-Z_]+$'),
  nombre      text        not null,
  fase        varchar(20) not null check (fase in ('PRECONTRACTUAL', 'CONTRACTUAL', 'POSCONTRACTUAL')),
  orden       smallint    not null unique,
  es_alerta   boolean     not null default false,
  color       varchar(7)  not null check (color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Contratistas / operadores. Se deduplican por clave de texto.
create table core.contratista (
  id          integer generated always as identity primary key,
  nombre      text        not null check (btrim(nombre) <> ''),
  nit         varchar(20),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index contratista_nombre_uq on core.contratista (core.clave_texto(nombre));
create unique index contratista_nit_uq on core.contratista (nit) where nit is not null;

-- Frentes del menú (boceto "Tacita de Plata"). Un frente agrupa procesos y
-- personal de una o varias dependencias; un proceso puede estar en varios.
create table core.frente (
  id          smallint generated always as identity primary key,
  nombre      text        not null,
  slug        varchar(60) not null unique check (slug ~ '^[a-z0-9-]+$'),
  descripcion text,
  color       varchar(7)  not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  icono       varchar(40) not null,
  orden       smallint    not null unique,
  activo      boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Usuarios (auth propia con JWT en NestJS; aquí solo el hash bcrypt)
-- -----------------------------------------------------------------------------

create table core.usuario (
  id             uuid        primary key default gen_random_uuid(),
  email          text        not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  nombre         text        not null,
  password_hash  text        not null,
  rol            varchar(10) not null default 'LECTOR' check (rol in ('ADMIN', 'EDITOR', 'LECTOR')),
  activo         boolean     not null default true,
  ultimo_acceso  timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index usuario_email_uq on core.usuario (lower(email));

-- Alcance: qué frentes puede editar un EDITOR (ADMIN ve y edita todo).
create table core.usuario_frente (
  usuario_id  uuid     not null references core.usuario (id) on delete cascade,
  frente_id   smallint not null references core.frente (id) on delete cascade,
  primary key (usuario_id, frente_id)
);
create index usuario_frente_frente_idx on core.usuario_frente (frente_id);

-- -----------------------------------------------------------------------------
-- Contratación
-- -----------------------------------------------------------------------------

-- Línea de trabajo de una dependencia. Agrupa la historia de sus procesos
-- (ej. "Recolección cambuches": uno terminado y uno nuevo en alerta).
create table core.actividad (
  id             integer generated always as identity primary key,
  dependencia_id integer not null references core.dependencia (id) on delete restrict,
  proyecto_id    integer not null references core.proyecto (id) on delete restrict,
  nombre         text    not null check (btrim(nombre) <> ''),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create unique index actividad_dep_nombre_uq on core.actividad (dependencia_id, core.clave_texto(nombre));
create index actividad_proyecto_idx on core.actividad (proyecto_id);

-- Proceso de contratación: desde la necesidad (sin número de contrato)
-- hasta el contrato terminado.
create table core.proceso_contratacion (
  id                      bigint generated always as identity primary key,
  actividad_id            integer  not null references core.actividad (id) on delete restrict,
  estado_id               smallint not null references core.estado_proceso (id) on delete restrict,
  contratista_id          integer  references core.contratista (id) on delete restrict,
  tipo                    varchar(15) not null default 'PRINCIPAL' check (tipo in ('PRINCIPAL', 'INTERVENTORIA')),
  -- Contrato que vigila una interventoría (se enlaza manualmente).
  proceso_supervisado_id  bigint references core.proceso_contratacion (id) on delete set null,
  numero_contrato         varchar(20) unique check (numero_contrato ~ '^[0-9]+$'),
  -- No es único: el Excel trae la necesidad 56173 en dos procesos.
  numero_necesidad        varchar(20) check (numero_necesidad ~ '^[0-9]+$'),
  fecha_inicio            date,
  fecha_terminacion       date,
  link_secop              text check (link_secop ~* '^https://'),
  observacion             text,
  created_by              uuid references core.usuario (id) on delete set null,
  updated_by              uuid references core.usuario (id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint proceso_fechas_ck check (fecha_inicio is null or fecha_terminacion is null or fecha_terminacion >= fecha_inicio),
  constraint proceso_no_autosupervisa_ck check (proceso_supervisado_id is null or proceso_supervisado_id <> id),
  constraint proceso_supervisado_solo_interventoria_ck check (proceso_supervisado_id is null or tipo = 'INTERVENTORIA')
);
create index proceso_actividad_idx   on core.proceso_contratacion (actividad_id);
create index proceso_estado_idx      on core.proceso_contratacion (estado_id);
create index proceso_contratista_idx on core.proceso_contratacion (contratista_id);
create index proceso_supervisado_idx on core.proceso_contratacion (proceso_supervisado_id);
create index proceso_necesidad_idx   on core.proceso_contratacion (numero_necesidad);
create index proceso_terminacion_idx on core.proceso_contratacion (fecha_terminacion);
create index proceso_created_by_idx  on core.proceso_contratacion (created_by);
create index proceso_updated_by_idx  on core.proceso_contratacion (updated_by);

-- Bitácora del proceso (notas fechadas).
create table core.seguimiento (
  id          bigint generated always as identity primary key,
  proceso_id  bigint   not null references core.proceso_contratacion (id) on delete cascade,
  fecha       date     not null,
  nota        text     not null check (btrim(nota) <> ''),
  estado_id   smallint references core.estado_proceso (id) on delete restrict,
  autor_id    uuid     references core.usuario (id) on delete set null,
  origen      varchar(10) not null default 'APP' check (origen in ('EXCEL', 'APP')),
  created_at  timestamptz not null default now()
);
create index seguimiento_proceso_fecha_idx on core.seguimiento (proceso_id, fecha desc);
create index seguimiento_estado_idx on core.seguimiento (estado_id);
create index seguimiento_autor_idx  on core.seguimiento (autor_id);

-- -----------------------------------------------------------------------------
-- Personal
-- -----------------------------------------------------------------------------

create table core.tipo_personal (
  id              integer generated always as identity primary key,
  nombre          text    not null check (btrim(nombre) <> ''),
  -- Nulo cuando el Excel no permite asignarla con certeza (ej. EMVARIAS).
  dependencia_id  integer references core.dependencia (id) on delete set null,
  activo          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index tipo_personal_nombre_uq on core.tipo_personal (core.clave_texto(nombre));
create index tipo_personal_dependencia_idx on core.tipo_personal (dependencia_id);

-- Foto del personal por vigencia ("Cifras actualizadas 2025/2026").
create table core.personal_corte (
  id                bigint generated always as identity primary key,
  tipo_personal_id  integer  not null references core.tipo_personal (id) on delete cascade,
  vigencia          smallint not null check (vigencia between 2020 and 2100),
  actual            integer  not null check (actual >= 0),
  -- Digitado (2026). En 2025 era fórmula meta-actual: se deja nulo y se calcula.
  pendiente         integer  check (pendiente >= 0),
  meta              integer  check (meta >= 0),
  fecha_final       date,
  observaciones     text,
  links_secop       text[]   not null default '{}',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (tipo_personal_id, vigencia)
);

-- Operadores de un corte (ej. "UdeA (199) / ITM (16)").
create table core.personal_operador (
  id              bigint generated always as identity primary key,
  corte_id        bigint  not null references core.personal_corte (id) on delete cascade,
  contratista_id  integer not null references core.contratista (id) on delete restrict,
  cantidad        integer check (cantidad >= 0),
  fecha_final     date,
  proceso_id      bigint references core.proceso_contratacion (id) on delete set null,
  unique (corte_id, contratista_id)
);
create index personal_operador_contratista_idx on core.personal_operador (contratista_id);
create index personal_operador_proceso_idx on core.personal_operador (proceso_id);

-- -----------------------------------------------------------------------------
-- Relación de los frentes (menú) con procesos y personal
-- -----------------------------------------------------------------------------

create table core.frente_proceso (
  frente_id   smallint not null references core.frente (id) on delete cascade,
  proceso_id  bigint   not null references core.proceso_contratacion (id) on delete cascade,
  -- Por qué el proceso está en el frente (trazabilidad de la regla).
  criterio    varchar(15) not null default 'MANUAL' check (criterio in ('DEPENDENCIA', 'CONTRATISTA', 'ACTIVIDAD', 'MANUAL')),
  nota        text,
  primary key (frente_id, proceso_id)
);
create index frente_proceso_proceso_idx on core.frente_proceso (proceso_id);

create table core.frente_tipo_personal (
  frente_id         smallint not null references core.frente (id) on delete cascade,
  tipo_personal_id  integer  not null references core.tipo_personal (id) on delete cascade,
  nota              text,
  primary key (frente_id, tipo_personal_id)
);
create index frente_tipo_personal_tipo_idx on core.frente_tipo_personal (tipo_personal_id);

-- -----------------------------------------------------------------------------
-- Auditoría (trigger genérico; el backend fija app.usuario_id por transacción
-- con: select set_config('app.usuario_id', '<uuid>', true))
-- -----------------------------------------------------------------------------

create table core.auditoria (
  id             bigint generated always as identity primary key,
  tabla          text        not null,
  registro_id    text        not null,
  accion         varchar(6)  not null check (accion in ('INSERT', 'UPDATE', 'DELETE')),
  datos_antes    jsonb,
  datos_despues  jsonb,
  usuario_id     uuid,
  created_at     timestamptz not null default now()
);
create index auditoria_tabla_registro_idx on core.auditoria (tabla, registro_id);
create index auditoria_created_idx on core.auditoria (created_at desc);

create or replace function core.registrar_auditoria()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := nullif(current_setting('app.usuario_id', true), '')::uuid;
  v_fila    jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into core.auditoria (tabla, registro_id, accion, datos_antes, datos_despues, usuario_id)
  values (
    tg_table_name,
    coalesce(v_fila ->> 'id', v_fila::text),
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end,
    v_usuario
  );
  return null;
end;
$$;
revoke all on function core.registrar_auditoria() from public;

-- -----------------------------------------------------------------------------
-- Triggers updated_at + auditoría
-- -----------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'dependencia', 'proyecto', 'contratista', 'frente', 'usuario',
    'actividad', 'proceso_contratacion', 'tipo_personal', 'personal_corte'
  ] loop
    execute format(
      'create trigger %I before update on core.%I for each row execute function core.set_updated_at()',
      t || '_updated_at', t);
  end loop;

  foreach t in array array[
    'proceso_contratacion', 'seguimiento', 'personal_corte',
    'personal_operador', 'frente_proceso', 'frente_tipo_personal'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on core.%I for each row execute function core.registrar_auditoria()',
      t || '_auditoria', t);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Seguridad: RLS en todas las tablas, sin permisos para roles de la Data API
-- -----------------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in select tablename from pg_tables where schemaname = 'core' loop
    execute format('alter table core.%I enable row level security', r.tablename);
    execute format('revoke all on core.%I from anon, authenticated', r.tablename);
  end loop;
end;
$$;
