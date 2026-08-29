// ============================================================
//  Autenticación y manejo de sesión / perfil / rol
// ============================================================
import { supabase } from '@/api/supabase.js';

let _profile = null;

// Ejecuta una promesa con un TIEMPO LÍMITE. Si se excede, rechaza con un error
// identificable (mensaje que empieza con "TIMEOUT"). Sirve para que, cuando la
// base de Supabase (plan gratuito) está "despertando" y la primera petición
// tarda demasiado o se cuelga, el arranque pueda detectarlo y reintentar en
// vez de quedarse congelado para siempre en "Cargando...".
export function withTimeout(promise, ms = 12000, label = 'operación') {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('TIMEOUT: ' + label)), ms);
    Promise.resolve(promise).then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}

// Devuelve la sesión actual (o null). Con tiempo límite: si la recuperación
// de la sesión se cuelga (p. ej. al refrescar el token contra una base
// "dormida"), lanza un error para que el arranque reintente en vez de quedarse
// esperando para siempre.
export async function getSession() {
  const { data } = await withTimeout(supabase.auth.getSession(), 12000, 'sesión');
  return data.session;
}

// Carga (y cachea) el perfil del usuario autenticado.
// La consulta lleva un tiempo límite: si la base no responde a tiempo (p. ej.
// está "despertando"), LANZA un error TIMEOUT para que el arranque reintente.
export async function getProfile(force = false) {
  if (_profile && !force) return _profile;
  const session = await getSession();
  if (!session) return null;
  const { data, error } = await withTimeout(
    supabase.from('profiles').select('*').eq('id', session.user.id).single(),
    12000,
    'perfil'
  );
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
  // Si el usuario tiene la verificación en dos pasos (2FA) ACTIVADA pero la
  // sesión sigue en nivel 1 (solo contraseña), exigir completar el código en
  // el login. Si no tiene 2FA, nextLevel = 'aal1' y no cambia nada (opt-in).
  // Falla "abierto": si la consulta de MFA da error, no se bloquea el acceso.
  try {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.currentLevel === 'aal1' && aal.nextLevel === 'aal2') {
      window.location.href = 'login.html';
      return null;
    }
  } catch (e) { /* no bloquear el acceso si la verificación de MFA falla */ }
  return profile;
}

// ============================================================
//  Verificación en dos pasos (MFA / TOTP)  — opcional, por usuario
// ============================================================

// Nivel de garantía de la sesión: { currentLevel, nextLevel }.
// nextLevel === 'aal2' indica que el usuario tiene un factor TOTP activado.
export async function mfaAssuranceLevel() {
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return data;
}

// Lista los factores MFA del usuario (data.totp = [...]).
export async function mfaFactors() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) return { totp: [] };
  return data;
}

// Inicia el alta de un factor TOTP. Devuelve { data: { id, totp: { qr_code, secret } } }.
export async function mfaEnroll() {
  return supabase.auth.mfa.enroll({ factorType: 'totp' });
}

// Verifica un código de 6 dígitos contra un factor (para activar o para iniciar sesión).
export async function mfaVerify(factorId, code) {
  const ch = await supabase.auth.mfa.challenge({ factorId });
  if (ch.error) return { error: ch.error };
  return supabase.auth.mfa.verify({ factorId, challengeId: ch.data.id, code });
}

// Quita (desactiva) un factor MFA.
export async function mfaUnenroll(factorId) {
  return supabase.auth.mfa.unenroll({ factorId });
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
