// ============================================================
//  LexFive — Sistema de Gestión Legal · Lógica principal
// ============================================================
import { supabase } from './supabase.js';
import { requireAuth, getProfile, signOut, signOutTo, logAccion, can } from './auth.js';
import { ROLES, ESTADOS, MATERIAS, WHATSAPP, ABOGADOS } from './config.js';

// ---------- Estado global ----------
const state = {
  profile: null,
  profiles: [],   // todos los usuarios (para mapear nombres y selects)
  clientes: [],   // cache de clientes
  categorias: [], // áreas del derecho (dinámicas, desde la tabla "categorias")
  view: 'dashboard'
};

// ---------- Iconos ----------
const ICON = {
  dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
  procesos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/></svg>',
  clientes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11"/></svg>',
  blog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  usuarios: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm14 10v-2a4 4 0 0 0-3-3.87M19 4a4 4 0 0 1 0 7.75"/></svg>',
  auditoria: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 11l3 3 8-8M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  audiencia: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
  alerta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"/></svg>',
  estrella: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M.05 24l1.69-6.16a11.9 11.9 0 1 1 4.3 4.2L.05 24zM6.6 20.2l.37.22a9.9 9.9 0 1 0-3.35-3.3l.24.38-1 3.65 3.74-.95z"/></svg>',
  consultas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
  categorias: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3H4a1 1 0 0 0-1 1v5.59A2 2 0 0 0 3.83 11l9.58 9.59a2 2 0 0 0 2.83 0l4.35-4.35a2 2 0 0 0 0-2.83zM7 7h.01"/></svg>',
  llave: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 2l-2 2m-3.5 3.5L21 2m-5.5 5.5a3.5 3.5 0 1 1-5 5 3.5 3.5 0 0 1 5-5zm0 0L19 4m0 0l2 2m-2-2-2 2"/><circle cx="8.5" cy="15.5" r="5.5"/></svg>'
};

const NAV = [
  { key: 'dashboard', label: 'Panel', icon: ICON.dashboard },
  { key: 'procesos', label: 'Procesos', icon: ICON.procesos },
  { key: 'modelos', label: 'Modelos', icon: ICON.doc },
  { key: 'clientes', label: 'Clientes', icon: ICON.clientes },
  { key: 'consultas', label: 'Consultas', icon: ICON.consultas },
  { key: 'blog', label: 'Blog', icon: ICON.blog },
  { key: 'credenciales', label: 'Credenciales', icon: ICON.llave, credOnly: true },
  { key: 'testimonios', label: 'Testimonios', icon: ICON.estrella, adminOnly: true },
  { key: 'categorias', label: 'Categorías', icon: ICON.categorias, adminOnly: true },
  { key: 'usuarios', label: 'Usuarios', icon: ICON.usuarios, adminOnly: true },
  { key: 'auditoria', label: 'Auditoría', icon: ICON.auditoria, adminOnly: true }
];
// credOnly = solo administrador y abogado (NO procurador ni cliente)

// ============================================================
//  Utilidades de interfaz
// ============================================================
const $ = (sel) => document.querySelector(sel);
const content = () => $('#content');

function esc(s) {
  return (s == null ? '' : String(s)).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
// Fecha de hoy en formato ISO (AAAA-MM-DD) para el input type=date.
function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
// Suma n años a una fecha ISO. Si no es ISO (texto antiguo), la devuelve igual.
function addAnios(iso, n) {
  const p = String(iso || '').split('-');
  if (p.length !== 3) return iso || '';
  return `${parseInt(p[0], 10) + n}-${p[1]}-${p[2]}`;
}
// Muestra una fecha ISO como DD/MM/AAAA (o tal cual si era texto libre).
function fmtFechaCorta(iso) {
  const p = String(iso || '').split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : (iso || '');
}
// Genera la URL de un código QR (servicio público) a partir de un texto. ecc=M para mejor lectura.
function qrURL(texto) {
  return 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=0&ecc=M&data=' + encodeURIComponent(texto || 'LexFive');
}
// URL fija del certificado SAJ-RPA del abogado responsable (va igual en TODAS las credenciales).
const RPA_URL = 'https://rpa2.justicia.gob.bo/#/certificado-funcionamiento?codigo=52348873-02ea-4065-9b69-3c27a86c9dd9';
const SITIO_URL = 'https://lexfive.netlify.app/';
// Enlace que codifica el QR personal del procurador: abre el sitio del bufete con sus datos.
function qrPersona(d) {
  d = d || {};
  return SITIO_URL + '?procurador=' + encodeURIComponent(d.nombre || '') + '&ci=' + encodeURIComponent(d.ci || '') + '&rol=' + encodeURIComponent(d.cargo || '');
}
// Resalta en negrita las palabras/cláusulas importantes del texto legal del reverso.
function resaltarRepre(txt) {
  let s = esc(txt || '');
  const palabras = ['AUTORIZADO', 'FACULTADO', 'ENTREGAR', 'EXAMINAR', 'SOLICITAR', 'RECOGER', 'ABOGADO', 'PORTADOR', 'Procesos', 'Trámites Administrativos', 'Constitución Política del Estado'];
  palabras.forEach(p => { s = s.replace(new RegExp('\\b(' + p + ')\\b', 'g'), '<strong>$1</strong>'); });
  // Referencias legales (Ley NNN, Art. NN)
  s = s.replace(/\b(Ley\s\d{2,4})/g, '<strong>$1</strong>');
  s = s.replace(/\b(Art\.\s?\d{1,3})/g, '<strong>$1</strong>');
  return s;
}
function fmtDate(d) {
  if (!d) return '—';
  const x = new Date(d);
  if (isNaN(x)) return '—';
  return x.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtDateTime(d) {
  if (!d) return '—';
  const x = new Date(d);
  if (isNaN(x)) return '—';
  return x.toLocaleString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function initials(name) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
function toast(msg, type = '') {
  const t = $('#toast');
  t.textContent = msg; t.className = type; void t.offsetWidth; t.classList.add('show', type);
  setTimeout(() => t.classList.remove('show'), 3200);
}

// ============================================================
//  AYUDA EN PANTALLA (tooltips)
//  - tip('texto'): genera un ícono "?" con ayuda al pasar el mouse.
//  - hint('texto'): añade la ayuda a un elemento existente (atributo).
//  Un único motor global muestra el globo flotante para cualquier
//  elemento con [data-tip], incluso los generados dinámicamente.
// ============================================================
function tip(text) {
  return ` <span class="help-tip" data-tip="${esc(text)}" tabindex="0" aria-label="Ayuda: ${esc(text)}">?</span>`;
}
function hint(text) {
  return ` data-tip="${esc(text)}" `;
}

function initTooltipEngine() {
  if (document.getElementById('tipBubble')) return;
  const bubble = document.createElement('div');
  bubble.id = 'tipBubble';
  bubble.className = 'tip-bubble';
  document.body.appendChild(bubble);

  let current = null;
  function show(el) {
    const text = el.getAttribute('data-tip');
    if (!text) return;
    current = el;
    bubble.textContent = text;
    bubble.classList.add('show');
    position(el);
  }
  function position(el) {
    const r = el.getBoundingClientRect();
    bubble.style.maxWidth = Math.min(300, window.innerWidth - 24) + 'px';
    bubble.style.left = '0px'; bubble.style.top = '0px';
    const bw = bubble.offsetWidth, bh = bubble.offsetHeight;
    let left = r.left + r.width / 2 - bw / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - bw - 12));
    let top = r.top - bh - 10;            // arriba por defecto
    if (top < 8) top = r.bottom + 10;      // si no cabe, abajo
    bubble.style.left = left + 'px';
    bubble.style.top = top + 'px';
  }
  function hide() { current = null; bubble.classList.remove('show'); }

  // Delegación: funciona con elementos creados dinámicamente
  document.addEventListener('mouseover', (e) => {
    const el = e.target.closest('[data-tip]');
    if (el && el !== current) show(el);
  });
  document.addEventListener('mouseout', (e) => {
    const el = e.target.closest('[data-tip]');
    if (el && el === current && !el.contains(e.relatedTarget)) hide();
  });
  // Accesibilidad: teclado y toque
  document.addEventListener('focusin', (e) => { const el = e.target.closest('[data-tip]'); if (el) show(el); });
  document.addEventListener('focusout', hide);
  document.addEventListener('click', (e) => {
    const el = e.target.closest('.help-tip');
    if (el) { e.stopPropagation(); (current === el) ? hide() : show(el); }
    else if (!e.target.closest('#tipBubble')) hide();
  });
  window.addEventListener('scroll', () => { if (current) position(current); }, true);
}
function loading() { content().innerHTML = '<div class="loading"><div class="spinner"></div>Cargando...</div>'; }

// Modal
function openModal(title, bodyHTML, buttons = [], wide = false) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = bodyHTML;
  $('#modal').classList.toggle('wide', !!wide);
  const foot = $('#modalFoot');
  foot.innerHTML = '';
  buttons.forEach(b => {
    const btn = document.createElement('button');
    btn.className = 'btn ' + (b.class || 'btn--ghost');
    btn.textContent = b.label;
    btn.onclick = b.onClick;
    if (b.id) btn.id = b.id;
    foot.appendChild(btn);
  });
  $('#modalOverlay').classList.add('open');
}
function closeModal() { $('#modalOverlay').classList.remove('open'); }

// ============================================================
//  BORRADORES — autoguardado para no perder lo que se está escribiendo
//  (p. ej. la descripción de un caso o un memorial largo). Se guarda en
//  el navegador, por usuario, y se recupera aunque la sesión se cierre
//  por inactividad o se cierre el navegador.
// ============================================================
const Draft = {
  key(name) { return `lexfive_draft_${state.profile ? state.profile.id : 'anon'}_${name}`; },
  save(name, data) { try { localStorage.setItem(this.key(name), JSON.stringify({ data, ts: Date.now() })); } catch (e) {} },
  load(name) { try { const r = localStorage.getItem(this.key(name)); return r ? JSON.parse(r) : null; } catch (e) { return null; } },
  clear(name) { try { localStorage.removeItem(this.key(name)); } catch (e) {} }
};

