-- ============================================================
--  LexFive — Áreas de práctica (carrusel de la web pública)
-- ------------------------------------------------------------
--  EJECUTAR UNA SOLA VEZ en Supabase (SQL Editor), DESPUÉS de los
--  scripts anteriores (schema.sql, 02..26).
--
--  QUÉ HACE:
--   - Crea la tabla "areas_practica": las áreas del derecho que el
--     bufete muestra en la página de inicio, como un CARRUSEL.
--   - Cada área tiene título, descripción e imagen propia.
--   - El personal (admin / abogado) las administra desde el panel
--     («Áreas de práctica»): crear, editar, ordenar, mostrar/ocultar.
--   - La web pública (visitantes SIN sesión) puede LEER las activas,
--     por eso la política de lectura incluye al rol anónimo.
--   - Precarga las áreas que el sitio ya traía por defecto, para que
--     el carrusel no aparezca vacío la primera vez.
--
--  Es idempotente y no borra datos: puede ejecutarse sin riesgo.
-- ============================================================

create table if not exists public.areas_practica (
  id           uuid primary key default gen_random_uuid(),
  titulo       text not null,
  descripcion  text not null default '',
  imagen_url   text,
  orden        integer not null default 0,
  activo       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- Índice para listar rápido por orden.
create index if not exists areas_practica_orden_idx on public.areas_practica (orden);

alter table public.areas_practica enable row level security;

-- Ver: cualquiera, INCLUIDO el público anónimo de la web (solo lectura).
-- El panel y la web filtran por "activo" según corresponda.
drop policy if exists areas_practica_select on public.areas_practica;
create policy areas_practica_select on public.areas_practica
  for select to anon, authenticated using (true);

-- Crear: solo el personal del bufete (admin / procurador / abogado).
drop policy if exists areas_practica_insert on public.areas_practica;
create policy areas_practica_insert on public.areas_practica
  for insert to authenticated with check (public.is_staff());

-- Editar: solo el personal del bufete.
drop policy if exists areas_practica_update on public.areas_practica;
create policy areas_practica_update on public.areas_practica
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- Eliminar: solo el administrador.
drop policy if exists areas_practica_delete on public.areas_practica;
create policy areas_practica_delete on public.areas_practica
  for delete to authenticated using (public.is_admin());

-- ------------------------------------------------------------
--  Datos semilla: las áreas que el sitio ya mostraba por defecto.
--  Solo se insertan si la tabla está vacía (para no duplicar).
-- ------------------------------------------------------------
insert into public.areas_practica (titulo, descripcion, orden)
select * from (values
  ('Derecho Laboral',        'Despidos, beneficios sociales, reincorporaciones y conflictos entre empleadores y trabajadores.', 1),
  ('Derecho Civil',          'Contratos, propiedad, responsabilidad civil, arrendamientos y conflictos patrimoniales.', 2),
  ('Derecho Penal',          'Defensa penal estratégica y representación en todas las etapas del proceso.', 3),
  ('Derecho de Familia',     'Divorcios, asistencia familiar, custodia, filiación, sucesiones y testamentos.', 4),
  ('Derecho Informático',    'Protección de datos, delitos informáticos, contratos tecnológicos, firma y comercio digital.', 5),
  ('Derecho Minero',         'Concesiones, contratos mineros, regalías y cumplimiento de la normativa sectorial y ambiental.', 6),
  ('Derecho Agrario',        'Propiedad agraria, saneamiento y titulación de tierras, y resolución de conflictos rurales.', 7),
  ('Derecho Constitucional', 'Amparos, acciones de libertad y de protección, y defensa de derechos fundamentales.', 8)
) as v(titulo, descripcion, orden)
where not exists (select 1 from public.areas_practica);

-- ============================================================
--  LISTO. A partir de ahora, las áreas de práctica se administran
--  desde el panel («Áreas de práctica») y se muestran en el
--  carrusel de la página de inicio.
-- ============================================================
