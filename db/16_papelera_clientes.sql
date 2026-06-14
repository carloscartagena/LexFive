-- ============================================================
--  LexFive — Papelera de clientes (borrado seguro)
--  Migración 16
-- ------------------------------------------------------------
--  Igual que la papelera de procesos (migración 14): en lugar de
--  borrar un cliente para siempre, se marca como "eliminado" y va a
--  una PAPELERA (visible solo para el admin), desde donde se puede
--  RESTAURAR o eliminar definitivamente.
--
--  No cambia las reglas de acceso (RLS): seguir creando/editando es
--  igual; estas columnas solo controlan qué se muestra. El borrado
--  definitivo sigue siendo exclusivo del administrador.
--
--  Ejecutar UNA vez en Supabase (SQL Editor). Es seguro re-ejecutarlo.
-- ============================================================

alter table public.clientes add column if not exists eliminado     boolean not null default false;
alter table public.clientes add column if not exists eliminado_at  timestamptz;
alter table public.clientes add column if not exists eliminado_por uuid references public.profiles(id);

-- Índice para listar/ocultar rápido los eliminados.
create index if not exists idx_clientes_eliminado on public.clientes(eliminado);
