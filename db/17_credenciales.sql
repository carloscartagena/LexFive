-- ============================================================
--  LexFive — Credenciales del bufete compartidas (en la nube)
--  Migración 17: tabla "credenciales"
-- ------------------------------------------------------------
--  Propósito:
--   Antes, las credenciales (carnets) creadas se guardaban SOLO en
--   el navegador de cada equipo (IndexedDB). Por eso una credencial
--   creada en la computadora NO aparecía en el celular ni en otra
--   computadora del bufete.
--
--   Esta tabla guarda las credenciales en la nube (Supabase), para
--   que la lista de credenciales se vea, se edite y se reimprima
--   IGUAL en todos los dispositivos.
--
--  Quién puede usarla:
--   Solo el administrador y los abogados (los mismos que ven la
--   pestaña «Credenciales» en el panel). Los procuradores y clientes
--   no tienen acceso.
--
--  Cómo aplicarla:
--   1. En tu proyecto de Supabase abre "SQL Editor".
--   2. Pega TODO este archivo y pulsa "Run".
--   (Es seguro ejecutarlo varias veces: usa IF NOT EXISTS / DROP POLICY.)
-- ============================================================

create table if not exists public.credenciales (
  id             uuid primary key default gen_random_uuid(),
  nombre         text not null,
  cargo          text,
  ci             text,
  tel_personal   text,
  tel_oficina    text,
  emision        text,            -- fecha de emisión (AAAA-MM-DD)
  validez        text,            -- fecha de validez (AAAA-MM-DD)
  frase          text,            -- frase del bufete (reverso)
  representacion text,            -- base legal de la representación (reverso)
  foto           text,            -- foto del portador (data URL); puede ser nula
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references public.profiles(id) default auth.uid()
);

-- Para ordenar/listar rápido por última modificación.
create index if not exists idx_credenciales_updated on public.credenciales(updated_at desc);

alter table public.credenciales enable row level security;

-- ---- LECTURA ----
-- Solo el administrador y los abogados pueden ver las credenciales.
drop policy if exists credenciales_select on public.credenciales;
create policy credenciales_select on public.credenciales for select to authenticated
  using (public.current_rol() in ('admin','abogado'));

-- ---- CREAR ----
drop policy if exists credenciales_insert on public.credenciales;
create policy credenciales_insert on public.credenciales for insert to authenticated
  with check (public.current_rol() in ('admin','abogado'));

-- ---- EDITAR ----
drop policy if exists credenciales_update on public.credenciales;
create policy credenciales_update on public.credenciales for update to authenticated
  using (public.current_rol() in ('admin','abogado'))
  with check (public.current_rol() in ('admin','abogado'));

-- ---- ELIMINAR ----
drop policy if exists credenciales_delete on public.credenciales;
create policy credenciales_delete on public.credenciales for delete to authenticated
  using (public.current_rol() in ('admin','abogado'));
