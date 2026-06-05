-- LexFive — Permitir varios abogados y procuradores por proceso
-- Ejecutar UNA vez en Supabase (SQL Editor), después de los scripts anteriores.
alter table public.procesos add column if not exists abogados_ids uuid[] default '{}';
alter table public.procesos add column if not exists procuradores_ids uuid[] default '{}';
