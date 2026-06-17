-- ============================================================
--  LexFive — Bucket de Storage para logos y sellos (branding)
--  db/23_branding_storage.sql
-- ------------------------------------------------------------
--  Crea un bucket PÚBLICO llamado "branding" donde se guardan los logos y
--  sellos del bufete como archivos (en vez de texto base64 dentro de la base
--  de datos). Así la vista de Credenciales carga rápido y la base no se infla.
--
--  Lectura: pública (las imágenes del bufete no son sensibles y deben verse
--  en la credencial impresa y en todos los dispositivos).
--  Subida/edición/borrado: solo personal (admin / abogado).
--
--  CÓMO USARLO: pega TODO este archivo en el SQL Editor de Supabase y pulsa
--  "Run". Es seguro re-ejecutarlo.
-- ============================================================

-- 1) Crear (o actualizar) el bucket público "branding".
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do update set public = true;

-- 2) Permisos (RLS) sobre los archivos del bucket.
--    La LECTURA pública la cubre public = true; aquí controlamos la escritura.
drop policy if exists branding_insert_staff on storage.objects;
create policy branding_insert_staff on storage.objects for insert to authenticated
  with check (bucket_id = 'branding' and public.current_rol() in ('admin','abogado'));

drop policy if exists branding_update_staff on storage.objects;
create policy branding_update_staff on storage.objects for update to authenticated
  using (bucket_id = 'branding' and public.current_rol() in ('admin','abogado'))
  with check (bucket_id = 'branding' and public.current_rol() in ('admin','abogado'));

drop policy if exists branding_delete_staff on storage.objects;
create policy branding_delete_staff on storage.objects for delete to authenticated
  using (bucket_id = 'branding' and public.current_rol() in ('admin','abogado'));