// ============================================================
//  Almacén de imágenes del bufete (logo y sello) en IndexedDB.
//  Antes se guardaban en localStorage, pero las imágenes en base64
//  son grandes y llenaban el cupo (~5MB), lo que hacía que el
//  autoguardado de la credencial fallara y se perdieran datos.
//  IndexedDB tiene mucho más espacio y resuelve ese problema.
// ============================================================
const ImgDB = {
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
const IMG = { logo: null, sello: null, loaded: false };

async function ensureImgCache() {
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
  // Respaldo: si quedó un data URL en localStorage (no se pudo migrar), úsalo.
  if (!IMG.logo) { const ol = localStorage.getItem('lexfive_logo_custom'); if (ol && ol.indexOf('data:') === 0) IMG.logo = ol; }
  if (!IMG.sello) { const os = localStorage.getItem('lexfive_sello_custom'); if (os && os.indexOf('data:') === 0) IMG.sello = os; }
  IMG.loaded = true;
}

// Guarda la imagen del bufete (kind = 'logo' | 'sello'). Devuelve true si lo logró.
async function guardarImagen(kind, dataUrl) {
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

function borrarImagen(kind) {
  IMG[kind] = null;
  localStorage.removeItem('lexfive_' + kind + '_custom');
  ImgDB.del(kind);
}

// Texto amistoso de "hace cuánto" se guardó el borrador
function draftAgo(ts) {
  if (!ts) return 'hace un momento';
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return 'hace menos de un minuto';
  if (min < 60) return `hace ${min} minuto${min === 1 ? '' : 's'}`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} hora${h === 1 ? '' : 's'}`;
  const d = Math.floor(h / 24);
  return `hace ${d} día${d === 1 ? '' : 's'}`;
}

// Conecta el autoguardado de un formulario: serializa los campos indicados
// (y grupos de checkboxes) y los guarda en cada cambio.
function wireDraft(draftName, fieldIds, checkboxClasses = []) {
  const collect = () => {
    const o = {};
    fieldIds.forEach(id => { const el = document.getElementById(id); if (el) o[id] = el.value; });
    checkboxClasses.forEach(cls => {
      o['__chk_' + cls] = Array.from(document.querySelectorAll('.' + cls + ':checked')).map(c => c.value);
    });
    return o;
  };
  const apply = (o) => {
    fieldIds.forEach(id => { const el = document.getElementById(id); if (el && o[id] != null) el.value = o[id]; });
    checkboxClasses.forEach(cls => {
      const vals = o['__chk_' + cls] || [];
      document.querySelectorAll('.' + cls).forEach(c => { c.checked = vals.includes(c.value); });
    });
  };
  const onChange = () => Draft.save(draftName, collect());
  fieldIds.forEach(id => { const el = document.getElementById(id); if (el) { el.addEventListener('input', onChange); el.addEventListener('change', onChange); } });
  checkboxClasses.forEach(cls => document.querySelectorAll('.' + cls).forEach(c => c.addEventListener('change', onChange)));
  return { collect, apply };
}

// Si hay un borrador distinto a lo que ya muestra el formulario, ofrece
// recuperarlo con un aviso en la parte superior del modal.
function maybeOfferDraft(draftName, draft) {
  const saved = Draft.load(draftName);
  if (!saved || !saved.data) return;
  if (JSON.stringify(saved.data) === JSON.stringify(draft.collect())) { Draft.clear(draftName); return; }
  const body = $('#modalBody');
  const banner = document.createElement('div');
  banner.className = 'draft-banner';
  banner.innerHTML = `<span>${ICON.alerta || ''} Se guardó automáticamente lo que estaba escribiendo (${draftAgo(saved.ts)}). ¿Desea recuperarlo?</span>
    <span class="draft-banner__actions">
      <button class="btn btn--navy btn--sm" id="draftRestore">Recuperar</button>
      <button class="btn btn--ghost btn--sm" id="draftDiscard">Descartar</button>
    </span>`;
  body.insertBefore(banner, body.firstChild);
  $('#draftRestore').onclick = () => { draft.apply(saved.data); banner.remove(); Draft.save(draftName, draft.collect()); toast('Recuperamos lo que estaba escribiendo.', 'success'); };
  $('#draftDiscard').onclick = () => { Draft.clear(draftName); banner.remove(); };
}

function profName(id) {
  if (!id) return '—';
  const p = state.profiles.find(x => x.id === id);
  return p ? p.nombre : '—';
}
function clienteName(id) {
  if (!id) return '—';
  const c = state.clientes.find(x => x.id === id);
  return c ? c.nombre : '—';
}
function badgeEstado(estado) {
  const label = ESTADOS[estado] || estado || '—';
  return `<span class="badge badge-estado ${esc(estado || '')}">${esc(label)}</span>`;
}
function optionsProfiles(selected) {
  return '<option value="">— Sin asignar —</option>' + state.profiles.filter(p => p.activo)
    .map(p => `<option value="${p.id}" ${p.id === selected ? 'selected' : ''}>${esc(p.nombre)} (${ROLES[p.rol] || p.rol})</option>`).join('');
}

function checkboxesProfiles(selected, cls) {
  const sel = selected || [];
  const staff = state.profiles.filter(p => p.activo && ['admin', 'procurador', 'abogado'].includes(p.rol));
  if (!staff.length) return '<span class="cell-sub">No hay personal disponible.</span>';
  return staff.map(p => `<label class="chk"><input type="checkbox" class="${cls}" value="${p.id}" ${sel.includes(p.id) ? 'checked' : ''}> ${esc(p.nombre)} <span class="chk-rol">(${ROLES[p.rol] || p.rol})</span></label>`).join('');
}
function namesFromIds(ids) {
  if (!ids || !ids.length) return null;
  return ids.map(profName).join(', ');
}
function optionsClientes(selected) {
  return '<option value="">— Sin cliente —</option>' + state.clientes
    .map(c => `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('');
}

// ============================================================
//  Carga de datos comunes
// ============================================================
async function loadProfiles() {
  const { data } = await supabase.from('profiles').select('*').order('nombre');
  state.profiles = data || [];
}
async function loadClientes() {
  const { data } = await supabase.from('clientes').select('*').order('nombre');
  state.clientes = data || [];
}

// ---------- Categorías / áreas del derecho (dinámicas) ----------
// Carga las áreas desde la tabla "categorias". Si la tabla aún no existe
// (no se ejecutó 08_categorias.sql), usa la lista por defecto como respaldo.
async function loadCategorias() {
  const { data, error } = await supabase.from('categorias').select('nombre').order('nombre');
  if (error || !data) {
    state.categorias = [...MATERIAS];
  } else {
    state.categorias = data.map(c => c.nombre);
  }
}

// Devuelve las <option> de áreas, marcando la seleccionada y agregando
// siempre la opción especial para crear una nueva categoría.
function categoriaOptions(selected, { includeNueva = true } = {}) {
  const sel = selected || '';
  // Si el valor guardado ya no está en la lista, lo incluimos igual para no perderlo
  const lista = state.categorias.includes(sel) || !sel ? state.categorias : [sel, ...state.categorias];
  let html = lista.map(c => `<option value="${esc(c)}" ${c === sel ? 'selected' : ''}>${esc(c)}</option>`).join('');
  if (includeNueva) html += '<option value="__nueva__">➕ Crear nueva categoría...</option>';
  return html;
}

// Crea una categoría nueva en la base de datos (evita duplicados) y la deja
// disponible en el estado para que aparezca en todas las listas.
async function crearCategoria(nombre) {
  const limpio = (nombre || '').trim();
  if (!limpio) return null;
  const yaExiste = state.categorias.find(c => c.toLowerCase() === limpio.toLowerCase());
  if (yaExiste) return yaExiste;
  const { error } = await supabase.from('categorias').insert({ nombre: limpio });
  if (error && !String(error.message || '').toLowerCase().includes('duplicate')) {
    toast('No se pudo crear la categoría: ' + error.message, 'error');
    return null;
  }
  await logAccion('crear', 'categoria', limpio, limpio);
  await loadCategorias();
  return limpio;
}

// Conecta un <select> de áreas para que, al elegir "Crear nueva categoría",
// pida el nombre, la guarde y la deje seleccionada (y refresque otros selects).
function wireCategoriaSelect(sel) {
  if (!sel) return;
  sel.dataset.prev = sel.value;
  sel.addEventListener('change', async () => {
    if (sel.value !== '__nueva__') { sel.dataset.prev = sel.value; return; }
    const nombre = prompt('Nombre de la nueva área del derecho:');
    const creada = await crearCategoria(nombre);
    // Reconstruye TODOS los selects de categoría abiertos para incluir la nueva
    document.querySelectorAll('select.js-categoria').forEach(s => {
      const val = s === sel ? (creada || s.dataset.prev || '') : s.value;
      const blank = s.dataset.includeBlank === '1'
        ? `<option value="">${esc(s.dataset.blankLabel || '—')}</option>`
        : '';
      s.innerHTML = blank + categoriaOptions(val);
      s.value = val;
      s.dataset.prev = val;
    });
    if (creada) toast(`Categoría "${creada}" creada.`, 'success');
  });
}

// Renombra una categoría: actualiza la tabla y, en cascada, los procesos y
// modelos que usaban el nombre anterior, para no perder la clasificación.
async function renombrarCategoria(nombreActual, nombreNuevo) {
  const limpio = (nombreNuevo || '').trim();
  if (!limpio || limpio === nombreActual) return false;
  if (state.categorias.find(c => c.toLowerCase() === limpio.toLowerCase())) {
    toast('Ya existe una categoría con ese nombre.', 'error'); return false;
  }
  const { error } = await supabase.from('categorias').update({ nombre: limpio }).eq('nombre', nombreActual);
  if (error) { toast('No se pudo renombrar: ' + error.message, 'error'); return false; }
  // Reclasificar registros existentes
  await supabase.from('procesos').update({ materia: limpio }).eq('materia', nombreActual);
  await supabase.from('modelos').update({ categoria: limpio }).eq('categoria', nombreActual);
  await logAccion('renombrar', 'categoria', nombreActual, `${nombreActual} → ${limpio}`);
  await loadCategorias();
  return true;
}

// Elimina una categoría (solo si nadie la está usando, para no dejar
// procesos/modelos huérfanos sin área).
async function eliminarCategoria(nombre) {
  const [{ count: cProc }, { count: cMod }] = await Promise.all([
    supabase.from('procesos').select('id', { count: 'exact', head: true }).eq('materia', nombre),
    supabase.from('modelos').select('id', { count: 'exact', head: true }).eq('categoria', nombre)
  ]);
  const usos = (cProc || 0) + (cMod || 0);
  if (usos > 0) {
    toast(`No se puede eliminar: "${nombre}" se usa en ${cProc || 0} proceso(s) y ${cMod || 0} modelo(s).`, 'error');
    return false;
  }
  if (!confirm(`¿Eliminar la categoría "${nombre}"?`)) return false;
  const { error } = await supabase.from('categorias').delete().eq('nombre', nombre);
  if (error) { toast('No se pudo eliminar: ' + error.message, 'error'); return false; }
  await logAccion('eliminar', 'categoria', nombre, nombre);
  await loadCategorias();
  return true;
}

// ============================================================
//  VISTA: CATEGORÍAS / ÁREAS DEL DERECHO (solo admin)
// ============================================================
async function renderCategorias() {
  loading();
  await loadCategorias();
  // Conteo de uso por categoría (procesos + modelos)
  const [{ data: procs }, { data: mods }] = await Promise.all([
    supabase.from('procesos').select('materia'),
    supabase.from('modelos').select('categoria')
  ]);
  const usoProc = {}, usoMod = {};
  (procs || []).forEach(p => { if (p.materia) usoProc[p.materia] = (usoProc[p.materia] || 0) + 1; });
  (mods || []).forEach(m => { if (m.categoria) usoMod[m.categoria] = (usoMod[m.categoria] || 0) + 1; });

  content().innerHTML = `
    <div class="toolbar">
      <input type="search" id="qCat" placeholder="Buscar categoría...">
      <div class="spacer"></div>
      <button class="btn btn--primary" id="btnNuevaCat">${ICON.plus} Nueva categoría</button>
    </div>
    <div class="card">
      <div class="card__body" style="padding-bottom:6px">
        <p class="cell-sub">Las áreas del derecho se usan para clasificar <strong>procesos</strong> y <strong>modelos de memoriales</strong>. Al crear una, aparece automáticamente en todas las listas. Solo se pueden eliminar las que no estén en uso.</p>
      </div>
      <div class="card__body--flush"><div id="catTable"></div></div>
    </div>`;

  function paint() {
    const q = ($('#qCat').value || '').toLowerCase();
    const rows = state.categorias.filter(c => !q || c.toLowerCase().includes(q));
    $('#catTable').innerHTML = rows.length ? `<div class="table-wrap"><table class="data">
      <thead><tr><th>Categoría</th><th>Procesos</th><th>Modelos</th><th>Acciones</th></tr></thead>
      <tbody>${rows.map(c => {
        const enUso = (usoProc[c] || 0) + (usoMod[c] || 0) > 0;
        return `<tr class="no-hover">
          <td class="cell-strong">${esc(c)}</td>
          <td>${usoProc[c] || 0}</td>
          <td>${usoMod[c] || 0}</td>
          <td style="white-space:nowrap">
            <button class="btn btn--ghost btn--sm js-ren" data-cat="${esc(c)}">Renombrar</button>
            <button class="btn btn--danger btn--sm js-del" data-cat="${esc(c)}" ${enUso ? 'disabled title="En uso, no se puede eliminar"' : ''}>Eliminar</button>
          </td></tr>`;
      }).join('')}</tbody></table></div>`
      : `<div class="empty">${ICON.categorias}<p>No hay categorías que coincidan.</p></div>`;

    $('#catTable').querySelectorAll('.js-ren').forEach(b => b.onclick = async () => {
      const actual = b.dataset.cat;
      const nuevo = prompt(`Nuevo nombre para "${actual}":`, actual);
      if (nuevo === null) return;
      if (await renombrarCategoria(actual, nuevo)) { toast('Categoría renombrada.', 'success'); renderCategorias(); }
    });
    $('#catTable').querySelectorAll('.js-del').forEach(b => b.onclick = async () => {
      if (await eliminarCategoria(b.dataset.cat)) { toast('Categoría eliminada.', 'success'); renderCategorias(); }
    });
  }
  paint();
  $('#qCat').oninput = paint;
  $('#btnNuevaCat').onclick = async () => {
    const nombre = prompt('Nombre de la nueva área del derecho:');
    if (nombre === null) return;
    const creada = await crearCategoria(nombre);
    if (creada) { toast(`Categoría "${creada}" creada.`, 'success'); renderCategorias(); }
  };
}

// Genera un enlace de WhatsApp con un recordatorio de audiencia ya escrito
function waRecordatorio(p) {
  const t = encodeURIComponent(
    `Recordatorio LexFive\nProceso: ${p.caratula}\nAudiencia/plazo: ${fmtDateTime(p.proxima_audiencia)}\nResponsable: ${profName(p.abogado_id)}`
  );
  return `https://wa.me/${WHATSAPP}?text=${t}`;
}

// Abre un modal para enviar el recordatorio por WhatsApp a los 5 abogados
function recordarPorWhatsApp(p) {
  const enc = encodeURIComponent(
    `Recordatorio LexFive\nProceso: ${p.caratula}\nAudiencia/plazo: ${fmtDateTime(p.proxima_audiencia)}\nResponsable: ${profName(p.abogado_id)}`
  );
  const body = `
    <p class="cell-sub" style="margin-bottom:14px">Toque cada botón para enviar el recordatorio por WhatsApp a cada abogado del equipo:</p>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${ABOGADOS.map(a => `<a class="btn" style="justify-content:flex-start;background:#25d366;color:#fff;border-color:#25d366" target="_blank" rel="noopener" href="https://wa.me/${a.wa}?text=${enc}">Enviar a ${esc(a.nombre)}</a>`).join('')}
    </div>`;
  openModal('Recordar audiencia / plazo', body, [{ label: 'Cerrar', class: 'btn--primary', onClick: closeModal }]);
}

// ============================================================
//  VISTA: DASHBOARD
// ============================================================
async function renderDashboard() {
  loading();
  const { data: procesos } = await supabase.from('procesos').select('*').order('proxima_audiencia', { ascending: true });
  const list = procesos || [];
  const activos = list.filter(p => !['archivado', 'concluido'].includes(p.estado)).length;
  const ahora = new Date();
  const proximas = list.filter(p => p.proxima_audiencia && new Date(p.proxima_audiencia) >= ahora)
    .sort((a, b) => new Date(a.proxima_audiencia) - new Date(b.proxima_audiencia));
  const mios = list.filter(p => p.abogado_id === state.profile.id || p.procurador_id === state.profile.id || (p.abogados_ids || []).includes(state.profile.id) || (p.procuradores_ids || []).includes(state.profile.id)).length;

  // Consultas nuevas recibidas desde el formulario de contacto de la web
  let consultasNuevas = 0;
  try {
    const { count } = await supabase.from('consultas').select('id', { count: 'exact', head: true }).eq('estado', 'nueva');
    consultasNuevas = count || 0;
  } catch (e) { consultasNuevas = 0; }

  // Alertas: audiencias vencidas y dentro de los próximos 7 días
  const en7 = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);
  const vencidas = list.filter(p => p.proxima_audiencia && new Date(p.proxima_audiencia) < ahora && !['archivado', 'concluido'].includes(p.estado))
    .sort((a, b) => new Date(b.proxima_audiencia) - new Date(a.proxima_audiencia));
  const urgentes = proximas.filter(p => new Date(p.proxima_audiencia) <= en7);

  const alertRow = (p, cls) => `
    <div class="alert-row ${cls}">
      <div><strong>${esc(p.caratula)}</strong><div class="cell-sub">${fmtDateTime(p.proxima_audiencia)} · ${esc(profName(p.abogado_id))}</div></div>
      <button class="btn btn--ghost btn--sm js-recordar" data-id="${p.id}">${ICON.whatsapp} Recordar a los 5</button>
    </div>`;
  const alertasHtml = (vencidas.length || urgentes.length) ? `
    <div class="card">
      <div class="card__head"><h3>${ICON.alerta} Alertas de audiencias y plazos</h3></div>
      <div class="card__body">
        ${vencidas.length ? `<p class="alert-title alert-title--red">Vencidas (${vencidas.length})</p>${vencidas.slice(0, 5).map(p => alertRow(p, 'alert-row--red')).join('')}` : ''}
        ${urgentes.length ? `<p class="alert-title alert-title--amber" style="margin-top:${vencidas.length ? '16px' : '0'}">Próximas (7 días) (${urgentes.length})</p>${urgentes.slice(0, 5).map(p => alertRow(p, 'alert-row--amber')).join('')}` : ''}
      </div>
    </div>` : '';

  content().innerHTML = `
    <div class="stats-grid">
      <div class="metric"><div class="metric__top"><div class="metric__icon">${ICON.procesos}</div></div><div class="metric__num">${list.length}</div><div class="metric__label">Procesos totales</div></div>
      <div class="metric"><div class="metric__top"><div class="metric__icon">${ICON.dashboard}</div></div><div class="metric__num">${activos}</div><div class="metric__label">Procesos activos</div></div>
      <div class="metric"><div class="metric__top"><div class="metric__icon">${ICON.audiencia}</div></div><div class="metric__num">${proximas.length}</div><div class="metric__label">Audiencias próximas</div></div>
      <div class="metric"><div class="metric__top"><div class="metric__icon">${ICON.clientes}</div></div><div class="metric__num">${mios}</div><div class="metric__label">Mis procesos</div></div>
      <div class="metric" id="mConsultas" style="cursor:pointer" ${hint('Mensajes nuevos enviados desde el formulario de contacto de la web. Haga clic para verlos y responder.')}><div class="metric__top"><div class="metric__icon">${ICON.consultas}</div></div><div class="metric__num">${consultasNuevas}</div><div class="metric__label">Consultas nuevas</div></div>
    </div>

    ${alertasHtml}

    <div class="card">
      <div class="card__head"><h3>Próximas audiencias y plazos</h3></div>
      <div class="card__body--flush">
        ${proximas.length ? `<div class="table-wrap"><table class="data">
          <thead><tr><th>Carátula</th><th>Materia</th><th>Fecha / hora</th><th>Responsable</th></tr></thead>
          <tbody>${proximas.slice(0, 8).map(p => `
            <tr data-id="${p.id}">
              <td class="cell-strong">${esc(p.caratula)}</td>
              <td><span class="badge badge-mat">${esc(p.materia || '—')}</span></td>
              <td>${fmtDateTime(p.proxima_audiencia)}</td>
              <td>${esc(namesFromIds(p.abogados_ids) || profName(p.abogado_id))}</td>
            </tr>`).join('')}</tbody></table></div>`
        : `<div class="empty">${ICON.audiencia}<p>No hay audiencias ni plazos próximos registrados.</p></div>`}
      </div>
    </div>`;

  content().querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => openProcesoDetail(tr.dataset.id));
  content().querySelectorAll('.js-recordar').forEach(btn => btn.onclick = (e) => {
    e.stopPropagation();
    const p = list.find(x => x.id === btn.dataset.id);
    if (p) recordarPorWhatsApp(p);
  });
  const mc = $('#mConsultas'); if (mc) mc.onclick = () => navigate('consultas');
}

// ============================================================
//  VISTA: PROCESOS
// ============================================================
async function renderProcesos() {
  loading();
  await loadClientes();
  await loadCategorias();
  const { data } = await supabase.from('procesos').select('*').order('created_at', { ascending: false });
  const procesos = data || [];

  content().innerHTML = `
    <div class="toolbar">
      <input type="search" id="qProc" placeholder="Buscar por carátula, número, juzgado..." ${hint('Escriba para filtrar la lista por carátula, número, juzgado o parte contraria.')}>
      <select id="fMateria" ${hint('Filtra los procesos por área del derecho.')}><option value="">Todas las materias</option>${state.categorias.map(m => `<option>${esc(m)}</option>`).join('')}</select>
      <select id="fEstado" ${hint('Filtra los procesos por su etapa actual.')}><option value="">Todos los estados</option>${Object.entries(ESTADOS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
      <div class="spacer"></div>
      <button class="btn btn--primary" id="btnNuevoProc" ${hint('Crea un nuevo caso. Solo la carátula es obligatoria; el resto puede completarlo después.')}>${ICON.plus} Nuevo proceso</button>
    </div>
    <div class="card"><div class="card__body--flush"><div id="procTable"></div></div></div>`;

  function paint() {
    const q = ($('#qProc').value || '').toLowerCase();
    const fm = $('#fMateria').value, fe = $('#fEstado').value;
    const rows = procesos.filter(p =>
      (!fm || p.materia === fm) && (!fe || p.estado === fe) &&
      (!q || [p.caratula, p.numero, p.juzgado, p.parte_contraria].some(v => (v || '').toLowerCase().includes(q))));
    $('#procTable').innerHTML = rows.length ? `<div class="table-wrap"><table class="data">
      <thead><tr><th>Carátula</th><th>Materia</th><th>Tipo</th><th>Abogado</th><th>Estado</th><th>Próx. audiencia</th></tr></thead>
      <tbody>${rows.map(p => `
        <tr data-id="${p.id}">
          <td class="cell-strong">${esc(p.caratula)}<div class="cell-sub">${esc(p.numero || 'Sin número')}</div></td>
          <td><span class="badge badge-mat">${esc(p.materia || '—')}</span></td>
          <td>${p.tipo === 'administrativo' ? 'Administrativo' : 'Judicial'}</td>
          <td>${esc(namesFromIds(p.abogados_ids) || profName(p.abogado_id))}</td>
          <td>${badgeEstado(p.estado)}</td>
          <td>${p.proxima_audiencia ? fmtDateTime(p.proxima_audiencia) : '—'}</td>
        </tr>`).join('')}</tbody></table></div>`
      : `<div class="empty">${ICON.procesos}<p>No se encontraron procesos.</p></div>`;
    $('#procTable').querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => openProcesoDetail(tr.dataset.id));
  }
  paint();
  $('#qProc').oninput = paint; $('#fMateria').onchange = paint; $('#fEstado').onchange = paint;
  $('#btnNuevoProc').onclick = () => procesoForm();
}

