-- ============================================================
--  LexFive — Migración 26
--  Agrega la columna 'cuerpo' a la tabla de certificados, para poder
--  REIMPRIMIR un certificado tal como se emitió (con su texto exacto).
--
--  Ejecútelo UNA vez en Supabase → SQL Editor (si ya corrió db/25 antes
--  de esta mejora). Es seguro repetirlo.
-- ============================================================

alter table public.certificados
  add column if not exists cuerpo text;
