// ============================================================
//  LexFive — Motor de branding (logo/sello/sitio) compartido en la nube
//  Configuración del bufete guardada en Supabase (tabla "configuracion"),
//  galerías de logos/sellos propios, opacidades, resolución del logo/sello
//  activo y aplicación del logo al encabezado. Extraído de app.js (paso 21).
//  El canal en tiempo real (subscribeBrandingRealtime) se queda en app.js
//  porque refresca vistas (Sellos/Credenciales).
// ============================================================
import { supabase } from './supabase.js';
import { toast } from './ui.js';
import { srcDe } from './exportar.js';
import { IMG, ImgDB, findCustomLogo, findCustomSello } from './media.js';
import { brandLogosVisibles, brandSellosVisibles, BRAND_LOGO_DEFAULT, BRAND_SELLO_DEFAULT } from './branding-catalogos.js';

// ---- Intensidad (opacidad) de la marca de agua del logo en la credencial ----
export function wmOpacityActual() {
  const v = Number(localStorage.getItem('lexfive_wm_op'));
  return (v >= 3 && v <= 40) ? v : 15;
}
export function applyWmOpacity(pct) {
  const p = Math.max(3, Math.min(40, Number(pct) || 15));
  document.documentElement.style.setProperty('--cred-wm-op', (p / 100).toFixed(2));
}

// ---- Visibilidad (opacidad) de la imagen de fondo de las secciones ----
export function bgOpOf(lsKey) {
  const v = Number(localStorage.getItem(lsKey));
  if (v >= 10 && v <= 100) return v;
  const legacy = Number(localStorage.getItem('lexfive_bgimg_op')); // compat versión anterior
  return (legacy >= 10 && legacy <= 100) ? legacy : 35;
}

// ---- Configuración compartida del bufete (logo y sello) en Supabase ----
export const Branding = {
  cache: null,
  async load() {
    try {
      const { data } = await supabase
        .from('configuracion').select('valor').eq('clave', 'branding').maybeSingle();
      this.cache = (data && data.valor) || {};
    } catch (e) {
      this.cache = this.local();
    }
    try { localStorage.setItem('lexfive_branding', JSON.stringify(this.cache)); } catch (e) {}
    return this.cache;
  },
  local() {
    if (this.cache) return this.cache;
    try { return JSON.parse(localStorage.getItem('lexfive_branding') || '{}'); } catch (e) { return {}; }
  },
  async save(obj) {
    this.cache = obj;
    try { localStorage.setItem('lexfive_branding', JSON.stringify(obj)); } catch (e) {}
    try {
      const { error } = await supabase.from('configuracion').upsert({
        clave: 'branding', valor: obj, updated_at: new Date().toISOString()
      });
      if (error) throw error;
      return true;
    } catch (e) {
      return false;
    }
  }
};

// ---- Galerías de logos/sellos propios (fila aparte en la nube) ----
export const Galerias = {
  async load() {
    try {
      const { data } = await supabase
        .from('configuracion').select('valor').eq('clave', 'branding_galerias').maybeSingle();
      return (data && data.valor) || {};
    } catch (e) { return {}; }
  },
  async save(obj) {
    try {
      const { error } = await supabase.from('configuracion').upsert({
        clave: 'branding_galerias', valor: obj, updated_at: new Date().toISOString()
      });
      if (error) throw error;
      return true;
    } catch (e) { return false; }
  }
};
export function snapshotGalerias() {
  return { logosCustom: IMG.logosCustom || [], sellosCustom: IMG.sellosCustom || [] };
}
export async function pushGalerias() {
  // Silencioso: el aviso al usuario lo da pushBranding (que se llama junto a
  // este), para no mostrar dos mensajes a la vez al subir un logo/sello.
  return await Galerias.save(snapshotGalerias());
}

