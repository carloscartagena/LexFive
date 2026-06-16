-- ============================================================
--  LexFive — VERIFICAR la base de datos (solo lectura)
-- ------------------------------------------------------------
--  Sirve para comprobar que TODOS los scripts (schema + 02..20) se
--  ejecutaron correctamente en Supabase y que la base está sana.
--  NO modifica nada. Ejecute cada bloque por separado (seleccione el
--  bloque y pulse "Run") para ver cada resultado.
-- ============================================================

-- A) Tablas del sistema y si tienen seguridad (RLS) activada.
--    Deben aparecer: actuaciones, articulos, auditoria, categorias,
--    clientes, configuracion, consultas, credenciales, documentos,
--    eventos, honorarios, modelos, pagos, plantillas, procesos,
--    profiles, tareas, testimonios.  rls_activado debe ser true.
select tablename, rowsecurity as rls_activado
from pg_tables
where schemaname = 'public'
order by tablename;

-- B) Funciones de seguridad (deben existir las 4).
select proname
from pg_proc
where proname in ('current_rol', 'is_staff', 'is_admin', 'current_email')
order by proname;

-- C) Tiempo real activado en "configuracion" (para logo/sello en vivo).
--    Debe listar la tabla configuracion.
select tablename
from pg_publication_tables
where pubname = 'supabase_realtime' and schemaname = 'public';

-- D) Políticas recientes clave (deben aparecer).
--    - configuracion_select_galerias (migración 19)
--    - eventos_select (migración 20, corrección de privacidad)
--    - credenciales_* (migración 17)
select tablename, policyname
from pg_policies
where schemaname = 'public'
  and (policyname like '%galerias%' or tablename in ('eventos', 'credenciales'))
order by tablename, policyname;

-- E) Cuántos registros hay en cada tabla (foto del estado actual).
select 'profiles'     as tabla, count(*) from public.profiles
union all select 'clientes',     count(*) from public.clientes
union all select 'procesos',     count(*) from public.procesos
union all select 'actuaciones',  count(*) from public.actuaciones
union all select 'documentos',   count(*) from public.documentos
union all select 'eventos',      count(*) from public.eventos
union all select 'tareas',       count(*) from public.tareas
union all select 'honorarios',   count(*) from public.honorarios
union all select 'pagos',        count(*) from public.pagos
union all select 'consultas',    count(*) from public.consultas
union all select 'articulos',    count(*) from public.articulos
union all select 'testimonios',  count(*) from public.testimonios
union all select 'modelos',      count(*) from public.modelos
union all select 'plantillas',   count(*) from public.plantillas
union all select 'credenciales', count(*) from public.credenciales
union all select 'categorias',   count(*) from public.categorias
union all select 'auditoria',    count(*) from public.auditoria
order by tabla;

-- F) Confirmar los usuarios que se conservarán (debe mostrar sus 4 cuentas).
select id, nombre, email, rol from public.profiles order by rol, nombre;
