-- ============================================================
--  LexFive — Numeración correlativa de recibos
--  Migración 15
-- ------------------------------------------------------------
--  Asigna a cada PAGO un número de recibo correlativo y permanente
--  (1, 2, 3, ...) mediante una secuencia y un trigger. Los pagos
--  que ya existían reciben su número en orden cronológico.
--
--  Ejecutar UNA vez en Supabase (SQL Editor). Es seguro re-ejecutarlo.
-- ============================================================

-- 1) Secuencia global de recibos.
create sequence if not exists public.recibo_nro_seq;

-- 2) Columna que guarda el número correlativo del recibo en cada pago.
alter table public.pagos add column if not exists nro_recibo bigint;

-- 3) Backfill: numerar los pagos existentes que aún no tienen número,
--    en orden cronológico (por fecha y luego por created_at).
do $$
declare r record;
begin
  for r in
    select id from public.pagos
    where nro_recibo is null
    order by fecha asc nulls last, created_at asc
  loop
    update public.pagos set nro_recibo = nextval('public.recibo_nro_seq') where id = r.id;
  end loop;
end $$;

-- 4) Trigger: asignar automáticamente el número al insertar un pago nuevo.
create or replace function public.set_recibo_nro()
returns trigger language plpgsql as $$
begin
  if new.nro_recibo is null then
    new.nro_recibo := nextval('public.recibo_nro_seq');
  end if;
  return new;
end $$;

drop trigger if exists trg_set_recibo_nro on public.pagos;
create trigger trg_set_recibo_nro
  before insert on public.pagos
  for each row execute function public.set_recibo_nro();

-- 5) Índice único para garantizar que no se repitan números.
create unique index if not exists idx_pagos_nro_recibo on public.pagos(nro_recibo);