// Toma una "foto" del logo/sello elegido en este equipo para guardarla en la nube.
export function snapshotBranding() {
  const readList = k => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch (e) { return []; } };
  const cache = (Branding && Branding.local) ? (Branding.local() || {}) : {};
  let logoId = localStorage.getItem('lexfive_logo') || null;
  if (logoId && logoId.indexOf('custom') === 0) logoId = 'custom'; // compatibilidad con la web pública
  let selloId = localStorage.getItem('lexfive_sello') || null;
  if (selloId && selloId.indexOf('custom') === 0) selloId = 'custom';
  let logoImg = IMG.logo || null;
  if (!logoImg && logoId === 'custom') logoImg = cache.logoImg || null;
  let selloImg = IMG.sello || null;
  if (!selloImg && selloId === 'custom') selloImg = cache.selloImg || null;
  if (logoId === 'custom' && !logoImg && cache.logoId) { logoId = cache.logoId; logoImg = cache.logoImg || null; }
  if (selloId === 'custom' && !selloImg && cache.selloId) { selloId = cache.selloId; selloImg = cache.selloImg || null; }
  const heroLS = localStorage.getItem('lexfive_hero_url');
  const bgLS = localStorage.getItem('lexfive_bg_style');
  const sobreLS = localStorage.getItem('lexfive_sobre_url');
  const heroBgLS = localStorage.getItem('lexfive_herobg_url');
  const aboutBgLS = localStorage.getItem('lexfive_aboutbg_url');
  const whyBgLS = localStorage.getItem('lexfive_whybg_url');
  const testimonialsBgLS = localStorage.getItem('lexfive_testimonialsbg_url');
  return {
    logoId: logoId,
    logoImg: logoImg,
    selloId: selloId,
    selloImg: selloImg,
    wmOpacity: wmOpacityActual(),
    whyBgOpacity: bgOpOf('lexfive_whybg_op'),
    aboutBgOpacity: bgOpOf('lexfive_aboutbg_op'),
    testimonialsBgOpacity: bgOpOf('lexfive_testimonialsbg_op'),
    heroBgOpacity: bgOpOf('lexfive_herobg_op'),
    logosHidden: readList('lexfive_logos_hidden'),
    sellosHidden: readList('lexfive_sellos_hidden'),
    heroImg: (heroLS !== null) ? (heroLS || null) : (cache.heroImg || null),
    bgStyle: (bgLS !== null) ? (bgLS || null) : (cache.bgStyle || null),
    sobreImg: (sobreLS !== null) ? (sobreLS || null) : (cache.sobreImg || null),
    heroBgImg: (heroBgLS !== null) ? (heroBgLS || null) : (cache.heroBgImg || null),
    aboutBgImg: (aboutBgLS !== null) ? (aboutBgLS || null) : (cache.aboutBgImg || null),
    whyBgImg: (whyBgLS !== null) ? (whyBgLS || null) : (cache.whyBgImg || null),
    testimonialsBgImg: (testimonialsBgLS !== null) ? (testimonialsBgLS || null) : (cache.testimonialsBgImg || null)
  };
}

// Marca de tiempo del último cambio de branding hecho EN ESTE equipo (para que
// el canal en tiempo real no se "auto-avise"). Es un export "vivo": app.js lo lee.
export let lastBrandingPush = 0;

export async function pushBranding() {
  lastBrandingPush = Date.now();
  const ok = await Branding.save(snapshotBranding());
  // El logo/sello YA quedó guardado y funcionando en este equipo. Si no se pudo
  // sincronizar con la nube, se avisa con un tono neutro (no es un error grave):
  // los demás dispositivos y la web pública lo verán cuando haya conexión o
  // cuando se configure el almacenamiento de imágenes en la nube.
  if (!ok) toast('Logo/sello aplicado en este equipo. Aún no se sincroniza con la nube (otros dispositivos y la web lo verán cuando haya conexión).', '');
  return ok;
}

// Estado de hidratación del branding desde la nube. Export "vivo": app.js y
// las vistas (sellos, credenciales) lo leen para saber si deben pedir red.
export let brandingHydrated = false;
export async function hydrateBranding(force) {
  if (brandingHydrated && !force) {
    const lg = localStorage.getItem('lexfive_logo'); if (lg) applyLogo(lg);
    return Branding.local();
  }
  const b = await Branding.load();
  brandingHydrated = true;
  if (!b || !Object.keys(b).length) return b;
  try {
    if (b.logoId) localStorage.setItem('lexfive_logo', b.logoId);
    if (b.selloId) localStorage.setItem('lexfive_sello', b.selloId);
    if (b.wmOpacity) { localStorage.setItem('lexfive_wm_op', b.wmOpacity); applyWmOpacity(b.wmOpacity); }
    if (b.bgImgOpacity) localStorage.setItem('lexfive_bgimg_op', b.bgImgOpacity);
    if (b.whyBgOpacity) localStorage.setItem('lexfive_whybg_op', b.whyBgOpacity);
    if (b.aboutBgOpacity) localStorage.setItem('lexfive_aboutbg_op', b.aboutBgOpacity);
    if (b.testimonialsBgOpacity) localStorage.setItem('lexfive_testimonialsbg_op', b.testimonialsBgOpacity);
    if (b.heroBgOpacity) localStorage.setItem('lexfive_herobg_op', b.heroBgOpacity);
    localStorage.setItem('lexfive_logos_hidden', JSON.stringify(b.logosHidden || []));
    localStorage.setItem('lexfive_sellos_hidden', JSON.stringify(b.sellosHidden || []));
    if (b.logoImg) { IMG.logo = b.logoImg; try { await ImgDB.set('logo', b.logoImg); } catch (e) {} }
    else if (b.logoId && b.logoId !== 'custom') { IMG.logo = null; try { await ImgDB.del('logo'); } catch (e) {} localStorage.removeItem('lexfive_logo_custom'); }
    if (b.selloImg) { IMG.sello = b.selloImg; try { await ImgDB.set('sello', b.selloImg); } catch (e) {} }
    else if (b.selloId && b.selloId !== 'custom') { IMG.sello = null; try { await ImgDB.del('sello'); } catch (e) {} localStorage.removeItem('lexfive_sello_custom'); }

    const g = await Galerias.load();
    const logosG = (Array.isArray(g.logosCustom) && g.logosCustom.length) ? g.logosCustom : (Array.isArray(b.logosCustom) ? b.logosCustom : []);
    const sellosG = (Array.isArray(g.sellosCustom) && g.sellosCustom.length) ? g.sellosCustom : (Array.isArray(b.sellosCustom) ? b.sellosCustom : []);
    if (logosG.length) { IMG.logosCustom = logosG; try { await ImgDB.set('logosCustom', logosG); } catch (e) {} }
    if (IMG.logo && !IMG.logosCustom.some(x => x && srcDe(x) === IMG.logo)) { IMG.logosCustom.unshift({ id: 'c' + Date.now(), img: IMG.logo }); try { await ImgDB.set('logosCustom', IMG.logosCustom); } catch (e) {} }
    if (sellosG.length) { IMG.sellosCustom = sellosG; try { await ImgDB.set('sellosCustom', sellosG); } catch (e) {} }
    if (IMG.sello && !IMG.sellosCustom.some(x => x && srcDe(x) === IMG.sello)) { IMG.sellosCustom.unshift({ id: 's' + Date.now(), img: IMG.sello }); try { await ImgDB.set('sellosCustom', IMG.sellosCustom); } catch (e) {} }
    const faltanGalerias = (!Array.isArray(g.logosCustom) || !g.logosCustom.length) && (!Array.isArray(g.sellosCustom) || !g.sellosCustom.length);
    if (faltanGalerias && (IMG.logosCustom.length || IMG.sellosCustom.length)) { try { await Galerias.save(snapshotGalerias()); } catch (e) {} }
  } catch (e) {}
  return b;
}

