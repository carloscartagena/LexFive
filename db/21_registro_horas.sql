-- ============================================================
--  LexFive — Registro de horas trabajadas por proceso (time tracking)
--  db/21_registro_horas.sql
-- ------------------------------------------------------------
--  Crea la tabla "registro_horas" para anotar el tiempo dedicado a
--  cada proceso (sustento para la facturación). Sigue el mismo patrón
--  y la misma seguridad (RLS) que la tabla de honorarios:
--  solo el personal con rol admin o abogado puede ver y registrar.
--
--  CÓMO USARLO: pega TODO este archivo en el SQL Editor de Supabase
--  y pulsa "Run". Es seguro ejecutarlo más de una vez (usa IF NOT EXISTS
--  y DROP POLICY IF EXISTS).
-- ============================================================

create table if not exists public.registro_horas (
  id          uuid primary key default gen_random_uuid(),
  proceso_id  uuid references public.procesos(id) on delete cascade,
  minutos     integer not null check (minutos > 0),
  descripcion text,
  fecha       date not null default current_date,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);
create index if not exists idx_registro_horas_proceso on public.registro_horas(proceso_id);

alter table public.registro_horas enable row level security;

-- Solo admin y abogado (igual que honorarios)
drop policy if exists registro_horas_select on public.registro_horas;
create policy registro_horas_select on public.registro_horas for select to authenticated
  using (public.current_rol() in ('admin','abogado'));

drop policy if exists registro_horas_insert on public.registro_horas;
create policy registro_horas_insert on public.registro_horas for insert to authenticated
  with check (public.current_rol() in ('admin','abogado'));

drop policy if exists registro_horas_update on public.registro_horas;
create policy registro_horas_update on public.registro_horas for update to authenticated
  using (public.current_rol() in ('admin','abogado'))
  with check (public.current_rol() in ('admin','abogado'));

drop policy if exists registro_horas_delete on public.registro_horas;
create policy registro_horas_delete on public.registro_horas for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());
