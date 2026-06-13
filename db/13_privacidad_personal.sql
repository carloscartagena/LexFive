-- ============================================================
--  LexFive — Bloque 3: Privacidad de los datos del personal
--  Migración 13
-- ------------------------------------------------------------
--  Problema que resuelve:
--   Hasta ahora, un CLIENTE podía leer la ficha completa del personal
--   (incluido el CORREO) por la regla de "profiles". Esto lo corrige:
--    - El personal (admin/procurador/abogado) sigue viendo todos los perfiles.
--    - El cliente solo ve SU PROPIA ficha.
--    - Para que el cliente siga viendo el NOMBRE de su abogado (sin su correo),
--      se crea una vista "directorio" que expone únicamente id, nombre y rol
--      del personal (nunca el correo ni datos de otros clientes).
--
--  Ejecutar UNA vez en Supabase (SQL Editor). Es seguro re-ejecutarlo.
-- ============================================================

-- 1) Endurecer la lectura de profiles: el cliente solo ve su propia ficha.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (
  public.is_staff() or id = auth.uid()
);

-- 2) Directorio interno: solo NOMBRE y ROL del personal (sin correo).
--    Se usa para mostrarle al cliente el nombre de su abogado.
--    La vista (propiedad del dueño) expone solo estas columnas seguras.
create or replace view public.directorio
with (security_invoker = false) as
  select id, nombre, rol
  from public.profiles
  where rol in ('admin', 'procurador', 'abogado');

-- 3) Permisos de la vista: solo usuarios autenticados; nunca anónimos.
revoke all on public.directorio from anon;
grant select on public.directorio to authenticated;
