-- ============================================================
--  LexFive — Sistema de Gestión Legal
--  Esquema de base de datos para Supabase (PostgreSQL)
-- ------------------------------------------------------------
--  Cómo usarlo:
--   1. En tu proyecto de Supabase, abre "SQL Editor".
--   2. Pega TODO este archivo y pulsa "Run".
--   3. Crea tu primer usuario (Authentication > Users > Add user)
--      o regístrate desde la pantalla de login del sistema.
--   4. Convierte ese usuario en administrador ejecutando, al final,
--      la sentencia UPDATE que está al pie de este archivo (cambia el correo).
--
--  Matriz de permisos aplicada (resumen):
--   - Todos (admin/procurador/abogado) ven TODOS los procesos.
--   - Todos pueden crear y editar cualquier proceso (trabajo colaborativo).
--   - Solo ADMIN elimina procesos/clientes de forma definitiva.
--   - Documentos/actuaciones: borra el autor o el admin.
--   - Blog: admin, procurador y abogado pueden escribir; editar/borrar ajenos solo admin.
--   - Usuarios y auditoría: solo admin.
-- ============================================================

-- ----------------------------------------------------------------
-- 1. PERFILES (vinculados a auth.users)
-- ----------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text not null default '',
  email       text,
  rol         text not null default 'abogado' check (rol in ('admin','procurador','abogado')),
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- FUNCIONES AUXILIARES (definidas tras profiles)
-- ----------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and rol = 'admin' and activo);
$$;

create or replace function public.current_rol()
returns text
language sql stable security definer set search_path = public as $$
  select rol from public.profiles where id = auth.uid();
$$;

