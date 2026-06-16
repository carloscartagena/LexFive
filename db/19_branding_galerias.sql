-- ============================================================
--  LexFive — Galerías de logos/sellos en una fila aparte
--  Migración 19: permiso de lectura para 'branding_galerias'
-- ------------------------------------------------------------
--  Propósito:
--   Antes, todas las imágenes de las galerías de logos y sellos propios
--   se guardaban DENTRO de la fila 'branding' de la tabla configuracion.
--   Esa fila se descarga en CADA carga de página (incluida la web pública
--   para los clientes), así que con varias imágenes en base64 se volvía
--   pesada y lenta.
--
--   Ahora las galerías viven en una fila aparte, con la clave
--   'branding_galerias', y SOLO se cargan al abrir la pestaña Credenciales.
--   La fila 'branding' queda liviana (solo el logo/sello elegido).
--
--  Seguridad:
--   La fila 'branding' sigue siendo de lectura pública (logo del sitio).
--   La fila 'branding_galerias' (las galerías completas) solo la pueden
--   leer el administrador y los abogados. La escritura ya estaba permitida
--   a ese personal por las políticas de la migración 10.
--
--  Cómo aplicarla:
--   1. En tu proyecto de Supabase abre "SQL Editor".
--   2. Pega TODO este archivo y pulsa "Run".
--   (Es seguro ejecutarlo varias veces.)
-- ============================================================

-- Permitir LEER la fila de galerías solo al personal autorizado.
-- (Las políticas de SELECT en RLS se combinan con OR: la fila 'branding'
--  sigue siendo pública por la política de la migración 10.)
drop policy if exists configuracion_select_galerias on public.configuracion;
create policy configuracion_select_galerias on public.configuracion
  for select to authenticated
  using (clave = 'branding_galerias' and public.current_rol() in ('admin', 'abogado'));
