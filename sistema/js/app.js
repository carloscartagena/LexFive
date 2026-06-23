// ============================================================
//  LexFive — Sistema de Gestión Legal · Lógica principal
// ============================================================
import { supabase } from './supabase.js';
import { requireAuth, getProfile, signOut, signOutTo, logAccion, can, withTimeout, mfaFactors, mfaEnroll, mfaVerify, mfaUnenroll } from './auth.js';
import { ROLES, ESTADOS, MATERIAS, WHATSAPP, ABOGADOS, VAPID_PUBLIC_KEY } from './config.js';
import { ICON } from './icons.js';
import { esc, hoyISO, addAnios, fmtFechaCorta, qrURL, RPA_URL, SITIO_URL, qrPersona, resaltarRepre, fmtDate, fmtDateTime, fmtHora, initials, esEmailValido } from './util.js';
import { descargarArchivo, srcDe, pad2, icsFecha, icsEscape, buildICS, googleCalURL, sumarDiasHabiles, fmtMoneda, clientesToCSV, honorariosToCSV, montoEnLetras } from './exportar.js';
import { $, content } from './dom.js';
import { paginar, pagerHTML, wirePager, barChart, toast, flashAutosave, tip, hint, initTooltipEngine, loading, openModal, closeModal } from './ui.js';
import { state } from './state.js';
import { loadCategorias, categoriaOptions, wireCategoriaSelect, renderCategorias } from './categorias.js';
import { profName, clienteName, badgeEstado, optionsProfiles, checkboxesProfiles, namesFromIds, optionsClientes } from './comunes.js';
import { renderConsultas, consultaNombre, openConsultaDetail } from './consultas.js';
import { loadProfiles, loadClientes } from './datos.js';
import { renderUsuarios, renderAuditoria } from './admin.js';
import { Draft, wireDraft, maybeOfferDraft } from './draft.js';
import { renderBlog } from './blog.js';
import { renderPlantillas } from './plantillas.js';
import { subirDocumento, enlaceDocumento, subirImagenBranding } from './storage.js';
import { renderModelos } from './modelos.js';
import { renderTareas, TAREA_PRIOR } from './tareas.js';
import { abrirImpresion } from './print.js';
import { renderReportes } from './reportes.js';
import { renderFinanzas, openHonorarios } from './finanzas.js';
import { renderPapelera } from './papelera.js';

// ---------- Estado global ----------
// El objeto state se movió a ./state.js (se importa arriba) para poder
// compartirlo con los módulos de vistas.

// ---------- Iconos ----------
// El objeto ICON se movió a ./icons.js y se importa arriba.

const NAV = [
  { key: 'dashboard', label: 'Panel', icon: ICON.dashboard },
  { key: 'procesos', label: 'Procesos', icon: ICON.procesos },
  { key: 'agenda', label: 'Agenda', icon: ICON.audiencia },
  { key: 'reportes', label: 'Reportes', icon: ICON.grafico },
  { key: 'tareas', label: 'Tareas', icon: ICON.tareas },
  { key: 'modelos', label: 'Modelos', icon: ICON.doc },
  { key: 'plantillas', label: 'Plantillas', icon: ICON.plantilla },
  { key: 'clientes', label: 'Clientes', icon: ICON.clientes },
  { key: 'consultas', label: 'Consultas', icon: ICON.consultas },
  { key: 'finanzas', label: 'Honorarios', icon: ICON.dinero, finOnly: true },
  { key: 'blog', label: 'Blog', icon: ICON.blog },
  { key: 'credenciales', label: 'Credenciales', icon: ICON.llave, credOnly: true },
  { key: 'credguardadas', label: 'Credenciales guardadas', icon: ICON.usuarios, credOnly: true },
  { key: 'sellos', label: 'Sellos y logos', icon: ICON.sello, credOnly: true },
  { key: 'sitio', label: 'Sitio web', icon: ICON.blog, credOnly: true },
  { key: 'areas', label: 'Áreas de práctica', icon: ICON.categorias, credOnly: true },
  { key: 'certificados', label: 'Certificados', icon: ICON.doc, credOnly: true },
  { key: 'testimonios', label: 'Testimonios', icon: ICON.estrella, adminOnly: true },
  { key: 'categorias', label: 'Categorías', icon: ICON.categorias, adminOnly: true },
  { key: 'usuarios', label: 'Usuarios', icon: ICON.usuarios, adminOnly: true },
  { key: 'auditoria', label: 'Auditoría', icon: ICON.auditoria, adminOnly: true },
  { key: 'papelera', label: 'Papelera', icon: ICON.papelera, adminOnly: true }
];
// credOnly = solo administrador y abogado (NO procurador ni cliente)

// ============================================================
//  Utilidades de interfaz
// ============================================================
// Los atajos $ y content están en ./dom.js; los helpers de UI (paginación,
// toast, modal, tooltips, etc.) en ./ui.js. Ambos se importan arriba.

// Barra discreta que avisa cuando hay una versión nueva del panel disponible
// (la detecta el Service Worker). Con un botón para recargar y aplicarla.
let _avisoActualizacionVisible = false;
function mostrarAvisoActualizacion() {
  if (_avisoActualizacionVisible) return;
  _avisoActualizacionVisible = true;
  const bar = document.createElement('div');
  bar.id = 'updateBar';
  bar.setAttribute('role', 'status');
  bar.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:9999;display:flex;align-items:center;gap:14px;max-width:92vw;background:#0e1b2c;color:#eef3f9;border:1px solid rgba(255,255,255,.18);box-shadow:0 10px 30px rgba(0,0,0,.35);border-radius:12px;padding:12px 16px;font-size:.92rem';
  bar.innerHTML = '<span>Hay una versión nueva del sistema disponible.</span>' +
    '<button type="button" id="updateNow" style="background:#c2a25a;color:#0e1b2c;border:none;border-radius:8px;padding:8px 14px;font-weight:700;cursor:pointer">Actualizar</button>' +
    '<button type="button" id="updateLater" aria-label="Cerrar" style="background:transparent;color:inherit;border:none;font-size:1.2rem;cursor:pointer;line-height:1">&times;</button>';
  document.body.appendChild(bar);
  const cerrar = () => { bar.remove(); _avisoActualizacionVisible = false; };
  bar.querySelector('#updateNow').onclick = () => location.reload();
  bar.querySelector('#updateLater').onclick = cerrar;
}

// ---------- Utilidades puras ----------
// Las funciones esc, fmtDate, fmtDateTime, fmtHora, hoyISO, addAnios,
// fmtFechaCorta, qrURL, qrPersona, resaltarRepre, initials, esEmailValido y las
// constantes RPA_URL / SITIO_URL se movieron a ./util.js y se importan arriba.

// ============================================================
//  Utilidades de exportación (descargas, calendario .ics, CSV)
// ============================================================
// descargarArchivo, srcDe, pad2, icsFecha, icsEscape, buildICS, googleCalURL,
// sumarDiasHabiles, fmtMoneda, clientesToCSV, honorariosToCSV y montoEnLetras
// se movieron a ./exportar.js y se importan arriba.

// --- Operaciones de Storage con TIEMPO LÍMITE ---------------------------------
// subirDocumento, enlaceDocumento y subirImagenBranding se movieron a
// ./storage.js (se importan arriba).

// ICS/calendario movidos a ./exportar.js (pad2, icsFecha, icsEscape, buildICS).

// Descarga la audiencia de un proceso como archivo de calendario.
function descargarICS(proc) {
  const ics = buildICS(proc);
  if (!ics) { toast('Este proceso no tiene fecha de audiencia.', 'error'); return; }
  const nombre = 'audiencia-' + (proc.caratula || 'proceso').toLowerCase().replace(/[^\w]+/g, '-').slice(0, 40) + '.ics';
  descargarArchivo(nombre, ics, 'text/calendar;charset=utf-8');
  toast('Evento descargado. Ábralo para agregarlo a su calendario.', 'success');
}

// googleCalURL y sumarDiasHabiles se movieron a ./exportar.js.


// Convierte filas de procesos a CSV (compatible con Excel: separador ; y BOM UTF-8).
function procesosToCSV(rows) {
  const cab = ['Carátula', 'Número', 'NUREJ', 'Materia', 'Tipo', 'Estado', 'Juzgado', 'Cliente', 'Parte contraria', 'Abogados', 'Procuradores', 'Fecha inicio', 'Próxima audiencia'];
  const celda = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const lineas = [cab.map(celda).join(';')];
  rows.forEach(p => {
    lineas.push([
      p.caratula, p.numero, p.nurej, p.materia,
      p.tipo === 'administrativo' ? 'Administrativo' : 'Judicial',
      ESTADOS[p.estado] || p.estado, p.juzgado,
      clienteName(p.cliente_id), p.parte_contraria,
      namesFromIds(p.abogados_ids) || profName(p.abogado_id),
      namesFromIds(p.procuradores_ids) || profName(p.procurador_id),
      p.fecha_inicio ? fmtDate(p.fecha_inicio) : '',
      p.proxima_audiencia ? fmtDateTime(p.proxima_audiencia) : ''
    ].map(celda).join(';'));
  });
  return '\ufeff' + lineas.join('\r\n');
}

// fmtMoneda, clientesToCSV, honorariosToCSV y montoEnLetras se movieron a
// ./exportar.js (procesosToCSV se queda aquí porque usa datos del panel).


// ============================================================
//  Utilidades de interfaz (paginación, barras, toast, tooltips, modal)
//  Se movieron a ./ui.js y se importan arriba.
// ============================================================




// ============================================================
//  BORRADORES — autoguardado para no perder lo que se está escribiendo
//  (p. ej. la descripción de un caso o un memorial largo). Se guarda en
//  el navegador, por usuario, y se recupera aunque la sesión se cierre
//  por inactividad o se cierre el navegador.
// ============================================================
// El sistema de borradores (Draft, wireDraft, maybeOfferDraft) se movió a
// ./draft.js (se importa arriba).

// ============================================================
//  Credenciales guardadas (compartidas en la nube vía Supabase).
//  Antes la credencial solo se autoguardaba como un único borrador
//  local, así que al crear otra se perdía la anterior y no se veía en
//  otros equipos. Ahora cada credencial creada se GUARDA en la tabla
//  "credenciales" de Supabase, por lo que se puede EDITAR, REIMPRIMIR
//  y eliminar IGUAL desde cualquier dispositivo del bufete.
//  Se mantiene una caché local para pintar rápido y tolerar cortes de red.
// ============================================================
// Convierte una fila de la tabla (snake_case) al formato que usa la interfaz.
function normCred(r) {
  r = r || {};
  return {
    id: r.id,
    nombre: r.nombre || '', cargo: r.cargo || '', ci: r.ci || '',
    telPersonal: r.tel_personal || '', telOficina: r.tel_oficina || '',
    emision: r.emision || '', validez: r.validez || '',
    frase: r.frase || '', representacion: r.representacion || '',
    foto: r.foto || null
  };
}
const CredStore = {
  cache: null,
  // Devuelve la caché en memoria al instante si ya existe (para que los
  // re-render de la pestaña —al elegir/subir/eliminar un logo o sello— NO
  // vuelvan a descargar las credenciales de la nube y se sientan rápidos).
  // Solo va a la red la primera vez o cuando la caché se invalidó tras
  // guardar/eliminar una credencial.
  async listCached() {
    if (this.cache) return this.cache;
    return this.list();
  },
  // Trae las credenciales de la nube (y guarda copia local por si no hay red).
  async list() {
    try {
      const { data, error } = await supabase
        .from('credenciales').select('*').order('updated_at', { ascending: false });
      if (error) throw error;
      this.cache = (data || []).map(normCred);
      try { localStorage.setItem('lexfive_cred_cache', JSON.stringify(this.cache)); } catch (e) {}
      return this.cache;
    } catch (e) {
      if (this.cache) return this.cache;
      try { return JSON.parse(localStorage.getItem('lexfive_cred_cache') || '[]'); } catch (e2) { return []; }
    }
  },
  // Crea o actualiza una credencial en la nube. Devuelve la fila guardada.
  async upsert(rec) {
    const row = {
      nombre: rec.nombre || '', cargo: rec.cargo || null, ci: rec.ci || null,
      tel_personal: rec.telPersonal || null, tel_oficina: rec.telOficina || null,
      emision: rec.emision || null, validez: rec.validez || null,
      frase: rec.frase || null, representacion: rec.representacion || null,
      foto: rec.foto || null, updated_at: new Date().toISOString()
    };
    if (rec.id) row.id = rec.id;
    const { data, error } = await supabase.from('credenciales').upsert(row).select().maybeSingle();
    if (error) throw error;
    this.cache = null; // forzar relectura desde la nube en el próximo render
    return normCred(data);
  },
  // Elimina una credencial de la nube.
  async remove(id) {
    const { error } = await supabase.from('credenciales').delete().eq('id', id);
    if (error) throw error;
    this.cache = null;
  }
};
// Credencial que se está editando en este momento (null = se creará una nueva).
let credEditId = null;

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
const IMG = { logo: null, sello: null, foto: null, logosCustom: [], sellosCustom: [], loaded: false };

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

// Guarda en el equipo la lista de logos propios subidos (galería con varios).
async function saveLogosCustom() { try { await ImgDB.set('logosCustom', IMG.logosCustom); } catch (e) {} }
async function saveSellosCustom() { try { await ImgDB.set('sellosCustom', IMG.sellosCustom); } catch (e) {} }

// ---- Intensidad (opacidad) de la marca de agua del logo en la credencial ----
// Se guarda como porcentaje (3–40) y se sincroniza con los demás dispositivos
// junto al resto del branding.
function wmOpacityActual() {
  const v = Number(localStorage.getItem('lexfive_wm_op'));
  return (v >= 3 && v <= 40) ? v : 15;
}
function applyWmOpacity(pct) {
  const p = Math.max(3, Math.min(40, Number(pct) || 15));
  document.documentElement.style.setProperty('--cred-wm-op', (p / 100).toFixed(2));
}

// ---- Visibilidad (opacidad) de la imagen de fondo de las secciones ----
// «Razones para confiar» y «Sobre el bufete». Se guarda como porcentaje
// (10–100): a MAYOR valor, la imagen se ve MÁS; a menor valor, queda más tenue
// y el texto se lee mejor. Se sincroniza con los demás equipos.
function bgOpOf(lsKey) {
  const v = Number(localStorage.getItem(lsKey));
  if (v >= 10 && v <= 100) return v;
  const legacy = Number(localStorage.getItem('lexfive_bgimg_op')); // compat versión anterior
  return (legacy >= 10 && legacy <= 100) ? legacy : 35;
}

// ---- Indicador de "sin conexión" (offline) ----
// Avisa cuando no hay internet: los cambios se guardan localmente y se
// sincronizan al volver la conexión.
function initOfflineIndicator() {
  let b = document.getElementById('offlineBanner');
  if (!b) {
    b = document.createElement('div');
    b.id = 'offlineBanner';
    b.className = 'offline-banner';
    b.innerHTML = '<span class="offline-banner__dot"></span><span>Sin conexión. Lo que guarde queda en este equipo y se sincronizará al volver el internet.</span>';
    document.body.appendChild(b);
  }
  const upd = () => b.classList.toggle('show', !navigator.onLine);
  window.addEventListener('offline', upd);
  window.addEventListener('online', () => { b.classList.remove('show'); toast('Conexión restablecida.', 'success'); });
  upd();
}

// ---- Respaldo manual de datos (exportar a JSON) ----
function lastBackupText() {
  const ts = Number(localStorage.getItem('lexfive_last_backup'));
  if (!ts) return 'Aún no ha exportado un respaldo manual.';
  return 'Último respaldo manual: ' + new Date(ts).toLocaleString('es-BO');
}
async function exportarRespaldo(btn) {
  if (btn) { btn.disabled = true; btn.textContent = 'Generando...'; }
  try {
    const tablas = ['profiles', 'clientes', 'procesos', 'consultas', 'articulos', 'testimonios',
      'tareas', 'eventos', 'honorarios', 'pagos', 'categorias', 'credenciales'];
    const dump = { generado: new Date().toISOString(), version: 1, tablas: {} };
    for (const t of tablas) {
      try { const { data } = await supabase.from(t).select('*'); dump.tablas[t] = data || []; }
      catch (e) { dump.tablas[t] = []; }
    }
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'lexfive-respaldo-' + hoyISO() + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    localStorage.setItem('lexfive_last_backup', String(Date.now()));
    const info = document.getElementById('lastBackupInfo'); if (info) info.textContent = lastBackupText();
    toast('Respaldo descargado en este equipo.', 'success');
  } catch (e) {
    toast('No se pudo generar el respaldo. Revise su conexión.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Exportar respaldo (JSON)'; }
  }
}

// Permite abrir un archivo de respaldo JSON exportado previamente y explorar
// su contenido en una tabla interactiva (solo lectura). No modifica la base.
function revisarRespaldo() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json,application/json';
  input.onchange = () => {
    const f = input.files && input.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const dump = JSON.parse(reader.result);
        if (!dump || !dump.tablas) { toast('El archivo no parece un respaldo válido de LexFive.', 'error'); return; }
        const tablas = Object.keys(dump.tablas);
        const resumen = tablas.map(t => `<tr><td class="cell-strong">${esc(t)}</td><td>${(dump.tablas[t] || []).length} registros</td></tr>`).join('');
        const body = `
          <p class="cell-sub" style="margin-bottom:10px">Archivo: <strong>${esc(f.name)}</strong> · Generado: ${dump.generado ? new Date(dump.generado).toLocaleString('es-BO') : 'desconocido'}</p>
          <p class="cell-sub" style="margin-bottom:14px">Este visor es de <strong>solo lectura</strong>. No modifica la base de datos.</p>
          <div class="table-wrap" style="max-height:320px;overflow:auto"><table class="data"><thead><tr><th>Tabla</th><th>Registros</th></tr></thead><tbody>${resumen}</tbody></table></div>
          <p class="cell-sub" style="margin-top:12px">Haga clic en una tabla para ver sus datos en detalle.</p>`;
        openModal('Revisar respaldo', body, [{ label: 'Cerrar', class: 'btn--ghost', onClick: closeModal }], true);
        // Click en una tabla para ver sus registros.
        $('#modalBody').querySelectorAll('tr').forEach(tr => {
          tr.style.cursor = 'pointer';
          tr.onclick = () => {
            const nombre = (tr.querySelector('.cell-strong') || {}).textContent;
            const rows = dump.tablas[nombre] || [];
            if (!rows.length) { toast('Esa tabla está vacía en el respaldo.', 'error'); return; }
            const cols = Object.keys(rows[0]);
            const head = cols.map(c => `<th>${esc(c)}</th>`).join('');
            const filas = rows.slice(0, 100).map(r => `<tr>${cols.map(c => `<td style="font-size:.78rem;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(String(r[c] != null ? r[c] : ''))}</td>`).join('')}</tr>`).join('');
            openModal(`${esc(nombre)} (${rows.length} registros${rows.length > 100 ? ', primeros 100' : ''})`,
              `<div class="table-wrap" style="max-height:420px;overflow:auto"><table class="data"><thead><tr>${head}</tr></thead><tbody>${filas}</tbody></table></div>`,
              [{ label: '← Volver', class: 'btn--ghost', onClick: () => revisarRespaldoConDump(dump, f.name) }, { label: 'Cerrar', class: 'btn--ghost', onClick: closeModal }], true);
          };
        });
      } catch (e) { toast('Error al leer el archivo. ¿Está corrupto?', 'error'); }
    };
    reader.readAsText(f);
  };
  input.click();
}
// Re-abre el resumen del respaldo (para el botón "← Volver" desde el detalle de una tabla).
function revisarRespaldoConDump(dump, nombre) {
  const tablas = Object.keys(dump.tablas);
  const resumen = tablas.map(t => `<tr><td class="cell-strong">${esc(t)}</td><td>${(dump.tablas[t] || []).length} registros</td></tr>`).join('');
  const body = `
    <p class="cell-sub" style="margin-bottom:10px">Archivo: <strong>${esc(nombre)}</strong> · Generado: ${dump.generado ? new Date(dump.generado).toLocaleString('es-BO') : 'desconocido'}</p>
    <p class="cell-sub" style="margin-bottom:14px">Este visor es de <strong>solo lectura</strong>. No modifica la base de datos.</p>
    <div class="table-wrap" style="max-height:320px;overflow:auto"><table class="data"><thead><tr><th>Tabla</th><th>Registros</th></tr></thead><tbody>${resumen}</tbody></table></div>
    <p class="cell-sub" style="margin-top:12px">Haga clic en una tabla para ver sus datos.</p>`;
  openModal('Revisar respaldo', body, [{ label: 'Cerrar', class: 'btn--ghost', onClick: closeModal }], true);
  $('#modalBody').querySelectorAll('tr').forEach(tr => {
    tr.style.cursor = 'pointer';
    tr.onclick = () => {
      const n = (tr.querySelector('.cell-strong') || {}).textContent;
      const rows = dump.tablas[n] || [];
      if (!rows.length) { toast('Tabla vacía.', 'error'); return; }
      const cols = Object.keys(rows[0]);
      const head = cols.map(c => `<th>${esc(c)}</th>`).join('');
      const filas = rows.slice(0, 100).map(r => `<tr>${cols.map(c => `<td style="font-size:.78rem;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(String(r[c] != null ? r[c] : ''))}</td>`).join('')}</tr>`).join('');
      openModal(`${esc(n)} (${rows.length} registros${rows.length > 100 ? ', primeros 100' : ''})`,
        `<div class="table-wrap" style="max-height:420px;overflow:auto"><table class="data"><thead><tr>${head}</tr></thead><tbody>${filas}</tbody></table></div>`,
        [{ label: '← Volver', class: 'btn--ghost', onClick: () => revisarRespaldoConDump(dump, nombre) }, { label: 'Cerrar', class: 'btn--ghost', onClick: closeModal }], true);
    };
  });
}

// ============================================================
//  Configuración compartida del bufete (logo y sello) en Supabase.
//  Antes el logo se guardaba SOLO en este navegador, por eso un
//  cambio hecho en la computadora no se veía en el celular. Ahora
//  se guarda en la nube (tabla "configuracion", clave 'branding')
//  y se aplica igual en todos los dispositivos y en la web pública.
// ============================================================
const Branding = {
  cache: null,
  // Lee la configuración guardada en la nube (y la cachea localmente).
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
  // Última versión conocida sin esperar a la red (pintado rápido / sin conexión).
  local() {
    if (this.cache) return this.cache;
    try { return JSON.parse(localStorage.getItem('lexfive_branding') || '{}'); } catch (e) { return {}; }
  },
  // Guarda la configuración en la nube para que se vea en todos los equipos.
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

// ============================================================
//  Galerías de logos/sellos propios (fila aparte en la nube).
//  Antes vivían DENTRO de la fila 'branding', que se descarga en CADA
//  carga de página: con varias imágenes en base64 se volvía pesada y
//  lenta. Ahora viven en la clave 'branding_galerias' y SOLO se cargan
//  al abrir Credenciales. Requiere db/19_branding_galerias.sql.
// ============================================================
const Galerias = {
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
function snapshotGalerias() {
  return { logosCustom: IMG.logosCustom || [], sellosCustom: IMG.sellosCustom || [] };
}
// Sube las galerías a la nube (y avisa si no se pudo). Se llama al subir o
// eliminar un logo/sello propio.
async function pushGalerias() {
  const ok = await Galerias.save(snapshotGalerias());
  if (!ok) toast('El logo/sello se guardó en este equipo, pero no se pudo sincronizar. Revise su conexión.', 'error');
  return ok;
}

// Toma una "foto" del logo/sello elegido en este equipo (selección + imágenes
// propias + modelos ocultos) para guardarla en la nube.
function snapshotBranding() {
  const readList = k => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch (e) { return []; } };
  const cache = (Branding && Branding.local) ? (Branding.local() || {}) : {};
  let logoId = localStorage.getItem('lexfive_logo') || null;
  if (logoId && logoId.indexOf('custom') === 0) logoId = 'custom'; // compatibilidad con la web pública
  let selloId = localStorage.getItem('lexfive_sello') || null;
  if (selloId && selloId.indexOf('custom') === 0) selloId = 'custom';
  // No perder el logo/sello propio: si la imagen no está cargada en memoria pero
  // el modelo elegido es 'custom', se conserva la última imagen conocida (caché)
  // para NO guardar un logo vacío que haría aparecer el de por defecto en todos
  // los dispositivos.
  let logoImg = IMG.logo || null;
  if (!logoImg && logoId === 'custom') logoImg = cache.logoImg || null;
  let selloImg = IMG.sello || null;
  if (!selloImg && selloId === 'custom') selloImg = cache.selloImg || null;
  // Si quedó 'custom' pero no hay imagen por ningún lado, no forzar 'custom'
  // (evita un logo vacío): se conserva lo último válido conocido en la caché.
  if (logoId === 'custom' && !logoImg && cache.logoId) { logoId = cache.logoId; logoImg = cache.logoImg || null; }
  if (selloId === 'custom' && !selloImg && cache.selloId) { selloId = cache.selloId; selloImg = cache.selloImg || null; }
  // Sitio web público: imagen del hero y estilo de fondo. Si la clave no está
  // en este equipo (no se abrió «Sitio web»), se conserva lo de la nube; si
  // está vacía (se quitó), se guarda nulo.
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
    // Imagen de la sección «Sobre el bufete» (vertical) y foto de fondo del
    // encabezado/hero. Mismo criterio: si la clave no está en este equipo, se
    // conserva lo de la nube; si está vacía (se quitó), se guarda nulo.
    sobreImg: (sobreLS !== null) ? (sobreLS || null) : (cache.sobreImg || null),
    heroBgImg: (heroBgLS !== null) ? (heroBgLS || null) : (cache.heroBgImg || null),
    // Imagen de fondo propia para las secciones «Razones para confiar» (whyBgImg)
    // y «Sobre el bufete» (aboutBgImg). Mismo criterio que las demás.
    aboutBgImg: (aboutBgLS !== null) ? (aboutBgLS || null) : (cache.aboutBgImg || null),
    whyBgImg: (whyBgLS !== null) ? (whyBgLS || null) : (cache.whyBgImg || null),
    testimonialsBgImg: (testimonialsBgLS !== null) ? (testimonialsBgLS || null) : (cache.testimonialsBgImg || null)
  };
}

// Marca de tiempo del último cambio de branding hecho EN ESTE equipo. Sirve
// para que el canal en tiempo real NO vuelva a descargar y re-renderizar la
// pestaña cuando el cambio lo originó este mismo dispositivo (antes, cada vez
// que se elegía/subía/eliminaba un logo o sello, el equipo se "auto-avisaba"
// y forzaba una recarga de red + re-render, haciendo que todo se sintiera lento).
let lastBrandingPush = 0;

// Empuja la configuración actual a la nube y avisa si no se pudo.
async function pushBranding() {
  lastBrandingPush = Date.now();
  const ok = await Branding.save(snapshotBranding());
  if (!ok) toast('Se guardó en este equipo, pero no se pudo sincronizar con los demás dispositivos. Revise su conexión.', 'error');
  return ok;
}

// Trae la configuración de la nube y la aplica a este equipo (selección,
// imágenes propias y modelos ocultos), dejándolo idéntico a los demás.
// Solo descarga de la nube la PRIMERA vez por sesión (o cuando se le fuerza
// con force=true desde el canal en tiempo real). Así los re-render de la
// pestaña —al elegir/subir/eliminar un logo o sello— no repiten 2 descargas
// de red (branding + galerías) y la vista responde al instante.
let brandingHydrated = false;
async function hydrateBranding(force) {
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
    // La nube es la fuente de verdad para la imagen propia.
    if (b.logoImg) { IMG.logo = b.logoImg; try { await ImgDB.set('logo', b.logoImg); } catch (e) {} }
    else if (b.logoId && b.logoId !== 'custom') { IMG.logo = null; try { await ImgDB.del('logo'); } catch (e) {} localStorage.removeItem('lexfive_logo_custom'); }
    // Si la nube no trae imagen pero el logo elegido es propio (o no hay dato), se conserva el del equipo.
    if (b.selloImg) { IMG.sello = b.selloImg; try { await ImgDB.set('sello', b.selloImg); } catch (e) {} }
    else if (b.selloId && b.selloId !== 'custom') { IMG.sello = null; try { await ImgDB.del('sello'); } catch (e) {} localStorage.removeItem('lexfive_sello_custom'); }

    // Galerías de logos/sellos propios: ahora viven en una fila aparte
    // ('branding_galerias'). Se admite la ubicación antigua (dentro de
    // 'branding') como respaldo, para migrar sin perder nada.
    const g = await Galerias.load();
    const logosG = (Array.isArray(g.logosCustom) && g.logosCustom.length) ? g.logosCustom : (Array.isArray(b.logosCustom) ? b.logosCustom : []);
    const sellosG = (Array.isArray(g.sellosCustom) && g.sellosCustom.length) ? g.sellosCustom : (Array.isArray(b.sellosCustom) ? b.sellosCustom : []);
    if (logosG.length) { IMG.logosCustom = logosG; try { await ImgDB.set('logosCustom', logosG); } catch (e) {} }
    if (IMG.logo && !IMG.logosCustom.some(x => x && srcDe(x) === IMG.logo)) { IMG.logosCustom.unshift({ id: 'c' + Date.now(), img: IMG.logo }); try { await ImgDB.set('logosCustom', IMG.logosCustom); } catch (e) {} }
    if (sellosG.length) { IMG.sellosCustom = sellosG; try { await ImgDB.set('sellosCustom', sellosG); } catch (e) {} }
    if (IMG.sello && !IMG.sellosCustom.some(x => x && srcDe(x) === IMG.sello)) { IMG.sellosCustom.unshift({ id: 's' + Date.now(), img: IMG.sello }); try { await ImgDB.set('sellosCustom', IMG.sellosCustom); } catch (e) {} }
    // Auto-migración: si la fila de galerías aún no existe en la nube pero este
    // equipo sí tiene galerías, se suben (para que aparezcan en otros dispositivos).
    const faltanGalerias = (!Array.isArray(g.logosCustom) || !g.logosCustom.length) && (!Array.isArray(g.sellosCustom) || !g.sellosCustom.length);
    if (faltanGalerias && (IMG.logosCustom.length || IMG.sellosCustom.length)) { try { await Galerias.save(snapshotGalerias()); } catch (e) {} }
  } catch (e) {}
  return b;
}

