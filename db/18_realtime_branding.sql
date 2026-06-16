-- ============================================================
--  LexFive — Branding en tiempo real (logo y sello en vivo)
--  Migración 18: habilita Realtime en la tabla "configuracion"
-- ------------------------------------------------------------
--  Propósito:
--   Hacer que, cuando se cambia el logo o el sello del bufete en un
--   dispositivo (p. ej. la computadora), el cambio aparezca al instante
--   en los demás dispositivos que tengan el panel abierto (el celular),
--   SIN necesidad de recargar la página.
--
--   Para lograrlo, Supabase debe "publicar" los cambios de la tabla
--   "configuracion" por su canal de tiempo real (Realtime). Esta
--   migración agrega esa tabla a la publicación de Realtime.
--
--  Seguridad:
--   La fila de branding ya es de lectura pública (ver migración 10), por
--   lo que es seguro publicar sus cambios. No se exponen otras claves.
--
--  Cómo aplicarla:
--   1. En tu proyecto de Supabase abre "SQL Editor".
--   2. Pega TODO este archivo y pulsa "Run".
--   (Es seguro ejecutarlo varias veces.)
-- ============================================================

-- Agrega la tabla a la publicación de Realtime solo si aún no está.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'configuracion'
  ) then
    alter publication supabase_realtime add table public.configuracion;
  end if;
end
$$;
