-- ============================================================
--  LexFive — Bloque 4: Papelera de procesos (borrado seguro)
--  Migración 14
-- ------------------------------------------------------------
--  En vez de borrar un proceso para siempre, se marca como
--  "eliminado" y va a una PAPELERA (visible solo para el admin),
--  desde donde se puede RESTAURAR o eliminar definitivamente.
--
--  Ejecutar UNA vez en Supabase (SQL Editor). Es seguro re-ejecutarlo.
-- ============================================================

alter table public.procesos add column if not exists eliminado     boolean not null default false;
alter table public.procesos add column if not exists eliminado_at  timestamptz;
alter table public.procesos add column if not exists eliminado_por uuid references public.profiles(id);

-- Índice para listar/ocultar rápido los eliminados.
create index if not exists idx_procesos_eliminado on public.procesos(eliminado);
