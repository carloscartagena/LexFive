-- ============================================================
--  LexFive — LIMPIAR la base de datos conservando los 4 usuarios
--  db/mantenimiento/limpiar-bd.sql
-- ------------------------------------------------------------
--  ⚠️  ESTE SCRIPT BORRA DATOS DE FORMA DEFINITIVA. ⚠️
--
--  ANTES DE EJECUTARLO:
--   1. Haz un respaldo (Panel → Panel general → "Exportar respaldo (JSON)").
--      Además ya existe el respaldo automático diario (GitHub Actions).
--   2. Asegúrate de que tus 4 usuarios (1 admin + 3 abogados) tienen su
--      rol correcto: admin / procurador / abogado (NO 'cliente').
--      Puedes verificarlo con db/mantenimiento/verificar-bd.sql (Bloque 4b).
--
--  QUÉ CONSERVA:
--   - Los usuarios del personal (perfiles con rol admin/procurador/abogado)
--     y sus cuentas de acceso (auth.users).
--   - Por defecto: el logo/sello (configuración) y las categorías/áreas.
--
--  QUÉ BORRA:
--   - clientes, procesos, actuaciones, documentos, eventos, tareas,
--     honorarios, pagos, consultas, artículos, testimonios, modelos,
--     plantillas, credenciales y la auditoría.
--   - Las cuentas de los CLIENTES auto-registrados (perfiles con rol
--     'cliente' y su acceso en auth.users).
--
--  CÓMO USARLO:
--   Ejecuta este archivo completo en el SQL Editor de Supabase (pega
--   todo y pulsa "Run"). Va dentro de una transacción: si algo falla,
--   no se aplica nada.
--
--  NOTA SOBRE ARCHIVOS (Storage): este script borra los DATOS, pero los
--  archivos subidos (memoriales/adjuntos) viven en Supabase → Storage →
--  bucket "documentos". Esos hay que vaciarlos a mano (ver Paso 4).
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) Borrar todos los DATOS operativos.
--    TRUNCATE con CASCADE respeta las relaciones entre estas tablas
--    y "restart identity" reinicia los contadores internos.
-- ------------------------------------------------------------
truncate table
  public.auditoria,
  public.documentos,
  public.actuaciones,
  public.eventos,
  public.tareas,
  public.pagos,
  public.honorarios,
  public.procesos,
  public.clientes,
  public.consultas,
  public.testimonios,
  public.modelos,
  public.plantillas,
  public.credenciales,
  public.articulos
restart identity cascade;

-- Reiniciar la numeración correlativa de recibos (migración 15),
-- para que el próximo recibo vuelva a empezar en 1.
alter sequence if exists public.recibo_nro_seq restart with 1;

-- ------------------------------------------------------------
-- 2) Borrar las cuentas de los CLIENTES (auto-registrados).
--    Se eliminan de auth.users; por la relación "on delete cascade"
--    también desaparece su fila en public.profiles.
--    Se CONSERVAN únicamente las cuentas del personal del bufete.
-- ------------------------------------------------------------
delete from auth.users
where id not in (
  select id from public.profiles
  where rol in ('admin', 'procurador', 'abogado')
);

-- ============================================================
--  DECISIONES OPCIONALES (por defecto NO se ejecutan).
--  Si también quieres borrarlas, quita los "--" del inicio de la línea.
-- ============================================================

-- (A) Borrar también el LOGO / SELLO y las galerías (branding):
-- delete from public.configuracion where clave in ('branding', 'branding_galerias');

-- (B) Borrar también las CATEGORÍAS / ÁREAS del derecho:
-- truncate table public.categorias restart identity cascade;

commit;

-- ============================================================
--  COMPROBACIÓN FINAL (se ejecuta sola al terminar).
--  Debe quedar SOLO la tabla "profiles" con tus 4 usuarios y
--  TODO LO DEMÁS en 0 (salvo categorias/configuracion si decidiste
--  conservarlas, que es lo recomendado).
-- ============================================================
select 'profiles'      as tabla, count(*) as registros from public.profiles
union all select 'clientes',      count(*) from public.clientes
union all select 'procesos',      count(*) from public.procesos
union all select 'actuaciones',   count(*) from public.actuaciones
union all select 'documentos',    count(*) from public.documentos
union all select 'articulos',     count(*) from public.articulos
union all select 'auditoria',     count(*) from public.auditoria
union all select 'testimonios',   count(*) from public.testimonios
union all select 'modelos',       count(*) from public.modelos
union all select 'consultas',     count(*) from public.consultas
union all select 'tareas',        count(*) from public.tareas
union all select 'eventos',       count(*) from public.eventos
union all select 'honorarios',    count(*) from public.honorarios
union all select 'pagos',         count(*) from public.pagos
union all select 'plantillas',    count(*) from public.plantillas
union all select 'credenciales',  count(*) from public.credenciales
union all select 'categorias (se conserva)',    count(*) from public.categorias
union all select 'configuracion (se conserva)', count(*) from public.configuracion
order by tabla;

-- Y tus usuarios conservados (deberían ser 4):
select nombre, email, rol, activo
from public.profiles
order by
  case rol when 'admin' then 0 when 'procurador' then 1 when 'abogado' then 2 else 3 end,
  nombre;
