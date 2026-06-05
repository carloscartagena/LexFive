-- ============================================================
--  LexFive — Modelos de memoriales + campo NUREJ
--  Ejecutar UNA vez en Supabase (SQL Editor), despues de los scripts anteriores.
-- ============================================================

alter table public.procesos add column if not exists nurej text;

create table if not exists public.modelos (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  categoria   text,
  storage_path text not null,
  subido_por  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);

alter table public.modelos enable row level security;

drop policy if exists modelos_select on public.modelos;
create policy modelos_select on public.modelos for select to authenticated using (public.is_staff());
drop policy if exists modelos_insert on public.modelos;
create policy modelos_insert on public.modelos for insert to authenticated with check (public.is_staff());
drop policy if exists modelos_delete on public.modelos;
create policy modelos_delete on public.modelos for delete to authenticated using (public.is_staff());
