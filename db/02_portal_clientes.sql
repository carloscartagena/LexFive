-- ============================================================
--  LexFive — Fase 1: Portal de Clientes y Control de Acceso
-- ------------------------------------------------------------
--  EJECUTAR UNA SOLA VEZ en Supabase (SQL Editor), DESPUÉS de schema.sql.
--
--  Qué hace:
--   - Agrega el rol 'cliente' y hace que los NUEVOS registros sean 'cliente'
--     por defecto (así, quien se registre solo, NO ve datos del bufete).
--   - Aísla los datos: cada cliente solo ve SUS procesos (vinculado por correo).
--   - El personal (admin/procurador/abogado) sigue viendo y gestionando todo.
--   - Solo el personal puede crear/editar; solo el admin elimina.
-- ============================================================

-- 1) Rol 'cliente' + valor por defecto
alter table public.profiles drop constraint if exists profiles_rol_check;
alter table public.profiles add constraint profiles_rol_check
  check (rol in ('admin','procurador','abogado','cliente'));
alter table public.profiles alter column rol set default 'cliente';

-- 2) Funciones auxiliares
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and activo and rol in ('admin','procurador','abogado')
  );
$$;

create or replace function public.current_email()
returns text language sql stable security definer set search_path = public as $$
  select email from public.profiles where id = auth.uid();
$$;

-- ============================================================
--  RLS — Reglas de acceso (reescritas para incluir clientes)
-- ============================================================

-- ---- PROFILES ----
-- El personal ve todos los perfiles; el cliente solo ve el suyo y los del personal
-- (para mostrar el nombre de su abogado), nunca los de otros clientes.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (
  public.is_staff() or id = auth.uid() or rol in ('admin','procurador','abogado')
);

-- ---- CLIENTES ----
drop policy if exists clientes_select on public.clientes;
create policy clientes_select on public.clientes for select to authenticated using (
  public.is_staff() or lower(email) = lower(public.current_email())
);
drop policy if exists clientes_insert on public.clientes;
create policy clientes_insert on public.clientes for insert to authenticated with check (public.is_staff());
drop policy if exists clientes_update on public.clientes;
create policy clientes_update on public.clientes for update to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists clientes_delete on public.clientes;
create policy clientes_delete on public.clientes for delete to authenticated using (public.is_admin());

-- ---- PROCESOS ----
drop policy if exists procesos_select on public.procesos;
create policy procesos_select on public.procesos for select to authenticated using (
  public.is_staff()
  or cliente_id in (
    select c.id from public.clientes c where lower(c.email) = lower(public.current_email())
  )
);
drop policy if exists procesos_insert on public.procesos;
create policy procesos_insert on public.procesos for insert to authenticated with check (public.is_staff());
drop policy if exists procesos_update on public.procesos;
create policy procesos_update on public.procesos for update to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists procesos_delete on public.procesos;
create policy procesos_delete on public.procesos for delete to authenticated using (public.is_admin());

-- ---- ACTUACIONES ----
drop policy if exists actuaciones_select on public.actuaciones;
create policy actuaciones_select on public.actuaciones for select to authenticated using (
  public.is_staff()
  or proceso_id in (
    select p.id from public.procesos p
    join public.clientes c on c.id = p.cliente_id
    where lower(c.email) = lower(public.current_email())
  )
);
drop policy if exists actuaciones_insert on public.actuaciones;
create policy actuaciones_insert on public.actuaciones for insert to authenticated with check (public.is_staff() and created_by = auth.uid());
drop policy if exists actuaciones_modify on public.actuaciones;
create policy actuaciones_modify on public.actuaciones for update to authenticated using (public.is_staff() and (created_by = auth.uid() or public.is_admin())) with check (public.is_staff());
drop policy if exists actuaciones_delete on public.actuaciones;
create policy actuaciones_delete on public.actuaciones for delete to authenticated using (public.is_staff() and (created_by = auth.uid() or public.is_admin()));

-- ---- DOCUMENTOS ----
drop policy if exists documentos_select on public.documentos;
create policy documentos_select on public.documentos for select to authenticated using (
  public.is_staff()
  or proceso_id in (
    select p.id from public.procesos p
    join public.clientes c on c.id = p.cliente_id
    where lower(c.email) = lower(public.current_email())
  )
);
drop policy if exists documentos_insert on public.documentos;
create policy documentos_insert on public.documentos for insert to authenticated with check (public.is_staff());
drop policy if exists documentos_delete on public.documentos;
create policy documentos_delete on public.documentos for delete to authenticated using (public.is_staff() and (subido_por = auth.uid() or public.is_admin()));

-- ============================================================
--  STORAGE — los clientes solo descargan documentos de SUS procesos
-- ============================================================
drop policy if exists docs_select on storage.objects;
create policy docs_select on storage.objects for select to authenticated using (
  bucket_id = 'documentos' and (
    public.is_staff()
    or (storage.foldername(name))[1] in (
      select p.id::text from public.procesos p
      join public.clientes c on c.id = p.cliente_id
      where lower(c.email) = lower(public.current_email())
    )
  )
);
drop policy if exists docs_insert on storage.objects;
create policy docs_insert on storage.objects for insert to authenticated with check (bucket_id = 'documentos' and public.is_staff());
drop policy if exists docs_delete on storage.objects;
create policy docs_delete on storage.objects for delete to authenticated using (bucket_id = 'documentos' and public.is_staff() and (owner = auth.uid() or public.is_admin()));

-- ============================================================
--  LISTO. A partir de ahora:
--   - Quien se registre en el login será CLIENTE (verá solo sus procesos).
--   - Para habilitar un abogado/procurador: créalo y, en el panel "Usuarios",
--     cámbiale el rol. (O ejecuta: update public.profiles set rol='abogado' where email='...';)
--   - Vincula a cada cliente poniendo SU CORREO en la ficha de Cliente; el cliente
--     debe registrarse con ese mismo correo.
-- ============================================================
