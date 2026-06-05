-- ============================================================
--  LexFive — Sincronizar clientes auto-registrados con la tabla "clientes"
-- ------------------------------------------------------------
--  EJECUTAR UNA SOLA VEZ en Supabase (SQL Editor), DESPUÉS de los
--  scripts anteriores (schema.sql, 02..06).
--
--  PROBLEMA QUE RESUELVE:
--   Cuando una persona se registra desde el login, se le crea su cuenta
--   de acceso (fila en "profiles"), pero NO una ficha en la tabla
--   "clientes". Por eso podía iniciar sesión, pero no aparecía en la
--   pestaña "Clientes" del panel del administrador.
--
--  QUÉ HACE:
--   1) Actualiza el trigger de registro para que, cuando alguien se
--      registre como CLIENTE, además de su perfil se cree (o actualice)
--      su ficha en "clientes", vinculada por su correo.
--   2) Rellena ("backfill") las fichas de los clientes que ya se habían
--      registrado antes de este arreglo.
--
--  Es idempotente y no borra datos: puede ejecutarse sin riesgo.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Nuevo trigger: crea perfil y, si es cliente, su ficha en "clientes"
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_nombre   text;
  v_tipo     text;
  v_telefono text;
begin
  v_nombre   := coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1));
  v_tipo     := new.raw_user_meta_data->>'tipo';
  v_telefono := new.raw_user_meta_data->>'telefono';

  -- Perfil (cuenta de acceso). El rol por defecto es 'cliente' (ver 02_portal_clientes.sql)
  insert into public.profiles (id, nombre, email)
  values (new.id, v_nombre, new.email)
  on conflict (id) do nothing;

  -- Ficha de cliente: solo para quienes se registran como cliente desde el login.
  -- Se vincula por correo (en minúsculas) y no duplica si ya existe una ficha
  -- con ese mismo correo (por ejemplo, creada antes por el personal).
  if v_tipo = 'cliente' then
    if not exists (
      select 1 from public.clientes
      where lower(email) = lower(new.email)
    ) then
      insert into public.clientes (nombre, email, telefono, notas)
      values (v_nombre, new.email, v_telefono, 'Registrado desde el portal del cliente');
    else
      -- Si ya existía la ficha (creada por el bufete), completamos el teléfono
      -- si estaba vacío, sin sobrescribir lo que ya haya cargado el personal.
      update public.clientes
         set telefono = coalesce(telefono, v_telefono)
       where lower(email) = lower(new.email);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 2) Backfill: crear fichas para clientes ya registrados que aún no tienen
--    una ficha en "clientes" (se vinculan por correo).
-- ------------------------------------------------------------
insert into public.clientes (nombre, email, telefono, notas)
select p.nombre,
       p.email,
       null,
       'Registrado desde el portal del cliente'
from public.profiles p
where p.rol = 'cliente'
  and p.email is not null
  and not exists (
    select 1 from public.clientes c
    where lower(c.email) = lower(p.email)
  );

-- ============================================================
--  LISTO. A partir de ahora, cada persona que se registre como cliente
--  aparecerá automáticamente en la pestaña "Clientes" del panel, y los
--  clientes que ya se habían registrado quedaron agregados con este script.
-- ============================================================