function procesoForm(proc = null) {
  const p = proc || {};
  const body = `
    <div class="field"><label>Carátula / Nombre del proceso *${tip('Es el título del caso. Ej: "García c/ Empresa X por beneficios sociales". Sirve para identificar el proceso rápidamente.')}</label><input id="pf_caratula" value="${esc(p.caratula || '')}"></div>
    <div class="field-row">
      <div class="field"><label>N.º de proceso / expediente${tip('Número que asigna el juzgado al expediente. Si aún no lo tiene, puede dejarlo vacío y completarlo después.')}</label><input id="pf_numero" value="${esc(p.numero || '')}"></div>
      <div class="field"><label>NUREJ${tip('Número Único de Registro Judicial. Es el código que identifica la causa en el sistema judicial.')}</label><input id="pf_nurej" value="${esc(p.nurej || '')}" placeholder="Número Único de Registro Judicial"></div>
    </div>
    <div class="field"><label>Tipo${tip('Judicial: el caso se tramita ante un juzgado. Administrativo: ante una entidad pública (alcaldía, ministerio, etc.).')}</label><select id="pf_tipo"><option value="judicial" ${p.tipo !== 'administrativo' ? 'selected' : ''}>Judicial</option><option value="administrativo" ${p.tipo === 'administrativo' ? 'selected' : ''}>Administrativo</option></select></div>
    <div class="field-row">
      <div class="field"><label>Materia${tip('Área del derecho del caso (Laboral, Civil, Penal...). Si falta una, elija "Crear nueva categoría" y se agregará a todo el sistema.')}</label><select id="pf_materia" class="js-categoria" data-include-blank="1"><option value="">—</option>${categoriaOptions(p.materia)}</select></div>
      <div class="field"><label>Estado${tip('Etapa actual del caso. Manténgalo al día para que el equipo y el cliente sepan cómo avanza.')}</label><select id="pf_estado">${Object.entries(ESTADOS).map(([k, v]) => `<option value="${k}" ${p.estado === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
    </div>
    <div class="field"><label>Juzgado / Entidad${tip('Nombre del juzgado o de la entidad donde se tramita el caso. Ej: "Juzgado 2º de Trabajo de El Alto".')}</label><input id="pf_juzgado" value="${esc(p.juzgado || '')}"></div>
    <div class="field-row">
      <div class="field"><label>Cliente${tip('Persona o empresa que representamos. Elíjala de la lista; si es nueva, use el campo de abajo para registrarla.')}</label><select id="pf_cliente">${optionsClientes(p.cliente_id)}</select></div>
      <div class="field"><label>Parte contraria${tip('La otra parte del proceso (demandado o demandante según el caso).')}</label><input id="pf_contraria" value="${esc(p.parte_contraria || '')}"></div>
    </div>
    <div class="field"><label>...o registrar un cliente nuevo (nombre completo)${tip('Si el cliente aún no existe, escriba aquí su nombre: se creará automáticamente y aparecerá en la pestaña Clientes.')}</label><input id="pf_cliente_nuevo" placeholder="Se creará y aparecerá en la pestaña Clientes"></div>
    <div class="field-row">
      <div class="field"><label>Abogados a cargo (puede elegir varios)${tip('Marque a los abogados responsables del caso. Pueden ser varios; aparecerá en su panel como "Mis procesos".')}</label><div class="chk-grid">${checkboxesProfiles(p.abogados_ids, 'pf-abo')}</div></div>
      <div class="field"><label>Procuradores asignados (puede elegir varios)${tip('Marque a los procuradores que apoyarán en el seguimiento y trámites del caso.')}</label><div class="chk-grid">${checkboxesProfiles(p.procuradores_ids, 'pf-proc')}</div></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Fecha de inicio${tip('Fecha en que se inició o ingresó el caso al bufete.')}</label><input type="date" id="pf_inicio" value="${p.fecha_inicio || (proc ? '' : new Date().toISOString().slice(0,10))}"></div>
      <div class="field"><label>Próxima audiencia / plazo${tip('Fecha y hora del próximo evento importante. El sistema avisará en el panel cuando se acerque o venza.')}</label><input type="datetime-local" id="pf_audiencia" value="${p.proxima_audiencia ? new Date(p.proxima_audiencia).toISOString().slice(0,16) : ''}"></div>
    </div>
    <div class="field"><label>Descripción${tip('Resumen del caso y notas importantes. Lo que escriba se autoguarda: si se cierra la sesión, podrá recuperarlo.')}</label><textarea id="pf_desc">${esc(p.descripcion || '')}</textarea></div>
    ${proc ? '' : `<div class="field"><label>Primer memorial (opcional)${tip('Puede adjuntar el primer documento del caso. También podrá subir más archivos después, desde el detalle del proceso.')}</label><input type="file" id="pf_memorial"><span class="cell-sub" style="display:block;margin-top:4px;">Se adjuntará al proceso al guardarlo.</span></div>`}`;

  openModal(proc ? 'Editar proceso' : 'Nuevo proceso', body, [
    { label: 'Cancelar', class: 'btn--ghost', onClick: closeModal },
    { label: 'Guardar', class: 'btn--primary', id: 'pf_save', onClick: () => saveProceso(proc) }
  ], true);
  wireCategoriaSelect($('#pf_materia'));

  // Autoguardado de borrador (no perder lo escrito si se cierra la sesión)
  const draftName = 'proceso_' + (proc ? proc.id : 'nuevo');
  const fields = ['pf_caratula', 'pf_numero', 'pf_nurej', 'pf_tipo', 'pf_materia', 'pf_estado',
    'pf_juzgado', 'pf_cliente', 'pf_contraria', 'pf_cliente_nuevo', 'pf_inicio', 'pf_audiencia', 'pf_desc'];
  const draft = wireDraft(draftName, fields, ['pf-abo', 'pf-proc']);
  maybeOfferDraft(draftName, draft);
}

async function saveProceso(proc) {
  const caratula = $('#pf_caratula').value.trim();
  if (!caratula) { toast('La carátula es obligatoria.', 'error'); return; }
  const aud = $('#pf_audiencia').value;
  const abogados_ids = Array.from(document.querySelectorAll('.pf-abo:checked')).map(c => c.value);
  const procuradores_ids = Array.from(document.querySelectorAll('.pf-proc:checked')).map(c => c.value);
  $('#pf_save').disabled = true;
  let clienteId = $('#pf_cliente').value || null;
  const nuevoCliente = $('#pf_cliente_nuevo').value.trim();
  if (nuevoCliente) {
    const { data: cliNuevo, error: cErr } = await supabase.from('clientes').insert({ nombre: nuevoCliente, created_by: state.profile.id }).select('id').single();
    if (cErr) { toast('Error al crear el cliente: ' + cErr.message, 'error'); $('#pf_save').disabled = false; return; }
    clienteId = cliNuevo.id;
  }
  const payload = {
    caratula,
    numero: $('#pf_numero').value.trim() || null,
    nurej: $('#pf_nurej').value.trim() || null,
    tipo: $('#pf_tipo').value,
    materia: $('#pf_materia').value || null,
    estado: $('#pf_estado').value,
    juzgado: $('#pf_juzgado').value.trim() || null,
    cliente_id: clienteId,
    parte_contraria: $('#pf_contraria').value.trim() || null,
    abogados_ids: abogados_ids,
    procuradores_ids: procuradores_ids,
    abogado_id: abogados_ids[0] || null,
    procurador_id: procuradores_ids[0] || null,
    fecha_inicio: $('#pf_inicio').value || null,
    proxima_audiencia: aud ? new Date(aud).toISOString() : null,
    descripcion: $('#pf_desc').value.trim() || null
  };
  $('#pf_save').disabled = true;
  let error;
  if (proc) {
    payload.updated_at = new Date().toISOString();
    ({ error } = await supabase.from('procesos').update(payload).eq('id', proc.id));
  } else {
    payload.created_by = state.profile.id;
    const { data: nuevo, error: insErr } = await supabase.from('procesos').insert(payload).select('id').single();
    error = insErr;
    if (!error && nuevo) {
      const fileInput = document.getElementById('pf_memorial');
      const file = fileInput && fileInput.files[0];
      if (file) {
        const path = `${nuevo.id}/${Date.now()}_${file.name.replace(/[^\w.\-]/g, '_')}`;
        const { error: upErr } = await supabase.storage.from('documentos').upload(path, file);
        if (!upErr) {
          await supabase.from('documentos').insert({ proceso_id: nuevo.id, nombre: file.name, tipo: 'memorial', storage_path: path, subido_por: state.profile.id });
        }
      }
    }
  }
  if (error) { toast('Error al guardar: ' + error.message, 'error'); $('#pf_save').disabled = false; return; }
  Draft.clear('proceso_' + (proc ? proc.id : 'nuevo'));
  await logAccion(proc ? 'editar' : 'crear', 'proceso', proc ? proc.id : caratula, caratula);
  closeModal(); toast(proc ? 'Proceso actualizado.' : 'Proceso creado.', 'success');
  renderProcesos();
}

// ---------- Detalle de proceso ----------
async function openProcesoDetail(id, readonly = false) {
  openModal('Detalle del proceso', '<div class="loading"><div class="spinner"></div>Cargando...</div>', [], true);
  const { data: p } = await supabase.from('procesos').select('*').eq('id', id).single();
  if (!p) { toast('No se encontró el proceso.', 'error'); closeModal(); return; }
  const [{ data: acts }, { data: docs }] = await Promise.all([
    supabase.from('actuaciones').select('*').eq('proceso_id', id).order('fecha', { ascending: false }),
    supabase.from('documentos').select('*').eq('proceso_id', id).order('created_at', { ascending: false })
  ]);

  const detail = `
    <div class="detail-grid">
      <div class="detail-item"><label>N.º de proceso</label><span>${esc(p.numero || '—')}</span></div>
      <div class="detail-item"><label>NUREJ</label><span>${esc(p.nurej || '—')}</span></div>
      <div class="detail-item"><label>Materia</label><span>${esc(p.materia || '—')} · ${p.tipo === 'administrativo' ? 'Administrativo' : 'Judicial'}</span></div>
      <div class="detail-item"><label>Juzgado / Entidad</label><span>${esc(p.juzgado || '—')}</span></div>
      <div class="detail-item"><label>Estado</label><span>${badgeEstado(p.estado)}</span></div>
      <div class="detail-item"><label>Cliente</label><span>${esc(clienteName(p.cliente_id))}</span></div>
      <div class="detail-item"><label>Parte contraria</label><span>${esc(p.parte_contraria || '—')}</span></div>
      <div class="detail-item"><label>Abogados a cargo</label><span>${esc(namesFromIds(p.abogados_ids) || profName(p.abogado_id))}</span></div>
      <div class="detail-item"><label>Procuradores</label><span>${esc(namesFromIds(p.procuradores_ids) || profName(p.procurador_id))}</span></div>
      <div class="detail-item"><label>Fecha de inicio</label><span>${fmtDate(p.fecha_inicio)}</span></div>
      <div class="detail-item"><label>Próxima audiencia / plazo</label><span>${fmtDateTime(p.proxima_audiencia)}</span></div>
    </div>
    ${p.descripcion ? `<div class="detail-item" style="margin-top:14px"><label>Descripción</label><span>${esc(p.descripcion)}</span></div>` : ''}

    <h4 class="section-title">Memoriales y documentos${tip('Documentos generales del caso (poder, carátula, anexos). Para la respuesta del juzgado y el nuevo memorial, mejor adjúntelos en el paso correspondiente del historial de abajo.')}</h4>
    ${readonly ? '' : `<div class="field" style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;">
      <div style="flex-grow:1;min-width:180px;"><label style="font-size:.8rem;">Subir archivo (PDF, Word, imagen...)</label><input type="file" id="docFile"></div>
      <input id="docNombre" placeholder="Descripción (ej: Memorial de respuesta)" style="flex-grow:1;min-width:180px;padding:10px 12px;border:1.5px solid var(--line);border-radius:8px;">
      <button class="btn btn--navy" id="btnUpload">Subir</button>
    </div>`}
    <div id="docList">${renderDocs((docs || []).filter(d => !d.actuacion_id), readonly)}</div>

    <h4 class="section-title">Historial de actuaciones${tip('Cada paso del caso en orden. Registre el avance (ej: "Respuesta del juzgado") y adjunte los archivos: la respuesta recibida y el nuevo memorial a presentar. El cliente verá esto y podrá descargarlo.')}</h4>
    ${readonly ? '' : `<div class="act-form">
      <div class="field-row" style="margin-bottom:8px">
        <input type="date" id="actFecha" value="${new Date().toISOString().slice(0,10)}" style="padding:10px 12px;border:1.5px solid var(--line);border-radius:8px;">
        <input id="actDesc" placeholder="Describa el paso (ej: Respuesta del juzgado, Nuevo memorial...)" style="padding:10px 12px;border:1.5px solid var(--line);border-radius:8px;">
      </div>
      <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;">
        <div style="flex-grow:1;min-width:200px;"><label style="font-size:.8rem;color:var(--muted)">Adjuntar archivos (opcional): respuesta del juzgado, nuevo memorial, etc.</label><input type="file" id="actFiles" multiple></div>
        <button class="btn btn--navy" id="btnActuacion">Agregar al historial</button>
      </div>
      <span class="cell-sub" id="actProgreso"></span>
    </div>`}
    <ul class="timeline" id="actList">${renderActs(acts || [], docs || [])}</ul>
    ${state.profile.rol === 'cliente' ? `<div class="card" id="opinionProc" style="margin-top:18px"></div>` : ''}`;

  const buttons = [];
  if (!readonly) {
    buttons.push({ label: 'Editar', class: 'btn--ghost', onClick: () => procesoForm(p) });
    if (can(state.profile, 'delete_proceso')) {
      buttons.push({ label: 'Eliminar', class: 'btn--danger', onClick: () => deleteProceso(p) });
    }
  }
  buttons.push({ label: 'Cerrar', class: 'btn--primary', onClick: closeModal });

  $('#modalTitle').textContent = p.caratula;
  $('#modalBody').innerHTML = detail;
  const foot = $('#modalFoot'); foot.innerHTML = '';
  buttons.forEach(b => { const x = document.createElement('button'); x.className = 'btn ' + b.class; x.textContent = b.label; x.onclick = b.onClick; foot.appendChild(x); });

  // Subir documento (solo personal)
  if ($('#btnUpload')) $('#btnUpload').onclick = async () => {
    const file = $('#docFile').files[0];
    if (!file) { toast('Seleccione un archivo.', 'error'); return; }
    $('#btnUpload').disabled = true; $('#btnUpload').textContent = 'Subiendo...';
    const path = `${id}/${Date.now()}_${file.name.replace(/[^\w.\-]/g, '_')}`;
    const { error: upErr } = await supabase.storage.from('documentos').upload(path, file);
    if (upErr) { toast('Error al subir: ' + upErr.message, 'error'); $('#btnUpload').disabled = false; $('#btnUpload').textContent = 'Subir'; return; }
    const { error: insErr } = await supabase.from('documentos').insert({
      proceso_id: id, nombre: $('#docNombre').value.trim() || file.name, tipo: 'memorial', storage_path: path, subido_por: state.profile.id
    });
    if (insErr) { toast('Error al registrar: ' + insErr.message, 'error'); }
    else {
      await logAccion('subir_documento', 'proceso', id, file.name);
      const { data: nd } = await supabase.from('documentos').select('*').eq('proceso_id', id).order('created_at', { ascending: false });
      $('#docList').innerHTML = renderDocs((nd || []).filter(d => !d.actuacion_id)); wireDocs(id);
      toast('Documento cargado.', 'success');
    }
    $('#btnUpload').disabled = false; $('#btnUpload').textContent = 'Subir'; $('#docNombre').value = ''; $('#docFile').value = '';
  };
  wireDocs(id);

  // Helper: recarga el historial (actuaciones + sus documentos) y reconecta botones
  async function reloadTimeline() {
    const [{ data: na }, { data: nd }] = await Promise.all([
      supabase.from('actuaciones').select('*').eq('proceso_id', id).order('fecha', { ascending: false }),
      supabase.from('documentos').select('*').eq('proceso_id', id).order('created_at', { ascending: false })
    ]);
    $('#actList').innerHTML = renderActs(na || [], nd || []);
    wireTimelineDocs(id, readonly, reloadTimeline);
    // Refresca también la lista general de documentos
    if ($('#docList')) { $('#docList').innerHTML = renderDocs((nd || []).filter(d => !d.actuacion_id), readonly); wireDocs(id); }
  }
  wireTimelineDocs(id, readonly, reloadTimeline);

  // Agregar actuación + adjuntos (solo personal)
  if ($('#btnActuacion')) $('#btnActuacion').onclick = async () => {
    const desc = $('#actDesc').value.trim();
    if (!desc) { toast('Describa el paso del proceso.', 'error'); return; }
    const btn = $('#btnActuacion'); const prog = $('#actProgreso');
    btn.disabled = true; btn.textContent = 'Guardando...';

    // 1) Crear la actuación
    const { data: actData, error } = await supabase.from('actuaciones').insert({
      proceso_id: id, fecha: $('#actFecha').value || new Date().toISOString().slice(0, 10),
      descripcion: desc, created_by: state.profile.id
    }).select().single();
    if (error) { toast('Error: ' + error.message, 'error'); btn.disabled = false; btn.textContent = 'Agregar al historial'; return; }
    await logAccion('actuacion', 'proceso', id, desc.slice(0, 60));

    // 2) Subir los archivos adjuntos vinculados a esa actuación
    const archivos = [...($('#actFiles') ? $('#actFiles').files : [])];
    let ok = 0, fallos = 0;
    for (let i = 0; i < archivos.length; i++) {
      const file = archivos[i];
      prog.textContent = `Subiendo adjunto ${i + 1} de ${archivos.length}...`;
      const path = `${id}/${Date.now()}_${i}_${file.name.replace(/[^\w.\-]/g, '_')}`;
      const { error: upErr } = await supabase.storage.from('documentos').upload(path, file);
      if (upErr) { fallos++; continue; }
      const { error: insErr } = await supabase.from('documentos').insert({
        proceso_id: id, actuacion_id: actData.id, nombre: file.name, tipo: 'actuacion',
        storage_path: path, subido_por: state.profile.id
      });
      if (insErr) { fallos++; await supabase.storage.from('documentos').remove([path]); continue; }
      ok++;
    }
    prog.textContent = '';
    btn.disabled = false; btn.textContent = 'Agregar al historial';
    $('#actDesc').value = ''; if ($('#actFiles')) $('#actFiles').value = '';
    if (window.__clearActDraft) window.__clearActDraft();
    await reloadTimeline();
    toast(`Paso agregado al historial${ok ? ` con ${ok} archivo(s)` : ''}.${fallos ? ' ' + fallos + ' fallaron.' : ''}`, fallos ? 'error' : 'success');
  };

  // Para el cliente: widget de "Mi opinión" dentro del propio proceso
  if (state.profile.rol === 'cliente') mountOpinion($('#opinionProc'));

  // Autoguardado de la actuación que se está escribiendo (no se pierde el texto)
  if (!readonly && $('#actDesc')) {
    const actDraft = 'actuacion_' + id;
    const adraft = wireDraft(actDraft, ['actFecha', 'actDesc']);
    const sv = Draft.load(actDraft);
    if (sv && sv.data && sv.data.actDesc) { adraft.apply(sv.data); toast('Recuperamos la actuación que estaba escribiendo.', 'success'); }
    // Nota: los archivos adjuntos no se pueden recuperar (el navegador no
    // permite "recordar" archivos); sí se conserva la descripción y la fecha.
    window.__clearActDraft = () => Draft.clear(actDraft);
  }
}

function renderDocs(docs, readonly = false) {
  if (!docs.length) return '<p class="cell-sub" style="padding:6px 0">Aún no hay documentos cargados.</p>';
  return docs.map(d => `
    <div class="doc-row" data-path="${esc(d.storage_path)}" data-id="${d.id}">
      <div class="doc-row__info"><div class="doc-row__icon">${ICON.doc}</div>
        <div><div class="cell-strong">${esc(d.nombre)}</div><div class="cell-sub">${fmtDate(d.created_at)} · ${esc(profName(d.subido_por))}</div></div>
      </div>
      <div style="display:flex;gap:6px;">
        <button class="btn btn--ghost btn--sm js-dl">Descargar</button>
        ${(!readonly && (d.subido_por === state.profile.id || state.profile.rol === 'admin')) ? '<button class="btn btn--danger btn--sm js-del">Eliminar</button>' : ''}
      </div>
    </div>`).join('');
}
function wireDocs(procId) {
  content(); // no-op safety
  document.querySelectorAll('#docList .doc-row').forEach(row => {
    const path = row.dataset.path, docId = row.dataset.id;
    const dl = row.querySelector('.js-dl');
    if (dl) dl.onclick = async () => {
      const { data, error } = await supabase.storage.from('documentos').createSignedUrl(path, 120);
      if (error) { toast('No se pudo generar el enlace.', 'error'); return; }
      window.open(data.signedUrl, '_blank');
    };
    const del = row.querySelector('.js-del');
    if (del) del.onclick = async () => {
      if (!confirm('¿Eliminar este documento?')) return;
      await supabase.storage.from('documentos').remove([path]);
      await supabase.from('documentos').delete().eq('id', docId);
      await logAccion('eliminar_documento', 'proceso', procId, path);
      const { data: nd } = await supabase.from('documentos').select('*').eq('proceso_id', procId).order('created_at', { ascending: false });
      $('#docList').innerHTML = renderDocs((nd || []).filter(d => !d.actuacion_id)); wireDocs(procId);
      toast('Documento eliminado.', 'success');
    };
  });
}
function renderActs(acts, docs = []) {
  if (!acts.length) return '<li class="cell-sub" style="border:none">Sin actuaciones registradas.</li>';
  return acts.map(a => {
    const adjuntos = docs.filter(d => d.actuacion_id === a.id);
    const filesHtml = adjuntos.length ? `<div class="act-files">${adjuntos.map(d => `
      <div class="act-file" data-path="${esc(d.storage_path)}" data-id="${d.id}">
        <span class="act-file__icon">${ICON.doc}</span>
        <span class="act-file__name">${esc(d.nombre)}</span>
        <button class="btn btn--ghost btn--sm js-tl-dl">Descargar</button>
        ${(state.profile.rol !== 'cliente' && (d.subido_por === state.profile.id || state.profile.rol === 'admin')) ? '<button class="btn btn--danger btn--sm js-tl-del">Eliminar</button>' : ''}
      </div>`).join('')}</div>` : '';
    return `<li><div class="t-date">${fmtDate(a.fecha)} · ${esc(profName(a.created_by))}</div><div>${esc(a.descripcion)}</div>${filesHtml}</li>`;
  }).join('');
}

// Conecta los botones de descargar/eliminar de los adjuntos del historial
function wireTimelineDocs(procId, readonly, reload) {
  document.querySelectorAll('#actList .act-file').forEach(row => {
    const path = row.dataset.path, docId = row.dataset.id;
    const dl = row.querySelector('.js-tl-dl');
    if (dl) dl.onclick = async () => {
      const { data, error } = await supabase.storage.from('documentos').createSignedUrl(path, 120);
      if (error) { toast('No se pudo generar el enlace.', 'error'); return; }
      window.open(data.signedUrl, '_blank');
    };
    const del = row.querySelector('.js-tl-del');
    if (del) del.onclick = async () => {
      if (!confirm('¿Eliminar este archivo?')) return;
      await supabase.storage.from('documentos').remove([path]);
      await supabase.from('documentos').delete().eq('id', docId);
      await logAccion('eliminar_documento', 'proceso', procId, path);
      if (reload) await reload();
      toast('Archivo eliminado.', 'success');
    };
  });
}

async function deleteProceso(p) {
  if (!confirm(`¿Eliminar definitivamente el proceso "${p.caratula}"? Esta acción no se puede deshacer.`)) return;
  const { error } = await supabase.from('procesos').delete().eq('id', p.id);
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  await logAccion('eliminar', 'proceso', p.id, p.caratula);
  closeModal(); toast('Proceso eliminado.', 'success'); renderProcesos();
}

// ============================================================
//  VISTA: CLIENTES
// ============================================================
async function renderClientes() {
  loading();
  await loadClientes();
  content().innerHTML = `
    <div class="toolbar">
      <input type="search" id="qCli" placeholder="Buscar cliente...">
      <div class="spacer"></div>
      <button class="btn btn--primary" id="btnNuevoCli">${ICON.plus} Nuevo cliente</button>
    </div>
    <div class="card"><div class="card__body--flush"><div id="cliTable"></div></div></div>`;
  function paint() {
    const q = ($('#qCli').value || '').toLowerCase();
    const rows = state.clientes.filter(c => !q || [c.nombre, c.documento, c.email, c.telefono].some(v => (v || '').toLowerCase().includes(q)));
    $('#cliTable').innerHTML = rows.length ? `<div class="table-wrap"><table class="data">
      <thead><tr><th>Nombre</th><th>Documento</th><th>Teléfono</th><th>Correo</th></tr></thead>
      <tbody>${rows.map(c => `<tr data-id="${c.id}"><td class="cell-strong">${esc(c.nombre)}</td><td>${esc(c.documento || '—')}</td><td>${esc(c.telefono || '—')}</td><td>${esc(c.email || '—')}</td></tr>`).join('')}</tbody></table></div>`
      : `<div class="empty">${ICON.clientes}<p>No hay clientes registrados.</p></div>`;
    $('#cliTable').querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => {
      const c = state.clientes.find(x => x.id === tr.dataset.id); clienteForm(c);
    });
  }
  paint();
  $('#qCli').oninput = paint;
  $('#btnNuevoCli').onclick = () => clienteForm();
}

function clienteForm(cli = null) {
  const c = cli || {};
  const body = `
    <div class="field"><label>Nombre / Razón social *${tip('Nombre completo de la persona o el nombre de la empresa que representamos.')}</label><input id="cf_nombre" value="${esc(c.nombre || '')}"></div>
    <div class="field-row">
      <div class="field"><label>Documento (CI/NIT)${tip('Cédula de Identidad de la persona o NIT si es empresa.')}</label><input id="cf_doc" value="${esc(c.documento || '')}"></div>
      <div class="field"><label>Teléfono${tip('Número de contacto, preferentemente con WhatsApp.')}</label><input id="cf_tel" value="${esc(c.telefono || '')}"></div>
    </div>
    <div class="field"><label>Correo electrónico${tip('Importante: si el cliente se registra en el portal con este mismo correo, verá automáticamente sus procesos.')}</label><input id="cf_email" value="${esc(c.email || '')}"></div>
    <div class="field"><label>Dirección${tip('Domicilio del cliente (opcional).')}</label><input id="cf_dir" value="${esc(c.direccion || '')}"></div>
    <div class="field"><label>Notas${tip('Anotaciones internas sobre el cliente. Solo las ve el personal del bufete.')}</label><textarea id="cf_notas">${esc(c.notas || '')}</textarea></div>`;
  const buttons = [{ label: 'Cancelar', class: 'btn--ghost', onClick: closeModal }];
  if (cli && can(state.profile, 'delete_cliente')) buttons.push({ label: 'Eliminar', class: 'btn--danger', onClick: () => deleteCliente(cli) });
  buttons.push({ label: 'Guardar', class: 'btn--primary', id: 'cf_save', onClick: () => saveCliente(cli) });
  openModal(cli ? 'Editar cliente' : 'Nuevo cliente', body, buttons);

  // Autoguardado de borrador
  const draftName = 'cliente_' + (cli ? cli.id : 'nuevo');
  const draft = wireDraft(draftName, ['cf_nombre', 'cf_doc', 'cf_tel', 'cf_email', 'cf_dir', 'cf_notas']);
  maybeOfferDraft(draftName, draft);
}

async function saveCliente(cli) {
  const nombre = $('#cf_nombre').value.trim();
  if (!nombre) { toast('El nombre es obligatorio.', 'error'); return; }
  const payload = {
    nombre, documento: $('#cf_doc').value.trim() || null, telefono: $('#cf_tel').value.trim() || null,
    email: $('#cf_email').value.trim() || null, direccion: $('#cf_dir').value.trim() || null, notas: $('#cf_notas').value.trim() || null
  };
  $('#cf_save').disabled = true;
  let error;
  if (cli) ({ error } = await supabase.from('clientes').update(payload).eq('id', cli.id));
  else { payload.created_by = state.profile.id; ({ error } = await supabase.from('clientes').insert(payload)); }
  if (error) { toast('Error: ' + error.message, 'error'); $('#cf_save').disabled = false; return; }
  Draft.clear('cliente_' + (cli ? cli.id : 'nuevo'));
  await logAccion(cli ? 'editar' : 'crear', 'cliente', cli ? cli.id : nombre, nombre);
  closeModal(); toast('Cliente guardado.', 'success'); renderClientes();
}
async function deleteCliente(cli) {
  if (!confirm(`¿Eliminar al cliente "${cli.nombre}"?`)) return;
  const { error } = await supabase.from('clientes').delete().eq('id', cli.id);
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  await logAccion('eliminar', 'cliente', cli.id, cli.nombre);
  closeModal(); toast('Cliente eliminado.', 'success'); renderClientes();
}

// ============================================================
//  VISTA: BLOG
// ============================================================
async function renderBlog() {
  loading();
  const { data } = await supabase.from('articulos').select('*').order('updated_at', { ascending: false });
  const arts = data || [];
  content().innerHTML = `
    <div class="toolbar">
      <div class="spacer"></div>
      <button class="btn btn--primary" id="btnNuevoArt">${ICON.plus} Nuevo artículo</button>
    </div>
    <div class="card"><div class="card__body--flush">
      ${arts.length ? `<div class="table-wrap"><table class="data">
        <thead><tr><th>Título</th><th>Categoría</th><th>Autor</th><th>Estado</th><th>Fecha</th></tr></thead>
        <tbody>${arts.map(a => `<tr data-id="${a.id}">
          <td class="cell-strong">${esc(a.titulo)}</td>
          <td>${esc(a.categoria || '—')}</td>
          <td>${esc(profName(a.autor_id))}</td>
          <td><span class="badge badge-${a.estado}">${a.estado === 'publicado' ? 'Publicado' : 'Borrador'}</span></td>
          <td>${fmtDate(a.fecha)}</td></tr>`).join('')}</tbody></table></div>`
      : `<div class="empty">${ICON.blog}<p>Aún no hay artículos. Cree el primero.</p></div>`}
    </div></div>`;
  content().querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => {
    const a = arts.find(x => x.id === tr.dataset.id); articuloForm(a);
  });
  $('#btnNuevoArt').onclick = () => articuloForm();
}

function articuloForm(art = null) {
  const a = art || {};
  const editable = !art || art.autor_id === state.profile.id || state.profile.rol === 'admin';
  const body = `
    <div class="field"><label>Título *${tip('Título del artículo tal como aparecerá en el blog público.')}</label><input id="af_titulo" value="${esc(a.titulo || '')}" ${editable ? '' : 'disabled'}></div>
    <div class="field-row">
      <div class="field"><label>Categoría${tip('Tema del artículo (Laboral, Familia, etc.). Ayuda a los lectores a encontrarlo.')}</label><input id="af_cat" value="${esc(a.categoria || '')}" placeholder="Laboral, Familia..." ${editable ? '' : 'disabled'}></div>
      <div class="field"><label>Estado${tip('"Borrador" lo mantiene oculto mientras lo redacta. "Publicado" lo muestra de inmediato en la web pública.')}</label><select id="af_estado" ${editable ? '' : 'disabled'}><option value="borrador" ${a.estado !== 'publicado' ? 'selected' : ''}>Borrador</option><option value="publicado" ${a.estado === 'publicado' ? 'selected' : ''}>Publicado</option></select></div>
    </div>
    <div class="field"><label>Resumen (extracto)${tip('Frase corta que resume el artículo. Es lo que se ve en la lista del blog antes de abrirlo.')}</label><textarea id="af_resumen" ${editable ? '' : 'disabled'}>${esc(a.resumen || '')}</textarea></div>
    <div class="field"><label>Contenido${tip('El texto completo del artículo. Se autoguarda mientras escribe.')}</label><textarea id="af_contenido" style="min-height:160px" ${editable ? '' : 'disabled'}>${esc(a.contenido || '')}</textarea></div>
    ${editable ? '' : '<p class="cell-sub">Solo el autor o un administrador pueden editar este artículo.</p>'}`;
  const buttons = [{ label: 'Cerrar', class: 'btn--ghost', onClick: closeModal }];
  if (art && editable) buttons.push({ label: 'Eliminar', class: 'btn--danger', onClick: () => deleteArticulo(art) });
  if (editable) buttons.push({ label: 'Guardar', class: 'btn--primary', id: 'af_save', onClick: () => saveArticulo(art) });
  openModal(art ? 'Editar artículo' : 'Nuevo artículo', body, buttons, true);

  // Autoguardado de borrador (solo si el formulario es editable)
  if (editable) {
    const draftName = 'articulo_' + (art ? art.id : 'nuevo');
    const draft = wireDraft(draftName, ['af_titulo', 'af_cat', 'af_estado', 'af_resumen', 'af_contenido']);
    maybeOfferDraft(draftName, draft);
  }
}

async function saveArticulo(art) {
  const titulo = $('#af_titulo').value.trim();
  if (!titulo) { toast('El título es obligatorio.', 'error'); return; }
  const payload = {
    titulo, categoria: $('#af_cat').value.trim() || null, estado: $('#af_estado').value,
    resumen: $('#af_resumen').value.trim() || null, contenido: $('#af_contenido').value.trim() || null
  };
  $('#af_save').disabled = true;
  let error;
  if (art) { payload.updated_at = new Date().toISOString(); ({ error } = await supabase.from('articulos').update(payload).eq('id', art.id)); }
  else { payload.autor_id = state.profile.id; ({ error } = await supabase.from('articulos').insert(payload)); }
  if (error) { toast('Error: ' + error.message, 'error'); $('#af_save').disabled = false; return; }
  Draft.clear('articulo_' + (art ? art.id : 'nuevo'));
  await logAccion(art ? 'editar' : 'crear', 'articulo', art ? art.id : titulo, titulo);
  closeModal(); toast('Artículo guardado.', 'success'); renderBlog();
}
async function deleteArticulo(art) {
  if (!confirm(`¿Eliminar el artículo "${art.titulo}"?`)) return;
  const { error } = await supabase.from('articulos').delete().eq('id', art.id);
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  await logAccion('eliminar', 'articulo', art.id, art.titulo);
  closeModal(); toast('Artículo eliminado.', 'success'); renderBlog();
}

// ============================================================
//  VISTA: USUARIOS (solo admin)
// ============================================================
async function renderUsuarios() {
  loading();
  await loadProfiles();
  content().innerHTML = `
    <div class="card">
      <div class="card__head"><h3>Usuarios del sistema${tip('Personal y clientes con acceso. Cambie el rol de cada uno o active/desactive su cuenta. El rol define qué puede ver y hacer.')}</h3></div>
      <div class="card__body--flush"><div class="table-wrap"><table class="data">
        <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>${state.profiles.map(u => `<tr class="no-hover" data-id="${u.id}">
          <td class="cell-strong">${esc(u.nombre)}</td>
          <td>${esc(u.email || '—')}</td>
          <td><select class="js-rol" data-id="${u.id}" style="padding:7px 10px;border:1.5px solid var(--line);border-radius:7px;">
            ${Object.entries(ROLES).map(([k, v]) => `<option value="${k}" ${u.rol === k ? 'selected' : ''}>${v}</option>`).join('')}
          </select></td>
          <td><span class="badge ${u.activo ? 'badge-on' : 'badge-off'}">${u.activo ? 'Activo' : 'Inactivo'}</span></td>
          <td><button class="btn btn--ghost btn--sm js-toggle" data-id="${u.id}">${u.activo ? 'Desactivar' : 'Activar'}</button></td>
        </tr>`).join('')}</tbody></table></div></div>
    </div>
    <div class="card"><div class="card__body">
      <h3 style="font-family:var(--font-serif);color:var(--navy);margin-bottom:8px;">Sobre los accesos</h3>
      <p class="cell-sub" style="margin-bottom:8px;"><strong>Clientes:</strong> cuando alguien se registra desde la pantalla de acceso, entra como <strong>Cliente</strong> y solo ve sus propios procesos (se vinculan por su correo). No ve nada del bufete ni de otros clientes.</p>
      <p class="cell-sub"><strong>Abogados / Procuradores:</strong> para habilitar a un colega, créele la cuenta en Supabase (<strong>Authentication → Users → Add user</strong>) o pídale que se registre, y aquí cámbiele el rol a Abogado o Procurador.</p>
    </div></div>`;

  content().querySelectorAll('.js-rol').forEach(sel => sel.onchange = async () => {
    const id = sel.dataset.id;
    const { error } = await supabase.from('profiles').update({ rol: sel.value }).eq('id', id);
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    await logAccion('cambiar_rol', 'usuario', id, sel.value);
    toast('Rol actualizado.', 'success');
  });
  content().querySelectorAll('.js-toggle').forEach(btn => btn.onclick = async () => {
    const id = btn.dataset.id;
    const u = state.profiles.find(x => x.id === id);
    if (id === state.profile.id) { toast('No puede desactivar su propia cuenta.', 'error'); return; }
    const { error } = await supabase.from('profiles').update({ activo: !u.activo }).eq('id', id);
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    await logAccion('estado_usuario', 'usuario', id, (!u.activo) ? 'activado' : 'desactivado');
    renderUsuarios();
  });
}

// ============================================================
//  VISTA: AUDITORÍA (solo admin)
// ============================================================
async function renderAuditoria() {
  loading();
  await loadProfiles();
  const { data } = await supabase.from('auditoria').select('*').order('created_at', { ascending: false }).limit(150);
  const logs = data || [];
  content().innerHTML = `
    <div class="card"><div class="card__head"><h3>Bitácora de auditoría</h3></div>
    <div class="card__body--flush">${logs.length ? `<div class="table-wrap"><table class="data">
      <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>Detalle</th></tr></thead>
      <tbody>${logs.map(l => `<tr class="no-hover"><td>${fmtDateTime(l.created_at)}</td><td>${esc(profName(l.usuario_id))}</td><td><span class="badge badge-mat">${esc(l.accion || '—')}</span></td><td>${esc(l.entidad || '—')}</td><td class="cell-sub">${esc(l.detalle || '')}</td></tr>`).join('')}</tbody></table></div>`
      : `<div class="empty">${ICON.auditoria}<p>Sin registros todavía.</p></div>`}</div></div>`;
}

// ============================================================
//  PORTAL DEL CLIENTE (solo lectura de sus propios procesos)
// ============================================================
async function renderMisProcesos() {
  loading();
  const { data } = await supabase.from('procesos').select('*').order('proxima_audiencia', { ascending: true });
  const procesos = data || [];
  const ahora = new Date();
  const proximas = procesos.filter(p => p.proxima_audiencia && new Date(p.proxima_audiencia) >= ahora).length;

  const waMsg = encodeURIComponent(`Hola, soy ${state.profile.nombre}, cliente de LexFive. Deseo hacer una consulta sobre mi proceso.`);
  const waUrl = `https://wa.me/${WHATSAPP}?text=${waMsg}`;

  content().innerHTML = `
    <div class="stats-grid">
      <div class="metric"><div class="metric__top"><div class="metric__icon">${ICON.procesos}</div></div><div class="metric__num">${procesos.length}</div><div class="metric__label">Mis procesos</div></div>
      <div class="metric"><div class="metric__top"><div class="metric__icon">${ICON.audiencia}</div></div><div class="metric__num">${proximas}</div><div class="metric__label">Audiencias próximas</div></div>
    </div>

    <div class="card">
      <div class="card__head">
        <h3>Mis procesos</h3>
        <a class="btn btn--primary btn--sm" href="${waUrl}" target="_blank" rel="noopener">Consultar por WhatsApp</a>
      </div>
      <div class="card__body--flush">
        ${procesos.length ? `<div class="table-wrap"><table class="data">
          <thead><tr><th>Carátula</th><th>Materia</th><th>Estado</th><th>Próx. audiencia</th></tr></thead>
          <tbody>${procesos.map(p => `
            <tr data-id="${p.id}">
              <td class="cell-strong">${esc(p.caratula)}<div class="cell-sub">${esc(p.numero || '')}</div></td>
              <td><span class="badge badge-mat">${esc(p.materia || '—')}</span></td>
              <td>${badgeEstado(p.estado)}</td>
              <td>${p.proxima_audiencia ? fmtDateTime(p.proxima_audiencia) : '—'}</td>
            </tr>`).join('')}</tbody></table></div>`
        : `<div class="empty">${ICON.procesos}<p>Aún no hay procesos asociados a su cuenta.<br>Verifique que se registró con el mismo correo que dejó en el bufete, o consúltenos por WhatsApp.</p></div>`}
      </div>
    </div>

    <div class="card" id="opinionDash" style="margin-top:18px"></div>`;
  content().querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => openProcesoDetail(tr.dataset.id, true));
  mountOpinion($('#opinionDash'));
}

