-- ============================================================
-- LexFive — Migración 32: NUREJ, Juzgado, Etapa y Consulta Pública de Casos
-- ============================================================
-- Permite estructurar la ficha procesal de cada causa con NUREJ, Juzgado,
-- Etapa procesal y Código de seguimiento, habilitando la consulta
-- segura de avances para clientes en casos.html.
-- ============================================================

-- 1) Columnas procesales en la tabla procesos
alter table public.procesos add column if not exists nurej text;
alter table public.procesos add column if not exists juzgado text;
alter table public.procesos add column if not exists etapa text default 'Preparatoria / Demanda';
alter table public.procesos add column if not exists codigo_seguimiento text;

-- Asegurar tipo de actuación en actuaciones
alter table public.actuaciones add column if not exists tipo text default 'Actuación';

-- 2) Índices para búsqueda rápida por código y NUREJ
create index if not exists idx_procesos_codigo_seguimiento on public.procesos (codigo_seguimiento);
create index if not exists idx_procesos_nurej on public.procesos (nurej);

-- 3) Función RPC para consulta pública y segura del expediente en casos.html
-- Solo expone información procesal pública, protegiendo notas internas y datos privados de clientes
create or replace function public.consultar_caso_publico(p_codigo text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proc record;
  v_acts json;
  v_clean text;
begin
  v_clean := trim(coalesce(p_codigo, ''));
  if v_clean = '' then
    return null;
  end if;

  -- Buscar proceso por codigo_seguimiento, nurej, numero o prefijo de ID
  select id, caratula, nurej, juzgado, materia, tipo, estado, etapa, codigo_seguimiento, fecha_inicio, updated_at
  into v_proc
  from public.procesos
  where eliminado = false
    and (
      upper(trim(coalesce(codigo_seguimiento, ''))) = upper(v_clean)
      or upper(trim(coalesce(nurej, ''))) = upper(v_clean)
      or upper(trim(coalesce(numero, ''))) = upper(v_clean)
      or id::text ilike v_clean || '%'
    )
  limit 1;

  if not found then
    return null;
  end if;

  -- Obtener actuaciones públicas ordenadas cronológicamente (más reciente primero)
  select coalesce(json_agg(
    json_build_object(
      'id', a.id,
      'fecha', a.fecha,
      'tipo', coalesce(a.tipo, 'Actuación'),
      'descripcion', a.descripcion,
      'created_at', a.created_at
    ) order by a.fecha desc, a.created_at desc
  ), '[]'::json)
  into v_acts
  from public.actuaciones a
  where a.proceso_id = v_proc.id;

  return json_build_object(
    'proceso', json_build_object(
      'id', v_proc.id,
      'caratula', v_proc.caratula,
      'nurej', v_proc.nurej,
      'juzgado', v_proc.juzgado,
      'materia', v_proc.materia,
      'tipo', v_proc.tipo,
      'estado', v_proc.estado,
      'etapa', coalesce(v_proc.etapa, 'Preparatoria / Demanda'),
      'codigo_seguimiento', coalesce(v_proc.codigo_seguimiento, 'LX-' || upper(substring(replace(v_proc.id::text, '-', ''), 1, 7))),
      'fecha_inicio', v_proc.fecha_inicio,
      'updated_at', v_proc.updated_at
    ),
    'actuaciones', v_acts
  );
end;
$$;

-- Permitir ejecución a usuarios anónimos (público general) y autenticados
grant execute on function public.consultar_caso_publico(text) to anon, authenticated;