-- Crear automáticamente el perfil cuando se registra un usuario nuevo
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nombre, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------
-- 2. CLIENTES
-- ----------------------------------------------------------------
create table if not exists public.clientes (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  documento   text,
  telefono    text,
  email       text,
  direccion   text,
  notas       text,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- 3. PROCESOS / CASOS
-- ----------------------------------------------------------------
create table if not exists public.procesos (
  id               uuid primary key default gen_random_uuid(),
  caratula         text not null,
  numero           text,
  materia          text,
  tipo             text default 'judicial' check (tipo in ('judicial','administrativo')),
  juzgado          text,
  cliente_id       uuid references public.clientes(id) on delete set null,
  parte_contraria  text,
  abogado_id       uuid references public.profiles(id),
  procurador_id    uuid references public.profiles(id),
  estado           text default 'en_tramite',
  fecha_inicio     date,
  proxima_audiencia timestamptz,
  descripcion      text,
  created_by       uuid references public.profiles(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- 4. ACTUACIONES (historial de cada proceso)
-- ----------------------------------------------------------------
create table if not exists public.actuaciones (
  id          uuid primary key default gen_random_uuid(),
  proceso_id  uuid not null references public.procesos(id) on delete cascade,
  fecha       date not null default current_date,
  tipo        text,
  descripcion text not null,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- 5. DOCUMENTOS / MEMORIALES (metadatos; el archivo va en Storage)
-- ----------------------------------------------------------------
create table if not exists public.documentos (
  id           uuid primary key default gen_random_uuid(),
  proceso_id   uuid not null references public.procesos(id) on delete cascade,
  nombre       text not null,
  tipo         text default 'memorial',
  storage_path text not null,
  subido_por   uuid references public.profiles(id),
  created_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- 6. ARTÍCULOS DEL BLOG
-- ----------------------------------------------------------------
create table if not exists public.articulos (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null,
  categoria   text,
  resumen     text,
  contenido   text,
  estado      text default 'borrador' check (estado in ('borrador','publicado')),
  autor_id    uuid references public.profiles(id),
  fecha       date default current_date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- 7. BITÁCORA DE AUDITORÍA
-- ----------------------------------------------------------------
create table if not exists public.auditoria (
  id          bigint generated always as identity primary key,
  usuario_id  uuid references public.profiles(id),
  accion      text,
  entidad     text,
  entidad_id  text,
  detalle     text,
  created_at  timestamptz not null default now()
);

-- ================================================================
--  SEGURIDAD A NIVEL DE FILA (RLS)
-- ================================================================
alter table public.profiles    enable row level security;
alter table public.clientes    enable row level security;
alter table public.procesos    enable row level security;
alter table public.actuaciones enable row level security;
alter table public.documentos  enable row level security;
alter table public.articulos   enable row level security;
alter table public.auditoria   enable row level security;

-- ---- PROFILES ----
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (true);
drop policy if exists profiles_admin on public.profiles;
create policy profiles_admin on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---- CLIENTES ----
drop policy if exists clientes_select on public.clientes;
create policy clientes_select on public.clientes for select to authenticated using (true);
drop policy if exists clientes_insert on public.clientes;
create policy clientes_insert on public.clientes for insert to authenticated with check (true);
drop policy if exists clientes_update on public.clientes;
create policy clientes_update on public.clientes for update to authenticated using (true) with check (true);
drop policy if exists clientes_delete on public.clientes;
create policy clientes_delete on public.clientes for delete to authenticated using (public.is_admin());

-- ---- PROCESOS ----
drop policy if exists procesos_select on public.procesos;
create policy procesos_select on public.procesos for select to authenticated using (true);
drop policy if exists procesos_insert on public.procesos;
create policy procesos_insert on public.procesos for insert to authenticated with check (true);
drop policy if exists procesos_update on public.procesos;
create policy procesos_update on public.procesos for update to authenticated using (true) with check (true);
drop policy if exists procesos_delete on public.procesos;
create policy procesos_delete on public.procesos for delete to authenticated using (public.is_admin());

-- ---- ACTUACIONES ----
drop policy if exists actuaciones_select on public.actuaciones;
create policy actuaciones_select on public.actuaciones for select to authenticated using (true);
drop policy if exists actuaciones_insert on public.actuaciones;
create policy actuaciones_insert on public.actuaciones for insert to authenticated with check (created_by = auth.uid());
drop policy if exists actuaciones_modify on public.actuaciones;
create policy actuaciones_modify on public.actuaciones for update to authenticated using (created_by = auth.uid() or public.is_admin()) with check (true);
drop policy if exists actuaciones_delete on public.actuaciones;
create policy actuaciones_delete on public.actuaciones for delete to authenticated using (created_by = auth.uid() or public.is_admin());

-- ---- DOCUMENTOS ----
drop policy if exists documentos_select on public.documentos;
create policy documentos_select on public.documentos for select to authenticated using (true);
drop policy if exists documentos_insert on public.documentos;
create policy documentos_insert on public.documentos for insert to authenticated with check (true);
drop policy if exists documentos_delete on public.documentos;
create policy documentos_delete on public.documentos for delete to authenticated using (subido_por = auth.uid() or public.is_admin());

-- ---- ARTICULOS (blog) ----
drop policy if exists articulos_select on public.articulos;
create policy articulos_select on public.articulos for select to authenticated using (true);
drop policy if exists articulos_insert on public.articulos;
create policy articulos_insert on public.articulos for insert to authenticated with check (autor_id = auth.uid());
drop policy if exists articulos_update on public.articulos;
create policy articulos_update on public.articulos for update to authenticated using (autor_id = auth.uid() or public.is_admin()) with check (true);
drop policy if exists articulos_delete on public.articulos;
create policy articulos_delete on public.articulos for delete to authenticated using (autor_id = auth.uid() or public.is_admin());

-- ---- AUDITORIA ----
drop policy if exists auditoria_select on public.auditoria;
create policy auditoria_select on public.auditoria for select to authenticated using (public.is_admin());
drop policy if exists auditoria_insert on public.auditoria;
create policy auditoria_insert on public.auditoria for insert to authenticated with check (true);

-- ================================================================
--  ALMACENAMIENTO (Storage) para memoriales/documentos
-- ================================================================
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

drop policy if exists docs_select on storage.objects;
create policy docs_select on storage.objects for select to authenticated using (bucket_id = 'documentos');
drop policy if exists docs_insert on storage.objects;
create policy docs_insert on storage.objects for insert to authenticated with check (bucket_id = 'documentos');
drop policy if exists docs_delete on storage.objects;
create policy docs_delete on storage.objects for delete to authenticated using (bucket_id = 'documentos' and (owner = auth.uid() or public.is_admin()));

-- ================================================================
--  PASO FINAL: definir tu primer ADMINISTRADOR
--  (ejecútalo DESPUÉS de crear/registrar tu usuario, cambiando el correo)
-- ================================================================
-- update public.profiles set rol = 'admin' where email = 'alba23meira@gmail.com';
