// ============================================================
//  Autenticación y manejo de sesión / perfil / rol
// ============================================================
import { supabase } from './supabase.js';

let _profile = null;

// Devuelve la sesión actual (o null)
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// Carga (y cachea) el perfil del usuario autenticado
export async function getProfile(force = false) {
  if (_profile && !force) return _profile;
  const session = await getSession();
  if (!session) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();
  if (error) {
    console.error('Error al cargar perfil:', error);
    return null;
  }
  _profile = data;
  return _profile;
}

// Protege una página: si no hay sesión válida y activa, redirige al login
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  const profile = await getProfile(true);
  if (!profile) {
    await signOut();
    return null;
  }
  if (!profile.activo) {
    alert('Su cuenta está desactivada. Contacte al administrador.');
    await signOut();
    return null;
  }
  return profile;
}

export async function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(email, password, nombre, telefono) {
  return supabase.auth.signUp({
    email,
    password,
    // 'tipo: cliente' permite que el trigger de la base de datos cree
    // automáticamente la ficha en la tabla "clientes" (vinculada por correo),
    // para que el nuevo cliente aparezca en el panel del administrador.
    options: { data: { nombre, telefono: telefono || null, tipo: 'cliente' } }
  });
}

export async function signOut() {
  _profile = null;
  await supabase.auth.signOut();
  window.location.href = 'login.html';
}

// Cierra la sesión SIN redirigir al login (para ir, por ejemplo, al sitio
// público). Los borradores autoguardados NO se borran: quedan en el
// navegador y se recuperan al volver a iniciar sesión.
export async function signOutTo(url) {
  _profile = null;
  await supabase.auth.signOut();
  window.location.href = url;
}

// Envía un correo con el enlace para restablecer la contraseña
export async function resetPassword(email, redirectTo) {
  return supabase.auth.resetPasswordForEmail(email, { redirectTo });
}

// Define una nueva contraseña (durante el flujo de recuperación)
export async function updatePassword(newPassword) {
  return supabase.auth.updateUser({ password: newPassword });
}

// Avisa cuando el usuario entra por el enlace de recuperación de contraseña
export function onPasswordRecovery(callback) {
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') callback();
  });
}

// Registra una acción en la bitácora de auditoría (no bloquea si falla)
export async function logAccion(accion, entidad, entidad_id, detalle) {
  try {
    const profile = await getProfile();
    await supabase.from('auditoria').insert({
      usuario_id: profile ? profile.id : null,
      accion, entidad,
      entidad_id: entidad_id ? String(entidad_id) : null,
      detalle: detalle || null
    });
  } catch (e) {
    console.warn('No se pudo registrar en auditoría:', e);
  }
}

export function can(profile, action) {
  if (!profile) return false;
  const rol = profile.rol;
  switch (action) {
    case 'manage_users':
    case 'view_audit':
    case 'delete_proceso':
    case 'delete_cliente':
      return rol === 'admin';
    default:
      return true; // ver/crear/editar procesos, docs, blog: todos los roles activos
  }
}