// ============================================================
//  Branding en tiempo real: si el logo o el sello del bufete cambia en
//  otro dispositivo, este equipo lo aplica al instante (sin recargar).
//  Requiere haber ejecutado db/18_realtime_branding.sql en Supabase.
// ============================================================
let brandingRealtimeOn = false;
function subscribeBrandingRealtime() {
  if (brandingRealtimeOn) return;
  brandingRealtimeOn = true;
  try {
    supabase
      .channel('lexfive-branding')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'configuracion', filter: 'clave=eq.branding' },
        async () => {
          // Si el cambio lo acaba de hacer ESTE equipo (hace menos de 8 s),
          // no hace falta volver a descargar nada ni re-renderizar: ya tenemos
          // la última versión localmente. Esto evita el "lag" al elegir, subir
          // o eliminar logos/sellos (antes se recargaba todo en cada acción).
          if (Date.now() - lastBrandingPush < 8000) return;
          try {
            await ensureImgCache();
            await hydrateBranding(true);
            const lg = localStorage.getItem('lexfive_logo'); if (lg) applyLogo(lg);
            // Si está abierta la pestaña de Credenciales, se refresca para ver
            // los nuevos logos/sellos (el formulario se recupera del autoguardado).
            if (state.view === 'credenciales') { try { await renderCredenciales(); } catch (e) {} }
            else if (state.view === 'sellos') { try { await renderSellos(); } catch (e) {} }
            else { toast('Se actualizó el logo o sello del bufete en este dispositivo.', 'success'); }
          } catch (e) {}
        })
      .subscribe();
  } catch (e) { brandingRealtimeOn = false; }
}

// draftAgo, wireDraft y maybeOfferDraft se movieron a ./draft.js (se importan arriba).

// Helpers comunes de presentación (profName, clienteName, badgeEstado,
// optionsProfiles, checkboxesProfiles, namesFromIds, optionsClientes) se
// movieron a ./comunes.js (se importan arriba).

// ============================================================
//  Carga de datos comunes
// ============================================================
// loadProfiles y loadClientes se movieron a ./datos.js (se importan arriba).

// ---------- Categorías / áreas del derecho (dinámicas) ----------
// loadCategorias, categoriaOptions, crearCategoria, wireCategoriaSelect,
// renombrarCategoria, eliminarCategoria y renderCategorias se movieron a
// ./categorias.js (se importan arriba).

// ============================================================
//  VISTA: CATEGORÍAS / ÁREAS DEL DERECHO (solo admin)
// ============================================================
// renderCategorias se movió a ./categorias.js (se importa arriba).

// Genera un enlace de WhatsApp con un recordatorio de audiencia ya escrito
function waRecordatorio(p) {
  const t = encodeURIComponent(
    `Recordatorio LexFive\nProceso: ${p.caratula}\nAudiencia/plazo: ${fmtDateTime(p.proxima_audiencia)}\nResponsable: ${profName(p.abogado_id)}`
  );
  return `https://wa.me/${WHATSAPP}?text=${t}`;
}

// Abre un modal para enviar el recordatorio por WhatsApp (a los 5 abogados)
// o por correo (a todo el personal del bufete).
function recordarPorWhatsApp(p) {
  const texto = `Recordatorio LexFive\nProceso: ${p.caratula}\nAudiencia/plazo: ${fmtDateTime(p.proxima_audiencia)}\nResponsable: ${profName(p.abogado_id)}`;
  const enc = encodeURIComponent(texto);
  // Correos del personal del bufete (desde los perfiles), para el recordatorio por correo.
  const correosEquipo = (state.profiles || [])
    .filter(u => ['admin', 'procurador', 'abogado'].includes(u.rol) && u.email)
    .map(u => u.email);
  const asunto = encodeURIComponent('Recordatorio de audiencia/plazo — ' + (p.caratula || 'Proceso'));
  const mailtoEquipo = 'mailto:' + correosEquipo.join(',') + '?subject=' + asunto + '&body=' + enc;
  const body = `
    <p class="cell-sub" style="margin-bottom:14px">Toque cada botón para enviar el recordatorio por WhatsApp a cada abogado del equipo:</p>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${ABOGADOS.map(a => `<a class="btn" style="justify-content:flex-start;background:#25d366;color:#fff;border-color:#25d366" target="_blank" rel="noopener" href="https://wa.me/${a.wa}?text=${enc}">Enviar a ${esc(a.nombre)}</a>`).join('')}
    </div>
    <p class="cell-sub" style="margin:18px 0 8px">O envíelo por <strong>correo</strong> a todo el personal del bufete de una sola vez:</p>
    ${correosEquipo.length
      ? `<a class="btn btn--primary" style="justify-content:flex-start" href="${mailtoEquipo}">✉️ Enviar recordatorio por correo (${correosEquipo.length})</a>`
      : `<p class="cell-sub" style="color:var(--danger,#c0392b)">No hay correos registrados en los perfiles del personal, así que no se puede enviar por correo todavía.</p>`}`;
  openModal('Recordar audiencia / plazo', body, [{ label: 'Cerrar', class: 'btn--primary', onClick: closeModal }]);
}

// recordarCobro (modal de recordatorio de cobro) se movió a ./finanzas.js.

// ============================================================
//  VISTA: DASHBOARD
// ============================================================
async function renderDashboard() {
  loading();
  const { data: procesos } = await supabase.from('procesos').select('*').eq('eliminado', false).order('proxima_audiencia', { ascending: true });
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

  // Tareas pendientes (no completadas)
  let tareasPend = 0;
  try {
    const { count } = await supabase.from('tareas').select('id', { count: 'exact', head: true }).neq('estado', 'hecha');
    tareasPend = count || 0;
  } catch (e) { tareasPend = 0; }

  // Mis tareas pendientes (asignadas a mí) para el panel personal "Mis pendientes".
  let misTareas = [];
  try {
    const { data } = await supabase.from('tareas').select('*')
      .neq('estado', 'hecha').eq('asignado_a', state.profile.id)
      .order('vence', { ascending: true, nullsFirst: false });
    misTareas = data || [];
  } catch (e) { misTareas = []; }

  // Mi agenda próxima (7 días): audiencias de mis procesos + plazos pendientes.
  const esMio = (p) => p.abogado_id === state.profile.id || p.procurador_id === state.profile.id
    || (p.abogados_ids || []).includes(state.profile.id) || (p.procuradores_ids || []).includes(state.profile.id);
  const en7d = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);
  const misProcesos = list.filter(esMio);
  let miAgenda = misProcesos
    .filter(p => p.proxima_audiencia && new Date(p.proxima_audiencia) >= ahora && new Date(p.proxima_audiencia) <= en7d && !['archivado', 'concluido'].includes(p.estado))
    .map(p => ({ tipo: 'Audiencia', fecha: p.proxima_audiencia, titulo: p.caratula, proceso_id: p.id }));
  try {
    const idsMios = misProcesos.map(p => p.id);
    if (idsMios.length) {
      const { data: evs } = await supabase.from('eventos').select('*')
        .eq('estado', 'pendiente')
        .gte('fecha', ahora.toISOString()).lte('fecha', en7d.toISOString())
        .in('proceso_id', idsMios);
      const caratulaDe = {}; misProcesos.forEach(p => { caratulaDe[p.id] = p.caratula; });
      (evs || []).forEach(e => miAgenda.push({ tipo: e.tipo || 'Plazo', fecha: e.fecha, titulo: e.titulo + (caratulaDe[e.proceso_id] ? ' — ' + caratulaDe[e.proceso_id] : ''), proceso_id: e.proceso_id }));
    }
  } catch (e) { /* la tabla eventos puede no existir aún; se ignora */ }
  miAgenda.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  // Por cobrar (solo admin y abogado)
  let porCobrar = null;
  let ingresos6 = [];
  if (['admin', 'abogado'].includes(state.profile.rol)) {
    try {
      const [{ data: hs }, { data: ps }] = await Promise.all([
        supabase.from('honorarios').select('monto'),
        supabase.from('pagos').select('monto,fecha')
      ]);
      const th = (hs || []).reduce((a, b) => a + Number(b.monto || 0), 0);
      const tp = (ps || []).reduce((a, b) => a + Number(b.monto || 0), 0);
      porCobrar = th - tp;
      // Ingresos (pagos recibidos) de los últimos 6 meses, para el gráfico.
      const porMes = {};
      (ps || []).forEach(p => { if (p.fecha) { const k = String(p.fecha).slice(0, 7); porMes[k] = (porMes[k] || 0) + Number(p.monto || 0); } });
      for (let i = 5; i >= 0; i--) {
        const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
        const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        ingresos6.push({ label: d.toLocaleDateString('es-BO', { month: 'short', year: '2-digit' }), value: Math.round(porMes[k] || 0) });
      }
    } catch (e) { porCobrar = null; }
  }

  // Alertas: audiencias vencidas y dentro de los próximos 7 días
  const en7 = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);
  const vencidas = list.filter(p => p.proxima_audiencia && new Date(p.proxima_audiencia) < ahora && !['archivado', 'concluido'].includes(p.estado))
    .sort((a, b) => new Date(b.proxima_audiencia) - new Date(a.proxima_audiencia));
  const urgentes = proximas.filter(p => new Date(p.proxima_audiencia) <= en7);

  // Datos para los gráficos
  const porEstado = Object.entries(ESTADOS)
    .map(([k, v]) => ({ label: v, value: list.filter(p => p.estado === k).length }));
  const matCount = {};
  list.forEach(p => { const mt = p.materia || 'Sin materia'; matCount[mt] = (matCount[mt] || 0) + 1; });
  const porMateria = Object.entries(matCount).map(([k, v]) => ({ label: k, value: v }))
    .sort((a, b) => b.value - a.value).slice(0, 8);
  const activosList = list.filter(p => !['archivado', 'concluido'].includes(p.estado));
  const aboCount = {};
  activosList.forEach(p => {
    const ids = (p.abogados_ids && p.abogados_ids.length) ? p.abogados_ids : (p.abogado_id ? [p.abogado_id] : []);
    ids.forEach(id => { aboCount[id] = (aboCount[id] || 0) + 1; });
  });
  const porAbogado = Object.entries(aboCount).map(([id, v]) => ({ label: profName(id), value: v }))
    .sort((a, b) => b.value - a.value).slice(0, 8);

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

  // Panel personal: tareas pendientes asignadas a quien inició sesión, con las
  // vencidas / que vencen hoy resaltadas y acciones rápidas (completar / abrir).
  const hoyS = hoyISO();
  const misPendientesHtml = `
    <div class="card">
      <div class="card__head"><h3>${ICON.tareas} Mis pendientes</h3>${misTareas.length ? `<button class="btn btn--ghost btn--sm" id="btnVerTareas" type="button">Ver tablero</button>` : ''}</div>
      <div class="card__body--flush">
        ${misTareas.length ? `<div class="pend-list">${misTareas.slice(0, 8).map(t => {
          const vencida = t.vence && t.vence < hoyS;
          const venceHoy = t.vence === hoyS;
          const vencHtml = t.vence
            ? `<span class="pend-venc ${vencida ? 'pend-venc--red' : (venceHoy ? 'pend-venc--amber' : '')}">${vencida ? 'Venció ' + fmtDate(t.vence) : (venceHoy ? 'Vence hoy' : 'Vence ' + fmtDate(t.vence))}</span>`
            : '';
          return `<div class="pend-row">
            <button class="pend-row__check js-done-tarea" data-id="${t.id}" type="button" title="Marcar como hecha" aria-label="Completar tarea">✓</button>
            <div class="pend-row__main js-open-tarea" data-id="${t.id}">
              <div class="cell-strong">${esc(t.titulo)}</div>
              <div class="pend-row__meta"><span class="badge-prio badge-prio--${t.prioridad}">${TAREA_PRIOR[t.prioridad] || t.prioridad}</span>${vencHtml}</div>
            </div>
          </div>`;
        }).join('')}</div>${misTareas.length > 8 ? `<p class="cell-sub" style="padding:10px 16px">y ${misTareas.length - 8} tarea(s) más…</p>` : ''}`
        : `<div class="empty" style="padding:26px 16px">${ICON.tareas}<p>No tiene tareas pendientes asignadas. ¡Buen trabajo!</p></div>`}
      </div>
    </div>`;

  // Panel "Mi agenda": audiencias de mis procesos y plazos de los próximos 7 días.
  const fechaCorta = (iso) => { try { return new Date(iso).toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + fmtHora(iso); } catch (e) { return fmtDateTime(iso); } };
  const miAgendaHtml = miAgenda.length ? `
    <div class="card">
      <div class="card__head"><h3>${ICON.audiencia} Mi agenda · próximos 7 días</h3><button class="btn btn--ghost btn--sm" id="btnVerAgenda" type="button">Ver calendario</button></div>
      <div class="card__body--flush">
        <div class="pend-list">${miAgenda.slice(0, 8).map(a => {
          const dia = (a.fecha || '').slice(0, 10);
          const esHoy = dia === hoyS;
          return `<div class="pend-row pend-row--agenda js-open-proc" data-id="${a.proceso_id}">
            <span class="agenda-tag agenda-tag--${a.tipo === 'Audiencia' ? 'aud' : 'plazo'}">${esc(a.tipo)}</span>
            <div class="pend-row__main">
              <div class="cell-strong">${esc(a.titulo)}</div>
              <div class="pend-row__meta"><span class="pend-venc ${esHoy ? 'pend-venc--amber' : ''}">${esHoy ? 'Hoy · ' + fmtHora(a.fecha) : fechaCorta(a.fecha)}</span></div>
            </div>
          </div>`;
        }).join('')}</div>${miAgenda.length > 8 ? `<p class="cell-sub" style="padding:10px 16px">y ${miAgenda.length - 8} más…</p>` : ''}
      </div>
    </div>` : '';

  content().innerHTML = `
    <div class="stats-grid">
      <div class="metric"><div class="metric__top"><div class="metric__icon">${ICON.procesos}</div></div><div class="metric__num">${list.length}</div><div class="metric__label">Procesos totales</div></div>
      <div class="metric"><div class="metric__top"><div class="metric__icon">${ICON.dashboard}</div></div><div class="metric__num">${activos}</div><div class="metric__label">Procesos activos</div></div>
      <div class="metric"><div class="metric__top"><div class="metric__icon">${ICON.audiencia}</div></div><div class="metric__num">${proximas.length}</div><div class="metric__label">Audiencias próximas</div></div>
      <div class="metric"><div class="metric__top"><div class="metric__icon">${ICON.clientes}</div></div><div class="metric__num">${mios}</div><div class="metric__label">Mis procesos</div></div>
      <div class="metric" id="mConsultas" style="cursor:pointer" ${hint('Mensajes nuevos enviados desde el formulario de contacto de la web. Haga clic para verlos y responder.')}><div class="metric__top"><div class="metric__icon">${ICON.consultas}</div></div><div class="metric__num">${consultasNuevas}</div><div class="metric__label">Consultas nuevas</div></div>
      <div class="metric" id="mTareas" style="cursor:pointer" ${hint('Tareas del equipo que aún no se completan. Haga clic para ver el tablero.')}><div class="metric__top"><div class="metric__icon">${ICON.tareas}</div></div><div class="metric__num">${tareasPend}</div><div class="metric__label">Tareas pendientes</div></div>
      ${porCobrar !== null ? `<div class="metric" id="mPorCobrar" style="cursor:pointer" ${hint('Honorarios facturados menos lo cobrado. Haga clic para ver el detalle.')}><div class="metric__top"><div class="metric__icon">${ICON.dinero}</div></div><div class="metric__num" style="font-size:1.4rem">${fmtMoneda(porCobrar)}</div><div class="metric__label">Por cobrar</div></div>` : ''}
    </div>

    ${misPendientesHtml}

    ${miAgendaHtml}

    ${alertasHtml}

    <div class="charts-grid">
      <div class="card"><div class="card__head"><h3>${ICON.grafico} Procesos por estado</h3></div><div class="card__body">${barChart(porEstado)}</div></div>
      <div class="card"><div class="card__head"><h3>${ICON.grafico} Procesos por materia</h3></div><div class="card__body">${barChart(porMateria)}</div></div>
      <div class="card"><div class="card__head"><h3>${ICON.grafico} Carga de trabajo por abogado (casos activos)</h3></div><div class="card__body">${barChart(porAbogado)}</div></div>
      ${ingresos6.length ? `<div class="card"><div class="card__head"><h3>${ICON.grafico} Ingresos por mes (Bs, últimos 6)</h3></div><div class="card__body">${barChart(ingresos6)}</div></div>` : ''}
    </div>

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
    </div>

    <div class="card">
      <div class="card__head"><h3>${ICON.doc} Manuales y guías</h3></div>
      <div class="card__body">
        <p class="cell-sub" style="margin-bottom:10px">Descargue los manuales en PDF para aprender a usar el sistema o para compartirlos con su equipo y sus clientes.</p>
        <div class="manual-links">
          <a class="btn btn--ghost btn--sm" href="../Manual-Sistema-LexFive.pdf" download>Manual completo del sistema</a>
          <a class="btn btn--ghost btn--sm" href="../Manual-Abogados-LexFive.pdf" download>Manual para abogados</a>
          <a class="btn btn--ghost btn--sm" href="../Manual-Clientes-LexFive.pdf" download>Manual para clientes</a>
        </div>
        <p class="cell-sub" style="margin-top:8px">El «Manual para clientes» es ideal para enviárselo a sus clientes cuando creen su cuenta.</p>
      </div>
    </div>

    ${state.profile.rol !== 'cliente' ? `
    <div class="card">
      <div class="card__head"><h3>${ICON.llave} Seguridad de la cuenta</h3></div>
      <div class="card__body">
        <p class="cell-sub" style="margin-bottom:10px">Active la <strong>verificación en dos pasos (2FA)</strong> para proteger su acceso: además de la contraseña, se le pedirá un código que genera una app en su teléfono (Google Authenticator, Microsoft Authenticator, Authy…).</p>
        <button class="btn btn--ghost btn--sm" id="btn2FA" type="button">Verificación en dos pasos</button>
        <button class="btn btn--ghost btn--sm" id="btnPush" type="button">Notificaciones</button>
      </div>
    </div>` : ''}

    ${state.profile.rol === 'admin' ? `
    <div class="card">
      <div class="card__head"><h3>${ICON.doc} Respaldos y datos</h3></div>
      <div class="card__body">
        <p class="cell-sub" style="margin-bottom:10px">La base de datos se respalda <strong>automáticamente cada día</strong> en GitHub (pestaña «Actions» → «Respaldo de base de datos»). Además, puede descargar cuando quiera una copia manual de los datos principales en formato JSON.</p>
        <button class="btn btn--ghost btn--sm" id="btnExportBackup" type="button">Exportar respaldo (JSON)</button>
        <button class="btn btn--ghost btn--sm" id="btnRevisarBackup" type="button">Revisar un respaldo</button>
        <span class="cell-sub" id="lastBackupInfo" style="margin-left:10px">${lastBackupText()}</span>
      </div>
    </div>` : ''}`;

  content().querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => openProcesoDetail(tr.dataset.id));
  content().querySelectorAll('.js-recordar').forEach(btn => btn.onclick = (e) => {
    e.stopPropagation();
    const p = list.find(x => x.id === btn.dataset.id);
    if (p) recordarPorWhatsApp(p);
  });
  const mc = $('#mConsultas'); if (mc) mc.onclick = () => navigate('consultas');
  const mt = $('#mTareas'); if (mt) mt.onclick = () => navigate('tareas');
  const mpc = $('#mPorCobrar'); if (mpc) mpc.onclick = () => navigate('finanzas');
  const beb = $('#btnExportBackup'); if (beb) beb.onclick = () => exportarRespaldo(beb);
  const brb = $('#btnRevisarBackup'); if (brb) brb.onclick = () => revisarRespaldo();
  const b2fa = $('#btn2FA'); if (b2fa) b2fa.onclick = () => openSeguridad2FA();
  const bpush = $('#btnPush'); if (bpush) bpush.onclick = () => openNotificaciones();

  // Panel "Mis pendientes": completar una tarea con un toque, abrirla para
  // editarla, o ir al tablero completo.
  const bvt = $('#btnVerTareas'); if (bvt) bvt.onclick = () => navigate('tareas');
  content().querySelectorAll('.js-open-tarea').forEach(el => el.onclick = () => {
    const t = misTareas.find(x => x.id === el.dataset.id);
    if (t) tareaForm(t);
  });
  content().querySelectorAll('.js-done-tarea').forEach(b => b.onclick = async (e) => {
    e.stopPropagation();
    b.disabled = true;
    const { error } = await supabase.from('tareas').update({ estado: 'hecha', updated_at: new Date().toISOString() }).eq('id', b.dataset.id);
    if (error) { b.disabled = false; toast('No se pudo actualizar: ' + error.message, 'error'); return; }
    toast('Tarea completada. ¡Bien hecho!', 'success');
    renderDashboard();
  });

  // Panel "Mi agenda": abrir el proceso o ir al calendario.
  const bva = $('#btnVerAgenda'); if (bva) bva.onclick = () => navigate('agenda');
  content().querySelectorAll('.js-open-proc').forEach(el => el.onclick = () => {
    if (el.dataset.id) openProcesoDetail(el.dataset.id);
  });
}

// ============================================================
//  SEGURIDAD: verificación en dos pasos (2FA / TOTP)
// ============================================================
async function openSeguridad2FA() {
  openModal('Verificación en dos pasos', '<div class="loading"><div class="spinner"></div>Cargando...</div>', [], true);
  const factors = await mfaFactors();
  const activos = (factors.totp || []).filter(f => f.status === 'verified');

  // Ya está activado -> ofrecer desactivar.
  if (activos.length) {
    const body = `<p class="cell-sub">La verificación en dos pasos está <strong style="color:var(--green,#1f9d6b)">ACTIVADA</strong> en su cuenta. Cada vez que inicie sesión se le pedirá el código de su app de autenticación.</p>
      <p class="cell-sub" style="margin-top:8px">Si desactiva la 2FA, su cuenta volverá a protegerse solo con la contraseña.</p>`;
    openModal('Verificación en dos pasos', body, [
      { label: 'Desactivar 2FA', class: 'btn--danger', onClick: async () => {
          if (!confirm('¿Seguro que desea desactivar la verificación en dos pasos?')) return;
          for (const f of activos) { try { await mfaUnenroll(f.id); } catch (e) {} }
          toast('Verificación en dos pasos desactivada.', 'success');
          closeModal();
        } },
      { label: 'Cerrar', class: 'btn--primary', onClick: closeModal }
    ], true);
    return;
  }

  // No activado -> iniciar el alta (enroll) y mostrar el QR.
  const { data, error } = await mfaEnroll();
  if (error || !data) {
    openModal('Verificación en dos pasos', `<p class="cell-sub">No se pudo iniciar la activación: ${esc(error ? error.message : 'error desconocido')}</p>`, [{ label: 'Cerrar', class: 'btn--primary', onClick: closeModal }]);
    return;
  }
  const factorId = data.id;
  const qr = data.totp && data.totp.qr_code;
  const secret = data.totp && data.totp.secret;
  const body = `
    <p class="cell-sub" style="margin-bottom:8px"><strong>Paso 1.</strong> Escanee este código QR con una app de autenticación (Google Authenticator, Microsoft Authenticator, Authy…).</p>
    <div style="text-align:center;margin:10px 0">${qr ? `<img src="${qr}" alt="Código QR para 2FA" style="width:200px;height:200px;background:#fff;border-radius:8px;padding:6px">` : ''}</div>
    <p class="cell-sub">¿No puede escanear? Ingrese esta clave manualmente en la app:<br><code style="font-size:.9rem;word-break:break-all">${esc(secret || '')}</code></p>
    <div class="field" style="margin-top:14px"><label><strong>Paso 2.</strong> Escriba el código de 6 dígitos que muestra la app</label><input id="mfa_code" inputmode="numeric" maxlength="6" placeholder="123456" autocomplete="one-time-code"></div>
    <p class="form-msg" id="mfa_msg" role="status" aria-live="polite"></p>`;
  openModal('Activar verificación en dos pasos', body, [
    { label: 'Activar', class: 'btn--primary', onClick: async () => {
        const code = ($('#mfa_code').value || '').trim();
        const msg = $('#mfa_msg');
        if (!/^\d{6}$/.test(code)) { if (msg) { msg.textContent = 'Ingrese el código de 6 dígitos.'; msg.className = 'form-msg error'; } return; }
        const { error: vErr } = await mfaVerify(factorId, code);
        if (vErr) { if (msg) { msg.textContent = 'Código incorrecto o expirado. Intente de nuevo.'; msg.className = 'form-msg error'; } return; }
        toast('¡Verificación en dos pasos activada!', 'success');
        closeModal();
      } },
    { label: 'Cancelar', class: 'btn--ghost', onClick: async () => { try { await mfaUnenroll(factorId); } catch (e) {} closeModal(); } }
  ], true);
}

// ============================================================
//  NOTIFICACIONES PUSH (función #10 — Fase A: activar + prueba local)
// ============================================================
async function openNotificaciones() {
  const soporta = ('serviceWorker' in navigator) && ('PushManager' in window) && ('Notification' in window);
  if (!soporta) {
    openModal('Notificaciones', '<p class="cell-sub">Este navegador no soporta notificaciones push. En iPhone/iPad primero debe <strong>instalar la app</strong> en la pantalla de inicio (iOS 16.4+).</p>', [{ label: 'Cerrar', class: 'btn--primary', onClick: closeModal }]);
    return;
  }
  openModal('Notificaciones', '<div class="loading"><div class="spinner"></div>Cargando...</div>', [], true);
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  const activo = !!sub && Notification.permission === 'granted';
  const estado = Notification.permission === 'denied'
    ? 'El permiso está <strong>bloqueado</strong> en este navegador. Actívelo desde la configuración del sitio (el candado junto a la dirección).'
    : (activo ? 'Las notificaciones están <strong style="color:var(--green,#1f9d6b)">ACTIVADAS</strong> en este dispositivo.' : 'Las notificaciones están <strong>desactivadas</strong> en este dispositivo.');
  const body = `
    <p class="cell-sub" style="margin-bottom:10px">${estado}</p>
    <p class="cell-sub">Cuando estén activas, recibirá avisos de audiencias y plazos próximos aunque el sistema esté cerrado. <em>(El envío automático se completa en una fase posterior; por ahora puede probar una notificación local.)</em></p>`;
  const botones = [];
  if (activo) {
    botones.push({ label: 'Enviar prueba', class: 'btn--ghost', onClick: async () => {
      try {
        const r = await navigator.serviceWorker.ready;
        await r.showNotification('LexFive — prueba ✅', {
          body: 'Si ve esto, las notificaciones funcionan en este dispositivo.',
          icon: '../assets/pwa/icon-192.png',
          badge: '../assets/pwa/icon-192.png',
          requireInteraction: true,
          tag: 'lexfive-prueba'
        });
        toast('Notificación enviada. Si no aparece, revise en Windows: «No molestar» desactivado y notificaciones permitidas para Chrome.', 'success');
      } catch (e) {
        console.error('showNotification:', e);
        toast('No se pudo mostrar la notificación: ' + (e && e.message ? e.message : e), 'error');
      }
    } });
    botones.push({ label: 'Desactivar', class: 'btn--danger', onClick: async () => {
      try {
        const s = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
        if (s) { await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint); await s.unsubscribe(); }
        toast('Notificaciones desactivadas en este dispositivo.', 'success');
      } catch (e) { toast('No se pudo desactivar.', 'error'); }
      closeModal();
    } });
  } else if (Notification.permission !== 'denied') {
    botones.push({ label: 'Activar', class: 'btn--primary', onClick: async () => { await activarPush(); closeModal(); } });
  }
  botones.push({ label: 'Cerrar', class: 'btn--ghost', onClick: closeModal });
  openModal('Notificaciones', body, botones, true);
}

async function activarPush() {
  try {
    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') { toast('No se concedió el permiso de notificaciones.', 'error'); return; }
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      try {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
      } catch (subErr) {
        console.error('push subscribe:', subErr);
        openModal('No se pudo activar', `
          <p class="cell-sub">El navegador no permitió crear la suscripción de notificaciones.</p>
          <p class="cell-sub" style="margin-top:10px"><strong>Si usa Brave</strong> (es lo más común): las push vienen desactivadas. Actívelas así:</p>
          <ol class="cell-sub" style="margin:6px 0 0 18px">
            <li>Abra una pestaña nueva y vaya a <code>brave://settings/privacy</code></li>
            <li>Active <strong>«Usar los servicios de Google para la mensajería push»</strong></li>
            <li><strong>Cierre y vuelva a abrir Brave</strong> y reintente aquí.</li>
          </ol>
          <p class="cell-sub" style="margin-top:10px">También funciona en <strong>Chrome</strong> o <strong>Edge</strong> sin configurar nada. En iPhone/iPad, primero instale la app en la pantalla de inicio (iOS 16.4+).</p>
          <p class="cell-sub" style="margin-top:10px;opacity:.65">Detalle técnico: ${esc(subErr && subErr.message ? subErr.message : String(subErr))}</p>`,
          [{ label: 'Cerrar', class: 'btn--primary', onClick: closeModal }], true);
        return;
      }
    }
    const json = sub.toJSON();
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: state.profile.id,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth
    }, { onConflict: 'endpoint' });
    if (error) {
      if (/push_subscriptions/.test(error.message) && /exist|relation/i.test(error.message)) {
        toast('Falta crear la tabla. Ejecute db/22_push_subscriptions.sql en Supabase.', 'error');
      } else {
        toast('Activado en el navegador, pero no se pudo guardar: ' + error.message, 'error');
      }
      return;
    }
    toast('Notificaciones activadas en este dispositivo.', 'success');
  } catch (e) {
    console.error('push:', e);
    toast('No se pudieron activar: ' + (e && e.message ? e.message : e), 'error');
  }
}

// Convierte la clave VAPID (base64url) al formato que exige pushManager.subscribe.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

