-- Migración 30: Agregar columnas de docente guía, tutor, RPA y género a certificados
alter table public.certificados
  add column if not exists docente_guia text,
  add column if not exists tutor_nombre text,
  add column if not exists tutor_rpa text,
  add column if not exists genero text;
