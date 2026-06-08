-- ============================================================
--  LexFive — Categorías / Áreas del derecho (dinámicas)
-- ------------------------------------------------------------
--  EJECUTAR UNA SOLA VEZ en Supabase (SQL Editor), DESPUÉS de los
--  scripts anteriores (schema.sql, 02..07).
--
--  QUÉ HACE:
--   - Crea la tabla "categorias": la lista de áreas del derecho que
--     usa el sistema para clasificar procesos y modelos de memoriales.
--   - El personal puede CREAR categorías nuevas desde el panel y, al
--     hacerlo, aparecen automáticamente en todas las listas.
--   - Precarga las áreas que el sistema ya traía por defecto.
--
--  Es idempotente y no borra datos: puede ejecutarse sin riesgo.
-- ============================================================

create table if not exists public.categorias (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null unique,
  created_at  timestamptz not null default now()
);

alter table public.categorias enable row level security;

-- Ver: cualquier usuario autenticado (las listas las usa el personal)
drop policy if exists categorias_select on public.categorias;
create policy categorias_select on public.categorias for select to authenticated using (true);

-- Crear: solo el personal del bufete (admin / procurador / abogado)
drop policy if exists categorias_insert on public.categorias;
create policy categorias_insert on public.categorias for insert to authenticated with check (public.is_staff());

-- Eliminar: solo el administrador
drop policy if exists categorias_delete on public.categorias;
create policy categorias_delete on public.categorias for delete to authenticated using (public.is_admin());

-- Áreas del derecho que el sistema ya traía por defecto
insert into public.categorias (nombre) values
  ('Laboral'), ('Civil'), ('Penal'), ('Familia'),
  ('Informático'), ('Minero'), ('Agrario'), ('Deportivo'), ('Otro')
on conflict (nombre) do nothing;

-- ============================================================
--  LISTO. A partir de ahora, las áreas del derecho se administran
--  desde el panel: al crear una nueva categoría aparece sola en las
--  listas de Procesos y de Modelos de memoriales.
-- ============================================================
