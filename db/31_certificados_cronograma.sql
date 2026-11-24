-- ============================================================
--  LexFive — Migración 31
--  Persistencia del cronograma de 20 jornadas y nota de remisión.
--
--  Agrega columnas para almacenar el cronograma estructurado en JSON
--  y los datos configurables de la Nota de Remisión a la Universidad (IIST).
--
--  Idempotente: seguro de ejecutar varias veces.
--  Ejecútelo en Supabase → SQL Editor y pulse Run.
-- ============================================================

alter table public.certificados
  add column if not exists cronograma_json jsonb,
  add column if not exists destinatario_remision text,
  add column if not exists cargo_remision text,
  add column if not exists celular_pasante text,
  add column if not exists firmante_remision text;

comment on column public.certificados.cronograma_json       is 'Cronograma estructurado de 20 jornadas de práctica forense (JSON)';
comment on column public.certificados.destinatario_remision is 'Destinatario de la Nota de Remisión a la Universidad';
comment on column public.certificados.cargo_remision        is 'Cargo institucional del destinatario de la Nota de Remisión';
comment on column public.certificados.celular_pasante       is 'Número de celular del pasante para pie de firma';
comment on column public.certificados.firmante_remision     is 'Firmante de la nota: estudiante | direccion';