// ============================================================
//  VISTA: AGENDA / CALENDARIO  (audiencias y plazos del bufete)
// ============================================================
async function renderAgenda() {
  loading();
  const [{ data: procs }, { data: evs }] = await Promise.all([
    supabase.from('procesos').select('*').eq('eliminado', false),
    supabase.from('eventos').select('*')
  ]);
  const procMap = {};
  (procs || []).forEach(p => { procMap[p.id] = p; });

  const hoy = new Date();
  const ahora = new Date();
  const en7 = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Unificar: "próxima audiencia" del proceso (heredado) + eventos/plazos múltiples.
  const items = [];
  (procs || []).forEach(p => {
    if (p.proxima_audiencia) items.push({ procId: p.id, fecha: p.proxima_audiencia, titulo: p.caratula, kind: 'proc', proc: p });
  });
  (evs || []).forEach(e => {
    const p = procMap[e.proceso_id];
    items.push({ procId: e.proceso_id, fecha: e.fecha, titulo: e.titulo + (p ? ' · ' + p.caratula : ''), kind: 'ev', ev: e, proc: p });
  });
  items.forEach((it, i) => { it.i = i; });

  const claseItem = it => {
    if (it.kind === 'ev' && it.ev.estado === 'cumplido') return 'cal-ev--done';
    const d = new Date(it.fecha);
    if (d < ahora && !(it.proc && ['archivado', 'concluido'].includes(it.proc.estado))) return 'cal-ev--red';
    if (d <= en7) return 'cal-ev--amber';
    return '';
  };

  if (!state.agenda) state.agenda = { y: hoy.getFullYear(), m: hoy.getMonth() };
  const { y, m } = state.agenda;
  const primero = new Date(y, m, 1);
  const diasMes = new Date(y, m + 1, 0).getDate();
  const inicioSemana = primero.getDay(); // 0=Dom
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Agrupar por día (solo del mes mostrado)
  const porDia = {};
  items.forEach(it => {
    const d = new Date(it.fecha);
    if (d.getFullYear() === y && d.getMonth() === m) {
      const k = d.getDate();
      (porDia[k] = porDia[k] || []).push(it);
    }
  });

  // Construir celdas (incluye huecos del inicio de semana)
  let celdas = '';
  for (let i = 0; i < inicioSemana; i++) celdas += '<div class="cal-cell cal-cell--empty"></div>';
  for (let dia = 1; dia <= diasMes; dia++) {
    const evsDia = (porDia[dia] || []).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    const esHoy = (y === hoy.getFullYear() && m === hoy.getMonth() && dia === hoy.getDate());
    const evHtml = evsDia.slice(0, 3).map(it => {
      const hora = new Date(it.fecha).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
      return `<button class="cal-ev ${claseItem(it)}" data-pid="${it.procId}" title="${esc(it.titulo)}">${hora} ${esc(it.titulo)}</button>`;
    }).join('');
    const mas = evsDia.length > 3 ? `<span class="cal-mas">+${evsDia.length - 3} más</span>` : '';
    celdas += `<div class="cal-cell ${esHoy ? 'cal-cell--hoy' : ''}"><span class="cal-daynum">${dia}</span>${evHtml}${mas}</div>`;
  }

  // Lista de eventos del mes (con botón para exportar a calendario personal)
  const delMes = items.filter(it => {
    const d = new Date(it.fecha);
    return d.getFullYear() === y && d.getMonth() === m;
  }).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  content().innerHTML = `
    <div class="card">
      <div class="cal-nav">
        <button class="btn btn--ghost btn--sm" id="calPrev">&larr;</button>
        <h3 class="cal-title">${meses[m]} ${y}</h3>
        <button class="btn btn--ghost btn--sm" id="calNext">&rarr;</button>
        <div class="spacer"></div>
        <button class="btn btn--ghost btn--sm" id="calHoy">Hoy</button>
      </div>
      <div class="card__body--flush">
        <div class="cal-weekdays">${dias.map(d => `<div>${d}</div>`).join('')}</div>
        <div class="cal-grid">${celdas}</div>
      </div>
    </div>

    <div class="card">
      <div class="card__head"><h3>${ICON.audiencia} Audiencias y plazos de ${meses[m]}</h3>${delMes.length ? `<button class="btn btn--ghost btn--sm" id="calExport" type="button">${ICON.descargar} Exportar mes (.ics)</button>` : ''}</div>
      <div class="card__body--flush">
        ${delMes.length ? `<div class="table-wrap"><table class="data">
          <thead><tr><th>Fecha / hora</th><th>Evento / proceso</th><th>Tipo</th><th>Responsable</th><th></th></tr></thead>
          <tbody>${delMes.map(it => {
            const detalleGcal = it.kind === 'ev'
              ? (it.ev.nota || '')
              : [it.proc && it.proc.numero ? ('Nº ' + it.proc.numero) : '', it.proc && it.proc.materia ? it.proc.materia : ''].filter(Boolean).join(' · ');
            const gcal = googleCalURL(new Date(it.fecha), it.titulo, detalleGcal, it.proc ? it.proc.juzgado : '');
            return `
            <tr>
              <td>${fmtDateTime(it.fecha)}</td>
              <td class="cell-strong js-open" data-pid="${it.procId}" style="cursor:pointer">${esc(it.titulo)}</td>
              <td>${it.kind === 'ev' ? esc(it.ev.tipo) : 'audiencia'}${it.kind === 'ev' && it.ev.estado === 'cumplido' ? ' ✓' : ''}</td>
              <td>${esc(it.proc ? (namesFromIds(it.proc.abogados_ids) || profName(it.proc.abogado_id)) : '—')}</td>
              <td style="white-space:nowrap">
                <button class="btn btn--ghost btn--sm js-ics" data-i="${it.i}">${ICON.descargar} .ics</button>
                ${gcal ? `<a class="btn btn--ghost btn--sm" target="_blank" rel="noopener" href="${gcal}" title="Agregar a Google Calendar">📅 Google</a>` : ''}
              </td>
            </tr>`; }).join('')}</tbody></table></div>`
        : `<div class="empty">${ICON.audiencia}<p>No hay audiencias ni plazos registrados en este mes.</p></div>`}
      </div>
    </div>`;

  const irMes = (delta) => {
    let nm = m + delta, ny = y;
    if (nm < 0) { nm = 11; ny--; } else if (nm > 11) { nm = 0; ny++; }
    state.agenda = { y: ny, m: nm };
    renderAgenda();
  };
  $('#calPrev').onclick = () => irMes(-1);
  $('#calNext').onclick = () => irMes(1);
  $('#calHoy').onclick = () => { state.agenda = { y: hoy.getFullYear(), m: hoy.getMonth() }; renderAgenda(); };
  content().querySelectorAll('.cal-ev, .js-open').forEach(el => el.onclick = () => openProcesoDetail(el.dataset.pid));
  content().querySelectorAll('.js-ics').forEach(b => b.onclick = (e) => {
    e.stopPropagation();
    const it = items[b.dataset.i];
    if (!it) return;
    if (it.kind === 'ev') descargarICSEvento(it.ev, it.proc ? it.proc.caratula : '');
    else descargarICS(it.proc);
  });
  const bexp = $('#calExport');
  if (bexp) bexp.onclick = () => {
    if (!delMes.length) { toast('No hay eventos este mes para exportar.', 'error'); return; }
    const vevents = delMes.map(it => {
      const inicio = new Date(it.fecha);
      const fin = new Date(inicio.getTime() + 60 * 60 * 1000);
      const uid = (it.kind === 'ev' ? 'ev-' + it.ev.id : 'proc-' + it.procId) + '@lexfive';
      const desc = it.kind === 'ev' ? (it.ev.nota || it.ev.tipo || '') : (it.proc && it.proc.numero ? 'Nº ' + it.proc.numero : '');
      return [
        'BEGIN:VEVENT', 'UID:lexfive-' + uid, 'DTSTAMP:' + icsFecha(new Date()),
        'DTSTART:' + icsFecha(inicio), 'DTEND:' + icsFecha(fin), 'SUMMARY:' + icsEscape(it.titulo),
        desc ? 'DESCRIPTION:' + icsEscape(desc) : '',
        'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEscape(it.titulo), 'END:VALARM',
        'END:VEVENT'
      ].filter(Boolean).join('\r\n');
    });
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LexFive//Sistema//ES', 'CALSCALE:GREGORIAN', ...vevents, 'END:VCALENDAR'].join('\r\n');
    descargarArchivo('agenda-' + y + '-' + String(m + 1).padStart(2, '0') + '.ics', ics, 'text/calendar;charset=utf-8');
    toast('Agenda de ' + meses[m] + ' descargada (' + delMes.length + ' eventos). Ábrala para agregarla a su calendario.', 'success');
  };
}

// Descarga un evento/plazo como archivo de calendario (.ics).
function descargarICSEvento(ev, caratula) {
  const inicio = new Date(ev.fecha);
  const fin = new Date(inicio.getTime() + 60 * 60 * 1000);
  const resumen = (ev.titulo || 'Evento') + (caratula ? ' — ' + caratula : '');
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LexFive//Sistema//ES', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', 'UID:lexfive-ev-' + ev.id + '@lexfive', 'DTSTAMP:' + icsFecha(new Date()),
    'DTSTART:' + icsFecha(inicio), 'DTEND:' + icsFecha(fin), 'SUMMARY:' + icsEscape(resumen),
    ev.nota ? 'DESCRIPTION:' + icsEscape(ev.nota) : '',
    'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEscape(resumen), 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'
  ].filter(Boolean).join('\r\n');
  descargarArchivo('evento-' + (ev.titulo || 'evento').toLowerCase().replace(/[^\w]+/g, '-').slice(0, 30) + '.ics', ics, 'text/calendar;charset=utf-8');
  toast('Evento descargado. Ábralo para agregarlo a su calendario.', 'success');
}

// ============================================================
//  VISTA: TAREAS / PENDIENTES  (tablero del equipo)
// ============================================================
// La vista de Tareas (TAREA_ESTADOS, renderTareas, tareaForm, saveTarea,
// toggleTareaEstado, deleteTarea) se movió a ./tareas.js. Se importan arriba
// renderTareas y TAREA_PRIOR (este último lo usa el Dashboard).

// ============================================================
//  PLAZOS / AUDIENCIAS de un proceso (varios eventos)
// ============================================================
async function openPlazos(proc) {
  const pintar = async () => {
    const { data } = await supabase.from('eventos').select('*').eq('proceso_id', proc.id).order('fecha', { ascending: true });
    const evs = data || [];
    const lista = evs.length ? evs.map(e => {
      const cumplido = e.estado === 'cumplido';
      const gcalEv = googleCalURL(new Date(e.fecha), (e.titulo || 'Evento') + (proc.caratula ? ' — ' + proc.caratula : ''), e.nota || '', proc.juzgado || '');
      return `<div class="plazo-row ${cumplido ? 'is-done' : ''}" data-id="${e.id}">
        <div>
          <div class="cell-strong">${esc(e.titulo)} <span class="badge badge-mat">${esc(e.tipo)}</span></div>
          <div class="cell-sub">${fmtDateTime(e.fecha)}${e.nota ? ' · ' + esc(e.nota) : ''}</div>
        </div>
        <div class="plazo-row__actions">
          <button class="btn btn--ghost btn--sm js-ics" data-id="${e.id}" title="Descargar .ics">${ICON.descargar}</button>
          ${gcalEv ? `<a class="btn btn--ghost btn--sm" target="_blank" rel="noopener" href="${gcalEv}" title="Agregar a Google Calendar">📅</a>` : ''}
          <button class="btn btn--ghost btn--sm js-done" data-id="${e.id}">${cumplido ? 'Reabrir' : 'Cumplido'}</button>
          <button class="btn btn--danger btn--sm js-del" data-id="${e.id}">Eliminar</button>
        </div>
      </div>`;
    }).join('') : '<p class="cell-sub" style="padding:8px 0">Aún no hay plazos ni audiencias registrados.</p>';

    const body = `
      <p class="cell-sub" style="margin-bottom:10px">Registre todas las audiencias y plazos de este proceso. Aparecerán en la <strong>Agenda</strong> y podrá exportarlos a su calendario.</p>
      <div class="plazo-list">${lista}</div>
      <div class="card" style="margin-top:14px"><div class="card__body">
        <div class="field-row">
          <div class="field"><label>Título *</label><input id="ev_titulo" placeholder="Ej: Audiencia preliminar"></div>
          <div class="field"><label>Tipo</label><select id="ev_tipo"><option value="audiencia">Audiencia</option><option value="plazo">Plazo / vencimiento</option><option value="reunion">Reunión</option><option value="otro">Otro</option></select></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Fecha y hora *</label><input type="datetime-local" id="ev_fecha"></div>
          <div class="field"><label>Nota (opcional)</label><input id="ev_nota" placeholder="Sala, detalle..."></div>
        </div>
        <button class="btn btn--navy" id="ev_add">${ICON.plus} Agregar plazo</button>
      </div></div>
      <div class="card" style="margin-top:14px"><div class="card__body">
        <h4 class="section-title" style="margin-top:0">Calculadora de plazo (días hábiles)</h4>
        <p class="cell-sub" style="margin-bottom:10px">Calcule la fecha de vencimiento contando días hábiles (omite sábados y domingos). No incluye feriados.</p>
        <div class="field-row">
          <div class="field"><label>Fecha base</label><input type="date" id="pl_base" value="${new Date().toISOString().slice(0, 10)}"></div>
          <div class="field"><label>Días hábiles</label><input type="number" id="pl_dias" min="1" value="5"></div>
        </div>
        <button class="btn btn--ghost btn--sm" id="pl_calc">Calcular vencimiento</button>
        <span class="cell-sub" id="pl_result" style="margin-left:10px"></span>
      </div></div>`;
    openModal('Plazos y audiencias · ' + proc.caratula, body, [{ label: 'Cerrar', class: 'btn--primary', onClick: closeModal }], true);

    $('#ev_add').onclick = async () => {
      const titulo = $('#ev_titulo').value.trim();
      const fecha = $('#ev_fecha').value;
      if (!titulo || !fecha) { toast('Indique título y fecha.', 'error'); return; }
      $('#ev_add').disabled = true;
      const { error } = await supabase.from('eventos').insert({
        proceso_id: proc.id, titulo, tipo: $('#ev_tipo').value,
        fecha: new Date(fecha).toISOString(), nota: $('#ev_nota').value.trim() || null,
        created_by: state.profile.id
      });
      if (error) { toast('Error: ' + error.message, 'error'); $('#ev_add').disabled = false; return; }
      await logAccion('crear', 'evento', proc.id, titulo);
      toast('Plazo agregado.', 'success');
      pintar();
    };
    document.querySelectorAll('.plazo-row .js-done').forEach(b => b.onclick = async () => {
      const e = evs.find(x => x.id === b.dataset.id);
      await supabase.from('eventos').update({ estado: e.estado === 'cumplido' ? 'pendiente' : 'cumplido' }).eq('id', e.id);
      pintar();
    });
    document.querySelectorAll('.plazo-row .js-del').forEach(b => b.onclick = async () => {
      if (!confirm('¿Eliminar este plazo?')) return;
      await supabase.from('eventos').delete().eq('id', b.dataset.id);
      toast('Plazo eliminado.', 'success');
      pintar();
    });
    document.querySelectorAll('.plazo-row .js-ics').forEach(b => b.onclick = () => {
      const e = evs.find(x => x.id === b.dataset.id);
      if (e) descargarICSEvento(e, proc.caratula);
    });

    // Calculadora de plazo en días hábiles.
    const plCalc = $('#pl_calc');
    if (plCalc) plCalc.onclick = () => {
      const base = $('#pl_base').value;
      const dias = $('#pl_dias').value;
      if (!base || !dias) { toast('Indique la fecha base y los días hábiles.', 'error'); return; }
      const venc = sumarDiasHabiles(base + 'T00:00:00', dias);
      if (!venc) { toast('Fecha base no válida.', 'error'); return; }
      const iso = venc.getFullYear() + '-' + pad2(venc.getMonth() + 1) + '-' + pad2(venc.getDate());
      $('#pl_result').innerHTML = `Vence el <strong>${fmtDate(iso)}</strong> &nbsp;<button class="btn btn--ghost btn--sm" id="pl_usar" type="button">Usar en el plazo</button>`;
      const usar = $('#pl_usar');
      if (usar) usar.onclick = () => {
        const f = $('#ev_fecha'); if (f) f.value = iso + 'T09:00';
        toast('Fecha colocada en el formulario de plazo (9:00). Ajústela si hace falta.', 'success');
      };
    };
  };
  await pintar();
}

// ============================================================
//  HONORARIOS y PAGOS de un proceso  (solo admin y abogado)
// ============================================================
// openHonorarios (gestión de honorarios y pagos de un proceso) se movió a
// ./finanzas.js (se importa arriba; lo usan Finanzas y Procesos).

// ============================================================
//  REGISTRO DE HORAS de un proceso  (time tracking · admin/abogado)
// ============================================================
function fmtDuracion(min) {
  const m = Math.max(0, Number(min || 0));
  const h = Math.floor(m / 60), r = m % 60;
  if (!m) return '0 min';
  return (h ? h + ' h ' : '') + (r ? r + ' min' : '').trim();
}

async function openHoras(proc) {
  const pintar = async () => {
    const { data, error } = await supabase.from('registro_horas').select('*').eq('proceso_id', proc.id).order('fecha', { ascending: false });
    // Si la tabla aún no existe (no se ejecutó db/21_registro_horas.sql), avisar con claridad.
    if (error && /registro_horas/.test(error.message) && /exist|relation/i.test(error.message)) {
      openModal('Registro de horas', `<p class="cell-sub">Esta función necesita una tabla que aún no está creada en la base de datos.</p><p class="cell-sub" style="margin-top:8px">Ejecute el script <strong>db/21_registro_horas.sql</strong> en el SQL Editor de Supabase y vuelva a intentarlo.</p>`, [{ label: 'Cerrar', class: 'btn--primary', onClick: closeModal }]);
      return;
    }
    const regs = data || [];
    const totalMin = regs.reduce((a, b) => a + Number(b.minutos || 0), 0);
    const fila = r => `<div class="fin-row" data-id="${r.id}"><div><div class="cell-strong">${fmtDuracion(r.minutos)}${r.descripcion ? ' · ' + esc(r.descripcion) : ''}</div><div class="cell-sub">${fmtDate(r.fecha)} · ${esc(profName(r.created_by))}</div></div><div class="fin-row__right"><button class="btn btn--danger btn--sm js-delhora" data-id="${r.id}">✕</button></div></div>`;
    const body = `
      <div class="fin-summary">
        <div><span>Total de horas</span><strong>${fmtDuracion(totalMin)}</strong></div>
        <div><span>Registros</span><strong>${regs.length}</strong></div>
      </div>
      <h4 class="section-title">Horas registradas</h4>
      <div class="fin-list">${regs.length ? regs.map(fila).join('') : '<p class="cell-sub">Aún no hay horas registradas en este proceso.</p>'}</div>
      <div class="card" style="margin-top:10px"><div class="card__body"><div class="field-row">
        <div class="field"><label>Horas *</label><input id="hr_horas" type="number" min="0" step="0.25" placeholder="Ej: 1.5"></div>
        <div class="field"><label>Fecha</label><input id="hr_fecha" type="date" value="${hoyISO()}"></div>
      </div>
      <div class="field"><label>Descripción (opcional)</label><input id="hr_desc" placeholder="Ej: Redacción de memorial, audiencia, reunión..."></div>
      <button class="btn btn--navy" id="hr_add">${ICON.plus} Registrar horas</button></div></div>`;
    openModal('Registro de horas · ' + proc.caratula, body, [{ label: 'Cerrar', class: 'btn--primary', onClick: closeModal }], true);

    $('#hr_add').onclick = async () => {
      const horas = parseFloat($('#hr_horas').value);
      if (isNaN(horas) || horas <= 0) { toast('Indique las horas trabajadas (ej: 1.5).', 'error'); return; }
      const minutos = Math.round(horas * 60);
      $('#hr_add').disabled = true;
      const { error: insErr } = await supabase.from('registro_horas').insert({ proceso_id: proc.id, minutos, descripcion: $('#hr_desc').value.trim() || null, fecha: $('#hr_fecha').value || hoyISO(), created_by: state.profile.id });
      if (insErr) { toast('Error: ' + insErr.message, 'error'); $('#hr_add').disabled = false; return; }
      await logAccion('crear', 'registro_horas', proc.id, minutos + ' min');
      toast('Horas registradas.', 'success'); pintar();
    };
    document.querySelectorAll('.js-delhora').forEach(b => b.onclick = async () => {
      if (!confirm('¿Eliminar este registro de horas?')) return;
      await supabase.from('registro_horas').delete().eq('id', b.dataset.id); toast('Eliminado.', 'success'); pintar();
    });
  };
  await pintar();
}

// ============================================================
//  VISTA: FINANZAS  (resumen de honorarios por proceso · admin/abogado)
// ============================================================
// renderFinanzas (cartera de honorarios/pagos) se movió a ./finanzas.js
// (se importa arriba).

// ============================================================
//  VISTA: REPORTES  (procesos por estado, materia y abogado, por período)
// ============================================================
// renderReportes (estadísticas de procesos y cobranza) se movió a ./reportes.js
// (se importa arriba).

// ============================================================
//  VISTA: PLANTILLAS DE MEMORIALES  (texto con campos que se rellenan)
// ============================================================
// Toda la vista de Plantillas (motor de campos {{...}}, generación e impresión
// y la vista en sí) se movió a ./plantillas.js (se importa renderPlantillas).

// HTML imprimible / Word del memorial generado.
// Abre una ventana con cabecera de LexFive lista para imprimir o guardar como PDF.
// abrirImpresion (impresión con membrete del bufete) se movió a ./print.js
// (se importa arriba).

// Genera e imprime un recibo de un pago concreto (imprimirReciboPago) se movió
// a ./finanzas.js.

// ============================================================
//  Certificados y constancias con hoja membretada del bufete.
//  Genera, en hoja membretada de LexFive, certificados de trabajo,
//  pasantías, horas de práctica, recomendaciones, etc.
// ============================================================
function urlAbs(src) {
  if (!src) return '';
  return src.indexOf('data:') === 0 ? src : new URL(src, location.href).href;
}
function fechaLarga(d) {
  let x;
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) {
    const p = d.slice(0, 10).split('-'); x = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  } else { x = d ? new Date(d) : new Date(); }
  if (isNaN(x)) return fmtDate(d);
  const m = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return x.getDate() + ' de ' + m[x.getMonth()] + ' de ' + x.getFullYear();
}

// Enlace que codifica el QR del certificado: abre la página de verificación de
// CERTIFICADOS del bufete con los datos del documento emitido.
function qrCertificado(d) {
  return SITIO_URL + 'verificar-certificado.html?n=' + encodeURIComponent(d.nombre || '') +
    '&ci=' + encodeURIComponent(d.ci || '') +
    '&cargo=' + encodeURIComponent(d.cargo || '') +
    '&tipo=' + encodeURIComponent(d.tipo || '') +
    '&ref=' + encodeURIComponent(d.ref || '') +
    '&fecha=' + encodeURIComponent(d.fecha || '');
}

const CERT_PLANTILLAS = [
  { id: 'trabajo_proc', nombre: 'Certificado de trabajo (Procurador)', titulo: 'CERTIFICADO DE TRABAJO',
    cuerpo: d => `Se CERTIFICA que el(la) Sr(a). ${d.nombre}${d.ci ? `, con Cédula de Identidad N.º ${d.ci}` : ''}, prestó sus servicios en el Bufete de Abogados LexFive en calidad de PROCURADOR(A), durante el período ${d.periodo}, desempeñando con responsabilidad funciones de gestión, seguimiento y diligenciamiento de procesos judiciales y trámites administrativos ante estrados judiciales, oficinas públicas y privadas.\n\nDurante su permanencia demostró ética profesional, puntualidad, compromiso y un adecuado desempeño en las tareas encomendadas.\n\nSe extiende el presente certificado a solicitud del(la) interesado(a), para los fines que estime convenientes.` },
  { id: 'trabajo_gen', nombre: 'Certificado de trabajo (general)', titulo: 'CERTIFICADO DE TRABAJO',
    cuerpo: d => `Se CERTIFICA que el(la) Sr(a). ${d.nombre}${d.ci ? `, con C.I. N.º ${d.ci}` : ''}, trabajó en el Bufete de Abogados LexFive en el cargo de ${d.calidad || '—'}, durante el período ${d.periodo}, cumpliendo satisfactoriamente las funciones propias de su cargo.\n\nSe extiende el presente a solicitud del(la) interesado(a), para los fines que vea por conveniente.` },
  { id: 'pasantia', nombre: 'Constancia de pasantía universitaria', titulo: 'CONSTANCIA DE PASANTÍA',
    cuerpo: d => `Se hace constar que el(la) universitario(a) ${d.nombre}${d.ci ? `, con C.I. N.º ${d.ci}` : ''}, estudiante de la carrera de ${d.carrera || '—'} de la ${d.universidad || '—'}, realizó su PASANTÍA / PRÁCTICA PRE-PROFESIONAL en el Bufete de Abogados LexFive durante el período ${d.periodo}${d.horas ? `, completando un total de ${d.horas} horas` : ''}.\n\nDurante la pasantía participó en labores de apoyo jurídico, revisión de expedientes, elaboración de memoriales y acompañamiento en diligencias, demostrando dedicación y responsabilidad.\n\nSe extiende la presente constancia a solicitud del(la) interesado(a), para fines académicos y los que estime convenientes.` },
  { id: 'horas', nombre: 'Certificado de horas de práctica', titulo: 'CERTIFICADO DE HORAS DE PRÁCTICA',
    cuerpo: d => `Se CERTIFICA que el(la) Sr(a). ${d.nombre}${d.ci ? `, con C.I. N.º ${d.ci}` : ''}${d.universidad ? `, de la ${d.universidad}` : ''}, cumplió un total de ${d.horas || '___'} horas de práctica en el Bufete de Abogados LexFive, durante el período ${d.periodo}, en tareas de apoyo legal y administrativo.\n\nSe extiende el presente para los fines académicos correspondientes.` },
  { id: 'recomendacion', nombre: 'Carta de recomendación', titulo: 'CARTA DE RECOMENDACIÓN',
    cuerpo: d => `Por medio de la presente, el Bufete de Abogados LexFive tiene a bien RECOMENDAR al(la) Sr(a). ${d.nombre}${d.ci ? `, con C.I. N.º ${d.ci}` : ''}, quien se desempeñó como ${d.calidad || 'colaborador(a)'} en nuestra institución durante el período ${d.periodo}.\n\nDurante este tiempo demostró ser una persona responsable, proactiva, honesta y con sólidos conocimientos en el área legal, cualidades que la hacen idónea para las funciones que requiera desempeñar.\n\nSe extiende la presente a solicitud del(la) interesado(a)${d.destinatario ? `, dirigida a ${d.destinatario}` : ''}.` },
  { id: 'desempeno', nombre: 'Constancia de desempeño / conducta', titulo: 'CONSTANCIA DE DESEMPEÑO',
    cuerpo: d => `Se hace constar que el(la) Sr(a). ${d.nombre}${d.ci ? `, con C.I. N.º ${d.ci}` : ''}, durante su permanencia en el Bufete de Abogados LexFive como ${d.calidad || '—'} (período ${d.periodo}), observó una conducta intachable y un desempeño sobresaliente, demostrando ética, disciplina y compromiso con la institución.\n\nSe extiende la presente a solicitud del(la) interesado(a).` },
  { id: 'servicios', nombre: 'Constancia de servicios prestados', titulo: 'CONSTANCIA DE SERVICIOS PRESTADOS',
    cuerpo: d => `Se hace constar que el(la) Sr(a). ${d.nombre}${d.ci ? `, con C.I. N.º ${d.ci}` : ''}, prestó servicios profesionales en el Bufete de Abogados LexFive en calidad de ${d.calidad || '—'}, durante el período ${d.periodo}.\n\nSe extiende la presente a solicitud del(la) interesado(a), para los fines que estime convenientes.` }
];

// Documento del certificado con estilos EN LÍNEA (autocontenido): sirve para la
// vista previa, la impresión/PDF (tamaño carta) y la descarga en Word.
function buildCertDoc(d) {
  const nombreEsc = (d.nombre && d.nombre.length >= 3 && d.nombre.indexOf('___') === -1) ? esc(d.nombre) : '';
  const ciEsc = (d.ci && d.ci.length >= 2) ? esc(d.ci) : '';
  const resaltar = (h) => {
    if (nombreEsc) h = h.split(nombreEsc).join('<strong>' + nombreEsc + '</strong>');
    if (ciEsc) h = h.split(ciEsc).join('<strong>' + ciEsc + '</strong>');
    return h;
  };
  const parrafos = (d.cuerpoTexto || '').split(/\n\s*\n/).map(p =>
    `<p style="margin:0 0 13px;text-align:justify;">${resaltar(esc(p).replace(/\n/g, '<br>'))}</p>`).join('');
  const wm = d.logoSrc ? `<img src="${d.logoSrc}" alt="" style="position:absolute;top:52%;left:50%;width:12cm;height:12cm;object-fit:contain;transform:translate(-50%,-50%);opacity:.05;pointer-events:none;">` : '';
  return `
  <div style="position:relative;font-family:Georgia,'Times New Roman',serif;color:#1a2330;background:#fff;width:21.6cm;min-height:27.9cm;margin:0 auto;padding:1.6cm 2cm 1.3cm;box-sizing:border-box;overflow:hidden;">
    <div style="position:absolute;top:0;left:0;bottom:0;width:0.5cm;background:linear-gradient(#0e1b2c,#16273d);"></div>
    ${wm}
    <div style="position:relative;text-align:center;border-bottom:2px solid #c2a25a;padding-bottom:14px;">
      ${d.logoSrc ? `<img src="${d.logoSrc}" alt="" style="width:92px;height:92px;object-fit:contain;display:block;margin:0 auto 6px;">` : ''}
      <div style="font-size:30px;font-weight:700;color:#0e1b2c;letter-spacing:1px;">Lex<span style="color:#c2a25a;">Five</span></div>
      <div style="font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#a8853c;font-family:Arial,sans-serif;">Bufete de Abogados</div>
      <div style="font-size:10px;color:#5c6675;font-family:Arial,sans-serif;margin-top:5px;line-height:1.55;">Calle Uruguay esq. Raúl Salmón, zona 12 de Octubre, Ed. Señor de Mayo N.&deg; 85, P.B., of. 1-A &mdash; El Alto, Bolivia<br>Tel/WhatsApp: +591 78360469 &nbsp;&middot;&nbsp; lexfive.netlify.app</div>
    </div>
    <div style="position:relative;text-align:right;font-size:10px;color:#5c6675;font-family:Arial,sans-serif;margin-top:6px;">Ref. N.º ${esc(d.ref || '')}</div>
    <h1 style="position:relative;text-align:center;font-size:20px;letter-spacing:1.5px;color:#0e1b2c;margin:18px 0 4px;text-transform:uppercase;">${esc(d.titulo)}</h1>
    <div style="position:relative;text-align:center;font-size:11px;color:#a8853c;font-family:Arial,sans-serif;letter-spacing:2px;margin-bottom:24px;">A QUIEN CORRESPONDA</div>
    <div style="position:relative;font-size:14px;line-height:1.95;">${parrafos}</div>
    <p style="position:relative;margin:24px 0 0;font-size:13px;">El Alto - Bolivia, ${esc(d.fechaTxt)}.</p>
    <div style="position:relative;display:flex;justify-content:space-between;align-items:flex-end;margin-top:58px;gap:20px;">
      <div style="text-align:center;flex:1;max-width:58%;">
        <div style="border-top:1.5px solid #0e1b2c;padding-top:6px;font-size:12px;font-weight:700;color:#0e1b2c;">Firma y Sello</div>
        <div style="font-size:10.5px;color:#5c6675;font-family:Arial,sans-serif;">LexFive &middot; Bufete de Abogados</div>
      </div>
      ${d.selloSrc ? `<img src="${d.selloSrc}" alt="" style="width:3.3cm;height:3.3cm;object-fit:contain;mix-blend-mode:multiply;filter:contrast(1.3) brightness(1.1);opacity:.95;transform:rotate(-6deg);margin-right:.4cm;">` : ''}
    </div>
    <div style="position:relative;display:flex;align-items:center;gap:12px;margin-top:30px;border-top:1px solid #d9dce1;padding-top:10px;">
      ${d.qrSrc ? `<img src="${d.qrSrc}" alt="QR de verificación" style="width:2.1cm;height:2.1cm;flex-shrink:0;">` : ''}
      <div style="font-size:9.5px;color:#5c6675;font-family:Arial,sans-serif;line-height:1.55;">
        <strong style="color:#0e1b2c;">Verificación:</strong> escanee el código QR para confirmar la autenticidad de este documento y la vinculación de la persona con el Bufete LexFive.<br>
        LexFive &middot; Bufete de Abogados &middot; Calle Uruguay esq. Raúl Salmón, Ed. Señor de Mayo N.&deg; 85, of. 1-A, El Alto - Bolivia &middot; Tel/WhatsApp +591 78360469 &middot; lexfive.netlify.app
      </div>
    </div>
  </div>`;
}

