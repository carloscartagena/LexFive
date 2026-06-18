-- ============================================================
--  LexFive — Migración 24
--  1) Notificaciones dentro de la app (campanita).
--  2) Permitir que el CLIENTE vea los honorarios y pagos de SUS procesos
--     (para su "estado de cuenta" en el portal).
--
--  Ejecútelo UNA vez en Supabase → SQL Editor. Es seguro repetirlo.
-- ============================================================

-- ---------- 1) Notificaciones in-app ----------
create table if not exists public.notificaciones (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  titulo     text not null,
  cuerpo     text,
  url        text,
  leida      boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notif_user on public.notificaciones(user_id, created_at desc);

alter table public.notificaciones enable row level security;

-- Cada usuario ve / marca / borra SOLO sus propias notificaciones.
drop policy if exists notif_select on public.notificaciones;
create policy notif_select on public.notificaciones for select to authenticated
  using (user_id = auth.uid());

drop policy if exists notif_update on public.notificaciones;
create policy notif_update on public.notificaciones for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists notif_delete on public.notificaciones;
create policy notif_delete on public.notificaciones for delete to authenticated
  using (user_id = auth.uid());

-- Las notificaciones las CREA el backend (Edge Function avisar-actuacion) con la
-- clave de servicio, que ignora RLS. Por eso no hace falta una policy de insert
-- para usuarios normales.

-- Realtime: para que la campanita se actualice al instante.
do $$ begin
  alter publication supabase_realtime add table public.notificaciones;
exception when others then null; end $$;

-- ---------- 2) Estado de cuenta del cliente ----------
-- Hasta ahora SOLO admin/abogado podían leer honorarios y pagos. Estas dos
-- políticas ADICIONALES permiten que el cliente lea los de SUS procesos
-- (vinculados por su correo). Son permisivas: no quitan el acceso del personal.
drop policy if exists honorarios_select_cliente on public.honorarios;
create policy honorarios_select_cliente on public.honorarios for select to authenticated
  using (
    proceso_id in (
      select p.id from public.procesos p
      join public.clientes c on c.id = p.cliente_id
      where lower(c.email) = lower(public.current_email())
    )
  );

drop policy if exists pagos_select_cliente on public.pagos;
create policy pagos_select_cliente on public.pagos for select to authenticated
  using (
    proceso_id in (
      select p.id from public.procesos p
      join public.clientes c on c.id = p.cliente_id
      where lower(c.email) = lower(public.current_email())
    )
  );
