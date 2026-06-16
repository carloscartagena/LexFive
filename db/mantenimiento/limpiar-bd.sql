-- ============================================================
--  LexFive — LIMPIAR la base de datos (¡DESTRUCTIVO!)
-- ------------------------------------------------------------
--  Borra TODOS los datos del sistema y CONSERVA únicamente las
--  cuentas de usuario (los 4 perfiles: 1 administrador y 3 abogados).
--
--  ⚠️  ADVERTENCIA: esto NO se puede deshacer. Antes de ejecutarlo:
--   1) Haga un respaldo: en el panel, "Panel general" → "Exportar
--      respaldo (JSON)". (También hay respaldo automático diario.)
--   2) Verifique con db/mantenimiento/verificar-bd.sql qué hay.
--   3) Ejecute este script en Supabase → SQL Editor.
--
--  Qué CONSERVA:
--   - public.profiles  (sus 4 usuarios)  y  auth.users (las cuentas).
--   - Por defecto, también conserva el LOGO/SELLO (configuracion) y las
--     CATEGORÍAS/áreas (categorias), porque son configuración, no datos.
--     Si desea borrarlas también, descomente la SECCIÓN OPCIONAL abajo.
--
--  Qué BORRA: clientes, procesos, actuaciones, documentos (metadatos),
--   eventos, tareas, honorarios, pagos, consultas, artículos del blog,
--   testimonios, modelos, plantillas, credenciales y la bitácora de
--   auditoría.
--
--  NOTA sobre archivos: los ARCHIVOS subidos (memoriales, adjuntos) viven
--   en Supabase Storage (bucket "documentos"). Este script borra solo sus
--   metadatos. Para borrar los archivos en sí: Supabase → Storage →
--   bucket "documentos" → seleccionar y eliminar.
-- ============================================================

-- Borra todos los datos operativos. RESTART IDENTITY reinicia contadores;
-- CASCADE limpia las filas hijas. profiles NO está en la lista => se conserva.
truncate table
  public.documentos,
  public.actuaciones,
  public.eventos,
  public.honorarios,
  public.pagos,
  public.tareas,
  public.procesos,
  public.clientes,
  public.articulos,
  public.testimonios,
  public.auditoria,
  public.modelos,
  public.consultas,
  public.plantillas,
  public.credenciales
restart identity cascade;

-- Reinicia la numeración correlativa de recibos (los pagos se borraron).
alter sequence if exists public.recibo_nro_seq restart with 1;

-- ============================================================
--  SECCIÓN OPCIONAL (déjela comentada si quiere conservar el logo,
--  el sello y las áreas/categorías del bufete).
--  Quite los "--" del inicio SOLO si desea borrarlas también.
-- ============================================================
-- truncate table public.categorias restart identity cascade;  -- borra las áreas del derecho
-- delete from public.configuracion;                            -- borra el logo y el sello elegidos

-- ============================================================
--  Comprobación final: deben quedar solo sus 4 usuarios y todo lo
--  demás en 0.
-- ============================================================
select 'profiles (se conservan)' as tabla, count(*) from public.profiles
union all select 'clientes', count(*) from public.clientes
union all select 'procesos', count(*) from public.procesos
union all select 'documentos', count(*) from public.documentos
union all select 'eventos', count(*) from public.eventos
union all select 'honorarios', count(*) from public.honorarios
union all select 'pagos', count(*) from public.pagos
union all select 'credenciales', count(*) from public.credenciales
order by tabla;
