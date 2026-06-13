-- ============================================================
--  LexFive — Gestión avanzada (Bloque 1)
--  Migración 11: Tareas, Plazos/eventos múltiples y Honorarios/Pagos
-- ------------------------------------------------------------
--  Cómo usarlo:
--   1. En Supabase abre "SQL Editor".
--   2. Pega TODO este archivo y pulsa "Run".
--   (Es seguro ejecutarlo varias veces.)
--
--  Resumen de permisos:
--   - TAREAS: las ve y gestiona el personal (admin/procurador/abogado).
--     Solo el autor o el admin pueden eliminarlas.
--   - EVENTOS/PLAZOS: visibles para usuarios autenticados (el cliente ve los
--     de sus procesos). Crea/edita el personal; elimina el autor o el admin.
--   - HONORARIOS y PAGOS (datos económicos): solo admin y abogado.
-- ============================================================

-- ----------------------------------------------------------------
--  TAREAS / PENDIENTES
-- ----------------------------------------------------------------
create table if not exists public.tareas (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null,
  descripcion text,
  proceso_id  uuid references public.procesos(id) on delete set null,
  asignado_a  uuid references public.profiles(id) on delete set null,
  estado      text not null default 'pendiente' check (estado in ('pendiente','en_progreso','hecha')),
  prioridad   text not null default 'media' check (prioridad in ('baja','media','alta')),
  vence       date,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_tareas_estado on public.tareas(estado);
create index if not exists idx_tareas_asignado on public.tareas(asignado_a);
create index if not exists idx_tareas_proceso on public.tareas(proceso_id);

alter table public.tareas enable row level security;
drop policy if exists tareas_select on public.tareas;
create policy tareas_select on public.tareas for select to authenticated
  using (public.current_rol() in ('admin','procurador','abogado'));
drop policy if exists tareas_insert on public.tareas;
create policy tareas_insert on public.tareas for insert to authenticated
  with check (public.current_rol() in ('admin','procurador','abogado'));
drop policy if exists tareas_update on public.tareas;
create policy tareas_update on public.tareas for update to authenticated
  using (public.current_rol() in ('admin','procurador','abogado'))
  with check (public.current_rol() in ('admin','procurador','abogado'));
drop policy if exists tareas_delete on public.tareas;
create policy tareas_delete on public.tareas for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());

-- ----------------------------------------------------------------
--  EVENTOS / PLAZOS (varios por proceso: audiencias, vencimientos...)
-- ----------------------------------------------------------------
create table if not exists public.eventos (
  id          uuid primary key default gen_random_uuid(),
  proceso_id  uuid not null references public.procesos(id) on delete cascade,
  titulo      text not null,
  tipo        text not null default 'audiencia' check (tipo in ('audiencia','plazo','reunion','otro')),
  fecha       timestamptz not null,
  nota        text,
  estado      text not null default 'pendiente' check (estado in ('pendiente','cumplido')),
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);
create index if not exists idx_eventos_proceso on public.eventos(proceso_id);
create index if not exists idx_eventos_fecha on public.eventos(fecha);

alter table public.eventos enable row level security;
drop policy if exists eventos_select on public.eventos;
create policy eventos_select on public.eventos for select to authenticated using (true);
drop policy if exists eventos_insert on public.eventos;
create policy eventos_insert on public.eventos for insert to authenticated
  with check (public.current_rol() in ('admin','procurador','abogado'));
drop policy if exists eventos_update on public.eventos;
create policy eventos_update on public.eventos for update to authenticated
  using (public.current_rol() in ('admin','procurador','abogado'))
  with check (public.current_rol() in ('admin','procurador','abogado'));
drop policy if exists eventos_delete on public.eventos;
create policy eventos_delete on public.eventos for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());

-- ----------------------------------------------------------------
--  HONORARIOS (cargos pactados) y PAGOS (cobros recibidos)
-- ----------------------------------------------------------------
create table if not exists public.honorarios (
  id          uuid primary key default gen_random_uuid(),
  proceso_id  uuid references public.procesos(id) on delete cascade,
  concepto    text not null,
  monto       numeric(12,2) not null default 0,
  moneda      text not null default 'Bs',
  fecha       date not null default current_date,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);
create index if not exists idx_honorarios_proceso on public.honorarios(proceso_id);

create table if not exists public.pagos (
  id          uuid primary key default gen_random_uuid(),
  proceso_id  uuid references public.procesos(id) on delete cascade,
  monto       numeric(12,2) not null default 0,
  moneda      text not null default 'Bs',
  metodo      text,
  nota        text,
  fecha       date not null default current_date,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);
create index if not exists idx_pagos_proceso on public.pagos(proceso_id);

alter table public.honorarios enable row level security;
alter table public.pagos      enable row level security;

-- Honorarios: solo admin y abogado
drop policy if exists honorarios_select on public.honorarios;
create policy honorarios_select on public.honorarios for select to authenticated
  using (public.current_rol() in ('admin','abogado'));
drop policy if exists honorarios_insert on public.honorarios;
create policy honorarios_insert on public.honorarios for insert to authenticated
  with check (public.current_rol() in ('admin','abogado'));
drop policy if exists honorarios_update on public.honorarios;
create policy honorarios_update on public.honorarios for update to authenticated
  using (public.current_rol() in ('admin','abogado'))
  with check (public.current_rol() in ('admin','abogado'));
drop policy if exists honorarios_delete on public.honorarios;
create policy honorarios_delete on public.honorarios for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());

-- Pagos: solo admin y abogado
drop policy if exists pagos_select on public.pagos;
create policy pagos_select on public.pagos for select to authenticated
  using (public.current_rol() in ('admin','abogado'));
drop policy if exists pagos_insert on public.pagos;
create policy pagos_insert on public.pagos for insert to authenticated
  with check (public.current_rol() in ('admin','abogado'));
drop policy if exists pagos_update on public.pagos;
create policy pagos_update on public.pagos for update to authenticated
  using (public.current_rol() in ('admin','abogado'))
  with check (public.current_rol() in ('admin','abogado'));
drop policy if exists pagos_delete on public.pagos;
create policy pagos_delete on public.pagos for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());
