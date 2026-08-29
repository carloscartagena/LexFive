// ============================================================
//  LexFive — Operaciones de Supabase Storage con TIEMPO LÍMITE
//  Suben/descargan documentos e imágenes sin quedarse colgados.
//  Si la red no responde a tiempo, devuelven { error } / null (no
//  lanzan), para que los botones se reactiven y el usuario reciba
//  un aviso. Extraído de app.js (paso 11 del split).
// ============================================================
import { supabase } from '@/api/supabase.js';
import { withTimeout } from '@/api/auth.js';

export async function subirDocumento(path, file) {
  try {
    return await withTimeout(supabase.storage.from('documentos').upload(path, file), 30000, 'subida de archivo');
  } catch (e) {
    return { error: (e instanceof Error) ? e : new Error(String(e)) };
  }
}

export async function enlaceDocumento(path) {
  try {
    return await withTimeout(supabase.storage.from('documentos').createSignedUrl(path, 120), 15000, 'enlace de descarga');
  } catch (e) {
    return { error: (e instanceof Error) ? e : new Error(String(e)) };
  }
}

// Sube una imagen (data URL) al bucket PÚBLICO "branding" de Storage y devuelve
// su URL pública. Si algo falla (p. ej. el bucket aún no existe, o no hay red),
// devuelve null y el sistema sigue funcionando guardando la imagen como antes
// (base64), sin romperse. Requiere db/23_branding_storage.sql.
export async function subirImagenBranding(dataUrl, prefijo) {
  try {
    if (!dataUrl || dataUrl.indexOf('data:') !== 0) return null;
    const blob = await (await fetch(dataUrl)).blob();
    const tipo = blob.type || 'image/png';
    const ext = tipo.indexOf('svg') >= 0 ? 'svg' : tipo.indexOf('webp') >= 0 ? 'webp' : tipo.indexOf('jpeg') >= 0 ? 'jpg' : 'png';
    const path = (prefijo || 'img') + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
    const up = await withTimeout(supabase.storage.from('branding').upload(path, blob, { contentType: tipo, upsert: true }), 30000, 'subida de imagen');
    if (up.error) return null;
    const { data } = supabase.storage.from('branding').getPublicUrl(path);
    return (data && data.publicUrl) || null;
  } catch (e) { return null; }
}
