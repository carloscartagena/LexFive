-- ============================================================
--  LexFive — Ficha completa y slug para Áreas de Práctica
-- ------------------------------------------------------------
--  EJECUTAR EN SUPABASE (SQL Editor) para habilitar fichas completas
--  y URLs amigables de especialidad (area.html?slug=...).
--
--  Es idempotente y totalmente seguro.
-- ============================================================

alter table public.areas_practica
  add column if not exists detalle_json jsonb,
  add column if not exists slug text;

create index if not exists areas_practica_slug_idx on public.areas_practica (slug);

-- Generar slug inicial para áreas existentes que no lo tengan
update public.areas_practica
set slug = lower(regexp_replace(
  regexp_replace(
    translate(titulo, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN'),
    '[^a-zA-Z0-9\s-]', '', 'g'
  ),
  '\s+', '-', 'g'
))
where slug is null or slug = '';
