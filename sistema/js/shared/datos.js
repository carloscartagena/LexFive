// ============================================================
//  LexFive — Carga de datos comunes al estado compartido
//  loadProfiles / loadClientes pueblan state.profiles y
//  state.clientes, usados por casi todas las vistas.
//  Extraído de app.js (paso 8 del split).
// ============================================================
import { supabase } from '@/api/supabase.js';
import { state } from '@/utils/state.js';

export async function loadProfiles() {
  // El cliente NO puede leer las fichas del personal (privacidad: sin correos).
  // Para mostrar el nombre de su abogado usa la vista "directorio" (id, nombre, rol).
  if (state.profile && state.profile.rol === 'cliente') {
    const { data, error } = await supabase.from('directorio').select('*').order('nombre');
    if (!error) { state.profiles = (data || []).map(p => ({ ...p, activo: true })); return; }
    // Respaldo si aún no se ejecutó la migración 13 (la vista no existe todavía).
  }
  const { data } = await supabase.from('profiles').select('*').order('nombre');
  state.profiles = data || [];
}

export async function loadClientes() {
  const { data } = await supabase.from('clientes').select('*').order('nombre');
  // Oculta los clientes enviados a la papelera (columna "eliminado", migración 16).
  // El filtro en el navegador funciona aunque la columna aún no exista.
  state.clientes = (data || []).filter(c => !c.eliminado);
}
