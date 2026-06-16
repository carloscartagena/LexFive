-- ============================================================
--  LexFive — Suscripciones de notificaciones push (función #10, Fase A)
--  db/22_push_subscriptions.sql
-- ------------------------------------------------------------
--  Guarda a qué dispositivos enviar las notificaciones push de cada usuario.
--  Cada usuario gestiona SOLO sus propias suscripciones (RLS).
--
--  CÓMO USARLO: pega TODO este archivo en el SQL Editor de Supabase y
--  pulsa "Run". Es seguro re-ejecutarlo (IF NOT EXISTS / DROP POLICY IF EXISTS).
-- ============================================================

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_push_subscriptions_user on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

-- Cada usuario solo ve / crea / borra SUS propias suscripciones.
drop policy if exists push_subscriptions_select on public.push_subscriptions;
create policy push_subscriptions_select on public.push_subscriptions for select to authenticated
  using (user_id = auth.uid());

drop policy if exists push_subscriptions_insert on public.push_subscriptions;
create policy push_subscriptions_insert on public.push_subscriptions for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists push_subscriptions_update on public.push_subscriptions;
create policy push_subscriptions_update on public.push_subscriptions for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists push_subscriptions_delete on public.push_subscriptions;
create policy push_subscriptions_delete on public.push_subscriptions for delete to authenticated
  using (user_id = auth.uid());
