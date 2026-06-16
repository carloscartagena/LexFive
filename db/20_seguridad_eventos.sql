-- ============================================================
--  LexFive — Corrección de seguridad: lectura de "eventos"
--  Migración 20
-- ------------------------------------------------------------
--  Problema que resuelve:
--   La tabla "eventos" (audiencias, plazos, reuniones y sus notas) tenía
--   la lectura ABIERTA a cualquier usuario con sesión (política
--   "eventos_select ... using (true)"). Eso permitía que un CLIENTE
--   pudiera leer los plazos y notas de procesos de OTROS clientes.
--
--   Esta migración corrige la regla para que:
--    - El personal (admin/procurador/abogado) siga viendo TODOS los eventos.
--    - El cliente solo vea los eventos de SUS propios procesos
--      (igual que ya ocurre con actuaciones y documentos).
--
--  Ejecutar UNA vez en Supabase (SQL Editor). Es seguro re-ejecutarlo.
-- ============================================================

drop policy if exists eventos_select on public.eventos;
create policy eventos_select on public.eventos for select to authenticated using (
  public.is_staff()
  or proceso_id in (
    select p.id from public.procesos p
    join public.clientes c on c.id = p.cliente_id
    where lower(c.email) = lower(public.current_email())
  )
);