// Abre una ventana de impresión (tamaño carta) con un documento de certificado.
function abrirImpresionCert(titulo, docHTML) {
  const w = window.open('', '_blank');
  if (!w) { toast('Permita las ventanas emergentes para imprimir.', 'error'); return; }
  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${esc(titulo)}</title>
    <style>@page{size:letter;margin:0;} html,body{margin:0;background:#fff;}</style></head><body>${docHTML}
    <script>window.addEventListener('load',function(){setTimeout(function(){window.print();},400);});<\/script></body></html>`);
  w.document.close();
}

async function renderCertificados() {
  loading();
  try { await withTimeout(ensureImgCache(), 8000, 'imágenes'); } catch (e) {}
  try { await withTimeout(hydrateBranding(), 8000, 'branding'); } catch (e) {}
  const logoSrc = urlAbs(brandLogoSrc(pickActiveLogo(localStorage.getItem('lexfive_logo'))));
  const selloSrc = urlAbs(brandSelloSrc(pickActiveSello(localStorage.getItem('lexfive_sello'))));

  content().innerHTML = `
    <div class="card">
      <div class="card__body">
        <h3 class="intro-title">Certificados y constancias</h3>
        <p class="cell-sub">Elija el tipo, complete los datos y use «Imprimir / Guardar PDF». El texto se genera solo y puede editarlo. Sale en la hoja membretada del bufete, con el sello.</p>
      </div>
    </div>

    <div class="card">
      <div class="card__head"><h3>Datos</h3></div>
      <div class="card__body">
        <div class="field"><label>Tipo de certificado</label>
          <select id="ce_tipo">${CERT_PLANTILLAS.map(t => `<option value="${t.id}">${esc(t.nombre)}</option>`).join('')}</select></div>
        <div class="cert-form">
          <div class="field"><label>Nombre completo *</label><input id="ce_nombre" placeholder="Nombre y apellidos"></div>
          <div class="field"><label>Cédula de identidad</label><input id="ce_ci" placeholder="Ej: 12345678 LP"></div>
          <div class="field"><label>Cargo / calidad</label><input id="ce_calidad" placeholder="Procurador, Pasante, Asistente legal..."></div>
          <div class="field"><label>Período</label><input id="ce_periodo" placeholder="marzo a diciembre de 2024"></div>
          <div class="field"><label>Universidad (pasantías)</label><input id="ce_uni" placeholder="Ej: U.M.S.A."></div>
          <div class="field"><label>Carrera</label><input id="ce_carrera" placeholder="Ej: Derecho"></div>
          <div class="field"><label>Horas (opcional)</label><input id="ce_horas" type="number" min="0" placeholder="Ej: 240"></div>
          <div class="field"><label>Dirigido a (opcional)</label><input id="ce_dest" placeholder="A quien corresponda"></div>
          <div class="field"><label>Fecha de emisión</label><input id="ce_fecha" type="date" value="${hoyISO()}"></div>
        </div>
        <div class="field" style="margin-top:8px">
          <label>Texto del certificado <button class="btn btn--ghost btn--sm" id="ce_restaurar" type="button" style="margin-left:8px">Restaurar texto automático</button></label>
          <textarea id="ce_cuerpo" rows="8" style="font-family:inherit"></textarea>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px">
          <button class="btn btn--primary" id="ce_print">${ICON.doc} Imprimir / Guardar PDF</button>
          <button class="btn btn--ghost" id="ce_word">Descargar Word</button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card__head"><h3>Vista previa</h3></div>
      <div class="card__body"><div class="cert-preview" id="certPreview"></div></div>
    </div>

    <div class="card">
      <div class="card__head"><h3>Certificados emitidos</h3>
        <span style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <input type="search" id="ce_buscar" placeholder="Buscar nombre, C.I., referencia..." style="max-width:220px">
          <label class="cell-sub" style="display:flex;align-items:center;gap:4px">Desde <input type="date" id="ce_fdesde"></label>
          <label class="cell-sub" style="display:flex;align-items:center;gap:4px">Hasta <input type="date" id="ce_fhasta"></label>
        </span>
      </div>
      <div class="card__body--flush"><div id="certList"><div class="loading"><div class="spinner"></div>Cargando...</div></div></div>
    </div>`;

  let cuerpoEditado = false;
  const tplActual = () => CERT_PLANTILLAS.find(t => t.id === $('#ce_tipo').value) || CERT_PLANTILLAS[0];
  const datos = () => ({
    nombre: ($('#ce_nombre').value || '').trim() || '___________________',
    ci: ($('#ce_ci').value || '').trim(),
    calidad: ($('#ce_calidad').value || '').trim(),
    periodo: ($('#ce_periodo').value || '').trim() || 'el período indicado',
    universidad: ($('#ce_uni').value || '').trim(),
    carrera: ($('#ce_carrera').value || '').trim(),
    horas: ($('#ce_horas').value || '').trim(),
    destinatario: ($('#ce_dest').value || '').trim()
  });
  const regenerar = () => { $('#ce_cuerpo').value = tplActual().cuerpo(datos()); cuerpoEditado = false; };
  const ref = 'LF-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-5);
  const docActual = () => {
    const nombre = ($('#ce_nombre').value || '').trim();
    const ci = ($('#ce_ci').value || '').trim();
    const cargo = ($('#ce_calidad').value || '').trim();
    const fecha = $('#ce_fecha').value;
    return buildCertDoc({
      titulo: tplActual().titulo,
      cuerpoTexto: $('#ce_cuerpo').value,
      nombre, ci,
      fechaTxt: fechaLarga(fecha),
      ref,
      qrSrc: qrURL(qrCertificado({ nombre, ci, cargo: cargo || 'Colaborador', tipo: tplActual().titulo, ref, fecha })),
      logoSrc, selloSrc
    });
  };
  const pintar = () => { $('#certPreview').innerHTML = docActual(); };

  // Registra el certificado en la nube (best-effort) para que sea verificable
  // por su N.º de referencia. Si la tabla aún no existe (db/25), no pasa nada.
  const registrarCert = () => {
    try {
      supabase.from('certificados').upsert({
        ref,
        tipo: tplActual().titulo,
        nombre: ($('#ce_nombre').value || '').trim(),
        ci: ($('#ce_ci').value || '').trim() || null,
        cargo: ($('#ce_calidad').value || '').trim() || null,
        periodo: ($('#ce_periodo').value || '').trim() || null,
        cuerpo: $('#ce_cuerpo').value || null,
        fecha_emision: $('#ce_fecha').value || null,
        created_by: state.profile.id
      }, { onConflict: 'ref' }).then(() => { cargarEmitidos(); }, () => {});
    } catch (e) { /* ignorado */ }
  };

  // ---- Certificados emitidos (lista, búsqueda, reimprimir, eliminar) ----
  let EMITIDOS = [];
  async function cargarEmitidos() {
    try {
      const { data } = await supabase.from('certificados').select('*').order('created_at', { ascending: false }).limit(500);
      EMITIDOS = data || [];
    } catch (e) { EMITIDOS = []; }
    pintarEmitidos();
  }
  function pintarEmitidos() {
    const cont = $('#certList'); if (!cont) return;
    if (!EMITIDOS.length) { cont.innerHTML = `<div class="empty" style="padding:24px">${ICON.doc}<p>Aún no hay certificados registrados. Genere uno e imprímalo o descárguelo para que aparezca aquí.</p></div>`; return; }
    const q = ($('#ce_buscar') ? $('#ce_buscar').value : '').toLowerCase();
    const desde = $('#ce_fdesde') ? $('#ce_fdesde').value : '';
    const hasta = $('#ce_fhasta') ? $('#ce_fhasta').value : '';
    const list = EMITIDOS.filter(c => {
      if (q && ![c.nombre, c.ci, c.ref, c.tipo].some(v => (v || '').toLowerCase().includes(q))) return false;
      const dia = (c.created_at || '').slice(0, 10);
      if (desde && dia < desde) return false;
      if (hasta && dia > hasta) return false;
      return true;
    });
    if (!list.length) { cont.innerHTML = '<p class="cell-sub" style="padding:16px">Sin resultados para esos filtros.</p>'; return; }
    cont.innerHTML = `<div class="table-wrap"><table class="data">
      <thead><tr><th>Persona</th><th>Tipo</th><th>Emitido por</th><th>Referencia</th><th>Emitido</th><th></th></tr></thead>
      <tbody>${list.map(c => `<tr>
        <td class="cell-strong">${esc(c.nombre)}${c.ci ? `<div class="cell-sub">C.I. ${esc(c.ci)}</div>` : ''}</td>
        <td>${esc(c.tipo || '')}</td>
        <td class="cell-sub">${esc(c.created_by ? profName(c.created_by) : '—')}</td>
        <td class="cell-sub">${esc(c.ref)}</td>
        <td class="cell-sub">${fmtDate(c.created_at)}</td>
        <td class="cell-actions" style="white-space:nowrap"><button class="btn btn--ghost btn--sm js-reimp" data-id="${c.id}">Reimprimir</button> <button class="btn btn--danger btn--sm js-delcert" data-id="${c.id}" title="Eliminar registro">&times;</button></td>
      </tr>`).join('')}</tbody></table></div>`;
    cont.querySelectorAll('.js-reimp').forEach(b => b.onclick = () => { const c = EMITIDOS.find(x => x.id === b.dataset.id); if (c) reimprimirCert(c); });
    cont.querySelectorAll('.js-delcert').forEach(b => b.onclick = async () => {
      const c = EMITIDOS.find(x => x.id === b.dataset.id); if (!c) return;
      if (!confirm('¿Eliminar el registro del certificado ' + c.ref + '? Ya no se podrá verificar por su QR.')) return;
      try { await supabase.from('certificados').delete().eq('id', c.id); toast('Registro eliminado.', 'success'); cargarEmitidos(); }
      catch (e) { toast('No se pudo eliminar.', 'error'); }
    });
  }
  function reimprimirCert(c) {
    let cuerpo = c.cuerpo;
    if (!cuerpo) {
      const tpl = CERT_PLANTILLAS.find(t => t.titulo === c.tipo) || CERT_PLANTILLAS[0];
      cuerpo = tpl.cuerpo({ nombre: c.nombre, ci: c.ci, calidad: c.cargo, periodo: c.periodo || 'el período indicado', universidad: '', carrera: '', horas: '', destinatario: '' });
    }
    const doc = buildCertDoc({
      titulo: c.tipo || 'CERTIFICADO', cuerpoTexto: cuerpo, nombre: c.nombre, ci: c.ci || '',
      fechaTxt: fechaLarga(c.fecha_emision), ref: c.ref,
      qrSrc: qrURL(qrCertificado({ nombre: c.nombre, ci: c.ci, cargo: c.cargo, tipo: c.tipo, ref: c.ref, fecha: c.fecha_emision })),
      logoSrc, selloSrc
    });
    abrirImpresionCert(c.tipo || 'Certificado', doc);
  }

  // Campos que, si el texto no fue editado a mano, regeneran el borrador.
  ['ce_nombre', 'ce_ci', 'ce_calidad', 'ce_periodo', 'ce_uni', 'ce_carrera', 'ce_horas', 'ce_dest'].forEach(id => {
    $('#' + id).oninput = () => { if (!cuerpoEditado) regenerar(); pintar(); };
  });
  $('#ce_tipo').onchange = () => { regenerar(); pintar(); };
  $('#ce_fecha').onchange = pintar;
  $('#ce_cuerpo').oninput = () => { cuerpoEditado = true; pintar(); };
  $('#ce_restaurar').onclick = () => { regenerar(); pintar(); toast('Texto regenerado a partir de los datos.', 'success'); };

  $('#ce_print').onclick = () => {
    if (!($('#ce_nombre').value || '').trim()) { toast('Escriba el nombre completo.', 'error'); return; }
    registrarCert();
    abrirImpresionCert(tplActual().titulo, docActual());
  };
  $('#ce_word').onclick = () => {
    if (!($('#ce_nombre').value || '').trim()) { toast('Escriba el nombre completo.', 'error'); return; }
    registrarCert();
    const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body>' + docActual() + '</body></html>';
    const nombre = 'certificado-' + (($('#ce_nombre').value || 'lexfive').toLowerCase().replace(/[^\w]+/g, '-').slice(0, 40)) + '.doc';
    descargarArchivo(nombre, '\ufeff' + html, 'application/msword');
    toast('Certificado descargado en Word.', 'success');
  };

  const bce = $('#ce_buscar'); if (bce) bce.oninput = pintarEmitidos;
  const bfd = $('#ce_fdesde'); if (bfd) bfd.onchange = pintarEmitidos;
  const bfh = $('#ce_fhasta'); if (bfh) bfh.onchange = pintarEmitidos;

  regenerar();
  pintar();
  cargarEmitidos();
}

// renderPlantillas (y plantillaForm/savePlantilla/deletePlantilla/usarPlantilla)
// se movió a ./plantillas.js (se importa renderPlantillas arriba).

// ============================================================
//  CLIENTE: Novedades de sus procesos (actuaciones y documentos)
// ============================================================
// Trae las últimas actuaciones y documentos de los procesos del cliente
// (RLS ya limita a SUS procesos). Devuelve una lista unificada y ordenada.
async function fetchNovedades() {
  const [{ data: procs }, { data: acts }, { data: docs }] = await Promise.all([
    supabase.from('procesos').select('id,caratula').eq('eliminado', false),
    supabase.from('actuaciones').select('id,proceso_id,descripcion,fecha,created_at').order('created_at', { ascending: false }).limit(40),
    supabase.from('documentos').select('id,proceso_id,nombre,created_at').order('created_at', { ascending: false }).limit(40)
  ]);
  const cara = {}; (procs || []).forEach(p => { cara[p.id] = p.caratula; });
  const items = [];
  (acts || []).forEach(a => items.push({ ts: a.created_at || a.fecha, procId: a.proceso_id, cara: cara[a.proceso_id] || 'Proceso', tipo: 'Actuación', texto: a.descripcion || '' }));
  (docs || []).forEach(d => items.push({ ts: d.created_at, procId: d.proceso_id, cara: cara[d.proceso_id] || 'Proceso', tipo: 'Documento', texto: d.nombre || '' }));
  items.sort((a, b) => new Date(b.ts) - new Date(a.ts));
  return items.slice(0, 30);
}

// Pone (o quita) el contador de novedades nuevas en el menú del cliente.
async function updateNovedadesBadge() {
  try {
    const items = await fetchNovedades();
    const visto = Number(localStorage.getItem('lexfive_nov_' + state.profile.id) || 0);
    const nuevos = items.filter(it => new Date(it.ts).getTime() > visto).length;
    const btn = document.querySelector('.nav-item[data-key="novedades"]');
    if (!btn) return;
    let b = btn.querySelector('.nav-badge');
    if (nuevos > 0) {
      if (!b) { b = document.createElement('span'); b.className = 'nav-badge'; btn.appendChild(b); }
      b.textContent = nuevos > 9 ? '9+' : String(nuevos);
    } else if (b) { b.remove(); }
  } catch (e) {}
}

async function renderNovedades() {
  loading();
  const items = await fetchNovedades();
  const key = 'lexfive_nov_' + state.profile.id;
  const visto = Number(localStorage.getItem(key) || 0);

  content().innerHTML = `
    <div class="card">
      <div class="card__head"><h3>${ICON.campana} Novedades de sus procesos</h3></div>
      <div class="card__body--flush">
        ${items.length ? `<ul class="novedades">${items.map(it => {
          const esNuevo = new Date(it.ts).getTime() > visto;
          return `<li class="novedad ${esNuevo ? 'is-nuevo' : ''}" data-pid="${it.procId}">
            <div class="novedad__top">
              <span class="badge badge-mat">${it.tipo}</span>
              ${esNuevo ? '<span class="novedad__nuevo">Nuevo</span>' : ''}
              <span class="novedad__fecha">${fmtDate(it.ts)}</span>
            </div>
            <div class="cell-strong">${esc(it.cara)}</div>
            <div class="cell-sub">${esc(it.texto)}</div>
          </li>`;
        }).join('')}</ul>`
        : `<div class="empty">${ICON.campana}<p>Aún no hay novedades en sus procesos. Aquí verá cada avance que registre su abogado.</p></div>`}
      </div>
    </div>`;

  content().querySelectorAll('.novedad[data-pid]').forEach(li => li.onclick = () => openProcesoDetail(li.dataset.pid, true));

  // Marcar todo como visto y quitar el contador del menú.
  try { localStorage.setItem(key, String(Date.now())); } catch (e) {}
  updateNovedadesBadge();
}

// ============================================================
//  VISTA: PROCESOS
// ============================================================
async function renderProcesos() {
  loading();
  await loadClientes();
  await loadCategorias();
  const { data } = await supabase.from('procesos').select('*').eq('eliminado', false).order('created_at', { ascending: false });
  const procesos = data || [];

  content().innerHTML = `
    <div class="toolbar">
      <input type="search" id="qProc" placeholder="Buscar por carátula, número, juzgado..." ${hint('Escriba para filtrar la lista por carátula, número, juzgado o parte contraria.')}>
      <select id="fMateria" ${hint('Filtra los procesos por área del derecho.')}><option value="">Todas las materias</option>${state.categorias.map(m => `<option>${esc(m)}</option>`).join('')}</select>
      <select id="fEstado" ${hint('Filtra los procesos por su etapa actual.')}><option value="">Todos los estados</option>${Object.entries(ESTADOS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
      <select id="fAbogado" ${hint('Filtra los procesos por abogado responsable.')}><option value="">Todos los abogados</option>${state.profiles.filter(p => p.rol === 'abogado' || p.rol === 'admin').map(p => `<option value="${p.id}">${esc(p.nombre)}</option>`).join('')}</select>
      <div class="field-row" style="gap:6px;margin:0">
        <input type="date" id="fDesde" ${hint('Filtra audiencias desde esta fecha.')} title="Desde" style="padding:8px 10px;border:1.5px solid var(--line);border-radius:8px;font:inherit;font-size:.85rem">
        <input type="date" id="fHasta" ${hint('Filtra audiencias hasta esta fecha.')} title="Hasta" style="padding:8px 10px;border:1.5px solid var(--line);border-radius:8px;font:inherit;font-size:.85rem">
      </div>
      <div class="spacer"></div>
      <button class="btn btn--ghost" id="btnExportCSV" ${hint('Descarga la lista filtrada en un archivo de Excel (CSV).')}>${ICON.descargar} Excel</button>
      <button class="btn btn--ghost" id="btnExportPDF" ${hint('Abre una vista para imprimir o guardar la lista filtrada como PDF.')}>${ICON.doc} PDF</button>
      <button class="btn btn--primary" id="btnNuevoProc" ${hint('Crea un nuevo caso. Solo la carátula es obligatoria; el resto puede completarlo después.')}>${ICON.plus} Nuevo proceso</button>
    </div>
    <div class="card"><div class="card__body--flush"><div id="procTable"></div></div></div>`;

  let filtradas = procesos;
  let page = 1;
  function paint() {
    const q = ($('#qProc').value || '').toLowerCase();
    const fm = $('#fMateria').value, fe = $('#fEstado').value;
    const fa = $('#fAbogado').value;
    const desde = $('#fDesde').value, hasta = $('#fHasta').value;
    const rows = procesos.filter(p =>
      (!fm || p.materia === fm) && (!fe || p.estado === fe) &&
      (!fa || (p.abogados_ids || []).includes(fa) || p.abogado_id === fa) &&
      (!desde || (p.proxima_audiencia && p.proxima_audiencia >= desde)) &&
      (!hasta || (p.proxima_audiencia && p.proxima_audiencia.slice(0, 10) <= hasta)) &&
      (!q || [p.caratula, p.numero, p.juzgado, p.parte_contraria].some(v => (v || '').toLowerCase().includes(q))));
    filtradas = rows;
    const info = paginar(rows, page);
    $('#procTable').innerHTML = rows.length ? `<div class="table-wrap"><table class="data">
      <thead><tr><th>Carátula</th><th>Materia</th><th>Tipo</th><th>Abogado</th><th>Estado</th><th>Próx. audiencia</th></tr></thead>
      <tbody>${info.slice.map(p => `
        <tr data-id="${p.id}">
          <td class="cell-strong">${esc(p.caratula)}<div class="cell-sub">${esc(p.numero || 'Sin número')}</div></td>
          <td><span class="badge badge-mat">${esc(p.materia || '—')}</span></td>
          <td>${p.tipo === 'administrativo' ? 'Administrativo' : 'Judicial'}</td>
          <td>${esc(namesFromIds(p.abogados_ids) || profName(p.abogado_id))}</td>
          <td>${badgeEstado(p.estado)}</td>
          <td>${p.proxima_audiencia ? fmtDateTime(p.proxima_audiencia) : '—'}</td>
        </tr>`).join('')}</tbody></table></div>${pagerHTML(info)}`
      : `<div class="empty">${ICON.procesos}<p>No se encontraron procesos.</p></div>`;
    $('#procTable').querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => openProcesoDetail(tr.dataset.id));
    wirePager($('#procTable'), info, (n) => { page = n; paint(); });
  }
  paint();
  const rePaint = () => { page = 1; paint(); };
  $('#qProc').oninput = rePaint; $('#fMateria').onchange = rePaint; $('#fEstado').onchange = rePaint;
  $('#fAbogado').onchange = rePaint; $('#fDesde').onchange = rePaint; $('#fHasta').onchange = rePaint;
  $('#btnNuevoProc').onclick = () => procesoForm();
  $('#btnExportCSV').onclick = () => {
    if (!filtradas.length) { toast('No hay procesos para exportar.', 'error'); return; }
    descargarArchivo('procesos-lexfive-' + hoyISO() + '.csv', procesosToCSV(filtradas), 'text/csv;charset=utf-8');
    toast('Lista exportada a Excel (CSV).', 'success');
  };
  $('#btnExportPDF').onclick = () => {
    if (!filtradas.length) { toast('No hay procesos para exportar.', 'error'); return; }
    imprimirListaProcesos(filtradas);
  };
}

// Abre una ventana de impresión con la lista de procesos (para guardar como PDF).
function imprimirListaProcesos(rows) {
  const filas = rows.map(p => `<tr>
    <td>${esc(p.caratula)}${p.numero ? '<br><small>' + esc(p.numero) + '</small>' : ''}</td>
    <td>${esc(p.materia || '—')}</td>
    <td>${p.tipo === 'administrativo' ? 'Administrativo' : 'Judicial'}</td>
    <td>${esc(ESTADOS[p.estado] || p.estado)}</td>
    <td>${esc(p.juzgado || '—')}</td>
    <td>${esc(clienteName(p.cliente_id))}</td>
    <td>${esc(namesFromIds(p.abogados_ids) || profName(p.abogado_id))}</td>
    <td>${p.proxima_audiencia ? fmtDateTime(p.proxima_audiencia) : '—'}</td>
  </tr>`).join('');
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <title>Procesos · LexFive</title>
    <style>
      body{font-family:Arial,Helvetica,sans-serif;color:#1a2330;margin:24px;}
      h1{font-family:Georgia,serif;color:#0e1b2c;font-size:20px;margin:0 0 2px;}
      .sub{color:#5c6675;font-size:12px;margin:0 0 16px;}
      table{width:100%;border-collapse:collapse;font-size:11px;}
      th,td{border:1px solid #d9dce1;padding:6px 8px;text-align:left;vertical-align:top;}
      th{background:#0e1b2c;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:.5px;}
      tr:nth-child(even) td{background:#f6f7f9;}
      small{color:#5c6675;}
      @media print{@page{size:landscape;margin:10mm;}}
    </style></head><body>
    <h1>LexFive — Listado de procesos</h1>
    <p class="sub">${rows.length} proceso(s) · Generado el ${fmtDate(new Date())}</p>
    <table><thead><tr>
      <th>Carátula</th><th>Materia</th><th>Tipo</th><th>Estado</th><th>Juzgado</th><th>Cliente</th><th>Abogados</th><th>Próx. audiencia</th>
    </tr></thead><tbody>${filas}</tbody></table>
    <script>window.onload=function(){window.print();}<\/script>
    </body></html>`;
  const w = window.open('', '_blank');
  if (!w) { toast('Permita las ventanas emergentes para generar el PDF.', 'error'); return; }
  w.document.write(html); w.document.close();
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
        const { error: upErr } = await subirDocumento(path, file);
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
      <div style="flex-grow:1;min-width:180px;"><label style="font-size:.8rem;">Subir archivo (PDF, Word, imagen... máx. 10 MB)</label><input type="file" id="docFile" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.txt,.png,.jpg,.jpeg,.webp,.gif,.svg"></div>
      <input id="docNombre" placeholder="Descripción (ej: Memorial de respuesta)" style="flex-grow:1;min-width:180px;padding:10px 12px;border:1.5px solid var(--line);border-radius:8px;">
      <button class="btn btn--navy" id="btnUpload">Subir</button>
      <span class="cell-sub" id="docPreview"></span>
    </div>`}
    <div id="docList">${renderDocs((docs || []).filter(d => !d.actuacion_id), readonly)}</div>

    <h4 class="section-title">Historial de actuaciones${tip('Cada paso del caso en orden. Registre el avance (ej: "Respuesta del juzgado") y adjunte los archivos: la respuesta recibida y el nuevo memorial a presentar. El cliente verá esto y podrá descargarlo.')}</h4>
    ${readonly ? '' : `<div class="act-form">
      <div class="field-row" style="margin-bottom:8px">
        <input type="date" id="actFecha" value="${new Date().toISOString().slice(0,10)}" style="padding:10px 12px;border:1.5px solid var(--line);border-radius:8px;">
        <input id="actDesc" placeholder="Describa el paso (ej: Respuesta del juzgado, Nuevo memorial...)" style="padding:10px 12px;border:1.5px solid var(--line);border-radius:8px;">
      </div>
      <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;">
        <div style="flex-grow:1;min-width:200px;"><label style="font-size:.8rem;color:var(--muted)">Adjuntar archivos (opcional, máx. 10 MB c/u): respuesta del juzgado, nuevo memorial, etc.</label><input type="file" id="actFiles" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.txt,.png,.jpg,.jpeg,.webp,.gif,.svg" multiple><span class="cell-sub" id="actFilesPreview" style="display:block;margin-top:4px"></span></div>
        <button class="btn btn--navy" id="btnActuacion">Agregar al historial</button>
      </div>
      <span class="cell-sub" id="actProgreso"></span>
    </div>`}
    <ul class="timeline" id="actList">${renderActs(acts || [], docs || [])}</ul>
    ${state.profile.rol === 'cliente' ? `<div class="card" id="opinionProc" style="margin-top:18px"></div>` : ''}`;

  const buttons = [];
  if (!readonly) {
    buttons.push({ label: 'Editar', class: 'btn--ghost', onClick: () => procesoForm(p) });
    buttons.push({ label: 'Plazos', class: 'btn--ghost', onClick: () => openPlazos(p) });
    if (['admin', 'abogado'].includes(state.profile.rol)) {
      buttons.push({ label: 'Honorarios', class: 'btn--ghost', onClick: () => openHonorarios(p) });
      buttons.push({ label: 'Horas', class: 'btn--ghost', onClick: () => openHoras(p) });
    }
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
  if ($('#btnUpload')) {
    // Vista previa al seleccionar archivo + validación de tamaño.
    const docFileEl = $('#docFile');
    if (docFileEl) docFileEl.onchange = () => {
      const pv = $('#docPreview');
      const f = docFileEl.files && docFileEl.files[0];
      if (!f) { if (pv) pv.textContent = ''; return; }
      if (f.size > 10 * 1024 * 1024) { toast('El archivo pesa más de 10 MB. Elija uno más liviano.', 'error'); docFileEl.value = ''; if (pv) pv.textContent = ''; return; }
      const ext = f.name.split('.').pop().toLowerCase();
      const tipoIcono = { pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊', png: '🖼️', jpg: '🖼️', jpeg: '🖼️', webp: '🖼️', gif: '🖼️' };
      if (pv) pv.innerHTML = `${tipoIcono[ext] || '📎'} <strong>${esc(f.name)}</strong> (${(f.size / 1024).toFixed(0)} KB)`;
    };
    $('#btnUpload').onclick = async () => {
    const file = $('#docFile').files[0];
    if (!file) { toast('Seleccione un archivo.', 'error'); return; }
    if (file.size > 10 * 1024 * 1024) { toast('El archivo pesa más de 10 MB. Elija uno más liviano.', 'error'); return; }
    $('#btnUpload').disabled = true; $('#btnUpload').textContent = 'Subiendo...';
    const path = `${id}/${Date.now()}_${file.name.replace(/[^\w.\-]/g, '_')}`;
    const { error: upErr } = await subirDocumento(path, file);
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
    const pv2 = $('#docPreview'); if (pv2) pv2.textContent = '';
  };
  }
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

  // Vista previa + validación de los adjuntos de la actuación (varios archivos).
  const actFilesEl = $('#actFiles');
  if (actFilesEl) actFilesEl.onchange = () => {
    const pv = $('#actFilesPreview');
    const files = [...actFilesEl.files];
    if (!files.length) { if (pv) pv.textContent = ''; return; }
    const pesados = files.filter(f => f.size > 10 * 1024 * 1024);
    if (pesados.length && pv) pv.innerHTML = `<span style="color:var(--red)">${pesados.length} archivo(s) superan 10 MB y se omitirán.</span>`;
    else if (pv) pv.innerHTML = `${files.length} archivo(s) listo(s): ${esc(files.map(f => f.name).join(', '))}`;
  };

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

    // Aviso automático al cliente del proceso (correo + push). No bloquea ni
    // interrumpe el guardado: si la Edge Function no está desplegada o falla,
    // simplemente no se envía el aviso. Ver supabase/functions/avisar-actuacion.
    try {
      supabase.functions.invoke('avisar-actuacion', { body: { proceso_id: id, descripcion: desc } }).catch(() => {});
    } catch (e) { /* ignorado a propósito */ }

    // 2) Subir los archivos adjuntos vinculados a esa actuación
    const archivos = [...($('#actFiles') ? $('#actFiles').files : [])];
    let ok = 0, fallos = 0;
    for (let i = 0; i < archivos.length; i++) {
      const file = archivos[i];
      if (file.size > 10 * 1024 * 1024) { fallos++; continue; }
      prog.textContent = `Subiendo adjunto ${i + 1} de ${archivos.length}...`;
      const path = `${id}/${Date.now()}_${i}_${file.name.replace(/[^\w.\-]/g, '_')}`;
      const { error: upErr } = await subirDocumento(path, file);
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
      const { data, error } = await enlaceDocumento(path);
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
      const { data, error } = await enlaceDocumento(path);
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
  if (!confirm(`¿Enviar el proceso "${p.caratula}" a la papelera?\n\nNo se borra definitivamente: el administrador podrá restaurarlo o eliminarlo desde la Papelera.`)) return;
  const { error } = await supabase.from('procesos').update({
    eliminado: true, eliminado_at: new Date().toISOString(), eliminado_por: state.profile.id
  }).eq('id', p.id);
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  await logAccion('papelera', 'proceso', p.id, p.caratula);
  closeModal(); toast('Proceso enviado a la papelera.', 'success'); renderProcesos();
}

// ============================================================
//  VISTA: PAPELERA DE PROCESOS (solo administrador)
// ============================================================
// La vista de Papelera (renderPapelera + papeleraProcesos/papeleraClientes,
// restaurar/eliminar definitivo de procesos y clientes) se movió a
// ./papelera.js (se importa renderPapelera arriba).

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
      <button class="btn btn--ghost" id="btnExportCli" ${hint('Descarga la lista de clientes en un archivo de Excel (CSV).')}>${ICON.descargar} Excel</button>
      <button class="btn btn--primary" id="btnNuevoCli">${ICON.plus} Nuevo cliente</button>
    </div>
    <div class="card"><div class="card__body--flush"><div id="cliTable"></div></div></div>`;
  let page = 1;
  function paint() {
    const q = ($('#qCli').value || '').toLowerCase();
    const rows = state.clientes.filter(c => !q || [c.nombre, c.documento, c.email, c.telefono].some(v => (v || '').toLowerCase().includes(q)));
    const info = paginar(rows, page);
    $('#cliTable').innerHTML = rows.length ? `<div class="table-wrap"><table class="data">
      <thead><tr><th>Nombre</th><th>Documento</th><th>Teléfono</th><th>Correo</th></tr></thead>
      <tbody>${info.slice.map(c => `<tr data-id="${c.id}"><td class="cell-strong">${esc(c.nombre)}</td><td>${esc(c.documento || '—')}</td><td>${esc(c.telefono || '—')}</td><td>${esc(c.email || '—')}</td></tr>`).join('')}</tbody></table></div>${pagerHTML(info)}`
      : `<div class="empty">${ICON.clientes}<p>No hay clientes registrados.</p></div>`;
    $('#cliTable').querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => {
      const c = state.clientes.find(x => x.id === tr.dataset.id); clienteForm(c);
    });
    wirePager($('#cliTable'), info, (n) => { page = n; paint(); });
  }
  paint();
  $('#qCli').oninput = () => { page = 1; paint(); };
  $('#btnNuevoCli').onclick = () => clienteForm();
  $('#btnExportCli').onclick = () => {
    if (!state.clientes.length) { toast('No hay clientes para exportar.', 'error'); return; }
    descargarArchivo('clientes-lexfive-' + hoyISO() + '.csv', clientesToCSV(state.clientes), 'text/csv;charset=utf-8');
    toast('Lista de clientes exportada a Excel (CSV).', 'success');
  };
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
  if (cli) buttons.push({ label: 'Correo de bienvenida', class: 'btn--ghost', onClick: () => mostrarCorreoBienvenida(cli) });
  buttons.push({ label: 'Guardar', class: 'btn--primary', id: 'cf_save', onClick: () => saveCliente(cli) });
  openModal(cli ? 'Editar cliente' : 'Nuevo cliente', body, buttons);

  // Autoguardado de borrador
  const draftName = 'cliente_' + (cli ? cli.id : 'nuevo');
  const draft = wireDraft(draftName, ['cf_nombre', 'cf_doc', 'cf_tel', 'cf_email', 'cf_dir', 'cf_notas']);
  maybeOfferDraft(draftName, draft);
}

// Plantilla del correo/mensaje de bienvenida para un cliente nuevo: incluye los
// pasos para registrarse y el enlace a la guía del cliente. Lista para copiar.
function welcomeEmailText(cli) {
  const nombre = (cli && cli.nombre) ? cli.nombre : 'cliente';
  const correo = (cli && cli.email) ? cli.email : '(el correo que registró en el bufete)';
  return [
    'Estimado/a ' + nombre + ':',
    '',
    'Le damos la bienvenida a LexFive Abogados. Habilitamos un portal en línea donde puede '
    + 'seguir el avance de sus procesos de forma segura, desde su computadora o su celular.',
    '',
    'Para crear su cuenta:',
    '1) Ingrese a: ' + SITIO_URL + 'sistema/login.html',
    '2) Elija «¿Es cliente del bufete? Cree su cuenta aquí».',
    '3) Regístrese con ESTE MISMO correo: ' + correo,
    '   (es importante usar este correo para que vea automáticamente sus casos).',
    '4) Cree una contraseña que recuerde. ¡Listo!',
    '',
    'Le compartimos una guía sencilla de uso del portal (PDF):',
    SITIO_URL + 'Manual-Clientes-LexFive.pdf',
    '',
    'Ante cualquier duda, estamos a su disposición.',
    '',
    'Atentamente,',
    'LexFive Abogados'
  ].join('\n');
}

function mostrarCorreoBienvenida(cli) {
  const texto = welcomeEmailText(cli);
  const correo = (cli && cli.email) ? cli.email : '';
  const tel = (cli && cli.telefono) ? String(cli.telefono).replace(/\D/g, '') : '';
  const body = `
    <p class="cell-sub" style="margin-bottom:10px">Copie este mensaje y envíelo al cliente por correo o WhatsApp. Ya viene con sus datos y el enlace a la guía del cliente.${correo ? '' : ' <strong>Sugerencia:</strong> agregue el correo del cliente en su ficha para personalizarlo.'}</p>
    <textarea id="welcomeMail" rows="15" style="width:100%;font:inherit;font-size:.9rem;line-height:1.5;padding:12px;border:1.5px solid var(--line);border-radius:8px;background:var(--white);color:var(--ink);resize:vertical">${esc(texto)}</textarea>`;
  const copiar = () => {
    const ta = document.getElementById('welcomeMail');
    const done = () => toast('Texto copiado. Péguelo en su correo o WhatsApp.', 'success');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(done).catch(() => { try { ta.select(); document.execCommand('copy'); done(); } catch (e) {} });
    } else { try { ta.select(); document.execCommand('copy'); done(); } catch (e) {} }
  };
  const buttons = [{ label: 'Copiar texto', class: 'btn--primary', onClick: copiar }];
  if (tel) buttons.push({ label: 'Enviar por WhatsApp', class: 'btn--ghost', onClick: () => window.open('https://wa.me/' + tel + '?text=' + encodeURIComponent(texto), '_blank') });
  if (correo) buttons.push({ label: 'Abrir en correo', class: 'btn--ghost', onClick: () => { window.location.href = 'mailto:' + correo + '?subject=' + encodeURIComponent('Bienvenido a LexFive Abogados') + '&body=' + encodeURIComponent(texto); } });
  buttons.push({ label: 'Cerrar', class: 'btn--ghost', onClick: closeModal });
  openModal('Correo de bienvenida para el cliente', body, buttons, true);
}

async function saveCliente(cli) {
  const nombre = $('#cf_nombre').value.trim();
  if (!nombre) { toast('El nombre es obligatorio.', 'error'); $('#cf_nombre').focus(); return; }
  const email = $('#cf_email').value.trim();
  if (email && !esEmailValido(email)) { toast('El correo no parece válido. Revíselo (ejemplo: nombre@correo.com).', 'error'); $('#cf_email').focus(); return; }
  const payload = {
    nombre, documento: $('#cf_doc').value.trim() || null, telefono: $('#cf_tel').value.trim() || null,
    email: email || null, direccion: $('#cf_dir').value.trim() || null, notas: $('#cf_notas').value.trim() || null
  };
  $('#cf_save').disabled = true;
  let error;
  if (cli) ({ error } = await supabase.from('clientes').update(payload).eq('id', cli.id));
  else { payload.created_by = state.profile.id; ({ error } = await supabase.from('clientes').insert(payload)); }
  if (error) { toast('No se pudo guardar el cliente: ' + (error.message || 'revise su conexión e intente de nuevo.'), 'error'); $('#cf_save').disabled = false; return; }
  Draft.clear('cliente_' + (cli ? cli.id : 'nuevo'));
  await logAccion(cli ? 'editar' : 'crear', 'cliente', cli ? cli.id : nombre, nombre);
  closeModal(); toast('Cliente guardado.', 'success'); renderClientes();
}
async function deleteCliente(cli) {
  if (!confirm(`¿Enviar al cliente "${cli.nombre}" a la papelera?\n\nNo se borra definitivamente: el administrador podrá restaurarlo o eliminarlo desde la Papelera.`)) return;
  const { error } = await supabase.from('clientes').update({
    eliminado: true, eliminado_at: new Date().toISOString(), eliminado_por: state.profile.id
  }).eq('id', cli.id);
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  await logAccion('eliminar', 'cliente', cli.id, cli.nombre);
  closeModal(); toast('Cliente enviado a la papelera.', 'success'); renderClientes();
}

// ============================================================
//  VISTA: BLOG
// ============================================================
// renderBlog (y articuloForm/saveArticulo/deleteArticulo) se movió a ./blog.js
// (se importa arriba renderBlog; las demás son internas del módulo).

// ============================================================
//  VISTA: USUARIOS / AUDITORÍA (solo admin)
// ============================================================
// renderUsuarios y renderAuditoria se movieron a ./admin.js (se importan arriba).

// ============================================================
//  PORTAL DEL CLIENTE (solo lectura de sus propios procesos)
// ============================================================
async function renderMisProcesos() {
  loading();
  const { data } = await supabase.from('procesos').select('*').eq('eliminado', false).order('proxima_audiencia', { ascending: true });
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

    <div class="card" style="margin-bottom:18px">
      <div class="card__body" style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;justify-content:space-between">
        <p class="cell-sub" style="margin:0">¿Primera vez aquí? Descargue la guía rápida para aprender a usar su portal.</p>
        <a class="btn btn--ghost btn--sm" href="../Manual-Clientes-LexFive.pdf" download>${ICON.doc} Descargar guía del cliente</a>
      </div>
    </div>

    <div class="card">
      <div class="card__head">
        <h3>Mis procesos</h3>
        <span style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn--ghost btn--sm" id="btnEstadoCuenta" type="button">${ICON.doc} Mi estado de cuenta</button>
          <a class="btn btn--primary btn--sm" href="${waUrl}" target="_blank" rel="noopener">Consultar por WhatsApp</a>
        </span>
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
  const bec = $('#btnEstadoCuenta'); if (bec) bec.onclick = () => descargarEstadoCuenta(procesos);
  mountOpinion($('#opinionDash'));
}

// Genera el estado de cuenta del cliente (honorarios y pagos de sus procesos)
// en una ventana lista para imprimir o guardar como PDF. Requiere que el
// cliente pueda leer sus honorarios/pagos (ver db/24_mejoras_portal_notif.sql);
// si aún no se aplicó ese permiso, no aparecerán movimientos y se avisa.
async function descargarEstadoCuenta(procesos) {
  const procIds = (procesos || []).map(p => p.id);
  if (!procIds.length) { toast('No hay procesos asociados a su cuenta.', 'error'); return; }
  const money = (n) => 'Bs ' + Number(n || 0).toFixed(2);
  let hs = [], ps = [];
  try {
    const [h, p] = await Promise.all([
      supabase.from('honorarios').select('proceso_id,concepto,monto,fecha').in('proceso_id', procIds),
      supabase.from('pagos').select('proceso_id,monto,metodo,fecha').in('proceso_id', procIds)
    ]);
    hs = h.data || []; ps = p.data || [];
  } catch (e) { hs = []; ps = []; }
  if (!hs.length && !ps.length) {
    toast('Aún no hay honorarios ni pagos registrados en sus procesos.', 'error');
    return;
  }
  const car = {}; (procesos || []).forEach(p => { car[p.id] = p.caratula; });
  let totalH = 0, totalP = 0;
  const bloques = procIds.map(pid => {
    const hh = hs.filter(x => x.proceso_id === pid);
    const pp = ps.filter(x => x.proceso_id === pid);
    if (!hh.length && !pp.length) return '';
    const sh = hh.reduce((a, b) => a + Number(b.monto || 0), 0);
    const sp = pp.reduce((a, b) => a + Number(b.monto || 0), 0);
    totalH += sh; totalP += sp;
    const filasH = hh.length ? hh.map(x => `<tr><td>${fmtDate(x.fecha)}</td><td>${esc(x.concepto || 'Honorario')}</td><td class="r">${money(x.monto)}</td></tr>`).join('') : '<tr><td colspan="3" class="muted">Sin cargos.</td></tr>';
    const filasP = pp.length ? pp.map(x => `<tr><td>${fmtDate(x.fecha)}</td><td>${esc(x.metodo || 'Pago')}</td><td class="r">${money(x.monto)}</td></tr>`).join('') : '<tr><td colspan="3" class="muted">Sin pagos.</td></tr>';
    return `<h2>${esc(car[pid] || 'Proceso')}</h2>
      <table><thead><tr><th colspan="3">Honorarios (cargos)</th></tr></thead><tbody>${filasH}</tbody></table>
      <table><thead><tr><th colspan="3">Pagos recibidos</th></tr></thead><tbody>${filasP}</tbody></table>
      <p class="saldo">Saldo del proceso: <strong>${money(sh - sp)}</strong></p>`;
  }).join('');
  const saldo = totalH - totalP;
  const win = window.open('', '_blank');
  if (!win) { toast('Permita las ventanas emergentes para descargar el estado de cuenta.', 'error'); return; }
  win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Estado de cuenta · LexFive</title>
    <style>
      *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#1a2330;margin:0;padding:28px;max-width:800px;margin:auto}
      .hd{background:#0e1b2c;color:#fff;padding:18px 22px;border-radius:10px;margin-bottom:18px}
      .hd b{font-size:20px} .hd .g{color:#c2a25a} .hd .sub{color:#c2a25a;font-size:12px;letter-spacing:2px;text-transform:uppercase}
      h2{font-size:15px;margin:18px 0 6px;color:#0e1b2c;border-bottom:2px solid #c2a25a;padding-bottom:4px}
      table{width:100%;border-collapse:collapse;margin:4px 0 10px}
      th,td{padding:6px 8px;font-size:12.5px;text-align:left;border-bottom:1px solid #e6e8ec}
      th{background:#f3eedf;color:#0e1b2c} td.r,th.r{text-align:right} .r{text-align:right}
      .muted{color:#888} .saldo{text-align:right;margin:2px 0 6px}
      .tot{background:#f7f8fa;border-radius:10px;padding:14px 18px;margin-top:16px}
      .tot .big{font-size:18px;color:#0e1b2c}
      .pie{color:#888;font-size:11px;margin-top:20px;text-align:center}
      @media print{body{padding:0}}
    </style></head>
    <body onload="window.print()">
      <div class="hd"><b>Lex<span class="g">Five</span></b><div class="sub">Estado de cuenta</div></div>
      <p><strong>Cliente:</strong> ${esc(state.profile.nombre || '')}<br>
         <strong>Fecha:</strong> ${fmtDate(hoyISO())}</p>
      ${bloques || '<p>No hay movimientos para mostrar.</p>'}
      <div class="tot">
        <p>Total honorarios: <strong>${money(totalH)}</strong></p>
        <p>Total pagado: <strong>${money(totalP)}</strong></p>
        <p class="big">Saldo pendiente: <strong>${money(saldo)}</strong></p>
      </div>
      <p class="pie">Documento generado desde el portal del cliente de LexFive. Si tiene dudas sobre algún monto, consúltenos.</p>
    </body></html>`);
  win.document.close();
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
// renderModelos se movió a ./modelos.js (se importa arriba).

// ============================================================
//  VISTA: CONSULTAS (bandeja del formulario de contacto de la web)
// ============================================================
// La vista de Consultas (consultaNombre, consultaEstadoBadge, waLinkTel,
// renderConsultas, openConsultaDetail, setConsultaEstado, deleteConsulta) se
// movió a ./consultas.js (se importan arriba renderConsultas, consultaNombre y
// openConsultaDetail; las demás son internas del módulo).

// ============================================================
//  VISTA: CREDENCIALES Y ACCESOS (solo administrador y abogados)
//  Genera una credencial/carnet del bufete para el usuario, lista para
//  imprimir. El administrador y los abogados son los únicos que la ven;
//  ellos entregan las credenciales a sus procuradores.
// ============================================================
// ============================================================
//  Catálogo y utilidades de branding (logo y sello del bufete).
//  Se comparten entre la pestaña «Sellos y logos» (renderSellos) y la
//  marca de agua de la credencial (renderCredenciales).
// ============================================================
const BRAND_LOGOS = [
  { id: 'ds1-balanza-codigo', nombre: 'Emblema · Balanza' },
  { id: 'ds2-L5-circuito', nombre: 'Emblema · Monograma L5' },
  { id: 'ds3-mazo-pulso', nombre: 'Emblema · Mazo del juez' },
  { id: 'ds4-columna-circuito', nombre: 'Emblema · Templo de justicia' },
  { id: 'ds5-balanza-chip', nombre: 'Emblema · Balanza en chip' },
  { id: 'opcion-6-LF-circuito', nombre: 'Monograma LF con circuito' },
  { id: 'ds7-balanza-binario', nombre: 'Balanza · Código binario' },
  { id: 'ds8-balanza-red', nombre: 'Balanza · Red de nodos' },
  { id: 'ds9-codigo-justicia', nombre: 'Balanza · Código </>' },
  { id: 'ds10-engranaje-ley', nombre: 'Balanza · Engranaje' },
  { id: 'ds11-LF-binario', nombre: 'Monograma LF · Binario' },
  { id: 'ds12-buho-circuito', nombre: 'Búho · Circuito' },
  { id: 'ds13-buho-hexagono', nombre: 'Búho · Hexágono tech' },
  { id: 'ds14-buho-balanza', nombre: 'Búho · Balanza' }
];
const BRAND_LOGO_DEFAULT = 'ds1-balanza-codigo';
const BRAND_SELLOS = [
  { id: 'sello-1-clasico', nombre: 'Clásico — balanza' },
  { id: 'sello-2-mazo', nombre: 'Mazo del juez' },
  { id: 'sello-3-ovalado', nombre: 'Ovalado institucional' },
  { id: 'sello-4-circuito', nombre: 'Derecho & Tecnología' },
  { id: 'sello-5-columnas', nombre: 'Templo de justicia' }
];
const BRAND_SELLO_DEFAULT = 'sello-1-clasico';

function brandHidden(k) { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch (e) { return []; } }
function brandLogosVisibles() { const h = brandHidden('lexfive_logos_hidden'); return BRAND_LOGOS.filter(l => h.indexOf(l.id) === -1); }
function brandSellosVisibles() { const h = brandHidden('lexfive_sellos_hidden'); return BRAND_SELLOS.filter(s => h.indexOf(s.id) === -1); }
function findCustomLogo(cid) { return IMG.logosCustom.find(x => x && x.id === cid); }
function findCustomSello(sid) { return IMG.sellosCustom.find(x => x && x.id === sid); }
function pickActiveLogo(saved) {
  if (saved && saved.indexOf('custom:') === 0 && findCustomLogo(saved.slice(7))) return saved;
  if (saved === 'custom' && IMG.logosCustom.length) return 'custom:' + IMG.logosCustom[0].id;
  const vis = brandLogosVisibles();
  if (vis.some(x => x.id === saved)) return saved;
  if (IMG.logosCustom.length) return 'custom:' + IMG.logosCustom[0].id;
  if (vis.length) return vis[0].id;
  return BRAND_LOGO_DEFAULT;
}
function pickActiveSello(saved) {
  if (saved && saved.indexOf('custom:') === 0 && findCustomSello(saved.slice(7))) return saved;
  if (saved === 'custom' && IMG.sellosCustom.length) return 'custom:' + IMG.sellosCustom[0].id;
  const vis = brandSellosVisibles();
  if (vis.some(x => x.id === saved)) return saved;
  if (IMG.sellosCustom.length) return 'custom:' + IMG.sellosCustom[0].id;
  if (vis.length) return vis[0].id;
  return BRAND_SELLO_DEFAULT;
}
function brandLogoSrc(id) {
  if (id && id.indexOf('custom:') === 0) { const lc = findCustomLogo(id.slice(7)); return srcDe(lc); }
  if (id === 'custom') return IMG.logo || srcDe(IMG.logosCustom[0]);
  return `../assets/logos/${id}.svg`;
}
function brandSelloSrc(id) {
  if (id && id.indexOf('custom:') === 0) { const sc = findCustomSello(id.slice(7)); return srcDe(sc); }
  if (id === 'custom') return IMG.sello || srcDe(IMG.sellosCustom[0]);
  return `../assets/sellos/${id}.svg`;
}
function nombreLogoArchivo(id) { return (id && id.indexOf('custom') === 0) ? 'logo-lexfive.png' : id + '.svg'; }
function nombreSelloArchivo(id) { return (id && id.indexOf('custom') === 0) ? 'sello-lexfive.png' : id + '.svg'; }

// Muestra una imagen de branding EN GRANDE y deja decidir si se usa como
// predeterminada (antes bastaba un clic en la miniatura para aplicarla, lo que
// provocaba selecciones accidentales). El sello se muestra sobre fondo blanco
// para que se vea bien aunque el modo oscuro esté activo.
function previewBrandImage(src, titulo, nombreArchivo, onUse, useLabel, esSello) {
  if (!src) { toast('No hay imagen para mostrar.', 'error'); return; }
  const o = document.createElement('div');
  o.className = 'img-editor';
  o.innerHTML = `
    <div class="img-editor__panel" style="width:540px;max-width:100%">
      <h3>${esc(titulo || 'Vista previa')}</h3>
      <div class="big-preview${esSello ? ' big-preview--sello' : ''}"><img src="${src}" alt="${esc(titulo || '')}"></div>
      <p class="cell-sub" style="text-align:center;margin:-2px 0 12px">Revise el diseño. Si le gusta, pulse <strong>${esc(useLabel || 'Usar este')}</strong> para dejarlo como predeterminado.</p>
      <div class="img-editor__actions">
        <a class="btn btn--ghost" href="${src}" download="${esc(nombreArchivo || 'imagen')}">Descargar</a>
        <button class="btn btn--ghost" id="bpClose" type="button">Cancelar</button>
        <button class="btn btn--primary" id="bpUse" type="button">${esc(useLabel || 'Usar este')}</button>
      </div>
    </div>`;
  document.body.appendChild(o);
  const close = () => o.remove();
  o.querySelector('#bpClose').onclick = close;
  o.querySelector('#bpUse').onclick = () => { close(); if (onUse) onUse(); };
  o.onclick = e => { if (e.target === o) close(); };
}

// Aplica el logo elegido como predeterminado del bufete (se sincroniza en la nube).
async function seleccionarLogo(id) {
  if (id.indexOf('custom:') === 0) {
    const lc = findCustomLogo(id.slice(7));
    if (lc) { const s = srcDe(lc); IMG.logo = s; try { await ImgDB.set('logo', s); } catch (e) {} localStorage.setItem('lexfive_logo_custom', '1'); }
  }
  localStorage.setItem('lexfive_logo', id);
  applyLogo(id);
  pushBranding();
  if (state.view === 'sellos') renderSellos();
  toast('Logo aplicado. Se usará en todo el sistema y en todos los dispositivos.', 'success');
}
// Aplica el sello elegido como predeterminado del bufete.
async function seleccionarSello(id) {
  if (id.indexOf('custom:') === 0) {
    const sc = findCustomSello(id.slice(7));
    if (sc) { const s = srcDe(sc); IMG.sello = s; try { await ImgDB.set('sello', s); } catch (e) {} localStorage.setItem('lexfive_sello_custom', '1'); }
  }
  localStorage.setItem('lexfive_sello', id);
  pushBranding();
  if (state.view === 'sellos') renderSellos();
  toast('Sello seleccionado. Listo para memoriales y documentos.', 'success');
}

// ============================================================
//  Pestaña «Sellos y logos» — administración del branding del bufete.
//  Se separó de «Credenciales» para que cada cosa cargue por su cuenta y
//  sea más liviana y clara.
// ============================================================
async function renderSellos() {
  loading();
  // Pinta de inmediato con lo que ya está en este equipo (IndexedDB + caché
  // local) y, SOLO la primera vez por sesión, baja la versión de la nube en
  // segundo plano y refresca una vez. Antes esperaba la red (hasta 8 s) ANTES
  // de mostrar nada, por eso la pestaña "se abría lenta".
  try { await withTimeout(ensureImgCache(), 8000, 'imágenes'); } catch (e) { console.warn('Sellos: ensureImgCache falló/timeout', e); }
  const necesitaRed = !brandingHydrated;

  function paint() {
  const logoActual = pickActiveLogo(localStorage.getItem('lexfive_logo'));
  const selloActual = pickActiveSello(localStorage.getItem('lexfive_sello'));
  const logosVisibles = brandLogosVisibles();
  const sellosVisibles = brandSellosVisibles();
  const hiddenLogos = brandHidden('lexfive_logos_hidden');
  const hiddenSellos = brandHidden('lexfive_sellos_hidden');

  content().innerHTML = `
    <div class="card">
      <div class="card__body">
        <h3 class="intro-title">Sellos y logos del bufete</h3>
        <p class="cell-sub">Toque cualquier logo o sello para verlo <strong>en grande</strong> y, si le gusta, pulse <strong>Usar este</strong> para dejarlo como predeterminado. Se aplican en la página, el panel, las credenciales y los memoriales.</p>
      </div>
    </div>

    <div class="card">
      <div class="card__head"><h3>Logotipo del bufete</h3></div>
      <div class="card__body">
        <p class="cell-sub" style="margin-bottom:12px">Toque un modelo para <strong>verlo en grande</strong> y decidir si lo usa. Elimínelo con la <strong>✕</strong>, o <strong>suba su propio logo</strong>.</p>
        <div class="logo-gallery">
          ${logosVisibles.map(l => `
            <div class="logo-option ${l.id === logoActual ? 'is-selected' : ''}" data-logo="${l.id}">
              <button class="tile-del" data-del-logo="${l.id}" type="button" title="Eliminar este modelo">&times;</button>
              <img src="../assets/logos/${l.id}.svg" alt="${esc(l.nombre)}">
              <span>${esc(l.nombre)}</span>
            </div>`).join('')}
          ${IMG.logosCustom.map((lc, i) => `
            <div class="logo-option ${logoActual === 'custom:' + lc.id ? 'is-selected' : ''}" data-logo="custom:${lc.id}">
              <button class="tile-del" data-del-logo="custom:${lc.id}" type="button" title="Quitar este logo">&times;</button>
              <img src="${srcDe(lc)}" alt="Mi logo ${i + 1}">
              <span>Mi logo ${i + 1}</span>
            </div>`).join('')}
          <button class="logo-option logo-upload" id="btnUploadLogo" type="button">
            <span class="logo-upload__plus">+</span>
            <span>Subir mi logo</span>
          </button>
        </div>
        <input type="file" id="fileLogo" accept=".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp" hidden>
        <p class="cell-sub" style="margin-top:10px">Acepta <strong>SVG</strong> o foto <strong>JPG/PNG</strong>. Si sube una foto podrá <strong>recortarla, ajustar el tamaño y se convertirá a PNG</strong> automáticamente (con opción de quitar el fondo blanco). ${hiddenLogos.length ? '<button class="btn btn--ghost btn--sm" id="btnRestoreLogos" type="button" style="margin-left:8px">Restaurar modelos eliminados</button>' : ''}</p>
        <div class="brand-preview">
          <img src="${brandLogoSrc(logoActual)}" alt="Logo predeterminado" class="brand-preview__img" id="logoPreviewBig">
          <div class="brand-preview__side">
            <p class="cell-sub" style="margin:0 0 8px"><strong>Logo predeterminado actual.</strong> Es el que se usa en todo el sistema.</p>
            <button class="btn btn--ghost btn--sm" id="btnLogoBig" type="button">Ver en grande</button>
            <a class="btn btn--ghost btn--sm" id="logoDownload" href="${brandLogoSrc(logoActual)}" download="${nombreLogoArchivo(logoActual)}" style="margin-left:6px">Descargar logo</a>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card__head"><h3>Sello del bufete</h3></div>
      <div class="card__body">
        <p class="cell-sub" style="margin-bottom:12px">Toque un sello para <strong>verlo en grande</strong> y decidir si lo usa. Elimínelo con la <strong>✕</strong>, o <strong>suba el suyo</strong>. Puede descargarlo o imprimirlo para <strong>memoriales</strong>, documentos y el reverso de las credenciales.</p>
        <div class="logo-gallery">
          ${sellosVisibles.map(s => `
            <div class="logo-option sello-option ${s.id === selloActual ? 'is-selected' : ''}" data-sello="${s.id}">
              <button class="tile-del" data-del-sello="${s.id}" type="button" title="Eliminar este sello">&times;</button>
              <img src="../assets/sellos/${s.id}.svg" alt="${esc(s.nombre)}">
              <span>${esc(s.nombre)}</span>
            </div>`).join('')}
          ${IMG.sellosCustom.map((sc, i) => `
            <div class="logo-option sello-option ${selloActual === 'custom:' + sc.id ? 'is-selected' : ''}" data-sello="custom:${sc.id}">
              <button class="tile-del" data-del-sello="custom:${sc.id}" type="button" title="Quitar este sello">&times;</button>
              <img src="${srcDe(sc)}" alt="Mi sello ${i + 1}">
              <span>Mi sello ${i + 1}</span>
            </div>`).join('')}
          <button class="logo-option logo-upload" id="btnUploadSello" type="button">
            <span class="logo-upload__plus">+</span>
            <span>Subir mi sello</span>
          </button>
        </div>
        <input type="file" id="fileSello" accept=".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp" hidden>
        <p class="cell-sub" style="margin-top:10px">Acepta <strong>SVG</strong> o foto <strong>JPG/PNG</strong>. Si sube una foto podrá <strong>recortarla, ajustar el tamaño y se convertirá a PNG</strong> (con opción de quitar el fondo blanco). ${hiddenSellos.length ? '<button class="btn btn--ghost btn--sm" id="btnRestoreSellos" type="button" style="margin-left:8px">Restaurar sellos eliminados</button>' : ''}</p>
        <div class="sello-box" style="margin-top:14px">
          <img src="${brandSelloSrc(selloActual)}" alt="Sello LexFive Abogados" class="sello-img" id="selloPreview">
          <div class="sello-actions">
            <button class="btn btn--ghost btn--sm" id="btnSelloBig" type="button">Ver en grande</button>
            <a class="btn btn--ghost btn--sm" href="${brandSelloSrc(selloActual)}" download="${nombreSelloArchivo(selloActual)}" id="selloDownload">Descargar sello</a>
            <button class="btn btn--ghost btn--sm" id="btnPrintSello">Imprimir sello</button>
          </div>
        </div>
      </div>
    </div>`;

  // ---- Logo: tocar para ver en grande y elegir ----
  content().querySelectorAll('.logo-option[data-logo]').forEach(tile => tile.onclick = () => {
    const id = tile.dataset.logo;
    previewBrandImage(brandLogoSrc(id), 'Vista del logo', nombreLogoArchivo(id), () => seleccionarLogo(id), 'Usar este logo', false);
  });
  const btnLogoBig = $('#btnLogoBig');
  if (btnLogoBig) btnLogoBig.onclick = () => previewBrandImage(brandLogoSrc(logoActual), 'Logo del bufete', nombreLogoArchivo(logoActual), () => seleccionarLogo(logoActual), 'Usar este logo', false);

  // Subir mi logo (SVG tal cual; foto JPG/PNG pasa por el editor y se convierte a PNG)
  const fileLogo = $('#fileLogo');
  const btnUploadLogo = $('#btnUploadLogo');
  if (btnUploadLogo) btnUploadLogo.onclick = () => fileLogo.click();
  // Tras subir un logo, lo agrega a la galería y lo deja seleccionado. La
  // sincronización con la nube se hace en segundo plano para que la vista
  // responda al instante (antes esperaba 2 escrituras de red antes de pintar).
  const trasSubirLogo = async () => {
    let img = IMG.logo;
    if (img && img.indexOf('data:') === 0) {
      const url = await subirImagenBranding(img, 'logos');
      if (url) { img = url; IMG.logo = url; try { await ImgDB.set('logo', url); } catch (e) {} }
    }
    let entry = IMG.logosCustom.find(x => x && srcDe(x) === img);
    if (!entry && img) { entry = (img.indexOf('http') === 0) ? { id: 'c' + Date.now(), url: img } : { id: 'c' + Date.now(), img }; IMG.logosCustom.push(entry); }
    await saveLogosCustom();
    localStorage.setItem('lexfive_logo', entry ? 'custom:' + entry.id : 'custom');
    applyLogo('custom');
    renderSellos();
    pushGalerias();
    pushBranding();
  };
  if (fileLogo) fileLogo.onchange = () => {
    const f = fileLogo.files && fileLogo.files[0];
    fileLogo.value = '';
    if (!f) return;
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (f.type === 'image/svg+xml' || ext === 'svg') {
      leerImagenBufete(f, 'logo', async () => { await trasSubirLogo(); toast('Logo subido y aplicado. Se conserva junto a los anteriores.', 'success'); });
    } else {
      abrirEditorImagen(f, { titulo: 'Ajustar logo', salida: 600, quitarBlanco: false }, async (pngUrl) => {
        const ok = await guardarImagen('logo', pngUrl);
        if (!ok) { toast('No se pudo guardar la imagen. Intente con una más liviana.', 'error'); return; }
        await trasSubirLogo();
        toast('Logo ajustado, convertido a PNG y guardado junto a los anteriores.', 'success');
      });
    }
  };

  // Eliminar / restaurar logos
  content().querySelectorAll('[data-del-logo]').forEach(b => b.onclick = async (e) => {
    e.stopPropagation();
    const id = b.dataset.delLogo;
    if (!confirm('¿Eliminar este logo de la galería?')) return;
    if (id.indexOf('custom:') === 0) {
      IMG.logosCustom = IMG.logosCustom.filter(x => x && x.id !== id.slice(7));
      await saveLogosCustom();
    } else if (id === 'custom') {
      borrarImagen('logo');
    } else {
      const arr = brandHidden('lexfive_logos_hidden'); if (arr.indexOf(id) === -1) arr.push(id); localStorage.setItem('lexfive_logos_hidden', JSON.stringify(arr));
    }
    const sel = localStorage.getItem('lexfive_logo');
    let valida = false;
    if (sel && sel.indexOf('custom:') === 0) valida = !!findCustomLogo(sel.slice(7));
    else if (sel === 'custom') valida = IMG.logosCustom.length > 0;
    else valida = BRAND_LOGOS.some(l => l.id === sel) && brandHidden('lexfive_logos_hidden').indexOf(sel) === -1;
    if (!valida) {
      const vis = brandLogosVisibles();
      let nuevo;
      if (IMG.logosCustom.length) { const f = IMG.logosCustom[0]; nuevo = 'custom:' + f.id; const s = srcDe(f); IMG.logo = s; try { await ImgDB.set('logo', s); } catch (er) {} }
      else { IMG.logo = null; try { await ImgDB.del('logo'); } catch (er) {} nuevo = vis.length ? vis[0].id : BRAND_LOGO_DEFAULT; }
      localStorage.setItem('lexfive_logo', nuevo); applyLogo(nuevo);
    }
    renderSellos();
    pushGalerias();
    pushBranding();
    toast('Logo eliminado de la galería.', 'success');
  });
  const btnRestoreLogos = $('#btnRestoreLogos');
  if (btnRestoreLogos) btnRestoreLogos.onclick = () => { localStorage.removeItem('lexfive_logos_hidden'); renderSellos(); pushBranding(); toast('Modelos de logo restaurados.', 'success'); };

  // ---- Sello: tocar para ver en grande y elegir ----
  content().querySelectorAll('.sello-option[data-sello]').forEach(tile => tile.onclick = () => {
    const id = tile.dataset.sello;
    previewBrandImage(brandSelloSrc(id), 'Vista del sello', nombreSelloArchivo(id), () => seleccionarSello(id), 'Usar este sello', true);
  });
  const btnSelloBig = $('#btnSelloBig');
  if (btnSelloBig) btnSelloBig.onclick = () => previewBrandImage(brandSelloSrc(selloActual), 'Sello del bufete', nombreSelloArchivo(selloActual), () => seleccionarSello(selloActual), 'Usar este sello', true);

  // Subir mi sello (SVG tal cual; foto pasa por el editor y se convierte a PNG)
  const fileSello = $('#fileSello');
  const btnUploadSello = $('#btnUploadSello');
  if (btnUploadSello) btnUploadSello.onclick = () => fileSello.click();
  const trasSubirSello = async () => {
    let img = IMG.sello;
    if (img && img.indexOf('data:') === 0) {
      const url = await subirImagenBranding(img, 'sellos');
      if (url) { img = url; IMG.sello = url; try { await ImgDB.set('sello', url); } catch (e) {} }
    }
    let entry = IMG.sellosCustom.find(x => x && srcDe(x) === img);
    if (!entry && img) { entry = (img.indexOf('http') === 0) ? { id: 's' + Date.now(), url: img } : { id: 's' + Date.now(), img }; IMG.sellosCustom.push(entry); }
    await saveSellosCustom();
    localStorage.setItem('lexfive_sello', entry ? 'custom:' + entry.id : 'custom');
    renderSellos();
    pushGalerias();
    pushBranding();
  };
  if (fileSello) fileSello.onchange = () => {
    const f = fileSello.files && fileSello.files[0];
    fileSello.value = '';
    if (!f) return;
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (f.type === 'image/svg+xml' || ext === 'svg') {
      leerImagenBufete(f, 'sello', async () => { await trasSubirSello(); toast('Sello subido. Se conserva junto a los anteriores.', 'success'); });
    } else {
      abrirEditorImagen(f, { titulo: 'Ajustar sello', salida: 1000, quitarBlanco: true }, async (pngUrl) => {
        const ok = await guardarImagen('sello', pngUrl);
        if (!ok) { toast('No se pudo guardar la imagen. Intente con una más liviana.', 'error'); return; }
        await trasSubirSello();
        toast('Sello ajustado, convertido a PNG y guardado junto a los anteriores.', 'success');
      });
    }
  };

  // Eliminar / restaurar sellos
  content().querySelectorAll('[data-del-sello]').forEach(b => b.onclick = async (e) => {
    e.stopPropagation();
    const id = b.dataset.delSello;
    if (!confirm('¿Eliminar este sello de la galería?')) return;
    if (id.indexOf('custom:') === 0) {
      IMG.sellosCustom = IMG.sellosCustom.filter(x => x && x.id !== id.slice(7));
      await saveSellosCustom();
    } else if (id === 'custom') {
      borrarImagen('sello');
    } else {
      const arr = brandHidden('lexfive_sellos_hidden'); if (arr.indexOf(id) === -1) arr.push(id); localStorage.setItem('lexfive_sellos_hidden', JSON.stringify(arr));
    }
    const sel = localStorage.getItem('lexfive_sello');
    let valida = false;
    if (sel && sel.indexOf('custom:') === 0) valida = !!findCustomSello(sel.slice(7));
    else if (sel === 'custom') valida = IMG.sellosCustom.length > 0;
    else valida = BRAND_SELLOS.some(s => s.id === sel) && brandHidden('lexfive_sellos_hidden').indexOf(sel) === -1;
    if (!valida) {
      const vis = brandSellosVisibles();
      let nuevo;
      if (IMG.sellosCustom.length) { const f = IMG.sellosCustom[0]; nuevo = 'custom:' + f.id; const s = srcDe(f); IMG.sello = s; try { await ImgDB.set('sello', s); } catch (er) {} }
      else { IMG.sello = null; try { await ImgDB.del('sello'); } catch (er) {} nuevo = vis.length ? vis[0].id : BRAND_SELLO_DEFAULT; }
      localStorage.setItem('lexfive_sello', nuevo);
    }
    renderSellos();
    pushGalerias();
    pushBranding();
    toast('Sello eliminado de la galería.', 'success');
  });
  const btnRestoreSellos = $('#btnRestoreSellos');
  if (btnRestoreSellos) btnRestoreSellos.onclick = () => { localStorage.removeItem('lexfive_sellos_hidden'); renderSellos(); pushBranding(); toast('Sellos restaurados.', 'success'); };

  // Imprimir sello
  const bps = $('#btnPrintSello');
  if (bps) bps.onclick = () => {
    const src = brandSelloSrc(selloActual);
    const abs = src.indexOf('data:') === 0 ? src : new URL(src, location.href).href;
    const w = window.open('', '_blank');
    w.document.write('<img src="' + abs + '" style="width:6cm;height:6cm;object-fit:contain" onload="window.print();window.close()">');
    w.document.close();
  };
  } // ---- fin de paint() ----

  paint(); // muestra YA la pestaña con los datos locales
  // Solo la primera vez por sesión se baja la versión de la nube y, si llega,
  // se vuelve a pintar una vez (las siguientes aperturas ya son instantáneas).
  if (necesitaRed) hydrateBranding().then(() => { if (state.view === 'sellos') paint(); }).catch(() => {});
}

// ============================================================
//  Pestaña «Sitio web»: el bufete controla la IMAGEN principal (hero) y el
//  ESTILO DE FONDO del sitio público. Se guardan en la nube (config
//  'branding', campos heroImg/bgStyle) y la web los aplica automáticamente.
// ============================================================
async function renderSitio() {
  loading();
  try { await withTimeout(hydrateBranding(), 8000, 'branding'); } catch (e) {}
  const b = (Branding && Branding.local) ? (Branding.local() || {}) : {};
  const heroActual = b.heroImg || null;
  const sobreActual = b.sobreImg || null;
  const heroBgActual = b.heroBgImg || null;
  const heroBgOpActual = bgOpOf('lexfive_herobg_op');
  const aboutBgActual = b.aboutBgImg || null;
  const whyBgActual = b.whyBgImg || null;
  const testimonialsBgActual = b.testimonialsBgImg || null;
  const whyOpActual = bgOpOf('lexfive_whybg_op');
  const aboutOpActual = bgOpOf('lexfive_aboutbg_op');
  const testimonialsOpActual = bgOpOf('lexfive_testimonialsbg_op');

  // Caja reutilizable de vista previa + botones Subir/Ampliar/Quitar para una imagen.
  const cajaImg = (url, idSubir, idQuitar, idFile, idAmp) => `
    <div class="sello-box">
      <div class="big-preview big-preview--sello" style="max-width:340px">
        ${url ? `<img src="${esc(url)}" alt="Vista previa" id="${idAmp}Img" style="width:100%;border-radius:10px;display:block;cursor:zoom-in" title="Toque para ampliar">` : '<p class="cell-sub" style="padding:22px;text-align:center">Sin imagen propia (se usa la ilustración por defecto).</p>'}
      </div>
      <div class="sello-actions">
        <button class="btn btn--primary btn--sm" id="${idSubir}" type="button">Subir imagen</button>
        ${url ? `<button class="btn btn--ghost btn--sm" id="${idAmp}" type="button">Ampliar</button>` : ''}
        ${url ? `<button class="btn btn--ghost btn--sm" id="${idQuitar}" type="button">Quitar imagen</button>` : ''}
        <input type="file" id="${idFile}" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" hidden>
      </div>
    </div>`;

  // Deslizador de opacidad/visibilidad para una imagen de fondo (uno por sección).
  const sliderOpacidad = (id, val) => `
    <div style="display:flex;align-items:center;gap:12px;max-width:430px;margin-top:10px">
      <span class="cell-sub">Tenue</span>
      <input type="range" id="${id}" min="10" max="100" step="5" value="${val}" style="flex:1" aria-label="Visibilidad de la imagen">
      <span class="cell-sub">Visible</span>
      <strong id="${id}Val" style="min-width:46px;text-align:right">${val}%</strong>
    </div>`;

  content().innerHTML = `
    <div class="card"><div class="card__body">
      <h3 class="intro-title">Sitio web público</h3>
      <p class="cell-sub">Controle las <strong>imágenes</strong> y el <strong>fondo</strong> de la página de inicio (lexfive.netlify.app). Todo se guarda solo y se ve en la web en unos segundos. Formatos: <strong>JPG, PNG o WebP</strong> (máx. 25 MB; el sistema las optimiza al subir).</p>
    </div></div>

    <div class="card">
      <div class="card__head"><h3>Imagen principal (hero)</h3></div>
      <div class="card__body">
        <p class="cell-sub" style="margin-bottom:12px">La que aparece al costado del título, como una tarjeta. Horizontal o cuadrada (ideal ~1200×900 px). Si no sube ninguna, se muestra la ilustración por defecto.</p>
        ${cajaImg(heroActual, 'btnSubirHero', 'btnQuitarHero', 'fileHero', 'ampHero')}
      </div>
    </div>

    <div class="card">
      <div class="card__head"><h3>Imagen de «Sobre el bufete»</h3></div>
      <div class="card__body">
        <p class="cell-sub" style="margin-bottom:12px">La del recuadro de la sección «Sobre el bufete». El recuadro es alto, así que conviene una imagen <strong>vertical</strong> (ideal ~800×950 px). Si no sube ninguna, se muestra la ilustración (balanza) por defecto.</p>
        ${cajaImg(sobreActual, 'btnSubirSobre', 'btnQuitarSobre', 'fileSobre', 'ampSobre')}
      </div>
    </div>

    <div class="card">
      <div class="card__head"><h3>Imagen de fondo del encabezado</h3></div>
      <div class="card__body">
        <p class="cell-sub" style="margin-bottom:12px">Opcional: una foto detrás del título del encabezado (hero). Horizontal/panorámica (ideal ~1920×1080 px); mejor si es <strong>oscura</strong>, porque el texto va encima. El sistema le pone <strong>automáticamente una capa oscura</strong> para que el título y los botones siempre se lean. Si la quita, vuelve el fondo por defecto.</p>
        ${cajaImg(heroBgActual, 'btnSubirHeroBg', 'btnQuitarHeroBg', 'fileHeroBg', 'ampHeroBg')}
        ${sliderOpacidad('opHero', heroBgOpActual)}
      </div>
    </div>

    <div class="card">
      <div class="card__head"><h3>Imagen de fondo de secciones</h3></div>
      <div class="card__body">
        <p class="cell-sub" style="margin-bottom:14px">Opcional: una foto de fondo propia para estas secciones. La imagen <strong>reemplaza al patrón</strong> en esa sección. <strong>Cada una tiene su propio control de opacidad</strong> para que el texto se siga leyendo. Ideal horizontal/panorámica (~1920×1080 px). Si la quita, vuelve el patrón.</p>

        <h4 style="margin:0 0 8px">Sección «Razones para confiar»</h4>
        ${cajaImg(whyBgActual, 'btnSubirWhyBg', 'btnQuitarWhyBg', 'fileWhyBg', 'ampWhyBg')}
        ${sliderOpacidad('opWhy', whyOpActual)}

        <hr style="border:none;border-top:1px solid var(--line,rgba(0,0,0,.1));margin:20px 0">
        <h4 style="margin:0 0 8px">Sección «Sobre el bufete»</h4>
        ${cajaImg(aboutBgActual, 'btnSubirAboutBg', 'btnQuitarAboutBg', 'fileAboutBg', 'ampAboutBg')}
        ${sliderOpacidad('opAbout', aboutOpActual)}

        <hr style="border:none;border-top:1px solid var(--line,rgba(0,0,0,.1));margin:20px 0">
        <h4 style="margin:0 0 6px">Sección «Testimonios de clientes»</h4>
        <p class="cell-sub" style="margin-bottom:10px">Esta sección tiene <strong>texto claro sobre fondo oscuro</strong>: el sistema usa una capa oscura automática para que el texto se siga leyendo por encima de la imagen.</p>
        ${cajaImg(testimonialsBgActual, 'btnSubirTestiBg', 'btnQuitarTestiBg', 'fileTestiBg', 'ampTestiBg')}
        ${sliderOpacidad('opTesti', testimonialsOpActual)}
      </div>
    </div>`;

  // Conecta un control de subida/quitar/ampliar de imagen con su clave de branding.
  // lsKey: clave en localStorage; prefijo: carpeta en Storage; maxLado: tamaño
  // máximo del lado mayor al optimizar; idAmp: botón/imagen para ampliar.
  const wireImagen = (idSubir, idQuitar, idFile, idAmp, urlActual, titulo, lsKey, prefijo, maxLado, okMsg, quitarMsg) => {
    const file = $('#' + idFile);
    const btn = $('#' + idSubir);
    if (btn) btn.onclick = () => file.click();
    if (file) file.onchange = () => {
      const f = file.files && file.files[0]; file.value = '';
      if (!f) return;
      if (f.size > 25 * 1024 * 1024) { toast('La imagen pesa demasiado (máx. 25 MB). Use una más liviana.', 'error'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        optimizarFotoSitio(reader.result, maxLado, async (peq) => {
          toast('Subiendo imagen...', 'success');
          // Intenta guardarla en Storage (URL liviana). Si Storage no está
          // configurado o falla, NO se rechaza: se guarda la propia imagen
          // optimizada (base64) en la configuración, igual que los logos/sellos.
          // Así funciona en todos los dispositivos sin configurar nada en Supabase.
          let src = null;
          try { src = await subirImagenBranding(peq, prefijo); } catch (e) {}
          if (!src) src = peq;
          localStorage.setItem(lsKey, src);
          await pushBranding();
          toast(okMsg, 'success');
          renderSitio();
        });
      };
      reader.onerror = () => toast('No se pudo leer el archivo. Intente de nuevo.', 'error');
      reader.readAsDataURL(f);
    };
    const btnQ = $('#' + idQuitar);
    if (btnQ) btnQ.onclick = async () => {
      localStorage.setItem(lsKey, '');
      await pushBranding();
      toast(quitarMsg, 'success');
      renderSitio();
    };
    const amp = $('#' + idAmp);
    if (amp) amp.onclick = () => ampliarImagenSitio(urlActual, titulo);
    const ampImg = $('#' + idAmp + 'Img');
    if (ampImg) ampImg.onclick = () => ampliarImagenSitio(urlActual, titulo);
  };

  wireImagen('btnSubirHero', 'btnQuitarHero', 'fileHero', 'ampHero', heroActual, 'Imagen principal (hero)', 'lexfive_hero_url', 'hero', 1400,
    'Imagen del hero actualizada. Se verá en la web en unos segundos.', 'Imagen quitada. Se usará la ilustración por defecto.');
  wireImagen('btnSubirSobre', 'btnQuitarSobre', 'fileSobre', 'ampSobre', sobreActual, 'Imagen de «Sobre el bufete»', 'lexfive_sobre_url', 'sobre', 1200,
    'Imagen de «Sobre el bufete» actualizada. Se verá en la web en unos segundos.', 'Imagen quitada. Se usará la ilustración por defecto.');
  wireImagen('btnSubirHeroBg', 'btnQuitarHeroBg', 'fileHeroBg', 'ampHeroBg', heroBgActual, 'Imagen de fondo del encabezado', 'lexfive_herobg_url', 'herobg', 1920,
    'Fondo del encabezado actualizado. Se verá en la web en unos segundos.', 'Fondo del encabezado quitado. Vuelve el fondo por defecto.');
  wireImagen('btnSubirWhyBg', 'btnQuitarWhyBg', 'fileWhyBg', 'ampWhyBg', whyBgActual, 'Fondo de «Razones para confiar»', 'lexfive_whybg_url', 'whybg', 1920,
    'Fondo de la sección «Razones para confiar» actualizado. Se verá en la web en unos segundos.', 'Fondo quitado. Vuelve el patrón por defecto.');
  wireImagen('btnSubirAboutBg', 'btnQuitarAboutBg', 'fileAboutBg', 'ampAboutBg', aboutBgActual, 'Fondo de «Sobre el bufete»', 'lexfive_aboutbg_url', 'aboutbg', 1920,
    'Fondo de la sección «Sobre el bufete» actualizado. Se verá en la web en unos segundos.', 'Fondo quitado. Vuelve el patrón por defecto.');
  wireImagen('btnSubirTestiBg', 'btnQuitarTestiBg', 'fileTestiBg', 'ampTestiBg', testimonialsBgActual, 'Fondo de «Testimonios de clientes»', 'lexfive_testimonialsbg_url', 'testibg', 1920,
    'Fondo de la sección «Testimonios» actualizado. Se verá en la web en unos segundos.', 'Fondo quitado. Vuelve el patrón por defecto.');

  // Deslizadores de visibilidad: uno por cada imagen de fondo de sección.
  const wireOp = (id, lsKey) => {
    const s = $('#' + id), lbl = $('#' + id + 'Val');
    if (!s) return;
    s.oninput = () => { if (lbl) lbl.textContent = s.value + '%'; };
    s.onchange = async () => {
      localStorage.setItem(lsKey, s.value);
      await pushBranding();
      toast('Visibilidad de la imagen actualizada. Se verá en la web en unos segundos.', 'success');
    };
  };
  wireOp('opWhy', 'lexfive_whybg_op');
  wireOp('opAbout', 'lexfive_aboutbg_op');
  wireOp('opTesti', 'lexfive_testimonialsbg_op');
  wireOp('opHero', 'lexfive_herobg_op');
}

// ============================================================
//  VISTA: ÁREAS DE PRÁCTICA (carrusel de la web pública)
//  Tabla areas_practica (db/27_areas_practica.sql). Cada área tiene
//  título, descripción e imagen. Se administran aquí y se muestran
//  como carrusel en la página de inicio.
// ============================================================
let _areasCache = [];
let _areaImgTmp = '';

async function renderAreas() {
  loading();
  const { data, error } = await supabase.from('areas_practica').select('*').order('orden', { ascending: true });
  if (error) {
    content().innerHTML = `<div class="card"><div class="card__body"><p class="cell-sub">No se pudieron cargar las áreas. ¿Ya ejecutó <code>db/27_areas_practica.sql</code> en Supabase?<br>Detalle: ${esc(error.message)}</p></div></div>`;
    return;
  }
  _areasCache = data || [];

  content().innerHTML = `
    <div class="toolbar">
      <div class="spacer"></div>
      <button class="btn btn--primary" id="btnNuevaArea">${ICON.plus} Nueva área</button>
    </div>
    <div class="card"><div class="card__body" style="padding-bottom:6px">
      <p class="cell-sub">Estas áreas se muestran como <strong>carrusel</strong> en la página de inicio (lexfive.netlify.app). Puede crear, editar, ordenar (▲▼) y mostrar/ocultar cada una, con su <strong>título, descripción e imagen</strong>. Los cambios se ven en la web en unos segundos.</p>
    </div></div>
    <div id="areasList"></div>`;

  $('#btnNuevaArea').onclick = () => formArea(null);
  paintAreas();
}

function paintAreas() {
  const cont = $('#areasList');
  if (!cont) return;
  if (!_areasCache.length) {
    cont.innerHTML = `<div class="empty">${ICON.categorias}<p>No hay áreas todavía. Cree la primera con «Nueva área».</p></div>`;
    return;
  }
  cont.innerHTML = _areasCache.map((a, i) => `
    <div class="card" style="margin-bottom:12px"><div class="card__body" style="display:flex;gap:14px;align-items:center">
      <div style="width:64px;height:64px;border-radius:10px;flex-shrink:0;background:#eef1f5;background-size:cover;background-position:center;background-repeat:no-repeat;${a.imagen_url ? `background-image:url('${esc(a.imagen_url)}');` : ''}display:grid;place-items:center;color:#9aa4b2">${a.imagen_url ? '' : ICON.categorias}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <strong>${esc(a.titulo)}</strong>
          ${a.activo ? '' : '<span class="badge" style="background:#eee;color:#888">Oculta</span>'}
        </div>
        <p class="cell-sub" style="margin-top:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(a.descripcion || '')}</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;gap:4px;justify-content:flex-end">
          <button class="btn btn--ghost btn--sm js-up" data-i="${i}" ${i === 0 ? 'disabled' : ''} title="Subir">▲</button>
          <button class="btn btn--ghost btn--sm js-down" data-i="${i}" ${i === _areasCache.length - 1 ? 'disabled' : ''} title="Bajar">▼</button>
        </div>
        <div style="display:flex;gap:4px;justify-content:flex-end">
          <button class="btn btn--ghost btn--sm js-edit" data-id="${esc(a.id)}">Editar</button>
          <button class="btn btn--danger btn--sm js-del" data-id="${esc(a.id)}">Eliminar</button>
        </div>
      </div>
    </div></div>`).join('');

  cont.querySelectorAll('.js-edit').forEach(b => b.onclick = () => formArea(_areasCache.find(x => x.id === b.dataset.id)));
  cont.querySelectorAll('.js-del').forEach(b => b.onclick = () => eliminarArea(b.dataset.id));
  cont.querySelectorAll('.js-up').forEach(b => b.onclick = () => moverArea(Number(b.dataset.i), -1));
  cont.querySelectorAll('.js-down').forEach(b => b.onclick = () => moverArea(Number(b.dataset.i), 1));
}

function formArea(area) {
  const esNueva = !area;
  const imgActual = area ? (area.imagen_url || '') : '';
  _areaImgTmp = imgActual;
  const body = `
    <div class="field"><label>Título</label>
      <input type="text" id="areaTitulo" value="${esc(area ? area.titulo : '')}" placeholder="Ej: Derecho Laboral"></div>
    <div class="field"><label>Descripción</label>
      <textarea id="areaDesc" rows="3" placeholder="Breve descripción del área...">${esc(area ? area.descripcion : '')}</textarea></div>
    <div class="field"><label>Imagen (opcional)</label>
      <div id="areaImgPrev" style="margin-bottom:8px">${imgActual ? `<img src="${esc(imgActual)}" alt="" style="max-width:100%;border-radius:10px;display:block">` : '<p class="cell-sub">Sin imagen (se mostrará un ícono por defecto).</p>'}</div>
      <button type="button" class="btn btn--ghost btn--sm" id="areaSubir">Subir imagen</button>
      <button type="button" class="btn btn--ghost btn--sm" id="areaQuitar" ${imgActual ? '' : 'hidden'}>Quitar imagen</button>
      <input type="file" id="areaFile" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" hidden>
    </div>
    <label class="chk"><input type="checkbox" id="areaActivo" ${(!area || area.activo) ? 'checked' : ''}> Mostrar en la web</label>`;
  openModal(esNueva ? 'Nueva área de práctica' : 'Editar área', body, [
    { label: 'Cancelar', class: 'btn--ghost', onClick: closeModal },
    { label: 'Guardar', class: 'btn--primary', id: 'areaGuardar', onClick: () => guardarArea(area) }
  ]);

  const file = $('#areaFile');
  $('#areaSubir').onclick = () => file.click();
  file.onchange = () => {
    const f = file.files && file.files[0]; file.value = '';
    if (!f) return;
    if (f.size > 25 * 1024 * 1024) { toast('La imagen pesa demasiado (máx. 25 MB).', 'error'); return; }
    const reader = new FileReader();
    reader.onload = () => optimizarFotoSitio(reader.result, 1200, async (peq) => {
      toast('Subiendo imagen...', 'success');
      let src = null;
      try { src = await subirImagenBranding(peq, 'areas'); } catch (e) {}
      if (!src) src = peq;
      _areaImgTmp = src;
      const prev = $('#areaImgPrev');
      if (prev) prev.innerHTML = `<img src="${esc(src)}" alt="" style="max-width:100%;border-radius:10px;display:block">`;
      const q = $('#areaQuitar'); if (q) q.hidden = false;
      toast('Imagen lista. No olvide Guardar.', 'success');
    });
    reader.onerror = () => toast('No se pudo leer el archivo.', 'error');
    reader.readAsDataURL(f);
  };
  const quitar = $('#areaQuitar');
  if (quitar) quitar.onclick = () => {
    _areaImgTmp = '';
    const prev = $('#areaImgPrev'); if (prev) prev.innerHTML = '<p class="cell-sub">Sin imagen (se mostrará un ícono por defecto).</p>';
    quitar.hidden = true;
  };
}

async function guardarArea(area) {
  const titulo = ($('#areaTitulo').value || '').trim();
  if (!titulo) { toast('Escriba un título.', 'error'); return; }
  const descripcion = ($('#areaDesc').value || '').trim();
  const activo = $('#areaActivo').checked;
  const btn = $('#areaGuardar'); if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }
  let error;
  if (area) {
    ({ error } = await supabase.from('areas_practica')
      .update({ titulo, descripcion, imagen_url: _areaImgTmp || null, activo }).eq('id', area.id));
  } else {
    const orden = _areasCache.length ? Math.max(..._areasCache.map(a => a.orden || 0)) + 1 : 1;
    ({ error } = await supabase.from('areas_practica')
      .insert({ titulo, descripcion, imagen_url: _areaImgTmp || null, activo, orden }));
  }
  if (error) { toast('Error: ' + error.message, 'error'); if (btn) { btn.disabled = false; btn.textContent = 'Guardar'; } return; }
  closeModal();
  toast(area ? 'Área actualizada. Se verá en la web en unos segundos.' : 'Área creada. Se verá en la web en unos segundos.', 'success');
  renderAreas();
}

function eliminarArea(id) {
  const area = _areasCache.find(x => x.id === id);
  if (!area) return;
  openModal('Eliminar área', `<p>¿Eliminar «${esc(area.titulo)}»? Esta acción no se puede deshacer.</p>`, [
    { label: 'Cancelar', class: 'btn--ghost', onClick: closeModal },
    { label: 'Eliminar', class: 'btn--danger', onClick: async () => {
      const { error } = await supabase.from('areas_practica').delete().eq('id', id);
      if (error) { toast('Error: ' + error.message, 'error'); return; }
      closeModal(); toast('Área eliminada.', 'success'); renderAreas();
    } }
  ]);
}

async function moverArea(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= _areasCache.length) return;
  const a = _areasCache[i], b = _areasCache[j];
  let oa = a.orden, ob = b.orden;
  if (oa === ob) { oa = i + 1; ob = j + 1; } // por si quedaron empatados
  const [r1, r2] = await Promise.all([
    supabase.from('areas_practica').update({ orden: ob }).eq('id', a.id),
    supabase.from('areas_practica').update({ orden: oa }).eq('id', b.id)
  ]);
  if (r1.error || r2.error) { toast('No se pudo reordenar.', 'error'); return; }
  renderAreas();
}

async function renderCredenciales() {
  loading();
  // Pinta de inmediato con lo que hay en este equipo y refresca en segundo
  // plano (el branding la 1ª vez por sesión y la lista de credenciales si no
  // está en caché). Antes esperaba la red ANTES de pintar: por eso "se abría
  // lenta". Las siguientes aperturas en la misma sesión ya son instantáneas.
  try { await withTimeout(ensureImgCache(), 8000, 'imágenes'); } catch (e) { console.warn('Credenciales: ensureImgCache falló/timeout', e); }
  const necesitaRed = !brandingHydrated;

  function paint() {
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
    { id: 'opcion-6-LF-circuito', nombre: 'Monograma LF con circuito' },
    { id: 'ds7-balanza-binario', nombre: 'Balanza · Código binario' },
    { id: 'ds8-balanza-red', nombre: 'Balanza · Red de nodos' },
    { id: 'ds9-codigo-justicia', nombre: 'Balanza · Código </>' },
    { id: 'ds10-engranaje-ley', nombre: 'Balanza · Engranaje' },
    { id: 'ds11-LF-binario', nombre: 'Monograma LF · Binario' },
    { id: 'ds12-buho-circuito', nombre: 'Búho · Circuito' },
    { id: 'ds13-buho-hexagono', nombre: 'Búho · Hexágono tech' },
    { id: 'ds14-buho-balanza', nombre: 'Búho · Balanza' }
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
  const findCustom = cid => IMG.logosCustom.find(x => x && x.id === cid);
  const pickActiveLogo = (saved) => {
    if (saved && saved.indexOf('custom:') === 0 && findCustom(saved.slice(7))) return saved;
    if (saved === 'custom' && IMG.logosCustom.length) return 'custom:' + IMG.logosCustom[0].id;
    if (logosVisibles.some(x => x.id === saved)) return saved;
    if (IMG.logosCustom.length) return 'custom:' + IMG.logosCustom[0].id;
    if (logosVisibles.length) return logosVisibles[0].id;
    return LOGO_DEFAULT;
  };
  const logoActual = pickActiveLogo(localStorage.getItem('lexfive_logo'));
  const findSello = sid => IMG.sellosCustom.find(x => x && x.id === sid);
  const pickActiveSello = (saved) => {
    if (saved && saved.indexOf('custom:') === 0 && findSello(saved.slice(7))) return saved;
    if (saved === 'custom' && IMG.sellosCustom.length) return 'custom:' + IMG.sellosCustom[0].id;
    if (sellosVisibles.some(x => x.id === saved)) return saved;
    if (IMG.sellosCustom.length) return 'custom:' + IMG.sellosCustom[0].id;
    if (sellosVisibles.length) return sellosVisibles[0].id;
    return SELLO_DEFAULT;
  };
  const selloActual = pickActiveSello(localStorage.getItem('lexfive_sello'));

  // Devuelven la fuente correcta: archivo del repo o imagen subida por el bufete (data URL)
  const logoSrc = id => {
    if (id && id.indexOf('custom:') === 0) { const lc = findCustom(id.slice(7)); return srcDe(lc); }
    if (id === 'custom') return IMG.logo || srcDe(IMG.logosCustom[0]);
    return `../assets/logos/${id}.svg`;
  };
  const selloSrc = id => {
    if (id && id.indexOf('custom:') === 0) { const sc = findSello(id.slice(7)); return srcDe(sc); }
    if (id === 'custom') return IMG.sello || srcDe(IMG.sellosCustom[0]);
    return `../assets/sellos/${id}.svg`;
  };

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
        <h3 class="intro-title">Credencial del bufete</h3>
        <p class="cell-sub">Complete los datos y se reflejarán en la credencial en tiempo real. Luego use <strong>Imprimir / Guardar PDF</strong>. Lo que escriba queda guardado en este equipo.</p>
      </div>
    </div>

    <div class="card">
      <div class="card__body" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <img src="${logoSrc(logoActual)}" alt="Logo del bufete" style="width:54px;height:54px;object-fit:contain;border-radius:8px;background:#fff;padding:5px;border:1px solid var(--line,#e6e8ec);flex-shrink:0">
        <div style="flex:1;min-width:200px">
          <p class="cell-sub" style="margin:0">El <strong>logo</strong> (marca de agua de la credencial) y el <strong>sello</strong> del bufete se administran ahora en la pestaña <strong>«Sellos y logos»</strong>. Lo que elija allí se aplica aquí automáticamente.</p>
        </div>
        <button class="btn btn--ghost btn--sm" id="btnIrSellos" type="button" style="flex-shrink:0">Ir a Sellos y logos</button>
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
          <div class="field"><label>Válido hasta (automático · 3 años)</label><input id="cr_validez_view" type="text" readonly value="" style="background:#f4f5f7;color:#0e1b2c;font-weight:600"></div>
          <div class="field">
            <label>Foto del procurador (2,5 × 2,5)</label>
            <div style="display:flex;align-items:center;gap:8px">
              <button class="btn btn--ghost btn--sm" id="btnUploadFoto" type="button">Subir foto</button>
              ${IMG.foto ? '<button class="btn btn--ghost btn--sm" id="btnRemoveFoto" type="button">Quitar</button><img src="' + IMG.foto + '" alt="foto" style="width:34px;height:34px;border-radius:5px;object-fit:cover;border:1px solid #e6e8ec">' : '<span class="cell-sub">Se recorta cuadrada (2,5 × 2,5)</span>'}
            </div>
            <input type="file" id="fileFoto" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" hidden>
          </div>
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

    <div class="cred-wm-control">
      <label for="cr_wm">Intensidad del logo de fondo</label>
      <input type="range" id="cr_wm" min="3" max="40" step="1" value="${wmOpacityActual()}">
      <output id="cr_wm_out">${wmOpacityActual()}%</output>
    </div>
    <p class="cell-sub" style="margin:2px 0 10px">La línea punteada alrededor de cada cara es la <strong>guía de corte</strong>: imprima y recorte por ahí. Tamaño final: 9 × 6 cm.</p>
    <div class="cred-wrap" id="credPrintArea">
      <!-- ANVERSO -->
      <div class="cred-cut">
      <div class="cred-card">
        <img class="cred-wm" id="cv_logo" src="${logoSrc(logoActual)}" alt="">
        <div class="cred-band"><strong>LexFive</strong> &middot; Credencial &middot; <span id="cv_cargo_band">${esc(datos.cargo || '')}</span></div>
        <div class="cred-body">
          <div class="cred-photo" id="cv_foto">${IMG.foto ? '<img src="' + IMG.foto + '" alt="Foto del portador">' : esc(initials(datos.nombre) || '')}</div>
          <div class="cred-data">
            <div class="cred-row"><span>Nombre</span><strong id="cv_nombre">${esc(datos.nombre || '')}</strong></div>
            <div class="cred-row"><span>Carnet de identidad</span><strong id="cv_ci">${esc(datos.ci || '')}</strong></div>
            <div class="cred-row"><span>Tel. personal / oficina</span><strong id="cv_tel">${esc([datos.telPersonal, datos.telOficina].filter(Boolean).join('  /  '))}</strong></div>
          </div>
        </div>
        <div class="cred-foot">
          <div><span>Emisión</span><strong id="cv_emision">${esc(fmtFechaCorta(datos.emision))}</strong></div>
          <div class="cred-foot__qrs">
            <div class="cred-foot__qr"><img id="cv_qr" src="${qrURL(qrPersona(datos))}" alt="Verificación del bufete" class="cred-qr-cert"><small class="cred-qr-cap">Verificar</small></div>
            <div class="cred-foot__qr"><img src="${qrURL(RPA_URL)}" alt="SAJ-RPA" class="cred-qr-cert"><small class="cred-qr-cap">SAJ-RPA</small></div>
          </div>
          <div class="cred-foot__validez"><span>Válido hasta</span><strong id="cv_validez">${esc(fmtFechaCorta(addAnios(datos.emision, 3)))}</strong>
            ${selloActual ? `<img class="cred-sello-img cred-sello-img--front" src="${selloSrc(selloActual)}" alt="Sello del bufete">` : ''}
          </div>
        </div>
      </div>
      </div>

      <!-- REVERSO -->
      <div class="cred-cut">
      <div class="cred-card cred-card--back">
        <img class="cred-wm" id="cv_logo_back" src="${logoSrc(logoActual)}" alt="">
        <div class="cred-band">LexFive &middot; La Paz / El Alto - Bolivia</div>
        <p class="cred-cert" id="cv_repre">${resaltarRepre(datos.representacion || REPRE_DEFAULT)}</p>
        <p class="cred-cert cred-frase" id="cv_frase">${esc(datos.frase || '')}</p>
        <div class="cred-sign">
          <div class="cred-sign__line">Firma autorizada</div>
          <div class="cred-sign__line cred-sign__sello">
            ${selloActual ? `<img class="cred-sello-img" id="cv_sello" src="${selloSrc(selloActual)}" alt="Sello del bufete">` : ''}
            Sello del bufete
          </div>
        </div>
        <p class="cred-note">Documento de uso institucional. Si la encuentra, devuélvala a LexFive.</p>
      </div>
      </div>
    </div>

    <div class="cred-actions">
      <button class="btn btn--primary" id="btnPrintCred">${ICON.doc} Imprimir / Guardar PDF</button>
      <button class="btn btn--ghost" id="btnPreviewCred" type="button">Vista previa</button>
      <button class="btn" id="btnSaveCred">${ICON.llave || ''} ${credEditId ? 'Actualizar credencial' : 'Guardar credencial'}</button>
      ${credEditId ? '<button class="btn btn--ghost" id="btnSaveCredNew" type="button">Guardar como nueva</button><button class="btn btn--ghost" id="btnNewCred" type="button">Nueva credencial (limpiar)</button>' : ''}
    </div>
    ${credEditId ? `<p class="cell-sub" id="credEditBanner" style="text-align:center;margin-top:4px"><strong>Editando una credencial guardada.</strong> Los cambios se aplicarán al actualizar.</p>` : ''}

    <div class="card">
      <div class="card__body" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <p class="cell-sub" style="margin:0">Las credenciales que guarde quedan en la pestaña <strong>«Credenciales guardadas»</strong>, donde puede volver a imprimirlas, editarlas o eliminarlas.</p>
        </div>
        <button class="btn btn--ghost btn--sm" id="btnVerGuardadas" type="button" style="flex-shrink:0">Ver credenciales guardadas</button>
      </div>
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

  // Botón para ir a la pestaña «Sellos y logos» (la administración del branding
  // se movió allí para que esta pestaña cargue más liviana).
  const btnIrSellos = $('#btnIrSellos');
  if (btnIrSellos) btnIrSellos.onclick = () => navigate('sellos');

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
    if (cvqr) cvqr.src = qrURL(qrPersona({ nombre: v('cr_nombre'), ci: v('cr_ci'), cargo: v('cr_cargo') }));
    $('#cv_emision').textContent = fmtFechaCorta(emi);
    $('#cv_validez').textContent = fmtFechaCorta(val);
    const vv = $('#cr_validez_view'); if (vv) vv.value = fmtFechaCorta(val);
    $('#cv_frase').textContent = v('cr_frase');
    $('#cv_repre').innerHTML = resaltarRepre(v('cr_repre') || REPRE_DEFAULT);
    const fotoEl = $('#cv_foto');
    if (fotoEl && !IMG.foto) fotoEl.textContent = initials(v('cr_nombre')) || '';
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

  // Subir / quitar foto del procurador (se recorta cuadrada y se guarda en IndexedDB)
  const fileFoto = $('#fileFoto');
  const btnUploadFoto = $('#btnUploadFoto');
  if (btnUploadFoto) btnUploadFoto.onclick = () => fileFoto.click();
  if (fileFoto) fileFoto.onchange = () => {
    const f = fileFoto.files && fileFoto.files[0];
    fileFoto.value = '';
    if (!f) return;
    abrirEditorImagen(f, { titulo: 'Ajustar foto (2,5 × 2,5)', salida: 360, quitarBlanco: false, formato: 'jpeg', calidad: 0.82 }, async (png) => {
      const ok = await guardarImagen('foto', png);
      if (!ok) { toast('No se pudo guardar la foto.', 'error'); return; }
      renderCredenciales();
      toast('Foto agregada a la credencial.', 'success');
    });
  };
  const btnRemoveFoto = $('#btnRemoveFoto');
  if (btnRemoveFoto) btnRemoveFoto.onclick = () => { borrarImagen('foto'); renderCredenciales(); toast('Foto quitada.', 'success'); };

  // Selección de sello: se administra en la pestaña «Sellos y logos».
  $('#btnPrintCred').onclick = imprimirCredencial;

  // Intensidad de la marca de agua del logo (slider).
  applyWmOpacity(wmOpacityActual());
  const wm = $('#cr_wm');
  if (wm) {
    const wmOut = $('#cr_wm_out');
    wm.addEventListener('input', () => { applyWmOpacity(wm.value); if (wmOut) wmOut.textContent = wm.value + '%'; });
    wm.addEventListener('change', () => { localStorage.setItem('lexfive_wm_op', wm.value); pushBranding(); });
  }

  // Vista previa de impresión: muestra ambas caras tal como saldrán.
  const bPrev = $('#btnPreviewCred');
  if (bPrev) bPrev.onclick = () => {
    const area = document.getElementById('credPrintArea');
    if (!area) return;
    openModal('Vista previa de la credencial',
      `<p class="cell-sub" style="margin-bottom:12px">Así se imprimirá (tamaño real aproximado). Recorte por la línea punteada. Use «Imprimir / Guardar PDF» para descargarla.</p>
       <div class="cred-preview-stage">${area.innerHTML}</div>`,
      [
        { label: 'Imprimir / Guardar PDF', class: 'btn--primary', onClick: () => { closeModal(); setTimeout(imprimirCredencial, 250); } },
        { label: 'Cerrar', onClick: closeModal }
      ], true);
  };

  // Botón para ver la pestaña de credenciales guardadas (la lista se movió allí).
  const btnVerGuardadas = $('#btnVerGuardadas');
  if (btnVerGuardadas) btnVerGuardadas.onclick = () => navigate('credguardadas');


  // ---- Guardado y edición de la credencial en curso ----
  const leerCred = () => {
    const v = id => ((($('#' + id) || {}).value) || '').trim();
    const emi = v('cr_emision') || hoyISO();
    return {
      nombre: v('cr_nombre'), cargo: v('cr_cargo'), ci: v('cr_ci'),
      telPersonal: v('cr_telpers'), telOficina: v('cr_teloff'),
      emision: emi, validez: addAnios(emi, 3),
      frase: v('cr_frase'), representacion: v('cr_repre'),
      foto: IMG.foto || null
    };
  };
  const guardarCred = async (forzarNueva) => {
    const datosCred = leerCred();
    if (!datosCred.nombre) { toast('Escriba al menos el nombre antes de guardar la credencial.', 'error'); return; }
    const editando = !forzarNueva && !!credEditId;
    if (editando) datosCred.id = credEditId;
    const btns = content().querySelectorAll('#btnSaveCred,#btnSaveCredNew');
    btns.forEach(b => b.disabled = true);
    try {
      const saved = await CredStore.upsert(datosCred);
      credEditId = (saved && saved.id) || credEditId;
      toast(editando ? 'Credencial actualizada y sincronizada.' : 'Credencial guardada y sincronizada en todos los dispositivos.', 'success');
      renderCredenciales();
    } catch (e) {
      btns.forEach(b => b.disabled = false);
      toast('No se pudo sincronizar la credencial. Revise su conexión e intente de nuevo.', 'error');
    }
  };
  const bSaveCred = $('#btnSaveCred'); if (bSaveCred) bSaveCred.onclick = () => guardarCred(false);
  const bSaveCredNew = $('#btnSaveCredNew'); if (bSaveCredNew) bSaveCredNew.onclick = () => guardarCred(true);
  const bNewCred = $('#btnNewCred');
  if (bNewCred) bNewCred.onclick = () => {
    credEditId = null;
    Draft.clear('credencial');
    borrarImagen('foto');
    renderCredenciales();
    toast('Formulario listo para una credencial nueva.', 'success');
  };
  } // ---- fin de paint() ----

  paint(); // muestra YA la pestaña con los datos locales

  // Refresco en segundo plano: solo la 1ª vez por sesión baja el branding
  // (logo/sello elegido) de la nube y vuelve a pintar una vez.
  if (necesitaRed) hydrateBranding().then(() => { if (state.view === 'credenciales') paint(); }).catch(() => {});
}

// ============================================================
//  Pestaña «Credenciales guardadas»: lista de todas las credenciales
//  creadas, separada del formulario de creación (pestaña «Credenciales»).
//  Permite reimprimir, editar (abre el formulario con los datos cargados) y
//  eliminar. Pinta al instante con la caché local y refresca desde la nube.
// ============================================================
async function renderCredGuardadas() {
  loading();
  let credList = CredStore.cache;
  if (!credList) { try { credList = JSON.parse(localStorage.getItem('lexfive_cred_cache') || '[]'); } catch (e) { credList = []; } }
  credList = credList || [];

  // Carga los datos de una credencial guardada en el formulario (borrador +
  // foto) para editarla o reimprimirla en la pestaña «Credenciales».
  const prepararForm = (rec) => {
    credEditId = rec.id;
    Draft.save('credencial', {
      nombre: rec.nombre || '', cargo: rec.cargo || '', ci: rec.ci || '',
      telPersonal: rec.telPersonal || '', telOficina: rec.telOficina || '',
      emision: rec.emision || hoyISO(), validez: rec.validez || '',
      frase: rec.frase || '', representacion: rec.representacion || ''
    });
    if (rec.foto) { IMG.foto = rec.foto; ImgDB.set('foto', rec.foto).catch(() => {}); }
    else { borrarImagen('foto'); }
  };

  function paint() {
    content().innerHTML = `
      <div class="card">
        <div class="card__body" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
          <div style="flex:1;min-width:200px">
            <h3 class="intro-title">Credenciales guardadas</h3>
            <p class="cell-sub" style="margin:0">Todas las credenciales que creó. Puede <strong>volver a imprimirlas</strong>, <strong>editarlas</strong> o eliminarlas. Se guardan en la nube y se ven en todos los dispositivos del bufete.</p>
          </div>
          <button class="btn btn--primary btn--sm" id="btnNuevaCred" type="button" style="flex-shrink:0">${ICON.llave || ''} Crear nueva credencial</button>
        </div>
      </div>

      <div class="card" id="credSavedCard">
        <div class="card__head"><h3>${ICON.usuarios || ''} Guardadas (${credList.length})</h3></div>
        <div class="card__body">
          ${credList.length ? `
          ${credList.length > 3 ? '<input type="text" class="cred-search" id="credSearch" placeholder="Buscar por nombre, CI o cargo...">' : ''}
          <div class="cred-saved-list">
            ${credList.map(c => `
              <div class="cred-saved-item" data-cred="${esc(c.id)}">
                <div class="cred-saved-item__info">
                  <strong>${esc(c.nombre || 'Sin nombre')}</strong>
                  <span class="cell-sub">${esc(c.cargo || '')}${c.ci ? ' &middot; CI ' + esc(c.ci) : ''}${c.emision ? ' &middot; Emisión ' + esc(fmtFechaCorta(c.emision)) : ''}</span>
                </div>
                <div class="cred-saved-item__actions">
                  <button class="btn btn--primary btn--sm" data-cred-print="${esc(c.id)}" type="button">${ICON.doc} Imprimir / PDF</button>
                  <button class="btn btn--ghost btn--sm" data-cred-edit="${esc(c.id)}" type="button">Editar</button>
                  <button class="btn btn--danger btn--sm" data-cred-del="${esc(c.id)}" type="button">Eliminar</button>
                </div>
              </div>`).join('')}
          </div>
          <p class="cred-saved-empty-search" id="credSearchNone" style="display:none">No se encontraron credenciales con ese texto.</p>` : '<p class="cell-sub">Todavía no ha guardado ninguna credencial. Vaya a <strong>Credenciales</strong>, complete los datos y pulse <strong>Guardar credencial</strong> para conservarla aquí.</p>'}
        </div>
      </div>`;

    const btnNueva = $('#btnNuevaCred');
    if (btnNueva) btnNueva.onclick = () => { credEditId = null; Draft.clear('credencial'); borrarImagen('foto'); navigate('credenciales'); };

    // Buscador en vivo (nombre, CI o cargo).
    const cs = $('#credSearch');
    if (cs) cs.addEventListener('input', () => {
      const q = cs.value.trim().toLowerCase();
      let visibles = 0;
      content().querySelectorAll('.cred-saved-item').forEach(it => {
        const ok = !q || it.textContent.toLowerCase().includes(q);
        it.style.display = ok ? '' : 'none';
        if (ok) visibles++;
      });
      const none = $('#credSearchNone');
      if (none) none.style.display = (visibles || !q) ? 'none' : 'block';
    });

    // Reimprimir: carga la credencial en el formulario, abre la pestaña
    // «Credenciales» y manda a imprimir en cuanto el área esté lista.
    content().querySelectorAll('[data-cred-print]').forEach(b => b.onclick = () => {
      const rec = credList.find(c => c.id === b.dataset.credPrint);
      if (!rec) return;
      prepararForm(rec);
      navigate('credenciales');
      toast('Preparando la credencial para imprimir/descargar...', 'success');
      const esperar = (n = 24) => {
        if (document.getElementById('credPrintArea')) { setTimeout(imprimirCredencial, 250); return; }
        if (n <= 0) return;
        setTimeout(() => esperar(n - 1), 150);
      };
      esperar();
    });

    // Editar: carga los datos y abre el formulario.
    content().querySelectorAll('[data-cred-edit]').forEach(b => b.onclick = () => {
      const rec = credList.find(c => c.id === b.dataset.credEdit);
      if (!rec) return;
      prepararForm(rec);
      navigate('credenciales');
      toast('Credencial cargada. Edite los datos y pulse «Actualizar credencial».', 'success');
    });

    // Eliminar: borra en la nube y quita de la lista al instante.
    content().querySelectorAll('[data-cred-del]').forEach(b => b.onclick = async () => {
      if (!confirm('¿Eliminar esta credencial guardada? Se quitará de todos los dispositivos y no se podrá recuperar.')) return;
      const id = b.dataset.credDel;
      b.disabled = true;
      try {
        await CredStore.remove(id);
        if (credEditId === id) credEditId = null;
        credList = credList.filter(c => c.id !== id);
        paint();
        toast('Credencial eliminada en todos los dispositivos.', 'success');
      } catch (e) {
        b.disabled = false;
        toast('No se pudo eliminar la credencial. Revise su conexión e intente de nuevo.', 'error');
      }
    });
  }

  paint(); // muestra YA la lista con la caché local

  // Si aún no hay caché en memoria, baja la lista de la nube en segundo plano.
  if (!CredStore.cache) {
    try {
      const fresh = await withTimeout(CredStore.list(), 8000, 'credenciales');
      if (fresh && JSON.stringify(fresh) !== JSON.stringify(credList) && state.view === 'credguardadas') { credList = fresh; paint(); }
    } catch (e) { console.warn('Credenciales guardadas: lista falló/timeout', e); }
  }
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
  if (file.size > 5 * 1024 * 1024) {
    toast('La imagen pesa demasiado (máx. 5 MB). Exporte una versión más liviana.', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = async () => {
    const guardar = async (dataUrl) => {
      const ok = await guardarImagen(kind, dataUrl);
      if (!ok) { toast('No se pudo guardar la imagen. Intente con una más liviana.', 'error'); return; }
      localStorage.setItem('lexfive_' + kind, 'custom');
      if (typeof done === 'function') done();
    };
    const esSvg = file.type === 'image/svg+xml' || ext === 'svg';
    // Los SVG son livianos y escalables: se guardan tal cual. Las imágenes de
    // mapa de bits (PNG/JPG/WebP) se REDIMENSIONAN a máx. 600 px y se recomprimen,
    // para que pesen poco (subida y carga rápidas) y no inflen la base de datos.
    if (esSvg) { guardar(reader.result); }
    else { redimensionarDataUrl(reader.result, 600, (peq) => guardar(peq)); }
  };
  reader.onerror = () => toast('No se pudo leer el archivo. Intente de nuevo.', 'error');
  reader.readAsDataURL(file);
}

// Optimiza una FOTO del sitio (hero, «Sobre el bufete» o fondo): limita el lado
// mayor a "maxLado" y la recomprime en JPEG (mucho más liviana que PNG para
// fotos). Así sube rápido y, si se guarda como respaldo en la configuración, no
// infla la base de datos. Si algo falla, devuelve la imagen original.
function optimizarFotoSitio(dataUrl, maxLado, cb) {
  try {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
      if (!w || !h) { cb(dataUrl); return; }
      const escala = Math.min(1, maxLado / Math.max(w, h));
      const cw = Math.max(1, Math.round(w * escala)), ch = Math.max(1, Math.round(h * escala));
      try {
        const c = document.createElement('canvas'); c.width = cw; c.height = ch;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cw, ch); // JPEG no tiene transparencia
        ctx.drawImage(img, 0, 0, cw, ch);
        cb(c.toDataURL('image/jpeg', 0.72));
      } catch (e) { cb(dataUrl); }
    };
    img.onerror = () => cb(dataUrl);
    img.src = dataUrl;
  } catch (e) { cb(dataUrl); }
}

// Muestra una imagen del sitio EN GRANDE (como la vista en grande de los
// logos/sellos), con opción de descargarla. Se cierra tocando fuera o «Cerrar».
function ampliarImagenSitio(src, titulo) {
  if (!src) { toast('No hay imagen para mostrar.', 'error'); return; }
  const o = document.createElement('div');
  o.className = 'img-editor';
  o.innerHTML = `
    <div class="img-editor__panel" style="width:820px;max-width:100%">
      <h3>${esc(titulo || 'Vista ampliada')}</h3>
      <div class="big-preview"><img src="${src}" alt="${esc(titulo || '')}" style="max-width:100%;max-height:72vh;border-radius:10px;display:block;margin:0 auto"></div>
      <div class="img-editor__actions">
        <a class="btn btn--ghost" href="${src}" download="imagen-sitio">Descargar</a>
        <button class="btn btn--primary" id="aiClose" type="button">Cerrar</button>
      </div>
    </div>`;
  document.body.appendChild(o);
  const close = () => o.remove();
  o.querySelector('#aiClose').onclick = close;
  o.onclick = e => { if (e.target === o) close(); };
}

// Redimensiona una imagen (data URL) para que su lado mayor no supere "maxLado",
// recomprimiéndola en PNG (conserva transparencia). Si ya es pequeña o algo falla,
// devuelve la original. Reduce mucho el peso de logos/sellos subidos como foto.
function redimensionarDataUrl(dataUrl, maxLado, cb) {
  try {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
      if (!w || !h || (w <= maxLado && h <= maxLado)) { cb(dataUrl); return; }
      const esc = Math.min(maxLado / w, maxLado / h);
      const cw = Math.max(1, Math.round(w * esc)), ch = Math.max(1, Math.round(h * esc));
      try {
        const c = document.createElement('canvas'); c.width = cw; c.height = ch;
        c.getContext('2d').drawImage(img, 0, 0, cw, ch);
        cb(c.toDataURL('image/png'));
      } catch (e) { cb(dataUrl); }
    };
    img.onerror = () => cb(dataUrl);
    img.src = dataUrl;
  } catch (e) { cb(dataUrl); }
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
      // Quita el fondo claro del papel (no solo el blanco puro). Usa el canal
      // más bajo: el papel claro tiene un mínimo alto; la tinta del sello tiene
      // un mínimo bajo y se conserva. Entre BAJO y ALTO se aplica una
      // transición suave para que los bordes no queden duros.
      const ALTO = 244, BAJO = 200;
      for (let i = 0; i < p.length; i += 4) {
        const min = Math.min(p[i], p[i + 1], p[i + 2]);
        if (min >= ALTO) { p[i + 3] = 0; }
        else if (min > BAJO) { p[i + 3] = Math.round(p[i + 3] * (1 - (min - BAJO) / (ALTO - BAJO))); }
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
      const esJpeg = opts.formato === 'jpeg';
      // El JPEG no tiene transparencia: se rellena de blanco para que las zonas
      // vacías no salgan en negro. (Las fotos son opacas; pesan mucho menos en JPEG.)
      if (esJpeg) { octx.fillStyle = '#ffffff'; octx.fillRect(0, 0, SALIDA, SALIDA); }
      octx.drawImage(img, st.x * k, st.y * k, img.width * st.scale * k, img.height * st.scale * k);
      if (whiteEl.checked) quitarBlanco(octx, SALIDA);
      const url = esJpeg ? out.toDataURL('image/jpeg', opts.calidad || 0.82) : out.toDataURL('image/png');
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
  // Calcula la URL del logo. Para logos propios ('custom') usa la imagen en
  // memoria y, si no está cargada, la última imagen conocida (caché). Si no hay
  // ninguna imagen, NO se sobrescribe el estilo (así no aparece el logo por
  // defecto por un dato momentáneamente vacío).
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

// Imprime la credencial: clona las dos caras en un contenedor a nivel de <body>
// para imprimir ambas caras (anverso y reverso) juntas en una sola hoja de 4x6.
function imprimirCredencial() {
  const area = document.getElementById('credPrintArea');
  if (!area) { window.print(); return; }
  const previo = document.getElementById('printRoot');
  if (previo) previo.remove();
  const root = document.createElement('div');
  root.id = 'printRoot';
  root.innerHTML = area.innerHTML;
  document.body.appendChild(root);
  document.body.classList.add('printing');
  const limpiar = () => { document.body.classList.remove('printing'); const r = document.getElementById('printRoot'); if (r) r.remove(); };
  window.addEventListener('afterprint', limpiar, { once: true });
  let hecho = false;
  const imprimir = () => { if (hecho) return; hecho = true; window.print(); setTimeout(limpiar, 3000); };
  // Esperar a que carguen las imágenes del clon (QRs, logo, foto) antes de imprimir.
  const imgs = Array.from(root.querySelectorAll('img'));
  let pendientes = imgs.filter(i => !i.complete).length;
  if (pendientes === 0) { setTimeout(imprimir, 60); }
  else {
    const check = () => { pendientes--; if (pendientes <= 0) imprimir(); };
    imgs.forEach(i => { if (!i.complete) { i.addEventListener('load', check, { once: true }); i.addEventListener('error', check, { once: true }); } });
    setTimeout(imprimir, 2500);
  }
}

// ============================================================
//  Navegación
// ============================================================
const VIEWS = {
  dashboard: { title: 'Panel general', render: renderDashboard },
  procesos: { title: 'Procesos', render: renderProcesos },
  agenda: { title: 'Agenda y calendario', render: renderAgenda },
  reportes: { title: 'Reportes', render: renderReportes },
  tareas: { title: 'Tareas y pendientes', render: renderTareas },
  finanzas: { title: 'Honorarios y pagos', render: renderFinanzas },
  modelos: { title: 'Modelos de memoriales', render: renderModelos },
  plantillas: { title: 'Plantillas de memoriales', render: renderPlantillas },
  clientes: { title: 'Clientes', render: renderClientes },
  consultas: { title: 'Consultas recibidas', render: renderConsultas },
  blog: { title: 'Blog', render: renderBlog },
  credenciales: { title: 'Credenciales y accesos', render: renderCredenciales },
  credguardadas: { title: 'Credenciales guardadas', render: renderCredGuardadas },
  sellos: { title: 'Sellos y logos del bufete', render: renderSellos },
  sitio: { title: 'Sitio web público', render: renderSitio },
  areas: { title: 'Áreas de práctica', render: renderAreas },
  certificados: { title: 'Certificados y constancias', render: renderCertificados },
  testimonios: { title: 'Testimonios', render: renderTestimonios },
  categorias: { title: 'Categorías', render: renderCategorias },
  usuarios: { title: 'Usuarios', render: renderUsuarios },
  auditoria: { title: 'Auditoría', render: renderAuditoria },
  papelera: { title: 'Papelera', render: renderPapelera },
  misprocesos: { title: 'Mis procesos', render: renderMisProcesos },
  novedades: { title: 'Novedades de mis procesos', render: renderNovedades },
  opinion: { title: 'Mi opinión', render: renderMiOpinion }
};

const CLIENT_NAV = [
  { key: 'misprocesos', label: 'Mis procesos', icon: ICON.procesos },
  { key: 'novedades', label: 'Novedades', icon: ICON.campana },
  { key: 'opinion', label: 'Mi opinión', icon: ICON.estrella }
];

function navigate(key) {
  const isClient = state.profile.rol === 'cliente';
  if (isClient) {
    if (!['misprocesos', 'novedades', 'opinion'].includes(key)) key = 'misprocesos';
  } else {
    if (!VIEWS[key]) key = 'dashboard';
    if (['usuarios', 'auditoria', 'testimonios', 'categorias', 'papelera'].includes(key) && state.profile.rol !== 'admin') key = 'dashboard';
    if (key === 'credenciales' && !['admin', 'abogado'].includes(state.profile.rol)) key = 'dashboard';
    if (key === 'credguardadas' && !['admin', 'abogado'].includes(state.profile.rol)) key = 'dashboard';
    if (key === 'sellos' && !['admin', 'abogado'].includes(state.profile.rol)) key = 'dashboard';
    if (key === 'sitio' && !['admin', 'abogado'].includes(state.profile.rol)) key = 'dashboard';
    if (key === 'areas' && !['admin', 'abogado'].includes(state.profile.rol)) key = 'dashboard';
    if (key === 'certificados' && !['admin', 'abogado'].includes(state.profile.rol)) key = 'dashboard';
    if (key === 'finanzas' && !['admin', 'abogado'].includes(state.profile.rol)) key = 'dashboard';
  }
  state.view = key;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.key === key));
  $('#pageTitle').textContent = VIEWS[key].title;
  $('#sidebar').classList.remove('open'); $('#backdrop').classList.remove('show');
  // Render con red de seguridad: si la vista falla o tarda demasiado, en vez de
  // quedarse en "Cargando..." se muestra un aviso con botón para reintentar.
  const cont = content();
  let settled = false;
  Promise.resolve().then(() => VIEWS[key].render())
    .then(() => { settled = true; actualizarBadgesMenu(); })
    .catch((e) => {
      settled = true;
      console.error('Error al cargar la vista «' + key + '»', e);
      if (cont && state.view === key) {
        cont.innerHTML = '<div class="empty"><p>No se pudo cargar esta sección.</p><button class="btn btn--primary btn--sm" id="btnReintentarVista" type="button">Reintentar</button></div>';
        const r = document.getElementById('btnReintentarVista'); if (r) r.onclick = () => navigate(key);
      }
    });
  setTimeout(() => {
    if (settled || state.view !== key) return;
    if (cont && cont.querySelector('.loading')) {
      cont.innerHTML = '<div class="empty"><p>Esta sección está tardando más de lo normal. Puede reintentar.</p><button class="btn btn--primary btn--sm" id="btnReintentarVista" type="button">Reintentar</button></div>';
      const r = document.getElementById('btnReintentarVista'); if (r) r.onclick = () => navigate(key);
    }
  }, 15000);
}

function buildSidebar() {
  const nav = $('#sidebarNav');
  const rol = state.profile.rol;
  const items = rol === 'cliente'
    ? CLIENT_NAV
    : NAV.filter(n => {
        if (n.adminOnly) return rol === 'admin';
        if (n.credOnly) return rol === 'admin' || rol === 'abogado';
        if (n.finOnly) return rol === 'admin' || rol === 'abogado';
        return true;
      });
  nav.innerHTML = items
    .map(n => `<button class="nav-item" data-key="${n.key}">${n.icon}<span>${n.label}</span></button>`).join('');
  nav.querySelectorAll('.nav-item').forEach(b => b.onclick = () => navigate(b.dataset.key));
  actualizarBadgesMenu();
}

// Pone (o quita) un contador junto a una opción del menú lateral.
function setNavBadge(key, n) {
  const item = document.querySelector(`.nav-item[data-key="${key}"]`);
  if (!item) return;
  let badge = item.querySelector('.nav-badge');
  if (n > 0) {
    if (!badge) { badge = document.createElement('span'); badge.className = 'nav-badge'; item.appendChild(badge); }
    badge.textContent = n > 99 ? '99+' : String(n);
  } else if (badge) {
    badge.remove();
  }
}

// Actualiza los contadores del menú: tareas pendientes asignadas a quien inició
// sesión y consultas nuevas sin atender. Se llama al construir el menú y cada
// vez que se navega, para que los números estén siempre al día. Los clientes no
// tienen estas secciones, así que no se calcula nada para ellos.
async function actualizarBadgesMenu() {
  if (!state.profile || state.profile.rol === 'cliente') return;
  const rol = state.profile.rol;
  try {
    const [tareasRes, consRes] = await Promise.all([
      supabase.from('tareas').select('id', { count: 'exact', head: true })
        .neq('estado', 'hecha').eq('asignado_a', state.profile.id),
      supabase.from('consultas').select('id', { count: 'exact', head: true }).eq('estado', 'nueva')
    ]);
    setNavBadge('tareas', tareasRes.count || 0);
    setNavBadge('consultas', consRes.count || 0);
  } catch (e) { /* sin conexión: se deja como esté */ }
}

// ============================================================
//  Buscador global (procesos, clientes y consultas)
// ============================================================
async function openBuscadorGlobal() {
  openModal('Buscar en el sistema', `
    <div class="field" style="margin-bottom:6px">
      <input id="gqInput" type="search" placeholder="Escriba carátula, número, NUREJ, cliente, correo, actuación..." autocomplete="off">
    </div>
    <p class="cell-sub" id="gqHint">Busca a la vez en procesos, clientes, consultas y actuaciones.</p>
    <div id="gqResults"></div>`, [{ label: 'Cerrar', class: 'btn--ghost', onClick: closeModal }], true);

  const input = $('#gqInput');
  const cont = $('#gqResults');
  if (input) input.focus();

  // Cargar datos una sola vez al abrir
  const [{ data: procesos }, { data: clientes }, { data: consultas }, actuRes] = await Promise.all([
    supabase.from('procesos').select('*').eq('eliminado', false),
    supabase.from('clientes').select('*'),
    supabase.from('consultas').select('*').order('created_at', { ascending: false }),
    supabase.from('actuaciones').select('id,proceso_id,descripcion,fecha').order('fecha', { ascending: false }).limit(500).then(r => r, () => ({ data: [] }))
  ]);
  const P = procesos || [], C = (clientes || []).filter(c => !c.eliminado), Q = consultas || [];
  const A = (actuRes && actuRes.data) || [];
  const procById = {}; P.forEach(p => { procById[p.id] = p; });

  const pinta = () => {
    const q = (input.value || '').trim().toLowerCase();
    if (q.length < 2) { cont.innerHTML = ''; $('#gqHint').style.display = ''; return; }
    $('#gqHint').style.display = 'none';
    const match = (...vals) => vals.some(v => (v || '').toString().toLowerCase().includes(q));

    const pr = P.filter(p => match(p.caratula, p.numero, p.nurej, p.juzgado, p.parte_contraria, clienteName(p.cliente_id))).slice(0, 8);
    const cl = C.filter(c => match(c.nombre, c.documento, c.email, c.telefono)).slice(0, 6);
    const cs = Q.filter(c => match(consultaNombre(c), c.email, c.mensaje, c.area)).slice(0, 6);
    const ac = A.filter(a => match(a.descripcion, procById[a.proceso_id] && procById[a.proceso_id].caratula)).slice(0, 6);

    let html = '';
    if (pr.length) html += `<div class="gq-group"><div class="gq-group__title">${ICON.procesos} Procesos (${pr.length})</div>${pr.map(p => `
      <button class="gq-item" data-tipo="proceso" data-id="${p.id}">
        <strong>${esc(p.caratula)}</strong>
        <span class="cell-sub">${esc(p.numero || 'Sin número')} · ${esc(p.materia || '—')} · ${esc(clienteName(p.cliente_id))}</span>
      </button>`).join('')}</div>`;
    if (cl.length) html += `<div class="gq-group"><div class="gq-group__title">${ICON.clientes} Clientes (${cl.length})</div>${cl.map(c => `
      <button class="gq-item" data-tipo="cliente" data-id="${c.id}">
        <strong>${esc(c.nombre)}</strong>
        <span class="cell-sub">${esc([c.documento, c.telefono, c.email].filter(Boolean).join(' · ') || 'Sin datos de contacto')}</span>
      </button>`).join('')}</div>`;
    if (cs.length) html += `<div class="gq-group"><div class="gq-group__title">${ICON.consultas} Consultas (${cs.length})</div>${cs.map(c => `
      <button class="gq-item" data-tipo="consulta" data-id="${c.id}">
        <strong>${esc(consultaNombre(c))}</strong>
        <span class="cell-sub">${esc((c.mensaje || '').slice(0, 70))}</span>
      </button>`).join('')}</div>`;
    if (ac.length) html += `<div class="gq-group"><div class="gq-group__title">${ICON.doc} Actuaciones (${ac.length})</div>${ac.map(a => `
      <button class="gq-item" data-tipo="actuacion" data-id="${a.proceso_id}">
        <strong>${esc((a.descripcion || 'Actuación').slice(0, 70))}</strong>
        <span class="cell-sub">${esc(fmtDate(a.fecha))}${procById[a.proceso_id] ? ' · ' + esc(procById[a.proceso_id].caratula) : ''}</span>
      </button>`).join('')}</div>`;
    if (!html) html = `<p class="empty" style="padding:20px">Sin resultados para “${esc(q)}”.</p>`;
    cont.innerHTML = html;

    cont.querySelectorAll('.gq-item').forEach(b => b.onclick = () => {
      const id = b.dataset.id;
      if (b.dataset.tipo === 'proceso') openProcesoDetail(id);
      else if (b.dataset.tipo === 'actuacion') openProcesoDetail(id);
      else if (b.dataset.tipo === 'cliente') { const c = C.find(x => x.id === id); if (c) clienteForm(c); }
      else { const c = Q.find(x => x.id === id); if (c) openConsultaDetail(c); }
    });
  };
  if (input) input.oninput = pinta;
}

// ============================================================
//  Modo oscuro / claro
// ============================================================
const THEME_KEY = 'lexfive_theme';
function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  const dark = t === 'dark';
  const btn = $('#btnTheme');
  if (btn) {
    btn.innerHTML = dark ? ICON.sol : ICON.luna;
    btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
    btn.title = dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#0b131e' : '#0e1b2c');
}
function toggleTheme() {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
  applyTheme(next);
}

// ---- Tamaño de letra (accesibilidad) ----
// Escala la letra de TODO el sistema cambiando el tamaño base (rem). Se guarda
// en este equipo y se aplica también antes de pintar (ver index.html) para que
// no haya parpadeo.
const FONT_KEY = 'lexfive_fontscale';
const FONT_STEPS = [0.9, 1, 1.1, 1.25, 1.4];
function currentFontScale() {
  const v = parseFloat(localStorage.getItem(FONT_KEY));
  return FONT_STEPS.indexOf(v) !== -1 ? v : 1;
}
function applyFontScale(s) {
  document.documentElement.style.fontSize = (s * 100) + '%';
}
function changeFontScale(dir) {
  let i = FONT_STEPS.indexOf(currentFontScale());
  if (i === -1) i = 1;
  i = Math.max(0, Math.min(FONT_STEPS.length - 1, i + dir));
  const s = FONT_STEPS[i];
  try { localStorage.setItem(FONT_KEY, String(s)); } catch (e) {}
  applyFontScale(s);
  toast('Tamaño de letra: ' + Math.round(s * 100) + '%', 'success');
}

// ============================================================
//  Campanita de notificaciones (novedades dentro de la app).
//  El cliente ve "Novedad en su proceso" al entrar, sin depender del correo.
//  Si la tabla 'notificaciones' aún no se creó (db/24), la campana se oculta
//  sola y nada se rompe.
// ============================================================
const NOTIF = { items: [], unread: 0, ok: false };

async function cargarNotificaciones() {
  if (!state.profile) return;
  try {
    const { data, error } = await supabase.from('notificaciones').select('*')
      .eq('user_id', state.profile.id)
      .order('created_at', { ascending: false }).limit(25);
    if (error) throw error;
    NOTIF.items = data || [];
    NOTIF.unread = NOTIF.items.filter(n => !n.leida).length;
    NOTIF.ok = true;
  } catch (e) {
    NOTIF.ok = false; // la tabla no existe todavía: ocultamos la campana
  }
  pintarCampana();
}

function pintarCampana() {
  const bell = $('#btnNotif');
  if (!bell) return;
  bell.hidden = !NOTIF.ok;
  const c = bell.querySelector('.notif-bell__count');
  if (c) {
    if (NOTIF.ok && NOTIF.unread > 0) { c.hidden = false; c.textContent = NOTIF.unread > 9 ? '9+' : String(NOTIF.unread); }
    else c.hidden = true;
  }
  const panel = $('#notifPanel');
  if (panel && panel.classList.contains('open')) renderNotifPanel(panel);
}

function notifListHTML() {
  if (!NOTIF.items.length) return '<div class="notif-empty">No tiene notificaciones.</div>';
  return NOTIF.items.map(n => `
    <button class="notif-item ${n.leida ? '' : 'is-unread'}" data-id="${n.id}" type="button">
      <div class="notif-item__title">${esc(n.titulo || 'Notificación')}</div>
      ${n.cuerpo ? `<div class="notif-item__body">${esc(n.cuerpo)}</div>` : ''}
      <div class="notif-item__time">${fmtDateTime(n.created_at)}</div>
    </button>`).join('');
}

function renderNotifPanel(panel) {
  panel.innerHTML = `
    <div class="notif-panel__head">
      <strong>Notificaciones</strong>
      ${NOTIF.unread ? '<button class="btn btn--ghost btn--sm" id="notifReadAll" type="button">Marcar leídas</button>' : ''}
    </div>
    <div class="notif-list">${notifListHTML()}</div>`;
  panel.querySelectorAll('.notif-item').forEach(it => it.onclick = () => marcarNotifLeida(it.dataset.id));
  const ra = panel.querySelector('#notifReadAll'); if (ra) ra.onclick = marcarTodasLeidas;
}

function toggleNotifPanel() {
  let panel = $('#notifPanel');
  if (!panel) { panel = document.createElement('div'); panel.id = 'notifPanel'; panel.className = 'notif-panel'; document.body.appendChild(panel); }
  if (panel.classList.contains('open')) { panel.classList.remove('open'); return; }
  renderNotifPanel(panel);
  const bell = $('#btnNotif');
  const r = bell.getBoundingClientRect();
  panel.style.top = (r.bottom + 8) + 'px';
  panel.style.right = Math.max(8, window.innerWidth - r.right) + 'px';
  panel.classList.add('open');
}

async function marcarNotifLeida(id) {
  const n = NOTIF.items.find(x => x.id === id);
  if (n && !n.leida) {
    n.leida = true; NOTIF.unread = Math.max(0, NOTIF.unread - 1); pintarCampana();
    try { await supabase.from('notificaciones').update({ leida: true }).eq('id', id); } catch (e) {}
  }
}

async function marcarTodasLeidas() {
  const ids = NOTIF.items.filter(n => !n.leida).map(n => n.id);
  NOTIF.items.forEach(n => n.leida = true); NOTIF.unread = 0; pintarCampana();
  try { if (ids.length) await supabase.from('notificaciones').update({ leida: true }).in('id', ids); } catch (e) {}
}

function subscribeNotifsRealtime() {
  try {
    supabase.channel('notif-' + state.profile.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: 'user_id=eq.' + state.profile.id }, () => cargarNotificaciones())
      .subscribe();
  } catch (e) {}
}

function initNotifBell() {
  const actions = $('#topbarActions');
  if (!actions || $('#btnNotif')) return;
  const btn = document.createElement('button');
  btn.className = 'btn btn--ghost btn--sm notif-bell';
  btn.id = 'btnNotif';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Notificaciones');
  btn.title = 'Notificaciones';
  btn.innerHTML = ICON.campana + '<span class="notif-bell__count" hidden></span>';
  btn.hidden = true;
  btn.onclick = (e) => { e.stopPropagation(); toggleNotifPanel(); };
  actions.insertBefore(btn, actions.firstChild);
  document.addEventListener('click', (e) => {
    const panel = $('#notifPanel');
    if (panel && panel.classList.contains('open') && !panel.contains(e.target) && !btn.contains(e.target)) panel.classList.remove('open');
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') cargarNotificaciones(); });
  cargarNotificaciones();
  subscribeNotifsRealtime();
}

// ============================================================
//  Arranque
// ============================================================

// Muestra un estado amable mientras se conecta con la base. Incluye botones
// para reintentar de inmediato o cerrar sesión, para que el usuario nunca se
// quede atrapado en un "Cargando..." que no avanza.
function mostrarEstadoArranque(intento) {
  const cont = content();
  if (!cont) return;
  cont.innerHTML = `
    <div class="loading" style="flex-direction:column;gap:14px;text-align:center;max-width:440px;margin:64px auto;">
      <div class="spinner"></div>
      <div>
        <p style="margin:0 0 6px;font-weight:600;">Conectando con la base de datos…</p>
        <p class="cell-sub" style="margin:0;">La base puede tardar unos segundos en «despertar» (plan gratuito). Reintentando automáticamente… (intento ${intento})</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
        <button class="btn btn--primary btn--sm" id="btnReintentarArranque" type="button">Reintentar ahora</button>
        <button class="btn btn--ghost btn--sm" id="btnSalirArranque" type="button">Cerrar sesión</button>
      </div>
    </div>`;
  const salir = document.getElementById('btnSalirArranque');
  if (salir) salir.onclick = () => signOut();
}

// Espera "ms" milisegundos, pero se interrumpe antes si el usuario pulsa
// "Reintentar ahora".
function esperarOReintento(ms) {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    const btn = document.getElementById('btnReintentarArranque');
    if (btn) btn.onclick = () => { clearTimeout(t); resolve(); };
  });
}

// Carga el perfil y los usuarios con reintentos. Solo devuelve null cuando NO
// hay sesión válida (en ese caso requireAuth ya redirige al login o cierra
// sesión). Si la base no responde, reintenta indefinidamente con una espera
// progresiva en vez de quedarse colgado.
async function arrancarSesion() {
  let intento = 0;
  while (true) {
    intento++;
    try {
      const profile = await requireAuth();
      if (!profile) return null;
      state.profile = profile;
      await withTimeout(loadProfiles(), 12000, 'usuarios');
      return profile;
    } catch (e) {
      console.warn('Arranque: la base no respondió a tiempo, reintentando…', e);
      mostrarEstadoArranque(intento);
      // Espera progresiva: 3s, 6s, 9s… (máximo 9s) antes de reintentar.
      await esperarOReintento(Math.min(3000 * intento, 9000));
    }
  }
}

(async function init() {
  const profile = await arrancarSesion();
  if (!profile) return;

  // Cabecera de usuario
  $('#userName').textContent = profile.nombre;
  $('#userRol').textContent = ROLES[profile.rol] || profile.rol;
  $('#userAvatar').textContent = initials(profile.nombre);

  buildSidebar();

  // Buscador global en la barra superior (solo personal, no clientes).
  if (profile.rol !== 'cliente') {
    const actions = $('#topbarActions');
    if (actions) {
      const btn = document.createElement('button');
      btn.className = 'btn btn--ghost btn--sm topbar__search';
      btn.id = 'btnBuscarGlobal';
      btn.innerHTML = ICON.buscar + '<span>Buscar</span>';
      btn.setAttribute('data-tip', 'Busque a la vez en procesos, clientes y consultas (atajo: Ctrl/⌘ + K).');
      btn.onclick = () => openBuscadorGlobal();
      actions.appendChild(btn);
    }
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); openBuscadorGlobal(); }
    });
  }

  // Campanita de notificaciones (novedades dentro de la app), para todos los roles.
  initNotifBell();

  // Registrar el service worker para que el sistema se pueda instalar como
  // app en el celular y funcione mejor (PWA).
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
    // El SW avisa cuando detecta una versión nueva del panel (app.js/CSS) en el
    // servidor. Mostramos una barra discreta con un botón para recargar, así el
    // usuario siempre puede pasar a la última versión sin tener que forzar nada.
    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e.data && e.data.tipo === 'lexfive-nueva-version') mostrarAvisoActualizacion();
    });
  }

  // Aplica el logo elegido por el bufete. Primero, pintado rápido con la
  // última versión conocida en este equipo; luego se refresca desde la nube
  // para que coincida con lo elegido en cualquier otro dispositivo.
  try {
    const cache = Branding.local();
    if (cache.logoImg) IMG.logo = cache.logoImg;
    if (cache.logoId) applyLogo(cache.logoId);
    else { const lg = localStorage.getItem('lexfive_logo'); if (lg) applyLogo(lg); }
  } catch (e) {}
  Branding.load().then(b => {
    if (!b) return;
    if (b.logoImg) IMG.logo = b.logoImg;
    if (b.logoId) { localStorage.setItem('lexfive_logo', b.logoId); applyLogo(b.logoId); }
  }).catch(() => {});

  // Escuchar cambios de logo/sello en vivo desde otros dispositivos.
  subscribeBrandingRealtime();

  // Respaldo del tiempo real: al volver a esta pestaña/app, refresca el logo y
  // el sello desde la nube. Así se actualiza aunque el canal en vivo no esté
  // disponible (p. ej. si aún no se ejecutó db/18 o el navegador lo bloquea).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    Branding.load().then(b => {
      if (!b) return;
      if (b.logoImg) IMG.logo = b.logoImg;
      if (b.selloImg) IMG.sello = b.selloImg;
      if (b.logoId) { localStorage.setItem('lexfive_logo', b.logoId); applyLogo(b.logoId); }
    }).catch(() => {});
  });

  // Aplica la intensidad guardada del logo de fondo y activa el aviso de "sin conexión".
  applyWmOpacity(wmOpacityActual());
  initOfflineIndicator();

  // Manejo global de errores: en vez de fallar en silencio, avisa con un mensaje
  // amable (sin abrumar: máximo uno cada 8 segundos).
  let _lastErr = 0;
  const avisoError = () => {
    const now = Date.now();
    if (now - _lastErr < 8000) return;
    _lastErr = now;
    if (!navigator.onLine) return; // el banner de "sin conexión" ya lo cubre
    toast('Ocurrió un problema. Si persiste, recargue la página.', 'error');
  };
  window.addEventListener('error', avisoError);
  window.addEventListener('unhandledrejection', avisoError);

  // Eventos globales
  // Al cerrar sesión, llevar al sitio web público (front-end) en vez de a la
  // pantalla de login. Así es coherente con el cierre por inactividad y con el
  // clic en el logo, que también van al sitio público. Lo autoguardado se
  // conserva y se puede recuperar al volver a iniciar sesión.
  $('#btnLogout').onclick = () => signOutTo('../index.html');
  initTooltipEngine();

  // Modo claro/oscuro: sincroniza el botón con el tema ya aplicado y permite alternarlo.
  applyTheme(currentTheme());
  const btnTheme = $('#btnTheme');
  if (btnTheme) btnTheme.onclick = toggleTheme;

  // Tamaño de letra (accesibilidad): botones A− / A+ en la barra superior.
  applyFontScale(currentFontScale());
  const bFontMinus = $('#btnFontMinus'); if (bFontMinus) bFontMinus.onclick = () => changeFontScale(-1);
  const bFontPlus = $('#btnFontPlus'); if (bFontPlus) bFontPlus.onclick = () => changeFontScale(1);

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
      alert('Su sesión se cerró automáticamente por 10 minutos de inactividad.\n\nTranquilo: lo que estaba escribiendo (descripción del caso, memorial, etc.) quedó guardado y podrá recuperarlo al volver a iniciar sesión.');
      await signOutTo('../index.html');
    }, IDLE_MS);
  }
  ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'].forEach(ev =>
    document.addEventListener(ev, resetIdle, { passive: true }));
  resetIdle();

  // Vista inicial según el rol
  navigate(profile.rol === 'cliente' ? 'misprocesos' : 'dashboard');
  if (profile.rol === 'cliente') updateNovedadesBadge();

  // Recordatorio automático de audiencias vencidas/próximas al abrir el panel.
  if (profile.rol !== 'cliente') {
    const lastRemind = Number(localStorage.getItem('lexfive_remind_ts') || 0);
    const now = Date.now();
    // Solo avisar una vez cada 4 horas (para no molestar en cada recarga).
    if (now - lastRemind > 4 * 60 * 60 * 1000) {
      (async () => {
        try {
          const { data: pp } = await supabase.from('procesos').select('caratula,proxima_audiencia,estado')
            .eq('eliminado', false).not('proxima_audiencia', 'is', null);
          if (!pp || !pp.length) return;
          const ahora = new Date();
          const en7 = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);
          const vencidas = pp.filter(p => new Date(p.proxima_audiencia) < ahora && !['archivado', 'concluido'].includes(p.estado));
          const proximas = pp.filter(p => { const d = new Date(p.proxima_audiencia); return d >= ahora && d <= en7 && !['archivado', 'concluido'].includes(p.estado); });
          if (vencidas.length || proximas.length) {
            const msgs = [];
            if (vencidas.length) msgs.push(vencidas.length + ' audiencia(s) VENCIDA(S)');
            if (proximas.length) msgs.push(proximas.length + ' audiencia(s) en los próximos 7 días');
            toast('Atención: ' + msgs.join(' y ') + '. Revise el panel general.', vencidas.length ? 'error' : '');
            localStorage.setItem('lexfive_remind_ts', String(now));
          }
        } catch (e) {}
      })();
    }
  }
})();
