-- ============================================================
--  LexFive — Migración 25
--  Registro de certificados emitidos + verificación pública por
--  número de referencia (para la página verificar-certificado.html).
--
--  Ejecútelo UNA vez en Supabase → SQL Editor. Es seguro repetirlo.
-- ============================================================

create table if not exists public.certificados (
  id            uuid primary key default gen_random_uuid(),
  ref           text unique not null,
  tipo          text,
  nombre        text not null,
  ci            text,
  cargo         text,
  periodo       text,
  fecha_emision date,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now()
);

create index if not exists idx_certificados_ref on public.certificados(ref);

alter table public.certificados enable row level security;

-- Solo el personal (administrador / abogado) puede registrar y consultar la
-- lista de certificados emitidos.
drop policy if exists certificados_select on public.certificados;
create policy certificados_select on public.certificados for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.rol in ('admin', 'abogado')));

drop policy if exists certificados_insert on public.certificados;
create policy certificados_insert on public.certificados for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.rol in ('admin', 'abogado')));

drop policy if exists certificados_update on public.certificados;
create policy certificados_update on public.certificados for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.rol in ('admin', 'abogado')));

drop policy if exists certificados_delete on public.certificados;
create policy certificados_delete on public.certificados for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.rol in ('admin', 'abogado')));

-- ---- Verificación PÚBLICA por número de referencia ----
-- La página de verificación es pública (sin login). Para NO exponer toda la
-- tabla (y evitar que alguien la "liste"), la verificación se hace con una
-- función que devuelve UN certificado SOLO si se conoce su referencia exacta.
create or replace function public.verificar_certificado(p_ref text)
returns table (
  ref text, tipo text, nombre text, ci text, cargo text,
  periodo text, fecha_emision date, created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select c.ref, c.tipo, c.nombre, c.ci, c.cargo, c.periodo, c.fecha_emision, c.created_at
  from public.certificados c
  where c.ref = p_ref
  limit 1;
$$;

grant execute on function public.verificar_certificado(text) to anon, authenticated;
