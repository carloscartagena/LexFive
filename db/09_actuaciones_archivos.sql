-- ============================================================
--  LexFive — Adjuntar archivos a cada actuación del proceso
-- ------------------------------------------------------------
--  EJECUTAR UNA SOLA VEZ en Supabase (SQL Editor), DESPUÉS de los
--  scripts anteriores (schema.sql, 02..08).
--
--  QUÉ HACE:
--   - Vincula los documentos a una actuación concreta del historial,
--     mediante la columna "actuacion_id" en la tabla "documentos".
--     Así, cada paso del proceso (p. ej. "Respuesta del juzgado" o
--     "Nuevo memorial presentado") puede llevar sus archivos adjuntos.
--   - Si se borra la actuación, el documento no se pierde: queda como
--     documento general del proceso (actuacion_id pasa a NULL).
--
--  No cambia los permisos: el personal sube/borra; los clientes solo
--  pueden VER y descargar los documentos de SUS propios procesos
--  (las reglas ya existen desde 02_portal_clientes.sql).
--
--  Es idempotente y no borra datos.
-- ============================================================

alter table public.documentos
  add column if not exists actuacion_id uuid
  references public.actuaciones(id) on delete set null;

create index if not exists documentos_actuacion_idx
  on public.documentos (actuacion_id);

-- ============================================================
--  LISTO. Ahora, al registrar una actuación en el historial del
--  proceso, se podrán adjuntar archivos (respuesta del juzgado,
--  nuevo memorial, etc.), visibles también para el cliente del caso.
-- ============================================================