// ---- Resolución del logo/sello activo y sus fuentes (src) ----
export function pickActiveLogo(saved) {
  if (saved && saved.indexOf('custom:') === 0 && findCustomLogo(saved.slice(7))) return saved;
  if (saved === 'custom' && IMG.logosCustom.length) return 'custom:' + IMG.logosCustom[0].id;
  const vis = brandLogosVisibles();
  if (vis.some(x => x.id === saved)) return saved;
  if (IMG.logosCustom.length) return 'custom:' + IMG.logosCustom[0].id;
  if (vis.length) return vis[0].id;
  return BRAND_LOGO_DEFAULT;
}
export function pickActiveSello(saved) {
  if (saved && saved.indexOf('custom:') === 0 && findCustomSello(saved.slice(7))) return saved;
  if (saved === 'custom' && IMG.sellosCustom.length) return 'custom:' + IMG.sellosCustom[0].id;
  const vis = brandSellosVisibles();
  if (vis.some(x => x.id === saved)) return saved;
  if (IMG.sellosCustom.length) return 'custom:' + IMG.sellosCustom[0].id;
  if (vis.length) return vis[0].id;
  return BRAND_SELLO_DEFAULT;
}
export function brandLogoSrc(id) {
  if (id && id.indexOf('custom:') === 0) { const lc = findCustomLogo(id.slice(7)); return srcDe(lc); }
  if (id === 'custom') return IMG.logo || srcDe(IMG.logosCustom[0]);
  return `../assets/logos/${id}.svg`;
}
export function brandSelloSrc(id) {
  if (id && id.indexOf('custom:') === 0) { const sc = findCustomSello(id.slice(7)); return srcDe(sc); }
  if (id === 'custom') return IMG.sello || srcDe(IMG.sellosCustom[0]);
  return `../assets/sellos/${id}.svg`;
}
export function nombreLogoArchivo(id) { return (id && id.indexOf('custom') === 0) ? 'logo-lexfive.png' : id + '.svg'; }
export function nombreSelloArchivo(id) { return (id && id.indexOf('custom') === 0) ? 'sello-lexfive.png' : id + '.svg'; }

// Aplica el logo elegido al encabezado del panel (vía un <style> dinámico).
export function applyLogo(id) {
  let url;
  if (id && id.indexOf('custom') === 0) {
    url = IMG.logo || '';
    if (!url) { try { url = (JSON.parse(localStorage.getItem('lexfive_branding') || '{}').logoImg) || ''; } catch (e) { url = ''; } }
  } else if (id) {
    url = `../../assets/logos/${id}.svg`;
  } else {
    url = '';
  }
  if (!url) return;
  let st = document.getElementById('lexfiveLogoStyle');
  if (!st) { st = document.createElement('style'); st.id = 'lexfiveLogoStyle'; document.head.appendChild(st); }
  st.textContent = `.logo__mark{background-image:url(${url})!important;}`;
}
