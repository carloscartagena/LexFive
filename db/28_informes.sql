-- ============================================================
--  LexFive — Informes de pasantía guardados (lista compartida)
--  Permite guardar varios informes y reabrirlos/editarlos desde cualquier
--  dispositivo del bufete. EJECUTAR UNA SOLA VEZ en Supabase (SQL Editor).
-- ============================================================
create table if not exists public.informes (
  id          uuid primary key default gen_random_uuid(),
  etiqueta    text,
  datos       jsonb not null default '{}'::jsonb,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_informes_updated on public.informes(updated_at desc);

alter table public.informes enable row level security;

-- Solo el personal (administrador y abogado) puede ver/crear/editar/eliminar.
drop policy if exists informes_select on public.informes;
create policy informes_select on public.informes for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.rol in ('admin','abogado')));

drop policy if exists informes_insert on public.informes;
create policy informes_insert on public.informes for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.rol in ('admin','abogado')));

drop policy if exists informes_update on public.informes;
create policy informes_update on public.informes for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.rol in ('admin','abogado')));

drop policy if exists informes_delete on public.informes;
create policy informes_delete on public.informes for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.rol in ('admin','abogado')));
