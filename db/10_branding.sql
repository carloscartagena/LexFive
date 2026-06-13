-- ============================================================
--  LexFive — Configuración compartida del bufete (branding)
--  Migración 10: tabla "configuracion"
-- ------------------------------------------------------------
--  Propósito:
--   Hasta ahora el logo y el sello se guardaban SOLO en el
--   navegador de cada equipo (localStorage / IndexedDB). Por eso
--   un cambio hecho en la computadora NO se veía en el celular.
--
--   Esta tabla guarda esa configuración en la nube (Supabase),
--   para que el logo/sello elegido se vea IGUAL en todos los
--   dispositivos: computadora, celular y la web pública.
--
--  Cómo usarlo:
--   1. En tu proyecto de Supabase abre "SQL Editor".
--   2. Pega TODO este archivo y pulsa "Run".
--   (Es seguro ejecutarlo varias veces: usa IF NOT EXISTS / DROP POLICY.)
-- ============================================================

create table if not exists public.configuracion (
  clave       text primary key,
  valor       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles(id)
);

alter table public.configuracion enable row level security;

-- ---- LECTURA ----
-- La fila "branding" (logo y sello) debe poder leerse SIN iniciar
-- sesión, porque la web pública necesita mostrar el logo a los
-- visitantes. Solo se expone esa fila; cualquier otra clave queda
-- reservada a usuarios autenticados.
drop policy if exists configuracion_select_publico on public.configuracion;
create policy configuracion_select_publico on public.configuracion
  for select using (clave = 'branding');

drop policy if exists configuracion_select_auth on public.configuracion;
create policy configuracion_select_auth on public.configuracion
  for select to authenticated using (true);

-- ---- ESCRITURA ----
-- Solo el administrador o un abogado pueden cambiar el logo/sello.
drop policy if exists configuracion_insert on public.configuracion;
create policy configuracion_insert on public.configuracion
  for insert to authenticated
  with check (public.current_rol() in ('admin','abogado'));

drop policy if exists configuracion_update on public.configuracion;
create policy configuracion_update on public.configuracion
  for update to authenticated
  using (public.current_rol() in ('admin','abogado'))
  with check (public.current_rol() in ('admin','abogado'));

-- Fila inicial vacía (opcional; el sistema la crea sola al guardar).
insert into public.configuracion (clave, valor)
values ('branding', '{}'::jsonb)
on conflict (clave) do nothing;
