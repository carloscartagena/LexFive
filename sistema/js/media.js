// ============================================================
//  LexFive — Almacén de imágenes del bufete (logo y sello)
//  Caché en IndexedDB (mucho más espacio que localStorage para
//  imágenes base64) + caché sincrónica en memoria (IMG) para que el
//  render no espere. Extraído de app.js (paso 20 del split).
// ============================================================
import { srcDe } from './exportar.js';

export const ImgDB = {
  _p: null,
  _open() {
    if (this._p) return this._p;
    this._p = new Promise((res, rej) => {
      try {
        const r = indexedDB.open('lexfive_media', 1);
        r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('img')) r.result.createObjectStore('img'); };
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      } catch (e) { rej(e); }
    });
    return this._p;
  },
  async get(k) { try { const db = await this._open(); return await new Promise(res => { const rq = db.transaction('img').objectStore('img').get(k); rq.onsuccess = () => res(rq.result || null); rq.onerror = () => res(null); }); } catch (e) { return null; } },
  async set(k, v) { const db = await this._open(); return new Promise((res, rej) => { const tx = db.transaction('img', 'readwrite'); tx.objectStore('img').put(v, k); tx.oncomplete = () => res(true); tx.onerror = () => rej(tx.error); }); },
  async del(k) { try { const db = await this._open(); return await new Promise(res => { const tx = db.transaction('img', 'readwrite'); tx.objectStore('img').delete(k); tx.oncomplete = () => res(true); tx.onerror = () => res(false); }); } catch (e) { return false; } }
};

// Caché sincrónica de las imágenes para que el render no tenga que esperar.
export const IMG = { logo: null, sello: null, foto: null, logosCustom: [], sellosCustom: [], loaded: false };

export async function ensureImgCache() {
  if (IMG.loaded) return;
  // Migración: versiones anteriores guardaban la imagen (data URL) en localStorage.
  try {
    const ol = localStorage.getItem('lexfive_logo_custom');
    if (ol && ol.indexOf('data:') === 0) { try { await ImgDB.set('logo', ol); localStorage.setItem('lexfive_logo_custom', '1'); } catch (e) {} }
    const os = localStorage.getItem('lexfive_sello_custom');
    if (os && os.indexOf('data:') === 0) { try { await ImgDB.set('sello', os); localStorage.setItem('lexfive_sello_custom', '1'); } catch (e) {} }
  } catch (e) {}
  IMG.logo = await ImgDB.get('logo');
  IMG.sello = await ImgDB.get('sello');
  IMG.foto = await ImgDB.get('foto');
  // Galería de logos propios subidos (varios). Antes solo había un espacio,
  // por eso al subir uno nuevo se perdía el anterior; ahora se conservan todos.
  IMG.logosCustom = (await ImgDB.get('logosCustom')) || [];
  if (IMG.logo && !IMG.logosCustom.some(x => x && srcDe(x) === IMG.logo)) {
    IMG.logosCustom.unshift({ id: 'c' + Date.now(), img: IMG.logo });
    try { await ImgDB.set('logosCustom', IMG.logosCustom); } catch (e) {}
  }
  // Galería de sellos propios subidos (varios), igual que los logos.
  IMG.sellosCustom = (await ImgDB.get('sellosCustom')) || [];
  if (IMG.sello && !IMG.sellosCustom.some(x => x && srcDe(x) === IMG.sello)) {
    IMG.sellosCustom.unshift({ id: 's' + Date.now(), img: IMG.sello });
    try { await ImgDB.set('sellosCustom', IMG.sellosCustom); } catch (e) {}
  }
  // Respaldo: si quedó un data URL en localStorage (no se pudo migrar), úsalo.
  if (!IMG.logo) { const ol = localStorage.getItem('lexfive_logo_custom'); if (ol && ol.indexOf('data:') === 0) IMG.logo = ol; }
  if (!IMG.sello) { const os = localStorage.getItem('lexfive_sello_custom'); if (os && os.indexOf('data:') === 0) IMG.sello = os; }
  IMG.loaded = true;
}

// Guarda la imagen del bufete (kind = 'logo' | 'sello'). Devuelve true si lo logró.
export async function guardarImagen(kind, dataUrl) {
  try {
    await ImgDB.set(kind, dataUrl);
    IMG[kind] = dataUrl;
    localStorage.setItem('lexfive_' + kind + '_custom', '1'); // bandera liviana
    return true;
  } catch (e) {
    try { localStorage.setItem('lexfive_' + kind + '_custom', dataUrl); IMG[kind] = dataUrl; return true; }
    catch (e2) { return false; }
  }
}

export function borrarImagen(kind) {
  IMG[kind] = null;
  localStorage.removeItem('lexfive_' + kind + '_custom');
  ImgDB.del(kind);
}

// Guarda en el equipo la lista de logos/sellos propios subidos (galería con varios).
export async function saveLogosCustom() { try { await ImgDB.set('logosCustom', IMG.logosCustom); } catch (e) {} }
export async function saveSellosCustom() { try { await ImgDB.set('sellosCustom', IMG.sellosCustom); } catch (e) {} }

// Busca un logo/sello propio de la galería por su id.
export function findCustomLogo(cid) { return IMG.logosCustom.find(x => x && x.id === cid); }
export function findCustomSello(sid) { return IMG.sellosCustom.find(x => x && x.id === sid); }
