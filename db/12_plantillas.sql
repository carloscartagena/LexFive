-- ============================================================
--  LexFive — Plantillas de memoriales (texto con campos)
--  Migración 12: tabla "plantillas"
-- ------------------------------------------------------------
--  A diferencia de "modelos" (archivos que se suben), las
--  plantillas son texto con campos como {{cliente}}, {{nurej}},
--  {{caratula}}... que el sistema rellena solo con los datos del
--  proceso elegido y genera el memorial listo para imprimir o
--  descargar en Word.
--
--  Ejecutar UNA vez en Supabase (SQL Editor), después de los
--  scripts anteriores.
-- ============================================================

create table if not exists public.plantillas (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null,
  categoria   text,
  cuerpo      text not null default '',
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_plantillas_categoria on public.plantillas(categoria);

alter table public.plantillas enable row level security;

drop policy if exists plantillas_select on public.plantillas;
create policy plantillas_select on public.plantillas for select to authenticated
  using (public.is_staff());
drop policy if exists plantillas_insert on public.plantillas;
create policy plantillas_insert on public.plantillas for insert to authenticated
  with check (public.is_staff());
drop policy if exists plantillas_update on public.plantillas;
create policy plantillas_update on public.plantillas for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists plantillas_delete on public.plantillas;
create policy plantillas_delete on public.plantillas for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());