function starsHtml(n) {
  let s = '<span class="stars">';
  for (let i = 1; i <= 5; i++) s += `<span class="${i <= n ? '' : 'off'}">${ICON.estrella}</span>`;
  return s + '</span>';
}

// Widget reutilizable de "Mi opinión": se monta en el dashboard del cliente,
// dentro de cada proceso y en la vista dedicada. Usa selectores por clase y
// queda aislado en su contenedor, por lo que puede mostrarse en varios sitios
// a la vez sin colisiones de IDs. El cliente tiene UNA opinión (sobre el
// servicio del bufete) que se edita desde cualquiera de esos lugares.
async function mountOpinion(el) {
  if (!el) return;
  el.innerHTML = '<div class="card__body"><p class="cell-sub">Cargando su opinión...</p></div>';
  const { data } = await supabase.from('testimonios').select('*')
    .eq('autor_id', state.profile.id).order('created_at', { ascending: false }).limit(1);
  const t = (data && data[0]) || null;
  let rating = t ? t.calificacion : 5;
  const estadoMsg = t ? ({
    pendiente: '<span class="badge badge-borrador">Pendiente</span> Su opinión será revisada por el bufete antes de publicarse.',
    aprobado: '<span class="badge badge-publicado">Publicada</span> ¡Gracias! Su opinión ya aparece en nuestra página web.',
    rechazado: '<span class="badge badge-rol-admin">No publicada</span> Puede editarla y volver a enviarla.'
  }[t.estado]) : '';

  el.innerHTML = `
    <div class="card__head"><h3>Mi opinión sobre el servicio</h3></div>
    <div class="card__body">
      <p class="cell-sub" style="margin-bottom:14px">Califique la atención recibida de su(s) abogado(s). Tras la aprobación del bufete, su testimonio aparecerá en la página web pública.</p>
      ${t ? `<p style="margin-bottom:14px">${estadoMsg}</p>` : ''}
      <div class="field"><label>Su calificación</label>
        <div class="rating-pick js-rate">${[1,2,3,4,5].map(i => `<button type="button" data-v="${i}" class="${i <= rating ? 'on' : ''}">${ICON.estrella}</button>`).join('')}</div>
      </div>
      <div class="field"><label>Su comentario</label><textarea class="js-texto" style="min-height:110px" placeholder="Cuéntenos cómo fue su experiencia...">${t ? esc(t.texto) : ''}</textarea></div>
      <div class="field"><label>¿Cómo desea que aparezca su nombre? (opcional)</label><input class="js-nombre" value="${t ? esc(t.nombre || '') : esc(state.profile.nombre)}"></div>
      <button class="btn btn--primary js-send">${t ? 'Actualizar mi opinión' : 'Enviar mi opinión'}</button>
    </div>`;

  el.querySelectorAll('.js-rate button').forEach(b => b.onclick = () => {
    rating = parseInt(b.dataset.v, 10);
    el.querySelectorAll('.js-rate button').forEach(x => x.classList.toggle('on', parseInt(x.dataset.v, 10) <= rating));
  });
  el.querySelector('.js-send').onclick = async () => {
    const texto = el.querySelector('.js-texto').value.trim();
    if (!texto) { toast('Escriba su comentario.', 'error'); return; }
    const payload = { texto, calificacion: rating, nombre: el.querySelector('.js-nombre').value.trim() || state.profile.nombre, detalle: 'Cliente', estado: 'pendiente', updated_at: new Date().toISOString() };
    const btn = el.querySelector('.js-send'); btn.disabled = true;
    let error;
    if (t) ({ error } = await supabase.from('testimonios').update(payload).eq('id', t.id));
    else { payload.autor_id = state.profile.id; ({ error } = await supabase.from('testimonios').insert(payload)); }
    if (error) { toast('Error: ' + error.message, 'error'); btn.disabled = false; return; }
    Draft.clear('opinion');
    toast('¡Gracias! Su opinión fue enviada para revisión.', 'success');
    mountOpinion(el);
  };

  // Autoguardado del comentario de la opinión (texto y nombre)
  const ta = el.querySelector('.js-texto'), nm = el.querySelector('.js-nombre');
  const saveOp = () => Draft.save('opinion', { texto: ta.value, nombre: nm.value });
  ta.addEventListener('input', saveOp); nm.addEventListener('input', saveOp);
  const svOp = Draft.load('opinion');
  if (svOp && svOp.data && svOp.data.texto && !ta.value) { ta.value = svOp.data.texto; if (svOp.data.nombre) nm.value = svOp.data.nombre; }
}

