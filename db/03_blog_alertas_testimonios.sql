-- ============================================================
--  LexFive — Fases 2 y 3
--  Blog público, teléfono de cliente y testimonios con moderación
-- ------------------------------------------------------------
--  EJECUTAR UNA SOLA VEZ en Supabase (SQL Editor), después de 02_portal_clientes.sql
-- ============================================================

-- 1) Teléfono en el perfil (opcional) + guardarlo al registrarse
alter table public.profiles add column if not exists telefono text;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nombre, email, telefono)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'telefono'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 2) BLOG PÚBLICO: que los visitantes (sin login) lean los artículos PUBLICADOS
drop policy if exists articulos_select on public.articulos;
create policy articulos_select on public.articulos for select to authenticated using (
  public.is_staff() or estado = 'publicado'
);
drop policy if exists articulos_public on public.articulos;
create policy articulos_public on public.articulos for select to anon using (estado = 'publicado');

-- 3) TESTIMONIOS (opiniones de clientes, con aprobación del admin)
create table if not exists public.testimonios (
  id           uuid primary key default gen_random_uuid(),
  autor_id     uuid references public.profiles(id) on delete set null,
  nombre       text,
  detalle      text,                       -- ej. "Cliente" o tipo de caso
  texto        text not null,
  calificacion int not null default 5 check (calificacion between 1 and 5),
  estado       text not null default 'pendiente' check (estado in ('pendiente','aprobado','rechazado')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.testimonios enable row level security;

-- Lectura pública SOLO de los aprobados (para la página web)
drop policy if exists testimonios_public on public.testimonios;
create policy testimonios_public on public.testimonios for select to anon using (estado = 'aprobado');

-- Lectura autenticada: aprobados + los propios + todo si es personal
drop policy if exists testimonios_select on public.testimonios;
create policy testimonios_select on public.testimonios for select to authenticated using (
  estado = 'aprobado' or autor_id = auth.uid() or public.is_staff()
);

-- El cliente crea su propio testimonio (nace 'pendiente')
drop policy if exists testimonios_insert on public.testimonios;
create policy testimonios_insert on public.testimonios for insert to authenticated with check (autor_id = auth.uid());

-- El autor puede editar el suyo, pero solo dejándolo 'pendiente' (no puede auto-aprobarse)
drop policy if exists testimonios_update_autor on public.testimonios;
create policy testimonios_update_autor on public.testimonios for update to authenticated
  using (autor_id = auth.uid()) with check (autor_id = auth.uid() and estado = 'pendiente');

-- El admin modera (aprueba / rechaza) cualquiera
drop policy if exists testimonios_update_admin on public.testimonios;
create policy testimonios_update_admin on public.testimonios for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Borrado: el autor el suyo, o el admin cualquiera
drop policy if exists testimonios_delete on public.testimonios;
create policy testimonios_delete on public.testimonios for delete to authenticated
  using (autor_id = auth.uid() or public.is_admin());

-- ============================================================
--  LISTO. Ahora:
--   - La web pública mostrará los artículos PUBLICADOS y los testimonios APROBADOS.
--   - Los clientes pueden dejar su opinión (queda pendiente hasta que el admin la apruebe).
-- ============================================================
