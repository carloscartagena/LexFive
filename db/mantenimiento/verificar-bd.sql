-- ============================================================
--  LexFive — VERIFICAR la base de datos (solo lectura, no borra nada)
--  db/mantenimiento/verificar-bd.sql
-- ------------------------------------------------------------
--  CÓMO USARLO (importante):
--   Este archivo tiene 4 BLOQUES separados por líneas de "====".
--   Ejecútalos UNO POR UNO: selecciona el bloque completo con el
--   mouse y pulsa "Run" en el SQL Editor de Supabase. Así ves el
--   resultado de cada comprobación por separado.
--
--   NO modifica nada: solo consulta. Es seguro ejecutarlo cuando
--   quieras (antes y después de limpiar).
-- ============================================================


-- ============================================================
--  BLOQUE 1 — ¿Están todas las tablas y tienen seguridad (RLS)?
--  Debe listar las 18 tablas del sistema, todas con "RLS ACTIVADA".
-- ============================================================
select
  esperada.tabla,
  case when c.relname is null then '❌ FALTA' else '✅ existe' end as estado,
  case
    when c.relname is null then '—'
    when c.relrowsecurity then '🔒 RLS ACTIVADA'
    else '⚠️ RLS DESACTIVADA'
  end as seguridad
from (values
  ('profiles'),('clientes'),('procesos'),('actuaciones'),('documentos'),
  ('articulos'),('auditoria'),('testimonios'),('modelos'),('consultas'),
  ('categorias'),('configuracion'),('tareas'),('eventos'),('honorarios'),
  ('pagos'),('plantillas'),('credenciales')
) as esperada(tabla)
left join pg_class c
  on c.relname = esperada.tabla
 and c.relnamespace = 'public'::regnamespace
order by esperada.tabla;


-- ============================================================
--  BLOQUE 2 — Funciones de seguridad y políticas (RLS)
--  2a) Deben aparecer las 6 funciones auxiliares.
--  2b) Lista de políticas por tabla (deben existir varias).
--  2c) Comprobación específica del ARREGLO DE EVENTOS (migración 20):
--      la condición de "eventos_select" debe mencionar is_staff()
--      y filtrar por el correo del cliente (NO debe decir solo "true").
-- ============================================================

-- 2a) Funciones auxiliares
select proname as funcion, '✅ existe' as estado
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('is_admin','is_staff','current_rol','current_email','handle_new_user','set_recibo_nro')
order by proname;

-- 2b) Políticas por tabla (resumen)
select schemaname, tablename, count(*) as nro_politicas
from pg_policies
where schemaname = 'public'
group by schemaname, tablename
order by tablename;

-- 2c) El arreglo de seguridad de "eventos" (migración 20)
select polname as politica,
       pg_get_expr(polqual, polrelid) as condicion_de_lectura
from pg_policy
where polrelid = 'public.eventos'::regclass
  and polname = 'eventos_select';


-- ============================================================
--  BLOQUE 3 — ¿Está activo el TIEMPO REAL (Realtime)?
--  Debe aparecer al menos la tabla "configuracion" (branding en vivo).
-- ============================================================
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
order by tablename;


-- ============================================================
--  BLOQUE 4 — Cuántos registros hay y quiénes son tus usuarios
--  4a) Conteo de filas por tabla.
--  4b) Lista de usuarios (perfiles): deberías ver tus 4 usuarios
--      (1 admin + 3 abogados) si la base ya está limpia.
-- ============================================================

-- 4a) Conteo por tabla
select 'profiles'      as tabla, count(*) from public.profiles
union all select 'clientes',      count(*) from public.clientes
union all select 'procesos',      count(*) from public.procesos
union all select 'actuaciones',   count(*) from public.actuaciones
union all select 'documentos',    count(*) from public.documentos
union all select 'articulos',     count(*) from public.articulos
union all select 'auditoria',     count(*) from public.auditoria
union all select 'testimonios',   count(*) from public.testimonios
union all select 'modelos',       count(*) from public.modelos
union all select 'consultas',     count(*) from public.consultas
union all select 'categorias',    count(*) from public.categorias
union all select 'configuracion', count(*) from public.configuracion
union all select 'tareas',        count(*) from public.tareas
union all select 'eventos',       count(*) from public.eventos
union all select 'honorarios',    count(*) from public.honorarios
union all select 'pagos',         count(*) from public.pagos
union all select 'plantillas',    count(*) from public.plantillas
union all select 'credenciales',  count(*) from public.credenciales
order by tabla;

-- 4b) Tus usuarios (perfiles)
select nombre, email, rol, activo, created_at
from public.profiles
order by
  case rol when 'admin' then 0 when 'procurador' then 1 when 'abogado' then 2 else 3 end,
  nombre;