// Vista del CLIENTE dedicada a dejar su opinión
async function renderMiOpinion() {
  loading();
  content().innerHTML = `<div class="card" style="max-width:680px" id="opinionCard"></div>`;
  await mountOpinion($('#opinionCard'));
}

// Vista del ADMIN para moderar (aprobar/rechazar) los testimonios
async function renderTestimonios() {
  loading();
  await loadProfiles();
  const { data } = await supabase.from('testimonios').select('*').order('created_at', { ascending: false });
  const list = data || [];
  content().innerHTML = `
    <div class="card"><div class="card__head"><h3>Testimonios de clientes</h3></div>
    <div class="card__body--flush">
      ${list.length ? `<div class="table-wrap"><table class="data">
        <thead><tr><th>Cliente</th><th>Opinión</th><th>Calif.</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>${list.map(t => `<tr class="no-hover">
          <td class="cell-strong">${esc(t.nombre || profName(t.autor_id))}<div class="cell-sub">${esc(t.detalle || '')}</div></td>
          <td style="max-width:340px">${esc(t.texto)}</td>
          <td>${starsHtml(t.calificacion)}</td>
          <td><span class="badge badge-${t.estado === 'aprobado' ? 'publicado' : (t.estado === 'rechazado' ? 'rol-admin' : 'borrador')}">${t.estado}</span></td>
          <td style="white-space:nowrap">
            ${t.estado !== 'aprobado' ? `<button class="btn btn--ghost btn--sm js-ap" data-id="${t.id}">Aprobar</button>` : ''}
            ${t.estado !== 'rechazado' ? `<button class="btn btn--ghost btn--sm js-re" data-id="${t.id}">Rechazar</button>` : ''}
            <button class="btn btn--danger btn--sm js-del" data-id="${t.id}">Eliminar</button>
          </td></tr>`).join('')}</tbody></table></div>`
      : `<div class="empty">${ICON.estrella}<p>Aún no hay testimonios. Aparecerán aquí cuando los clientes los envíen desde su portal.</p></div>`}
    </div></div>`;

  const setEstado = async (id, estado) => {
    const { error } = await supabase.from('testimonios').update({ estado, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    await logAccion('moderar', 'testimonio', id, estado);
    toast(estado === 'aprobado' ? 'Aprobado y publicado en la web.' : 'Testimonio ' + estado + '.', 'success');
    renderTestimonios();
  };
  content().querySelectorAll('.js-ap').forEach(b => b.onclick = () => setEstado(b.dataset.id, 'aprobado'));
  content().querySelectorAll('.js-re').forEach(b => b.onclick = () => setEstado(b.dataset.id, 'rechazado'));
  content().querySelectorAll('.js-del').forEach(b => b.onclick = async () => {
    if (!confirm('¿Eliminar este testimonio?')) return;
    await supabase.from('testimonios').delete().eq('id', b.dataset.id);
    await logAccion('eliminar', 'testimonio', b.dataset.id, '');
    renderTestimonios();
  });
}

// ============================================================
//  VISTA: MODELOS DE MEMORIALES (biblioteca reutilizable, solo personal)
// ============================================================
async function renderModelos() {
  loading();
  await loadCategorias();
  const { data } = await supabase.from('modelos').select('*').order('created_at', { ascending: false });
  const list = data || [];

  // Áreas disponibles para clasificar los modelos (categorías dinámicas)
  const areaOptions = state.categorias.map(m => `<option>${esc(m)}</option>`).join('');

  content().innerHTML = `
    <div class="card">
      <div class="card__head"><h3>Subir modelos de memoriales${tip('Plantillas reutilizables (demandas, memoriales, etc.) que el equipo puede descargar cuando las necesite.')}</h3></div>
      <div class="card__body">
        <div class="field-row">
          <div class="field"><label>Área del derecho *${tip('Clasifica el modelo. Si falta un área, elija "Crear nueva categoría" y se agregará a todo el sistema.')}</label>
            <select id="md_area" class="js-categoria" data-include-blank="1" data-blank-label="Seleccione un área"><option value="">Seleccione un área</option>${categoriaOptions('')}</select>
          </div>
          <div class="field"><label>Nombre (opcional)${tip('Si sube un solo archivo puede darle un nombre claro. Si sube varios o una carpeta, se usa el nombre de cada archivo.')}</label>
            <input id="md_nombre" placeholder="Si sube un solo archivo. Si deja vacío, se usa el nombre del archivo.">
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Archivos (puede elegir varios)${tip('Puede seleccionar varios archivos a la vez manteniendo Ctrl (o Cmd en Mac) al elegirlos.')}</label>
            <input type="file" id="md_file" multiple>
            <span class="cell-sub" style="display:block;margin-top:4px;">Word, PDF, imágenes, etc. Mantenga Ctrl/Cmd para elegir varios.</span>
          </div>
          <div class="field">
            <label>...o una carpeta completa${tip('Sube todos los archivos de una carpeta de su computadora al área elegida. Funciona en navegadores de escritorio.')}</label>
            <input type="file" id="md_folder" webkitdirectory directory multiple>
            <span class="cell-sub" style="display:block;margin-top:4px;">Se subirán todos los archivos de la carpeta al área elegida.</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <button class="btn btn--primary" id="md_subir">Subir al área seleccionada</button>
          <span class="cell-sub" id="md_progreso"></span>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card__head"><h3>Biblioteca de modelos (${list.length})</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <select id="md_farea" style="padding:9px 12px;border:1.5px solid var(--line);border-radius:8px;">
            <option value="">Todas las áreas</option>${areaOptions}
          </select>
          <input type="search" id="md_q" placeholder="Buscar modelo..." style="padding:9px 12px;border:1.5px solid var(--line);border-radius:8px;">
        </div>
      </div>
      <div class="card__body--flush"><div id="md_list"></div></div>
    </div>`;

  const SIN_AREA = 'Sin área';

  function paint() {
    const q = ($('#md_q').value || '').toLowerCase();
    const fa = $('#md_farea').value;
    const rows = list.filter(m =>
      (!fa || (m.categoria || '') === fa) &&
      (!q || [m.nombre, m.categoria].some(v => (v || '').toLowerCase().includes(q))));

    if (!rows.length) {
      $('#md_list').innerHTML = `<div class="empty">${ICON.doc}<p>No hay modelos que coincidan. Suba el primero arriba.</p></div>`;
      return;
    }

    // Agrupar por área
    const grupos = {};
    rows.forEach(m => { const a = m.categoria || SIN_AREA; (grupos[a] = grupos[a] || []).push(m); });
    const ordenadas = Object.keys(grupos).sort((a, b) => a.localeCompare(b, 'es'));

    $('#md_list').innerHTML = ordenadas.map(area => `
      <div class="md-group">
        <div class="md-group__head">${esc(area)} <span class="md-group__count">${grupos[area].length}</span></div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Nombre</th><th>Fecha</th><th>Subido por</th><th>Acciones</th></tr></thead>
          <tbody>${grupos[area].map(m => `<tr class="no-hover">
            <td class="cell-strong">${esc(m.nombre)}</td>
            <td>${fmtDate(m.created_at)}</td>
            <td>${esc(profName(m.subido_por))}</td>
            <td style="white-space:nowrap">
              <button class="btn btn--ghost btn--sm js-dl" data-path="${esc(m.storage_path)}">Descargar</button>
              <button class="btn btn--danger btn--sm js-del" data-id="${m.id}" data-path="${esc(m.storage_path)}">Eliminar</button>
            </td></tr>`).join('')}</tbody></table></div>
      </div>`).join('');

    $('#md_list').querySelectorAll('.js-dl').forEach(b => b.onclick = async () => {
      const { data: d, error } = await supabase.storage.from('documentos').createSignedUrl(b.dataset.path, 120);
      if (error) { toast('No se pudo generar el enlace.', 'error'); return; }
      window.open(d.signedUrl, '_blank');
    });
    $('#md_list').querySelectorAll('.js-del').forEach(b => b.onclick = async () => {
      if (!confirm('¿Eliminar este modelo?')) return;
      await supabase.storage.from('documentos').remove([b.dataset.path]);
      await supabase.from('modelos').delete().eq('id', b.dataset.id);
      await logAccion('eliminar', 'modelo', b.dataset.id, '');
      renderModelos();
    });
  }
  paint();
  $('#md_q').oninput = paint;
  $('#md_farea').onchange = paint;
  wireCategoriaSelect($('#md_area'));

  $('#md_subir').onclick = async () => {
    const area = $('#md_area').value;
    if (!area) { toast('Seleccione el área del derecho.', 'error'); return; }

    // Reunir los archivos: de la carpeta y/o de la selección de archivos sueltos
    const archivos = [...($('#md_folder').files || []), ...($('#md_file').files || [])];
    if (!archivos.length) { toast('Seleccione archivos o una carpeta.', 'error'); return; }

    const nombreManual = $('#md_nombre').value.trim();
    const btn = $('#md_subir'); const prog = $('#md_progreso');
    btn.disabled = true; btn.textContent = 'Subiendo...';

    let ok = 0, fallos = 0;
    for (let i = 0; i < archivos.length; i++) {
      const file = archivos[i];
      prog.textContent = `Subiendo ${i + 1} de ${archivos.length}...`;
      // El nombre manual solo se usa si se sube un único archivo; si no, el del archivo.
      const baseName = (archivos.length === 1 && nombreManual)
        ? nombreManual
        : file.name.replace(/\.[^.]+$/, '');
      const safe = file.name.replace(/[^\w.\-]/g, '_');
      const path = `modelos/${area.toLowerCase()}/${Date.now()}_${i}_${safe}`;
      const { error: upErr } = await supabase.storage.from('documentos').upload(path, file);
      if (upErr) { fallos++; continue; }
      const { error: insErr } = await supabase.from('modelos').insert({
        nombre: baseName, categoria: area, storage_path: path, subido_por: state.profile.id
      });
      if (insErr) { fallos++; await supabase.storage.from('documentos').remove([path]); continue; }
      ok++;
    }
    await logAccion('subir', 'modelo', area, `${ok} modelo(s) en ${area}`);
    prog.textContent = '';
    if (ok) toast(`${ok} modelo(s) subido(s) a ${area}.${fallos ? ' ' + fallos + ' con error.' : ''}`, fallos ? 'error' : 'success');
    else toast('No se pudo subir ningún archivo.', 'error');
    renderModelos();
  };
}

// ============================================================
//  VISTA: CONSULTAS (bandeja del formulario de contacto de la web)
// ============================================================
function consultaNombre(c) {
  return [c.nombre, c.apellido].filter(Boolean).join(' ') || '—';
}
function consultaEstadoBadge(estado) {
  const map = {
    nueva: '<span class="badge badge-borrador">Nueva</span>',
    atendida: '<span class="badge badge-publicado">Atendida</span>',
    archivada: '<span class="badge badge-off">Archivada</span>'
  };
  return map[estado] || `<span class="badge">${esc(estado || '—')}</span>`;
}
// Construye un enlace de WhatsApp a partir de un teléfono (añade 591 si hace falta)
function waLinkTel(tel, texto) {
  const digits = (tel || '').replace(/\D/g, '');
  if (!digits) return null;
  const full = digits.length <= 8 ? '591' + digits : digits;
  return `https://wa.me/${full}${texto ? '?text=' + encodeURIComponent(texto) : ''}`;
}

async function renderConsultas() {
  loading();
  const { data, error } = await supabase.from('consultas').select('*').order('created_at', { ascending: false });
  if (error) {
    content().innerHTML = `<div class="card"><div class="card__body"><div class="empty">${ICON.consultas}
      <p>No se pudo cargar la bandeja de consultas.<br>Verifique que ejecutó el script <strong>db/06_consultas.sql</strong> en Supabase.</p></div></div></div>`;
    return;
  }
  const list = data || [];
  const nuevas = list.filter(c => c.estado === 'nueva').length;
  content().innerHTML = `
    <div class="toolbar">
      <input type="search" id="qCons" placeholder="Buscar por nombre, correo, mensaje..." ${hint('Busque una consulta por el nombre de la persona, su correo o el contenido del mensaje.')}>
      <select id="fEstadoCons" ${hint('Filtre por estado: Nuevas (sin atender), Atendidas (ya respondidas) o Archivadas.')}>
        <option value="">Todos los estados</option>
        <option value="nueva">Nuevas (${nuevas})</option>
        <option value="atendida">Atendidas</option>
        <option value="archivada">Archivadas</option>
      </select>
      <div class="spacer"></div>
    </div>
    <div class="card"><div class="card__body--flush"><div id="consTable"></div></div></div>`;

  function paint() {
    const q = ($('#qCons').value || '').toLowerCase();
    const fe = $('#fEstadoCons').value;
    const rows = list.filter(c =>
      (!fe || c.estado === fe) &&
      (!q || [c.nombre, c.apellido, c.email, c.telefono, c.area, c.mensaje].some(v => (v || '').toLowerCase().includes(q))));
    $('#consTable').innerHTML = rows.length ? `<div class="table-wrap"><table class="data">
      <thead><tr><th>Fecha</th><th>Nombre</th><th>Contacto</th><th>Área</th><th>Estado</th></tr></thead>
      <tbody>${rows.map(c => `
        <tr data-id="${c.id}">
          <td>${fmtDateTime(c.created_at)}</td>
          <td class="cell-strong">${esc(consultaNombre(c))}<div class="cell-sub">${esc((c.mensaje || '').slice(0, 60))}${(c.mensaje || '').length > 60 ? '…' : ''}</div></td>
          <td>${esc(c.email || c.telefono || '—')}</td>
          <td>${c.area ? `<span class="badge badge-mat">${esc(c.area)}</span>` : '—'}</td>
          <td>${consultaEstadoBadge(c.estado)}</td>
        </tr>`).join('')}</tbody></table></div>`
      : `<div class="empty">${ICON.consultas}<p>No hay consultas que coincidan.<br>Las consultas enviadas desde el formulario de contacto de la web aparecerán aquí.</p></div>`;
    $('#consTable').querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => {
      const c = list.find(x => x.id === tr.dataset.id); openConsultaDetail(c);
    });
  }
  paint();
  $('#qCons').oninput = paint;
  $('#fEstadoCons').onchange = paint;
}

function openConsultaDetail(c) {
  const wa = waLinkTel(c.telefono, `Hola ${c.nombre || ''}, le escribimos de LexFive en respuesta a su consulta.`);
  const mailHref = c.email ? `mailto:${esc(c.email)}?subject=${encodeURIComponent('Su consulta a LexFive')}` : null;
  const body = `
    <div class="detail-grid">
      <div class="detail-item"><label>Nombre</label><span>${esc(consultaNombre(c))}</span></div>
      <div class="detail-item"><label>Estado</label><span>${consultaEstadoBadge(c.estado)}</span></div>
      <div class="detail-item"><label>Correo</label><span>${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '—'}</span></div>
      <div class="detail-item"><label>Teléfono</label><span>${esc(c.telefono || '—')}</span></div>
      <div class="detail-item"><label>Área de interés</label><span>${esc(c.area || '—')}</span></div>
      <div class="detail-item"><label>Recibida</label><span>${fmtDateTime(c.created_at)}</span></div>
    </div>
    <div class="detail-item" style="margin-top:14px"><label>Mensaje</label><span style="white-space:pre-wrap">${esc(c.mensaje || '')}</span></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:18px">
      ${wa ? `<a class="btn btn--sm" style="background:#25d366;color:#fff;border-color:#25d366" target="_blank" rel="noopener" href="${wa}">${ICON.whatsapp} Responder por WhatsApp</a>` : ''}
      ${mailHref ? `<a class="btn btn--ghost btn--sm" href="${mailHref}">Responder por correo</a>` : ''}
    </div>`;

  const buttons = [];
  if (c.estado !== 'atendida') buttons.push({ label: 'Marcar atendida', class: 'btn--navy', onClick: () => setConsultaEstado(c, 'atendida') });
  if (c.estado !== 'archivada') buttons.push({ label: 'Archivar', class: 'btn--ghost', onClick: () => setConsultaEstado(c, 'archivada') });
  if (c.estado !== 'nueva') buttons.push({ label: 'Marcar nueva', class: 'btn--ghost', onClick: () => setConsultaEstado(c, 'nueva') });
  if (state.profile.rol === 'admin') buttons.push({ label: 'Eliminar', class: 'btn--danger', onClick: () => deleteConsulta(c) });
  buttons.push({ label: 'Cerrar', class: 'btn--primary', onClick: closeModal });

  openModal('Consulta de ' + consultaNombre(c), body, buttons, true);
}

async function setConsultaEstado(c, estado) {
  const { error } = await supabase.from('consultas').update({ estado }).eq('id', c.id);
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  await logAccion('consulta_' + estado, 'consulta', c.id, consultaNombre(c));
  closeModal(); toast('Consulta actualizada.', 'success'); renderConsultas();
}

async function deleteConsulta(c) {
  if (!confirm('¿Eliminar definitivamente esta consulta?')) return;
  const { error } = await supabase.from('consultas').delete().eq('id', c.id);
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  await logAccion('eliminar', 'consulta', c.id, consultaNombre(c));
  closeModal(); toast('Consulta eliminada.', 'success'); renderConsultas();
}

// ============================================================
//  VISTA: CREDENCIALES Y ACCESOS (solo administrador y abogados)
//  Genera una credencial/carnet del bufete para el usuario, lista para
//  imprimir. El administrador y los abogados son los únicos que la ven;
//  ellos entregan las credenciales a sus procuradores.
// ============================================================
async function renderCredenciales() {
  loading();
  await ensureImgCache();
  const p = state.profile;
  const rolLabel = ROLES[p.rol] || p.rol;

  // Datos editables de la credencial (los llena el director). Se guardan en
  // Texto legal por defecto del reverso (base de la representación del portador),
  // tomado de la normativa boliviana vigente proporcionada por el bufete.
  const REPRE_DEFAULT = 'El PORTADOR se encuentra AUTORIZADO y FACULTADO para: ENTREGAR, EXAMINAR, SOLICITAR y RECOGER de las autoridades (Estrados Judiciales, Públicas y Privadas) correspondientes a Procesos y/o Trámites Administrativos que se PATROCINAN en calidad de ABOGADO, de acuerdo a normativa vigente: Art. 8 núm. 1 Ley 387 "Ley del Ejercicio de la Abogacía", concordante con los Arts. 84, 100 y 101 Ley 439 "Código Procesal Civil", Art. 300 parágrafo I Ley 603 "Código de las Familias y del Proceso Familiar" y demás normativa, bajo el PRINCIPIO del Art. 24 de la Constitución Política del Estado. Certifico.';

  // este equipo mediante el autoguardado por usuario.
  const saved = (Draft.load('credencial') || {}).data || {};
  const datos = {
    nombre: saved.nombre || '',
    cargo: saved.cargo || rolLabel,
    ci: saved.ci || '',
    correo: saved.correo || '',
    telPersonal: saved.telPersonal || '',
    telOficina: saved.telOficina || '',
    emision: saved.emision || hoyISO(),
    validez: saved.validez || '',
    frase: saved.frase || '',
    representacion: saved.representacion || REPRE_DEFAULT
  };

  // Opciones de logo disponibles para elegir (Derecho + Ingeniería en Sistemas)
  const LOGOS = [
    { id: 'ds1-balanza-codigo', nombre: 'Emblema · Balanza' },
    { id: 'ds2-L5-circuito', nombre: 'Emblema · Monograma L5' },
    { id: 'ds3-mazo-pulso', nombre: 'Emblema · Mazo del juez' },
    { id: 'ds4-columna-circuito', nombre: 'Emblema · Templo de justicia' },
    { id: 'ds5-balanza-chip', nombre: 'Emblema · Balanza en chip' },
    { id: 'opcion-6-LF-circuito', nombre: 'Monograma LF con circuito' }
  ];
  const LOGO_DEFAULT = 'ds1-balanza-codigo';

  // Opciones de sello para el bufete (memoriales y documentos)
  const SELLOS = [
    { id: 'sello-1-clasico', nombre: 'Clásico — balanza' },
    { id: 'sello-2-mazo', nombre: 'Mazo del juez' },
    { id: 'sello-3-ovalado', nombre: 'Ovalado institucional' },
    { id: 'sello-4-circuito', nombre: 'Derecho & Tecnología' },
    { id: 'sello-5-columnas', nombre: 'Templo de justicia' }
  ];
  const SELLO_DEFAULT = 'sello-1-clasico';

  // Modelos ocultos (eliminados de la galería por el bufete)
  const readList = k => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch (e) { return []; } };
  const hiddenLogos = readList('lexfive_logos_hidden');
  const hiddenSellos = readList('lexfive_sellos_hidden');
  const logosVisibles = LOGOS.filter(l => hiddenLogos.indexOf(l.id) === -1);
  const sellosVisibles = SELLOS.filter(s => hiddenSellos.indexOf(s.id) === -1);

  const customLogo = IMG.logo;
  const customSello = IMG.sello;

  // Elige la opción activa respetando ocultos y la imagen propia
  const pickActive = (saved, custom, visibles, def) => {
    if (saved === 'custom' && custom) return 'custom';
    if (visibles.some(x => x.id === saved)) return saved;
    if (custom) return 'custom';
    if (visibles.length) return visibles[0].id;
    return def;
  };
  const logoActual = pickActive(localStorage.getItem('lexfive_logo'), customLogo, logosVisibles, LOGO_DEFAULT);
  const selloActual = pickActive(localStorage.getItem('lexfive_sello'), customSello, sellosVisibles, SELLO_DEFAULT);

  // Devuelven la fuente correcta: archivo del repo o imagen subida por el bufete (data URL)
  const logoSrc = id => id === 'custom' ? (IMG.logo || '') : `../assets/logos/${id}.svg`;
  const selloSrc = id => id === 'custom' ? (IMG.sello || '') : `../assets/sellos/${id}.svg`;

  // Frases sugeridas para el reverso
  const FRASES = [
    'Justicia con tecnología.',
    'Donde el derecho y la innovación se encuentran.',
    'Defendemos sus derechos con la fuerza de la tecnología.',
    'Derecho moderno, soluciones reales.',
    'La justicia a su alcance.',
    'Su confianza, nuestra causa.'
  ];

  content().innerHTML = `
    <div class="card">
      <div class="card__body">
        <h3 style="font-family:var(--font-serif,Georgia,serif);color:var(--navy,#0e1b2c);margin-bottom:6px;">Credencial del bufete</h3>
        <p class="cell-sub">Complete los datos y se reflejarán en la credencial en tiempo real. Luego use <strong>Imprimir / Guardar PDF</strong>. Lo que escriba queda guardado en este equipo.</p>
      </div>
    </div>

    <div class="card">
      <div class="card__head"><h3>Logotipo del bufete</h3></div>
      <div class="card__body">
        <p class="cell-sub" style="margin-bottom:12px">Elija un modelo, elimínelo con la <strong>✕</strong>, o <strong>suba su propio logo</strong>. Se aplicará en toda la página, el panel y la credencial.</p>
        <div class="logo-gallery">
          ${logosVisibles.map(l => `
            <div class="logo-option ${l.id === logoActual ? 'is-selected' : ''}" data-logo="${l.id}">
              <button class="tile-del" data-del-logo="${l.id}" type="button" title="Eliminar este modelo">&times;</button>
              <img src="../assets/logos/${l.id}.svg" alt="${esc(l.nombre)}">
              <span>${esc(l.nombre)}</span>
            </div>`).join('')}
          ${customLogo ? `
            <div class="logo-option ${logoActual === 'custom' ? 'is-selected' : ''}" data-logo="custom">
              <button class="tile-del" data-del-logo="custom" type="button" title="Quitar mi logo">&times;</button>
              <img src="${customLogo}" alt="Mi logo">
              <span>Mi logo</span>
            </div>` : ''}
          <button class="logo-option logo-upload" id="btnUploadLogo" type="button">
            <span class="logo-upload__plus">+</span>
            <span>Subir mi logo</span>
          </button>
        </div>
        <input type="file" id="fileLogo" accept=".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp" hidden>
        <p class="cell-sub" style="margin-top:10px">Acepta <strong>SVG</strong> o foto <strong>JPG/PNG</strong>. Si sube una foto podrá <strong>recortarla, ajustar el tamaño y se convertirá a PNG</strong> automáticamente (con opción de quitar el fondo blanco). ${hiddenLogos.length ? '<button class="btn btn--ghost btn--sm" id="btnRestoreLogos" type="button" style="margin-left:8px">Restaurar modelos eliminados</button>' : ''}</p>
        <div class="brand-preview">
          <img src="${logoSrc(logoActual)}" alt="Vista del logo" class="brand-preview__img" id="logoPreviewBig">
          <div class="brand-preview__side">
            <p class="cell-sub" style="margin:0 0 8px">Así se verá el logo. Ábralo en grande para revisar el diseño antes de usarlo.</p>
            <button class="btn btn--ghost btn--sm" id="btnLogoBig" type="button">Ver en grande</button>
            <a class="btn btn--ghost btn--sm" id="logoDownload" href="${logoSrc(logoActual)}" download="logo-lexfive" style="margin-left:6px">Descargar logo</a>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card__head"><h3>Sello del bufete</h3></div>
      <div class="card__body">
        <p class="cell-sub" style="margin-bottom:12px">Elija un sello, elimínelo con la <strong>✕</strong>, o <strong>suba el suyo</strong>. Puede descargarlo o imprimirlo para usarlo en <strong>memoriales</strong>, documentos y en el reverso de las credenciales.</p>
        <div class="logo-gallery">
          ${sellosVisibles.map(s => `
            <div class="logo-option sello-option ${s.id === selloActual ? 'is-selected' : ''}" data-sello="${s.id}">
              <button class="tile-del" data-del-sello="${s.id}" type="button" title="Eliminar este sello">&times;</button>
              <img src="../assets/sellos/${s.id}.svg" alt="${esc(s.nombre)}">
              <span>${esc(s.nombre)}</span>
            </div>`).join('')}
          ${customSello ? `
            <div class="logo-option sello-option ${selloActual === 'custom' ? 'is-selected' : ''}" data-sello="custom">
              <button class="tile-del" data-del-sello="custom" type="button" title="Quitar mi sello">&times;</button>
              <img src="${customSello}" alt="Mi sello">
              <span>Mi sello</span>
            </div>` : ''}
          <button class="logo-option logo-upload" id="btnUploadSello" type="button">
            <span class="logo-upload__plus">+</span>
            <span>Subir mi sello</span>
          </button>
        </div>
        <input type="file" id="fileSello" accept=".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp" hidden>
        <p class="cell-sub" style="margin-top:10px">Acepta <strong>SVG</strong> o foto <strong>JPG/PNG</strong>. Si sube una foto podrá <strong>recortarla, ajustar el tamaño y se convertirá a PNG</strong> (con opción de quitar el fondo blanco). ${hiddenSellos.length ? '<button class="btn btn--ghost btn--sm" id="btnRestoreSellos" type="button" style="margin-left:8px">Restaurar sellos eliminados</button>' : ''}</p>
        <div class="sello-box" style="margin-top:14px">
          <img src="${selloSrc(selloActual)}" alt="Sello LexFive Abogados" class="sello-img" id="selloPreview">
          <div class="sello-actions">
            <button class="btn btn--ghost btn--sm" id="btnSelloBig" type="button">Ver en grande</button>
            <a class="btn btn--ghost btn--sm" href="${selloSrc(selloActual)}" download="sello-lexfive" id="selloDownload">Descargar sello</a>
            <button class="btn btn--ghost btn--sm" id="btnPrintSello">Imprimir sello</button>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card__head"><h3>Datos de la credencial</h3></div>
      <div class="card__body">
        <div class="field-row">
          <div class="field"><label>Nombre completo</label><input id="cr_nombre" value="${esc(datos.nombre)}" placeholder="Escriba el nombre y apellido"></div>
          <div class="field"><label>Cargo / rol (aparece solo en la banda superior)</label><input id="cr_cargo" value="${esc(datos.cargo)}" placeholder="Ej: Procurador / Abogado"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Carnet de identidad</label><input id="cr_ci" value="${esc(datos.ci)}" placeholder="Ej: 6813383 L.P."></div>
          <div class="field"><label>Teléfono personal</label><input id="cr_telpers" value="${esc(datos.telPersonal)}" placeholder="Ej: 700 00 000"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Teléfono de la oficina</label><input id="cr_teloff" value="${esc(datos.telOficina)}" placeholder="Ej: 2 000 000"></div>
          <div class="field"><label>Fecha de emisión</label><input id="cr_emision" type="date" value="${esc(datos.emision)}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Válido hasta (automático · 3 años)</label><input id="cr_validez_view" type="text" readonly value="" style="background:#f4f5f7;font-weight:600"></div>
          <div class="field"></div>
        </div>
        <div class="field"><label>Frase del bufete (reverso)</label>
          <input id="cr_frase" value="${esc(datos.frase)}" placeholder="Escríbala o elija una sugerencia" list="fraseList">
          <datalist id="fraseList">${FRASES.map(f => `<option value="${esc(f)}">`).join('')}</datalist>
          <span class="cell-sub" style="display:block;margin-top:5px">Sugerencias: ${FRASES.map(f => `&ldquo;${esc(f)}&rdquo;`).join(' &middot; ')}</span>
        </div>
        <div class="field"><label>Base legal de la representación (reverso)</label>
          <textarea id="cr_repre" style="min-height:120px">${esc(datos.representacion)}</textarea>
          <span class="cell-sub" style="display:block;margin-top:5px">Ya viene con la base legal vigente (Ley 387, Ley 439, Ley 603 y Art. 24 CPE). Puede editarla con su criterio profesional.</span>
        </div>
      </div>
    </div>

    <div class="cred-wrap" id="credPrintArea">
      <!-- ANVERSO -->
      <div class="cred-card">
        <div class="cred-card__top">
          <img class="cred-logo" id="cv_logo" src="${logoSrc(logoActual)}" alt="Logo del bufete">
          <div class="cred-org">
            <strong>LexFive</strong>
            <small>Bufete de Abogados</small>
          </div>
        </div>
        <div class="cred-band">CREDENCIAL &middot; <span id="cv_cargo_band">${esc(datos.cargo || '')}</span></div>
        <div class="cred-body">
          <div class="cred-photo-col">
            <div class="cred-photo" id="cv_foto">${esc(initials(datos.nombre) || '')}</div>
            <img class="cred-qr" id="cv_qr" src="${qrURL(qrPersona(datos))}" alt="QR de datos y sitio web">
            <small class="cred-qr-cap">Datos · web</small>
          </div>
          <div class="cred-data">
            <div class="cred-row"><span>Nombre</span><strong id="cv_nombre">${esc(datos.nombre || '')}</strong></div>
            <div class="cred-row"><span>Carnet de identidad</span><strong id="cv_ci">${esc(datos.ci || '')}</strong></div>
            <div class="cred-row"><span>Tel. personal / oficina</span><strong id="cv_tel">${esc([datos.telPersonal, datos.telOficina].filter(Boolean).join('  /  '))}</strong></div>
          </div>
        </div>
        <div class="cred-foot">
          <div><span>Emisión</span><strong id="cv_emision">${esc(fmtFechaCorta(datos.emision))}</strong></div>
          <div class="cred-foot__qr"><img src="${qrURL(RPA_URL)}" alt="Verificación SAJ-RPA del abogado" class="cred-qr-cert"><small class="cred-qr-cap">SAJ-RPA</small></div>
          <div><span>Válido hasta</span><strong id="cv_validez">${esc(fmtFechaCorta(addAnios(datos.emision, 3)))}</strong></div>
        </div>
      </div>

      <!-- REVERSO -->
      <div class="cred-card cred-card--back">
        <div class="cred-band">LexFive &middot; La Paz / El Alto - Bolivia</div>
        <p class="cred-cert" id="cv_repre">${resaltarRepre(datos.representacion || REPRE_DEFAULT)}</p>
        <p class="cred-cert cred-frase" id="cv_frase">${esc(datos.frase || '')}</p>
        <div class="cred-sign">
          <div class="cred-sign__line">Firma autorizada</div>
          <div class="cred-sign__line">Sello del bufete</div>
        </div>
        <p class="cred-note">Documento de uso institucional. Si la encuentra, devuélvala a LexFive.</p>
      </div>
    </div>

    <div class="cred-actions">
      <button class="btn btn--primary" id="btnPrintCred">${ICON.doc} Imprimir / Guardar PDF</button>
    </div>

    <div class="card">
      <div class="card__head"><h3>${ICON.usuarios} Cómo entregar una credencial a un procurador</h3></div>
      <div class="card__body">
        <ol class="cred-steps">
          <li>Pida al procurador que se registre en <strong>lexfive.netlify.app/sistema/login.html</strong> con su correo y una contraseña (entra como «Cliente» por defecto).</li>
          <li>El <strong>administrador</strong> abre la pestaña <strong>Usuarios</strong> y le cambia el rol a <strong>Procurador</strong>.</li>
          <li>Llene aquí los datos de la credencial del procurador, imprímala y entréguesela.</li>
        </ol>
        <p class="cell-sub" style="margin-top:10px"><strong>Importante:</strong> cada persona tiene su propia cuenta. No comparta contraseñas ni la cuenta principal del bufete.</p>
      </div>
    </div>`;

  // Selección de logo: aplica al sistema (se guarda en este equipo)
  let logoSel = logoActual;
  const nombreLogo = id => id === 'custom' ? 'logo-lexfive.png' : id + '.svg';
  content().querySelectorAll('.logo-option[data-logo]').forEach(tile => tile.onclick = () => {
    const id = tile.dataset.logo;
    logoSel = id;
    localStorage.setItem('lexfive_logo', id);
    content().querySelectorAll('.logo-option[data-logo]').forEach(b => b.classList.toggle('is-selected', b === tile));
    const cv = $('#cv_logo'); if (cv) cv.src = logoSrc(id);
    const pv = $('#logoPreviewBig'); if (pv) pv.src = logoSrc(id);
    const dl = $('#logoDownload'); if (dl) { dl.href = logoSrc(id); dl.setAttribute('download', nombreLogo(id)); }
    applyLogo(id);
    toast('Logo aplicado. Se usará en todo el sistema.', 'success');
  });
  const btnLogoBig = $('#btnLogoBig');
  if (btnLogoBig) btnLogoBig.onclick = () => verImagenGrande(logoSrc(logoSel), 'Logo del bufete', nombreLogo(logoSel));

  // Subir mi logo (SVG se guarda tal cual; foto JPG/PNG pasa por el editor y se convierte a PNG)
  const fileLogo = $('#fileLogo');
  const btnUploadLogo = $('#btnUploadLogo');
  if (btnUploadLogo) btnUploadLogo.onclick = () => fileLogo.click();
  if (fileLogo) fileLogo.onchange = () => {
    const f = fileLogo.files && fileLogo.files[0];
    fileLogo.value = '';
    if (!f) return;
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (f.type === 'image/svg+xml' || ext === 'svg') {
      leerImagenBufete(f, 'logo', () => { applyLogo('custom'); renderCredenciales(); toast('Logo subido y aplicado.', 'success'); });
    } else {
      abrirEditorImagen(f, { titulo: 'Ajustar logo', salida: 600, quitarBlanco: false }, async (pngUrl) => {
        const ok = await guardarImagen('logo', pngUrl);
        if (!ok) { toast('No se pudo guardar la imagen. Intente con una más liviana.', 'error'); return; }
        localStorage.setItem('lexfive_logo', 'custom');
        applyLogo('custom'); renderCredenciales();
        toast('Logo ajustado, convertido a PNG y aplicado.', 'success');
      });
    }
  };

  // Eliminar / restaurar logos
  content().querySelectorAll('[data-del-logo]').forEach(b => b.onclick = (e) => {
    e.stopPropagation();
    const id = b.dataset.delLogo;
    if (!confirm('¿Eliminar este logo de la galería?')) return;
    if (id === 'custom') borrarImagen('logo');
    else { const arr = readList('lexfive_logos_hidden'); if (arr.indexOf(id) === -1) arr.push(id); localStorage.setItem('lexfive_logos_hidden', JSON.stringify(arr)); }
    if (localStorage.getItem('lexfive_logo') === id) {
      const vis = LOGOS.filter(l => readList('lexfive_logos_hidden').indexOf(l.id) === -1);
      const nuevo = pickActive(null, IMG.logo, vis, LOGO_DEFAULT);
      localStorage.setItem('lexfive_logo', nuevo); applyLogo(nuevo);
    }
    renderCredenciales();
    toast('Logo eliminado de la galería.', 'success');
  });
  const btnRestoreLogos = $('#btnRestoreLogos');
  if (btnRestoreLogos) btnRestoreLogos.onclick = () => { localStorage.removeItem('lexfive_logos_hidden'); renderCredenciales(); toast('Modelos de logo restaurados.', 'success'); };

  // Enlazar los campos con la credencial en vivo + autoguardado
  const sync = () => {
    const v = id => ($('#' + id).value || '').trim();
    $('#cv_nombre').textContent = v('cr_nombre');
    $('#cv_cargo_band').textContent = v('cr_cargo');
    $('#cv_ci').textContent = v('cr_ci');
    $('#cv_tel').textContent = [v('cr_telpers'), v('cr_teloff')].filter(Boolean).join('  /  ');
    const emi = v('cr_emision') || hoyISO();
    const val = addAnios(emi, 3);
    const cvqr = $('#cv_qr');
    if (cvqr) cvqr.src = qrURL(SITIO_URL + '?procurador=' + encodeURIComponent(v('cr_nombre')) + '&ci=' + encodeURIComponent(v('cr_ci')) + '&rol=' + encodeURIComponent(v('cr_cargo')));
    $('#cv_emision').textContent = fmtFechaCorta(emi);
    $('#cv_validez').textContent = fmtFechaCorta(val);
    const vv = $('#cr_validez_view'); if (vv) vv.value = fmtFechaCorta(val);
    $('#cv_frase').textContent = v('cr_frase');
    $('#cv_repre').innerHTML = resaltarRepre(v('cr_repre') || REPRE_DEFAULT);
    $('#cv_foto').textContent = initials(v('cr_nombre')) || '';
    Draft.save('credencial', {
      nombre: v('cr_nombre'), cargo: v('cr_cargo'), ci: v('cr_ci'),
      telPersonal: v('cr_telpers'), telOficina: v('cr_teloff'),
      emision: emi, validez: val,
      frase: v('cr_frase'), representacion: v('cr_repre')
    });
  };
  ['cr_nombre', 'cr_cargo', 'cr_ci', 'cr_telpers', 'cr_teloff', 'cr_emision', 'cr_frase', 'cr_repre']
    .forEach(id => { const el = $('#' + id); if (el) { el.addEventListener('input', sync); el.addEventListener('change', sync); } });
  sync();

  // Selección de sello: se guarda en este equipo y actualiza vista previa, descarga e impresión
  let selloElegido = selloActual;
  content().querySelectorAll('.sello-option[data-sello]').forEach(tile => tile.onclick = () => {
    const id = tile.dataset.sello;
    selloElegido = id;
    localStorage.setItem('lexfive_sello', id);
    content().querySelectorAll('.sello-option[data-sello]').forEach(b => b.classList.toggle('is-selected', b === tile));
    const prev = $('#selloPreview'); if (prev) prev.src = selloSrc(id);
    const dl = $('#selloDownload'); if (dl) { dl.href = selloSrc(id); dl.setAttribute('download', id === 'custom' ? 'sello-lexfive.png' : id + '.svg'); }
    toast('Sello seleccionado. Listo para memoriales y documentos.', 'success');
  });
  const btnSelloBig = $('#btnSelloBig');
  if (btnSelloBig) btnSelloBig.onclick = () => verImagenGrande(selloSrc(selloElegido), 'Sello del bufete', selloElegido === 'custom' ? 'sello-lexfive.png' : selloElegido + '.svg');

  // Subir mi sello (SVG tal cual; foto pasa por el editor y se convierte a PNG)
  const fileSello = $('#fileSello');
  const btnUploadSello = $('#btnUploadSello');
  if (btnUploadSello) btnUploadSello.onclick = () => fileSello.click();
  if (fileSello) fileSello.onchange = () => {
    const f = fileSello.files && fileSello.files[0];
    fileSello.value = '';
    if (!f) return;
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (f.type === 'image/svg+xml' || ext === 'svg') {
      leerImagenBufete(f, 'sello', () => { renderCredenciales(); toast('Sello subido.', 'success'); });
    } else {
      abrirEditorImagen(f, { titulo: 'Ajustar sello', salida: 1000, quitarBlanco: true }, async (pngUrl) => {
        const ok = await guardarImagen('sello', pngUrl);
        if (!ok) { toast('No se pudo guardar la imagen. Intente con una más liviana.', 'error'); return; }
        localStorage.setItem('lexfive_sello', 'custom');
        renderCredenciales();
        toast('Sello ajustado, convertido a PNG y aplicado.', 'success');
      });
    }
  };

  // Eliminar / restaurar sellos
  content().querySelectorAll('[data-del-sello]').forEach(b => b.onclick = (e) => {
    e.stopPropagation();
    const id = b.dataset.delSello;
    if (!confirm('¿Eliminar este sello de la galería?')) return;
    if (id === 'custom') borrarImagen('sello');
    else { const arr = readList('lexfive_sellos_hidden'); if (arr.indexOf(id) === -1) arr.push(id); localStorage.setItem('lexfive_sellos_hidden', JSON.stringify(arr)); }
    if (localStorage.getItem('lexfive_sello') === id) {
      const vis = SELLOS.filter(s => readList('lexfive_sellos_hidden').indexOf(s.id) === -1);
      localStorage.setItem('lexfive_sello', pickActive(null, IMG.sello, vis, SELLO_DEFAULT));
    }
    renderCredenciales();
    toast('Sello eliminado de la galería.', 'success');
  });
  const btnRestoreSellos = $('#btnRestoreSellos');
  if (btnRestoreSellos) btnRestoreSellos.onclick = () => { localStorage.removeItem('lexfive_sellos_hidden'); renderCredenciales(); toast('Sellos restaurados.', 'success'); };

  $('#btnPrintCred').onclick = () => window.print();
  const bps = $('#btnPrintSello');
  if (bps) bps.onclick = () => {
    const src = selloSrc(selloElegido);
    const abs = src.indexOf('data:') === 0 ? src : new URL(src, location.href).href;
    const w = window.open('', '_blank');
    w.document.write('<img src="' + abs + '" style="width:6cm;height:6cm;object-fit:contain" onload="window.print();window.close()">');
    w.document.close();
  };
}

