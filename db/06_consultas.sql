-- ============================================================
--  LexFive — Bandeja de Consultas (formulario de contacto del sitio)
-- ------------------------------------------------------------
--  EJECUTAR UNA SOLA VEZ en Supabase (SQL Editor), después de los
--  scripts anteriores (schema.sql, 02..05).
--
--  Qué hace:
--   - Crea la tabla "consultas": cada mensaje enviado desde el
--     formulario de contacto de la web pública queda guardado aquí
--     y aparece en la pestaña "Consultas" del panel.
--   - Cualquiera (visitante sin login) puede ENVIAR una consulta.
--   - Solo el personal (admin/procurador/abogado) puede verlas y
--     gestionarlas; solo el admin puede eliminarlas.
-- ============================================================

create table if not exists public.consultas (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  apellido    text,
  email       text,
  telefono    text,
  area        text,
  mensaje     text not null,
  estado      text not null default 'nueva' check (estado in ('nueva','atendida','archivada')),
  created_at  timestamptz not null default now()
);

create index if not exists consultas_estado_idx on public.consultas (estado, created_at desc);

alter table public.consultas enable row level security;

-- Enviar una consulta: permitido a cualquiera (web pública sin sesión)
drop policy if exists consultas_insert_anon on public.consultas;
create policy consultas_insert_anon on public.consultas for insert to anon with check (true);
drop policy if exists consultas_insert_auth on public.consultas;
create policy consultas_insert_auth on public.consultas for insert to authenticated with check (true);

-- Ver / actualizar (cambiar estado): solo el personal del bufete
drop policy if exists consultas_select on public.consultas;
create policy consultas_select on public.consultas for select to authenticated using (public.is_staff());
drop policy if exists consultas_update on public.consultas;
create policy consultas_update on public.consultas for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- Eliminar: solo el administrador
drop policy if exists consultas_delete on public.consultas;
create policy consultas_delete on public.consultas for delete to authenticated using (public.is_admin());

-- ============================================================
--  LISTO. Las consultas del formulario de contacto llegarán a la
--  pestaña "Consultas" del panel (además del correo, si está activo).
-- ============================================================
