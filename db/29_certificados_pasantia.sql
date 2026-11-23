-- ============================================================
--  LexFive — Migración 29
--  Soporte para certificados de pasantía universitaria.
--
--  Agrega columnas opcionales para pasantías sin romper los
--  registros existentes (todos quedan como tipo_certificado='trabajo').
--  Actualiza la función pública de verificación por QR para
--  incluir los datos de pasantía relevantes.
--
--  Idempotente: seguro de ejecutar varias veces.
--  Ejecútelo en Supabase → SQL Editor y pulse Run.
-- ============================================================

-- =============================================
--  1. NUEVAS COLUMNAS
-- =============================================

-- Discriminador simple: 'trabajo' | 'pasantia' | 'horas' | etc.
-- Los registros existentes quedan con 'trabajo' automáticamente.
alter table public.certificados
  add column if not exists tipo_certificado text not null default 'trabajo';

-- Columnas específicas de pasantía universitaria (todas nullable)
alter table public.certificados
  add column if not exists registro_universitario text;

alter table public.certificados
  add column if not exists universidad text;

alter table public.certificados
  add column if not exists carrera_plan text;

alter table public.certificados
  add column if not exists asignatura text;

alter table public.certificados
  add column if not exists nota_designacion text;

-- Se usa DATE para consistencia con fecha_emision.
alter table public.certificados
  add column if not exists fecha_nota_designacion date;

alter table public.certificados
  add column if not exists modalidad text;

alter table public.certificados
  add column if not exists horario text;

-- Fechas de inicio/fin del período de pasantía.
alter table public.certificados
  add column if not exists fecha_inicio date;

alter table public.certificados
  add column if not exists fecha_fin date;

-- Flag para incluir sello digital en el PDF.
alter table public.certificados
  add column if not exists incluir_sello_digital boolean not null default true;

-- Comentarios para documentación del esquema.
comment on column public.certificados.tipo_certificado       is 'Discriminador: trabajo, pasantia, horas, recomendacion, desempeno, servicios, aceptacion_pasantia';
comment on column public.certificados.registro_universitario is 'Pasantía: registro universitario del estudiante';
comment on column public.certificados.universidad            is 'Pasantía: nombre de la universidad (ej. U.M.S.A.)';
comment on column public.certificados.carrera_plan           is 'Pasantía: carrera y plan de estudios';
comment on column public.certificados.asignatura             is 'Pasantía: asignatura de pasantía (ej. CJR-410)';
comment on column public.certificados.nota_designacion       is 'Pasantía: N.º de nota de designación';
comment on column public.certificados.fecha_nota_designacion is 'Pasantía: fecha de la nota de designación';
comment on column public.certificados.modalidad              is 'Pasantía: ej. 4 semanas a medio tiempo (4 h/día)';
comment on column public.certificados.horario                is 'Pasantía: ej. 14:00 a 18:00';
comment on column public.certificados.fecha_inicio           is 'Fecha de inicio del período (trabajo o pasantía)';
comment on column public.certificados.fecha_fin              is 'Fecha de fin del período (trabajo o pasantía)';
comment on column public.certificados.incluir_sello_digital  is 'Si es true, el PDF incluye la imagen del sello';

-- Índice para filtrar por tipo de certificado.
create index if not exists idx_certificados_tipo_cert
  on public.certificados(tipo_certificado);

-- =============================================
--  2. POLÍTICAS RLS — sin cambios necesarios
-- =============================================
-- Las 4 políticas (select/insert/update/delete) usan
-- condiciones a nivel de FILA basadas en profiles.rol,
-- NO a nivel de columna. Las nuevas columnas heredan
-- automáticamente los mismos permisos: solo admin/abogado
-- pueden leer/escribir. No hace falta tocar las políticas.

-- =============================================
--  3. FUNCIÓN PÚBLICA DE VERIFICACIÓN POR QR
-- =============================================
-- Se reemplaza para incluir los campos de pasantía que son
-- RELEVANTES para la verificación pública, sin exponer datos
-- administrativos internos (nota_designacion, horario, etc.).
--
-- NOTA: CREATE OR REPLACE no puede cambiar el tipo de retorno
-- de una función existente. Por eso hacemos DROP + CREATE.

drop function if exists public.verificar_certificado(text);

create or replace function public.verificar_certificado(p_ref text)
returns table (
  ref                text,
  tipo               text,
  tipo_certificado   text,
  nombre             text,
  ci                 text,
  cargo              text,
  periodo            text,
  universidad        text,
  carrera_plan       text,
  asignatura         text,
  modalidad          text,
  fecha_inicio       date,
  fecha_fin          date,
  fecha_emision      date,
  created_at         timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    c.ref,
    c.tipo,
    c.tipo_certificado,
    c.nombre,
    c.ci,
    c.cargo,
    c.periodo,
    c.universidad,
    c.carrera_plan,
    c.asignatura,
    c.modalidad,
    c.fecha_inicio,
    c.fecha_fin,
    c.fecha_emision,
    c.created_at
  from public.certificados c
  where c.ref = p_ref
  limit 1;
$$;

grant execute on function public.verificar_certificado(text) to anon, authenticated;