// Lee una imagen subida por el bufete (kind = 'logo' | 'sello'), la valida y la guarda.
function leerImagenBufete(file, kind, done) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const tiposOk = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'];
  const extOk = ['svg', 'png', 'jpg', 'jpeg', 'webp'].includes(ext);
  if (!tiposOk.includes(file.type) && !extOk) {
    toast('Formato no válido. Use SVG o PNG (de preferencia con fondo transparente).', 'error');
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    toast('La imagen pesa demasiado (máx. 2 MB). Exporte una versión más liviana.', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = async () => {
    const ok = await guardarImagen(kind, reader.result);
    if (!ok) { toast('No se pudo guardar la imagen. Intente con una más liviana.', 'error'); return; }
    localStorage.setItem('lexfive_' + kind, 'custom');
    if (typeof done === 'function') done();
  };
  reader.onerror = () => toast('No se pudo leer el archivo. Intente de nuevo.', 'error');
  reader.readAsDataURL(file);
}

// Editor de imagen para logos/sellos: recortar (cuadrado), acercar, opcionalmente quitar
// el fondo blanco, y exportar en PNG al tamaño exacto que necesita el sistema.
function abrirEditorImagen(file, opts, onDone) {
  opts = opts || {};
  const SALIDA = opts.salida || 600;     // px del PNG final (cuadrado)
  const LIENZO = 340;                     // px del área de edición
  if (file.size > 12 * 1024 * 1024) { toast('La foto es muy pesada (máx. 12 MB).', 'error'); return; }

  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => construir(img);
    img.onerror = () => toast('No se pudo abrir la imagen.', 'error');
    img.src = reader.result;
  };
  reader.onerror = () => toast('No se pudo leer el archivo.', 'error');
  reader.readAsDataURL(file);

  function construir(img) {
    const overlay = document.createElement('div');
    overlay.className = 'img-editor';
    overlay.innerHTML = `
      <div class="img-editor__panel">
        <h3>${esc(opts.titulo || 'Ajustar imagen')}</h3>
        <p class="cell-sub">Arrastre la imagen o use las flechas para moverla. Aparecen <strong>guías verdes</strong> y se imanta al centro. El recuadro es el recorte final. Se guardará en <strong>PNG ${SALIDA}×${SALIDA}px</strong>.</p>
        <div class="img-editor__stage">
          <canvas id="ieCanvas" width="${LIENZO}" height="${LIENZO}"></canvas>
        </div>
        <div class="img-editor__nudge">
          <button type="button" class="n-up" data-nudge="up" title="Subir">&#9650;</button>
          <button type="button" class="n-left" data-nudge="left" title="Izquierda">&#9664;</button>
          <button type="button" class="n-center" data-nudge="center" title="Centrar">&#10043;</button>
          <button type="button" class="n-right" data-nudge="right" title="Derecha">&#9654;</button>
          <button type="button" class="n-down" data-nudge="down" title="Bajar">&#9660;</button>
        </div>
        <label class="img-editor__zoom">Zoom
          <input type="range" id="ieZoom" min="1" max="5" step="0.01" value="1">
        </label>
        <label class="img-editor__chk"><input type="checkbox" id="ieWhite" ${opts.quitarBlanco ? 'checked' : ''}> Quitar fondo blanco (ideal para fotos JPG)</label>
        <div class="img-editor__actions">
          <button class="btn btn--ghost" id="ieCancel" type="button">Cancelar</button>
          <button class="btn btn--primary" id="ieApply" type="button">Aplicar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const canvas = overlay.querySelector('#ieCanvas');
    const ctx = canvas.getContext('2d');
    const zoomEl = overlay.querySelector('#ieZoom');
    const whiteEl = overlay.querySelector('#ieWhite');
    const C = LIENZO / 2;

    const base = Math.min(LIENZO / img.width, LIENZO / img.height);
    const st = { scale: base, x: (LIENZO - img.width * base) / 2, y: (LIENZO - img.height * base) / 2 };

    function quitarBlanco(context, size) {
      const d = context.getImageData(0, 0, size, size);
      const p = d.data;
      for (let i = 0; i < p.length; i += 4) {
        if (p[i] > 238 && p[i + 1] > 238 && p[i + 2] > 238) p[i + 3] = 0;
      }
      context.putImageData(d, 0, 0);
    }

    // Dibuja guías verdes cuando la imagen está centrada (como en Word)
    function ejes() {
      const cx = st.x + img.width * st.scale / 2;
      const cy = st.y + img.height * st.scale / 2;
      ctx.save();
      ctx.strokeStyle = '#19b36b'; ctx.lineWidth = 1;
      if (Math.abs(cx - C) < 1.5) { ctx.beginPath(); ctx.moveTo(C, 0); ctx.lineTo(C, LIENZO); ctx.stroke(); }
      if (Math.abs(cy - C) < 1.5) { ctx.beginPath(); ctx.moveTo(0, C); ctx.lineTo(LIENZO, C); ctx.stroke(); }
      ctx.restore();
    }

    function pintar() {
      ctx.clearRect(0, 0, LIENZO, LIENZO);
      ctx.drawImage(img, st.x, st.y, img.width * st.scale, img.height * st.scale);
      if (whiteEl.checked) quitarBlanco(ctx, LIENZO);
      ejes();
    }
    pintar();

    // Imán hacia el centro
    function imantar() {
      const SNAP = 8;
      const cx = st.x + img.width * st.scale / 2;
      const cy = st.y + img.height * st.scale / 2;
      if (Math.abs(cx - C) < SNAP) st.x = C - img.width * st.scale / 2;
      if (Math.abs(cy - C) < SNAP) st.y = C - img.height * st.scale / 2;
    }
    function centrar() {
      st.x = (LIENZO - img.width * st.scale) / 2;
      st.y = (LIENZO - img.height * st.scale) / 2;
      pintar();
    }

    zoomEl.oninput = () => {
      const nueva = base * parseFloat(zoomEl.value);
      st.x = C - ((C - st.x) / st.scale) * nueva;
      st.y = C - ((C - st.y) / st.scale) * nueva;
      st.scale = nueva;
      pintar();
    };
    whiteEl.onchange = pintar;

    overlay.querySelectorAll('[data-nudge]').forEach(b => b.onclick = () => {
      const d = b.dataset.nudge, S = 6;
      if (d === 'up') st.y -= S; else if (d === 'down') st.y += S;
      else if (d === 'left') st.x -= S; else if (d === 'right') st.x += S;
      else if (d === 'center') return centrar();
      imantar(); pintar();
    });

    let drag = false, px = 0, py = 0;
    const down = e => { drag = true; const t = e.touches ? e.touches[0] : e; px = t.clientX; py = t.clientY; };
    const move = e => {
      if (!drag) return;
      const t = e.touches ? e.touches[0] : e;
      st.x += t.clientX - px; st.y += t.clientY - py; px = t.clientX; py = t.clientY;
      imantar(); pintar(); if (e.cancelable) e.preventDefault();
    };
    const up = () => { drag = false; };
    canvas.addEventListener('mousedown', down); window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    canvas.addEventListener('touchstart', down, { passive: true }); canvas.addEventListener('touchmove', move, { passive: false }); window.addEventListener('touchend', up);

    function cerrar() {
      window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); window.removeEventListener('touchend', up);
      overlay.remove();
    }
    overlay.querySelector('#ieCancel').onclick = cerrar;
    overlay.querySelector('#ieApply').onclick = () => {
      const out = document.createElement('canvas');
      out.width = SALIDA; out.height = SALIDA;
      const octx = out.getContext('2d');
      const k = SALIDA / LIENZO;
      octx.drawImage(img, st.x * k, st.y * k, img.width * st.scale * k, img.height * st.scale * k);
      if (whiteEl.checked) quitarBlanco(octx, SALIDA);
      const url = out.toDataURL('image/png');
      cerrar();
      if (typeof onDone === 'function') onDone(url);
    };
  }
}

// Vista previa en grande de un logo o sello, con opción de descargar a tamaño completo.
function verImagenGrande(src, titulo, nombreArchivo) {
  if (!src) { toast('No hay imagen para mostrar.', 'error'); return; }
  const o = document.createElement('div');
  o.className = 'img-editor';
  o.innerHTML = `
    <div class="img-editor__panel" style="width:540px;max-width:100%">
      <h3>${esc(titulo || 'Vista previa')}</h3>
      <div class="big-preview"><img src="${src}" alt="${esc(titulo || '')}"></div>
      <div class="img-editor__actions">
        <a class="btn btn--ghost" href="${src}" download="${esc(nombreArchivo || 'imagen')}">Descargar</a>
        <button class="btn btn--primary" id="bpClose" type="button">Cerrar</button>
      </div>
    </div>`;
  document.body.appendChild(o);
  o.querySelector('#bpClose').onclick = () => o.remove();
  o.onclick = e => { if (e.target === o) o.remove(); };
}

// Aplica el logo elegido en todo el panel (inyecta un estilo que sobreescribe
// el fondo del .logo__mark). Se guarda en este equipo (localStorage).
function applyLogo(id) {
  let st = document.getElementById('lexfiveLogoStyle');
  if (!st) { st = document.createElement('style'); st.id = 'lexfiveLogoStyle'; document.head.appendChild(st); }
  const url = id === 'custom' ? (IMG.logo || '') : `../../assets/logos/${id}.svg`;
  st.textContent = `.logo__mark{background-image:url(${url})!important;}`;
}

// ============================================================
//  Navegación
// ============================================================
const VIEWS = {
  dashboard: { title: 'Panel general', render: renderDashboard },
  procesos: { title: 'Procesos', render: renderProcesos },
  modelos: { title: 'Modelos de memoriales', render: renderModelos },
  clientes: { title: 'Clientes', render: renderClientes },
  consultas: { title: 'Consultas recibidas', render: renderConsultas },
  blog: { title: 'Blog', render: renderBlog },
  credenciales: { title: 'Credenciales y accesos', render: renderCredenciales },
  testimonios: { title: 'Testimonios', render: renderTestimonios },
  categorias: { title: 'Categorías', render: renderCategorias },
  usuarios: { title: 'Usuarios', render: renderUsuarios },
  auditoria: { title: 'Auditoría', render: renderAuditoria },
  misprocesos: { title: 'Mis procesos', render: renderMisProcesos },
  opinion: { title: 'Mi opinión', render: renderMiOpinion }
};

const CLIENT_NAV = [
  { key: 'misprocesos', label: 'Mis procesos', icon: ICON.procesos },
  { key: 'opinion', label: 'Mi opinión', icon: ICON.estrella }
];

function navigate(key) {
  const isClient = state.profile.rol === 'cliente';
  if (isClient) {
    if (!['misprocesos', 'opinion'].includes(key)) key = 'misprocesos';
  } else {
    if (!VIEWS[key]) key = 'dashboard';
    if (['usuarios', 'auditoria', 'testimonios', 'categorias'].includes(key) && state.profile.rol !== 'admin') key = 'dashboard';
    if (key === 'credenciales' && !['admin', 'abogado'].includes(state.profile.rol)) key = 'dashboard';
  }
  state.view = key;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.key === key));
  $('#pageTitle').textContent = VIEWS[key].title;
  $('#sidebar').classList.remove('open'); $('#backdrop').classList.remove('show');
  VIEWS[key].render();
}

function buildSidebar() {
  const nav = $('#sidebarNav');
  const rol = state.profile.rol;
  const items = rol === 'cliente'
    ? CLIENT_NAV
    : NAV.filter(n => {
        if (n.adminOnly) return rol === 'admin';
        if (n.credOnly) return rol === 'admin' || rol === 'abogado';
        return true;
      });
  nav.innerHTML = items
    .map(n => `<button class="nav-item" data-key="${n.key}">${n.icon}<span>${n.label}</span></button>`).join('');
  nav.querySelectorAll('.nav-item').forEach(b => b.onclick = () => navigate(b.dataset.key));
}

// ============================================================
//  Arranque
// ============================================================
(async function init() {
  const profile = await requireAuth();
  if (!profile) return;
  state.profile = profile;
  await loadProfiles();

  // Cabecera de usuario
  $('#userName').textContent = profile.nombre;
  $('#userRol').textContent = ROLES[profile.rol] || profile.rol;
  $('#userAvatar').textContent = initials(profile.nombre);

  buildSidebar();

  // Aplica el logo elegido por el bufete (si se eligió uno)
  const logoGuardado = localStorage.getItem('lexfive_logo');
  if (logoGuardado) applyLogo(logoGuardado);

  // Eventos globales
  $('#btnLogout').onclick = () => signOut();
  initTooltipEngine();

  // Al hacer clic en el logo (ir al sitio público), cerrar la sesión por
  // seguridad. El autoguardado conserva lo que se estaba escribiendo, así que
  // al volver a iniciar sesión se podrá recuperar.
  const panelLogo = document.querySelector('.sidebar__head .logo');
  if (panelLogo) {
    panelLogo.setAttribute('data-tip', 'Vuelve al sitio web público y cierra su sesión por seguridad. Lo que esté escribiendo queda autoguardado y podrá recuperarlo al volver a entrar.');
    panelLogo.addEventListener('click', (e) => {
      e.preventDefault();
      signOutTo('../index.html');
    });
  }
  $('#modalClose').onclick = closeModal;
  $('#modalOverlay').onclick = (e) => { if (e.target === $('#modalOverlay')) closeModal(); };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  $('#menuToggle').onclick = () => { $('#sidebar').classList.toggle('open'); $('#backdrop').classList.toggle('show'); };
  $('#backdrop').onclick = () => { $('#sidebar').classList.remove('open'); $('#backdrop').classList.remove('show'); };

  // Cierre de sesión automático por inactividad (10 minutos)
  const IDLE_MS = 10 * 60 * 1000;
  let idleTimer;
  function resetIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(async () => {
      alert('Su sesión se cerró automáticamente por 10 minutos de inactividad. Por seguridad, vuelva a iniciar sesión.\n\nTranquilo: lo que estaba escribiendo (descripción del caso, memorial, etc.) quedó guardado y podrá recuperarlo al volver a abrir ese formulario.');
      await signOut();
    }, IDLE_MS);
  }
  ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'].forEach(ev =>
    document.addEventListener(ev, resetIdle, { passive: true }));
  resetIdle();

  // Vista inicial según el rol
  navigate(profile.rol === 'cliente' ? 'misprocesos' : 'dashboard');
})();
