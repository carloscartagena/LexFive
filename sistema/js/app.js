// ============================================================
//  LexFive — Sistema de Gestión Legal · Lógica principal
// ============================================================
import { supabase } from './supabase.js';
import { requireAuth, getProfile, signOut, signOutTo, logAccion, can, withTimeout, mfaFactors, mfaEnroll, mfaVerify, mfaUnenroll } from './auth.js';
import { ROLES, ESTADOS, MATERIAS, WHATSAPP, ABOGADOS, VAPID_PUBLIC_KEY } from './config.js';

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
  llave: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 2l-2 2m-3.5 3.5L21 2m-5.5 5.5a3.5 3.5 0 1 1-5 5 3.5 3.5 0 0 1 5-5zm0 0L19 4m0 0l2 2m-2-2-2 2"/><circle cx="8.5" cy="15.5" r="5.5"/></svg>',
  sello: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="5"/><path d="M12 8v0M4 21h16M5 21l1.2-4.2a2 2 0 0 1 1.9-1.3h7.8a2 2 0 0 1 1.9 1.3L19 21"/></svg>',
  buscar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
  descargar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>',
  grafico: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="13" width="3" height="4"/></svg>',
  tareas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 11l2 2 4-4"/><rect x="3" y="4" width="18" height="16" rx="2"/></svg>',
  dinero: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9v6M18 9v6"/></svg>',
  plantilla: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h5M8 17h8"/></svg>',
  campana: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
  papelera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6"/></svg>',
  sol: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8"/></svg>',
  luna: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>'
};

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
  { key: 'sellos', label: 'Sellos y logos', icon: ICON.sello, credOnly: true },
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
// Enlace que codifica el QR personal del procurador: abre la página de verificación del bufete con sus datos.
function qrPersona(d) {
  d = d || {};
  return SITIO_URL + 'verificar.html?n=' + encodeURIComponent(d.nombre || '') + '&ci=' + encodeURIComponent(d.ci || '') + '&rol=' + encodeURIComponent(d.cargo || 'Procurador');
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
function fmtHora(d) {
  if (!d) return '';
  const x = new Date(d);
  if (isNaN(x)) return '';
  return x.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
}
function initials(name) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
// Valida de forma sencilla un correo electrónico (algo@algo.dominio).
function esEmailValido(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());
}

// ============================================================
//  Utilidades de exportación (descargas, calendario .ics, CSV)
// ============================================================
// Descarga un contenido como archivo (sin servidor).
function descargarArchivo(nombre, contenido, mime = 'text/plain;charset=utf-8') {
  const blob = (contenido instanceof Blob) ? contenido : new Blob([contenido], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// --- Operaciones de Storage con TIEMPO LÍMITE ---------------------------------
// Suben/descargan documentos sin riesgo de quedarse colgados para siempre. Si la
// red no responde a tiempo, devuelven { error } (no lanzan), para que los botones
// se reactiven y el usuario reciba un aviso, en vez de un "Subiendo..." eterno.
async function subirDocumento(path, file) {
  try {
    return await withTimeout(supabase.storage.from('documentos').upload(path, file), 30000, 'subida de archivo');
  } catch (e) {
    return { error: (e instanceof Error) ? e : new Error(String(e)) };
  }
}
async function enlaceDocumento(path) {
  try {
    return await withTimeout(supabase.storage.from('documentos').createSignedUrl(path, 120), 15000, 'enlace de descarga');
  } catch (e) {
    return { error: (e instanceof Error) ? e : new Error(String(e)) };
  }
}

// Devuelve la fuente de una imagen de galería: la URL de Storage (nuevo) o el
// data URL antiguo en base64 (compatibilidad). Así conviven los dos formatos.
function srcDe(item) { return (item && (item.url || item.img)) || ''; }

// Sube una imagen (data URL) al bucket PÚBLICO "branding" de Storage y devuelve
// su URL pública. Si algo falla (p. ej. el bucket aún no existe, o no hay red),
// devuelve null y el sistema sigue funcionando guardando la imagen como antes
// (base64), sin romperse. Requiere db/23_branding_storage.sql.
async function subirImagenBranding(dataUrl, prefijo) {
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

function pad2(n) { return String(n).padStart(2, '0'); }

// Convierte una fecha a formato UTC para iCalendar (AAAAMMDDTHHMMSSZ).
function icsFecha(d) {
  return d.getUTCFullYear() + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate()) +
    'T' + pad2(d.getUTCHours()) + pad2(d.getUTCMinutes()) + pad2(d.getUTCSeconds()) + 'Z';
}
function icsEscape(s) {
  return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

// Genera el contenido .ics de la audiencia/plazo de un proceso (1 hora de duración).
function buildICS(proc) {
  if (!proc.proxima_audiencia) return null;
  const inicio = new Date(proc.proxima_audiencia);
  const fin = new Date(inicio.getTime() + 60 * 60 * 1000);
  const resumen = 'Audiencia: ' + (proc.caratula || 'Proceso');
  const partes = [];
  if (proc.numero) partes.push('Nº ' + proc.numero);
  if (proc.juzgado) partes.push(proc.juzgado);
  if (proc.materia) partes.push(proc.materia);
  const desc = partes.join(' · ');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LexFive//Sistema de Gestion//ES', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    'UID:lexfive-' + proc.id + '@lexfive',
    'DTSTAMP:' + icsFecha(new Date()),
    'DTSTART:' + icsFecha(inicio),
    'DTEND:' + icsFecha(fin),
    'SUMMARY:' + icsEscape(resumen),
    'DESCRIPTION:' + icsEscape(desc),
    proc.juzgado ? 'LOCATION:' + icsEscape(proc.juzgado) : '',
    'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEscape(resumen), 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'
  ].filter(Boolean).join('\r\n');
}

// Descarga la audiencia de un proceso como archivo de calendario.
function descargarICS(proc) {
  const ics = buildICS(proc);
  if (!ics) { toast('Este proceso no tiene fecha de audiencia.', 'error'); return; }
  const nombre = 'audiencia-' + (proc.caratula || 'proceso').toLowerCase().replace(/[^\w]+/g, '-').slice(0, 40) + '.ics';
  descargarArchivo(nombre, ics, 'text/calendar;charset=utf-8');
  toast('Evento descargado. Ábralo para agregarlo a su calendario.', 'success');
}

// Genera un enlace para agregar el evento a Google Calendar en UN CLIC
// (abre el formulario de nuevo evento ya pre-rellenado). Dura 1 hora.
function googleCalURL(inicio, resumen, detalles, lugar) {
  if (!inicio || isNaN(inicio)) return '';
  const fin = new Date(inicio.getTime() + 60 * 60 * 1000);
  const fechas = icsFecha(inicio) + '/' + icsFecha(fin); // formato UTC AAAAMMDDTHHMMSSZ
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE'
    + '&text=' + encodeURIComponent(resumen || 'Evento')
    + '&dates=' + fechas
    + '&details=' + encodeURIComponent(detalles || '')
    + (lugar ? '&location=' + encodeURIComponent(lugar) : '');
}

// Suma "n" días HÁBILES a una fecha (omite sábados y domingos).
// Nota: no contempla feriados (varían por año y por departamento).
function sumarDiasHabiles(fechaBase, n) {
  const d = new Date(fechaBase);
  if (isNaN(d)) return null;
  let restantes = Math.max(0, parseInt(n, 10) || 0);
  while (restantes > 0) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) restantes--;
  }
  return d;
}

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

// Formato de dinero (Bolivianos por defecto).
function fmtMoneda(monto, moneda = 'Bs') {
  const n = Number(monto || 0);
  return (moneda || 'Bs') + ' ' + n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Convierte filas de clientes a CSV (compatible con Excel).
function clientesToCSV(rows) {
  const cab = ['Nombre', 'Documento', 'Teléfono', 'Correo', 'Dirección', 'Notas'];
  const celda = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const lineas = [cab.map(celda).join(';')];
  rows.forEach(c => lineas.push([c.nombre, c.documento, c.telefono, c.email, c.direccion, c.notas].map(celda).join(';')));
  return '\ufeff' + lineas.join('\r\n');
}

// Convierte filas de honorarios + pagos a CSV.
function honorariosToCSV(honorarios, pagos) {
  const cab = ['Tipo', 'Proceso', 'Cliente', 'Monto', 'Fecha', 'Descripción'];
  const celda = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const lineas = [cab.map(celda).join(';')];
  (honorarios || []).forEach(h => lineas.push(['Honorario', h.proceso || '', h.cliente || '', h.monto, h.fecha || '', h.descripcion || ''].map(celda).join(';')));
  (pagos || []).forEach(p => lineas.push(['Pago', p.proceso || '', p.cliente || '', p.monto, p.fecha || '', p.descripcion || ''].map(celda).join(';')));
  return '\ufeff' + lineas.join('\r\n');
}

// Convierte un monto a su importe en letras para los recibos.
// Ej: 1500.50 -> "MIL QUINIENTOS 50/100 BOLIVIANOS".
function montoEnLetras(monto, moneda) {
  const NUM = Number(monto || 0);
  const entero = Math.floor(Math.abs(NUM));
  const centavos = Math.round((Math.abs(NUM) - entero) * 100);
  const UNI = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
    'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE',
    'VEINTE', 'VEINTIÚN', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
  const DEC = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const CEN = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
  const tresCifras = (n) => {
    if (n === 100) return 'CIEN';
    let txt = '';
    const c = Math.floor(n / 100), resto = n % 100;
    if (c) txt += CEN[c] + ' ';
    if (resto <= 29) txt += UNI[resto];
    else { const d = Math.floor(resto / 10), u = resto % 10; txt += DEC[d] + (u ? ' Y ' + UNI[u] : ''); }
    return txt.trim();
  };
  const enteroALetras = (n) => {
    if (n === 0) return 'CERO';
    let txt = '';
    const millones = Math.floor(n / 1000000);
    const miles = Math.floor((n % 1000000) / 1000);
    const resto = n % 1000;
    if (millones) txt += (millones === 1 ? 'UN MILLÓN' : tresCifras(millones) + ' MILLONES') + ' ';
    if (miles) txt += (miles === 1 ? 'MIL' : tresCifras(miles) + ' MIL') + ' ';
    if (resto) txt += tresCifras(resto);
    return txt.trim();
  };
  const m = (moneda || 'Bs').toUpperCase();
  const esDolar = m.includes('USD') || m.includes('$');
  const nombre = esDolar
    ? (entero === 1 ? 'DÓLAR AMERICANO' : 'DÓLARES AMERICANOS')
    : (entero === 1 ? 'BOLIVIANO' : 'BOLIVIANOS');
  return `${enteroALetras(entero)} ${String(centavos).padStart(2, '0')}/100 ${nombre}`;
}

// ============================================================
//  Paginación reutilizable para listas largas (cliente)
// ============================================================
const PAGE_SIZE = 25;

// Calcula la "rebanada" visible y los datos de la página actual.
function paginar(rows, page, perPage = PAGE_SIZE) {
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const p = Math.min(Math.max(1, page || 1), pages);
  const from = (p - 1) * perPage;
  return { slice: rows.slice(from, from + perPage), page: p, pages, total, from };
}

// HTML de la barra de paginación (no se muestra si todo cabe en una página).
function pagerHTML(info) {
  if (info.total === 0) return '';
  if (info.pages <= 1) return `<div class="pager"><span class="pager__info">${info.total} registro${info.total === 1 ? '' : 's'}</span></div>`;
  const desde = info.from + 1, hasta = info.from + info.slice.length;
  return `<div class="pager">
    <span class="pager__info">${desde}–${hasta} de ${info.total}</span>
    <div class="pager__btns">
      <button class="btn btn--ghost btn--sm" data-pg="prev" ${info.page <= 1 ? 'disabled' : ''}>&larr; Anterior</button>
      <span class="pager__page">Pág. ${info.page} / ${info.pages}</span>
      <button class="btn btn--ghost btn--sm" data-pg="next" ${info.page >= info.pages ? 'disabled' : ''}>Siguiente &rarr;</button>
    </div>
  </div>`;
}

// Conecta los botones de la paginación dentro de un contenedor.
function wirePager(container, info, onGo) {
  if (!container) return;
  container.querySelectorAll('[data-pg]').forEach(b => b.onclick = () => {
    if (b.disabled) return;
    onGo(b.dataset.pg === 'next' ? info.page + 1 : info.page - 1);
  });
}

// Gráfico de barras horizontal simple (sin librerías).
function barChart(items) {
  const datos = (items || []).filter(i => i.value > 0);
  if (!datos.length) return '<p class="cell-sub" style="padding:6px 0">Sin datos para mostrar.</p>';
  const max = Math.max.apply(null, datos.map(i => i.value));
  return '<div class="bars">' + datos.map(i => `
    <div class="bar-row">
      <div class="bar-row__label" title="${esc(i.label)}">${esc(i.label)}</div>
      <div class="bar-row__track"><div class="bar-row__fill ${i.cls || ''}" style="width:${Math.max(6, Math.round(i.value / max * 100))}%"></div></div>
      <div class="bar-row__val">${i.value}</div>
    </div>`).join('') + '</div>';
}

function toast(msg, type = '') {
  const t = $('#toast');
  t.textContent = msg; t.className = type; void t.offsetWidth; t.classList.add('show', type);
  setTimeout(() => t.classList.remove('show'), 3200);
}

// Indicador discreto de "borrador guardado" para los formularios con
// autoguardado, para tranquilidad del usuario en textos largos.
let _autosaveTimer = null;
function flashAutosave() {
  let el = document.getElementById('autosaveTip');
  if (!el) {
    el = document.createElement('div');
    el.id = 'autosaveTip';
    el.className = 'autosave-tip';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.textContent = '\u2713 Borrador guardado';
    document.body.appendChild(el);
  }
  el.classList.add('show');
  clearTimeout(_autosaveTimer);
  _autosaveTimer = setTimeout(() => el.classList.remove('show'), 1500);
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
  // Accesibilidad: llevar el foco al modal para teclado y lectores de pantalla.
  try {
    const m = $('#modal');
    const focusable = m.querySelector('input, select, textarea, button:not(.modal__close)') || $('#modalClose');
    if (focusable) setTimeout(() => focusable.focus(), 50);
  } catch (e) {}
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
  return {
    logoId: logoId,
    logoImg: logoImg,
    selloId: selloId,
    selloImg: selloImg,
    wmOpacity: wmOpacityActual(),
    logosHidden: readList('lexfive_logos_hidden'),
    sellosHidden: readList('lexfive_sellos_hidden')
  };
}

// Empuja la configuración actual a la nube y avisa si no se pudo.
async function pushBranding() {
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
  const onChange = () => { Draft.save(draftName, collect()); flashAutosave(); };
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
async function loadClientes() {
  const { data } = await supabase.from('clientes').select('*').order('nombre');
  // Oculta los clientes enviados a la papelera (columna "eliminado", migración 16).
  // El filtro en el navegador funciona aunque la columna aún no exista.
  state.clientes = (data || []).filter(c => !c.eliminado);
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
    supabase.from('procesos').select('id', { count: 'exact', head: true }).eq('materia', nombre).eq('eliminado', false),
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

// Abre un modal para recordar el COBRO de un saldo pendiente a un cliente,
// por WhatsApp y/o correo, con un mensaje cordial pre-redactado.
function recordarCobro(cli, saldo) {
  if (!cli) return;
  const texto = `Estimado/a ${cli.nombre}:\n\nLe recordamos cordialmente que su cuenta con LexFive Abogados presenta un saldo pendiente de ${fmtMoneda(saldo)}. Agradeceremos coordinar su pago a la brevedad.\n\nQuedamos atentos. Saludos cordiales,\nLexFive Abogados`;
  const enc = encodeURIComponent(texto);
  let tel = (cli.telefono || '').replace(/[^\d]/g, '');
  if (tel && tel.length <= 8) tel = '591' + tel; // prefijo Bolivia si es número local
  const wa = tel ? `https://wa.me/${tel}?text=${enc}` : '';
  const mailto = cli.email ? `mailto:${cli.email}?subject=${encodeURIComponent('Recordatorio de pago — LexFive Abogados')}&body=${enc}` : '';
  const body = `
    <p class="cell-sub" style="margin-bottom:12px">Recordatorio de cobro para <strong>${esc(cli.nombre)}</strong> — saldo pendiente <strong>${fmtMoneda(saldo)}</strong>:</p>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${wa ? `<a class="btn" style="justify-content:flex-start;background:#25d366;color:#fff;border-color:#25d366" target="_blank" rel="noopener" href="${wa}">${ICON.whatsapp} Enviar por WhatsApp</a>` : '<p class="cell-sub">Este cliente no tiene teléfono registrado.</p>'}
      ${mailto ? `<a class="btn btn--primary" style="justify-content:flex-start" href="${mailto}">✉️ Enviar por correo</a>` : '<p class="cell-sub">Este cliente no tiene correo registrado.</p>'}
    </div>`;
  openModal('Recordar cobro', body, [{ label: 'Cerrar', class: 'btn--primary', onClick: closeModal }]);
}

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
const TAREA_ESTADOS = { pendiente: 'Pendiente', en_progreso: 'En progreso', hecha: 'Hecha' };
const TAREA_PRIOR = { alta: 'Alta', media: 'Media', baja: 'Baja' };

async function renderTareas() {
  loading();
  const [{ data: tareas }, { data: procs }] = await Promise.all([
    supabase.from('tareas').select('*').order('vence', { ascending: true, nullsFirst: false }),
    supabase.from('procesos').select('id,caratula').eq('eliminado', false)
  ]);
  const T = tareas || [];
  const procMap = {}; (procs || []).forEach(p => { procMap[p.id] = p.caratula; });

  content().innerHTML = `
    <div class="toolbar">
      <input type="search" id="qTarea" placeholder="Buscar tarea...">
      <select id="fVence" ${hint('Filtre las tareas por su fecha de vencimiento.')}>
        <option value="">Todas las fechas</option>
        <option value="hoy">Vencen hoy</option>
        <option value="semana">Esta semana (7 días)</option>
        <option value="vencidas">Vencidas</option>
      </select>
      <select id="fProc" ${hint('Muestre solo las tareas de un proceso.')}>
        <option value="">Todos los procesos</option>
        ${(procs || []).map(p => `<option value="${p.id}">${esc(p.caratula)}</option>`).join('')}
      </select>
      <label class="chk-inline"><input type="checkbox" id="fMias"> Solo mías</label>
      <div class="spacer"></div>
      <button class="btn btn--primary" id="btnNuevaTarea">${ICON.plus} Nueva tarea</button>
    </div>
    <div class="tareas-board" id="tareasBoard"></div>`;

  const hoyStr = hoyISO();
  const en7Str = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); })();
  const tarjeta = (t) => {
    const vencida = t.vence && t.vence < hoyStr && t.estado !== 'hecha';
    const acciones = [];
    if (t.estado === 'pendiente') acciones.push(`<button class="btn btn--ghost btn--sm js-mv" data-id="${t.id}" data-to="en_progreso">Iniciar</button>`);
    if (t.estado !== 'hecha') acciones.push(`<button class="btn btn--navy btn--sm js-mv" data-id="${t.id}" data-to="hecha">Completar</button>`);
    if (t.estado === 'hecha') acciones.push(`<button class="btn btn--ghost btn--sm js-mv" data-id="${t.id}" data-to="pendiente">Reabrir</button>`);
    return `<div class="tarea-card prio-${t.prioridad}">
      <div class="tarea-card__top">
        <span class="badge-prio badge-prio--${t.prioridad}">${TAREA_PRIOR[t.prioridad] || t.prioridad}</span>
        ${t.vence ? `<span class="tarea-venc ${vencida ? 'is-vencida' : ''}">${vencida ? 'Venció ' : 'Vence '}${fmtDate(t.vence)}</span>` : ''}
      </div>
      <div class="tarea-card__title">${esc(t.titulo)}</div>
      ${t.descripcion ? `<div class="cell-sub">${esc(t.descripcion)}</div>` : ''}
      <div class="cell-sub">${t.proceso_id && procMap[t.proceso_id] ? 'Proceso: ' + esc(procMap[t.proceso_id]) + ' · ' : ''}Asignado: ${esc(profName(t.asignado_a) || 'Sin asignar')}</div>
      <div class="tarea-card__actions">
        ${acciones.join('')}
        <button class="btn btn--ghost btn--sm js-edit" data-id="${t.id}">Editar</button>
        ${(t.created_by === state.profile.id || state.profile.rol === 'admin') ? `<button class="btn btn--danger btn--sm js-del" data-id="${t.id}">Eliminar</button>` : ''}
      </div>
    </div>`;
  };

  const paint = () => {
    const q = ($('#qTarea').value || '').toLowerCase();
    const mias = $('#fMias').checked;
    const fv = $('#fVence').value;
    const fp = $('#fProc').value;
    const venceOk = (t) => {
      if (fv === 'hoy') return t.vence === hoyStr;
      if (fv === 'semana') return t.vence && t.vence >= hoyStr && t.vence <= en7Str;
      if (fv === 'vencidas') return t.vence && t.vence < hoyStr && t.estado !== 'hecha';
      return true;
    };
    const visibles = T.filter(t =>
      (!mias || t.asignado_a === state.profile.id) &&
      (!fp || t.proceso_id === fp) &&
      venceOk(t) &&
      (!q || [t.titulo, t.descripcion, procMap[t.proceso_id]].some(v => (v || '').toLowerCase().includes(q))));
    const board = $('#tareasBoard');
    board.innerHTML = Object.entries(TAREA_ESTADOS).map(([k, label]) => {
      const col = visibles.filter(t => t.estado === k);
      return `<div class="tareas-col">
        <div class="tareas-col__head">${label} <span class="tareas-col__count">${col.length}</span></div>
        <div class="tareas-col__body">${col.length ? col.map(tarjeta).join('') : '<p class="cell-sub" style="padding:8px">Sin tareas.</p>'}</div>
      </div>`;
    }).join('');
    board.querySelectorAll('.js-mv').forEach(b => b.onclick = () => toggleTareaEstado(b.dataset.id, b.dataset.to));
    board.querySelectorAll('.js-edit').forEach(b => b.onclick = () => { const t = T.find(x => x.id === b.dataset.id); if (t) tareaForm(t); });
    board.querySelectorAll('.js-del').forEach(b => b.onclick = () => { const t = T.find(x => x.id === b.dataset.id); if (t) deleteTarea(t); });
  };
  paint();
  $('#qTarea').oninput = paint;
  $('#fMias').onchange = paint;
  $('#fVence').onchange = paint;
  $('#fProc').onchange = paint;
  $('#btnNuevaTarea').onclick = () => tareaForm();
}

async function tareaForm(t = null) {
  const { data: procs } = await supabase.from('procesos').select('id,caratula').eq('eliminado', false).order('created_at', { ascending: false });
  const tarea = t || {};
  const opcionesProc = `<option value="">— Sin proceso —</option>` +
    (procs || []).map(p => `<option value="${p.id}" ${tarea.proceso_id === p.id ? 'selected' : ''}>${esc(p.caratula)}</option>`).join('');
  const body = `
    <div class="field"><label>Título de la tarea *</label><input id="tf_titulo" value="${esc(tarea.titulo || '')}" placeholder="Ej: Presentar memorial de respuesta"></div>
    <div class="field"><label>Detalle (opcional)</label><textarea id="tf_desc">${esc(tarea.descripcion || '')}</textarea></div>
    <div class="field-row">
      <div class="field"><label>Proceso relacionado</label><select id="tf_proceso">${opcionesProc}</select></div>
      <div class="field"><label>Asignar a</label><select id="tf_asignado">${optionsProfiles(tarea.asignado_a)}</select></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Prioridad</label><select id="tf_prioridad">${Object.entries(TAREA_PRIOR).map(([k, v]) => `<option value="${k}" ${(tarea.prioridad || 'media') === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      <div class="field"><label>Vence</label><input type="date" id="tf_vence" value="${tarea.vence || ''}"></div>
    </div>
    ${t ? `<div class="field"><label>Estado</label><select id="tf_estado">${Object.entries(TAREA_ESTADOS).map(([k, v]) => `<option value="${k}" ${tarea.estado === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>` : ''}`;
  openModal(t ? 'Editar tarea' : 'Nueva tarea', body, [
    { label: 'Cancelar', class: 'btn--ghost', onClick: closeModal },
    { label: 'Guardar', class: 'btn--primary', id: 'tf_save', onClick: () => saveTarea(t) }
  ]);
}

async function saveTarea(t) {
  const titulo = $('#tf_titulo').value.trim();
  if (!titulo) { toast('Escriba el título de la tarea.', 'error'); return; }
  $('#tf_save').disabled = true;
  const payload = {
    titulo,
    descripcion: $('#tf_desc').value.trim() || null,
    proceso_id: $('#tf_proceso').value || null,
    asignado_a: $('#tf_asignado').value || null,
    prioridad: $('#tf_prioridad').value,
    vence: $('#tf_vence').value || null
  };
  let error;
  if (t) {
    payload.estado = $('#tf_estado').value;
    payload.updated_at = new Date().toISOString();
    ({ error } = await supabase.from('tareas').update(payload).eq('id', t.id));
  } else {
    payload.created_by = state.profile.id;
    ({ error } = await supabase.from('tareas').insert(payload));
  }
  if (error) { toast('Error al guardar: ' + error.message, 'error'); $('#tf_save').disabled = false; return; }
  await logAccion(t ? 'editar' : 'crear', 'tarea', t ? t.id : titulo, titulo);
  closeModal(); toast(t ? 'Tarea actualizada.' : 'Tarea creada.', 'success');
  renderTareas();
}

async function toggleTareaEstado(id, nuevo) {
  const { error } = await supabase.from('tareas').update({ estado: nuevo, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) { toast('No se pudo actualizar: ' + error.message, 'error'); return; }
  renderTareas();
}

async function deleteTarea(t) {
  if (!confirm('¿Eliminar esta tarea?')) return;
  const { error } = await supabase.from('tareas').delete().eq('id', t.id);
  if (error) { toast('No se pudo eliminar: ' + error.message, 'error'); return; }
  await logAccion('eliminar', 'tarea', t.id, t.titulo);
  toast('Tarea eliminada.', 'success');
  renderTareas();
}

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
async function openHonorarios(proc) {
  const pintar = async () => {
    const [{ data: hs }, { data: ps }] = await Promise.all([
      supabase.from('honorarios').select('*').eq('proceso_id', proc.id).order('fecha', { ascending: false }),
      supabase.from('pagos').select('*').eq('proceso_id', proc.id).order('fecha', { ascending: false })
    ]);
    const cargos = hs || [], pagos = ps || [];
    const totalCargos = cargos.reduce((a, b) => a + Number(b.monto || 0), 0);
    const totalPagos = pagos.reduce((a, b) => a + Number(b.monto || 0), 0);
    const saldo = totalCargos - totalPagos;

    const filaH = h => `<div class="fin-row" data-id="${h.id}"><div><div class="cell-strong">${esc(h.concepto)}</div><div class="cell-sub">${fmtDate(h.fecha)} · ${esc(profName(h.created_by))}</div></div><div class="fin-row__right"><span class="fin-monto">${fmtMoneda(h.monto, h.moneda)}</span><button class="btn btn--danger btn--sm js-delh" data-id="${h.id}">✕</button></div></div>`;
    const filaP = p => `<div class="fin-row" data-id="${p.id}"><div><div class="cell-strong">${fmtMoneda(p.monto, p.moneda)} ${p.metodo ? '<span class="cell-sub">(' + esc(p.metodo) + ')</span>' : ''}</div><div class="cell-sub">${fmtDate(p.fecha)}${p.nota ? ' · ' + esc(p.nota) : ''}</div></div><div class="fin-row__right"><button class="btn btn--ghost btn--sm js-recibo" data-id="${p.id}">Recibo</button><button class="btn btn--danger btn--sm js-delp" data-id="${p.id}">✕</button></div></div>`;

    const body = `
      <div class="fin-summary">
        <div><span>Honorarios</span><strong>${fmtMoneda(totalCargos)}</strong></div>
        <div><span>Pagado</span><strong>${fmtMoneda(totalPagos)}</strong></div>
        <div class="${saldo > 0 ? 'fin-saldo--debe' : 'fin-saldo--ok'}"><span>Saldo pendiente</span><strong>${fmtMoneda(saldo)}</strong></div>
      </div>

      <h4 class="section-title">Honorarios (cargos)</h4>
      <div class="fin-list">${cargos.length ? cargos.map(filaH).join('') : '<p class="cell-sub">Sin honorarios registrados.</p>'}</div>
      <div class="card" style="margin-top:10px"><div class="card__body"><div class="field-row">
        <div class="field"><label>Concepto *</label><input id="h_concepto" placeholder="Ej: Honorarios profesionales"></div>
        <div class="field"><label>Monto (Bs) *</label><input id="h_monto" type="number" min="0" step="0.01" placeholder="0.00"></div>
        <div class="field"><label>Fecha</label><input id="h_fecha" type="date" value="${hoyISO()}"></div>
      </div><button class="btn btn--navy" id="h_add">${ICON.plus} Agregar honorario</button></div></div>

      <h4 class="section-title">Pagos recibidos</h4>
      <div class="fin-list">${pagos.length ? pagos.map(filaP).join('') : '<p class="cell-sub">Sin pagos registrados.</p>'}</div>
      <div class="card" style="margin-top:10px"><div class="card__body"><div class="field-row">
        <div class="field"><label>Monto (Bs) *</label><input id="p_monto" type="number" min="0" step="0.01" placeholder="0.00"></div>
        <div class="field"><label>Método</label><input id="p_metodo" placeholder="Efectivo, transferencia..."></div>
        <div class="field"><label>Fecha</label><input id="p_fecha" type="date" value="${hoyISO()}"></div>
      </div>
      <div class="field"><label>Nota (opcional)</label><input id="p_nota" placeholder="Detalle del pago"></div>
      <button class="btn btn--navy" id="p_add">${ICON.plus} Registrar pago</button></div></div>`;
    openModal('Honorarios · ' + proc.caratula, body, [{ label: 'Cerrar', class: 'btn--primary', onClick: closeModal }], true);

    $('#h_add').onclick = async () => {
      const concepto = $('#h_concepto').value.trim();
      const monto = parseFloat($('#h_monto').value);
      if (!concepto || isNaN(monto)) { toast('Indique concepto y monto.', 'error'); return; }
      $('#h_add').disabled = true;
      const { error } = await supabase.from('honorarios').insert({ proceso_id: proc.id, concepto, monto, fecha: $('#h_fecha').value || hoyISO(), created_by: state.profile.id });
      if (error) { toast('Error: ' + error.message, 'error'); $('#h_add').disabled = false; return; }
      await logAccion('crear', 'honorario', proc.id, concepto + ' ' + monto);
      toast('Honorario agregado.', 'success'); pintar();
    };
    $('#p_add').onclick = async () => {
      const monto = parseFloat($('#p_monto').value);
      if (isNaN(monto)) { toast('Indique el monto del pago.', 'error'); return; }
      $('#p_add').disabled = true;
      const { error } = await supabase.from('pagos').insert({ proceso_id: proc.id, monto, metodo: $('#p_metodo').value.trim() || null, nota: $('#p_nota').value.trim() || null, fecha: $('#p_fecha').value || hoyISO(), created_by: state.profile.id });
      if (error) { toast('Error: ' + error.message, 'error'); $('#p_add').disabled = false; return; }
      await logAccion('crear', 'pago', proc.id, String(monto));
      toast('Pago registrado.', 'success'); pintar();
    };
    document.querySelectorAll('.js-delh').forEach(b => b.onclick = async () => {
      if (!confirm('¿Eliminar este honorario?')) return;
      await supabase.from('honorarios').delete().eq('id', b.dataset.id); toast('Eliminado.', 'success'); pintar();
    });
    document.querySelectorAll('.js-delp').forEach(b => b.onclick = async () => {
      if (!confirm('¿Eliminar este pago?')) return;
      await supabase.from('pagos').delete().eq('id', b.dataset.id); toast('Eliminado.', 'success'); pintar();
    });
    document.querySelectorAll('.js-recibo').forEach(b => b.onclick = () => {
      const pago = pagos.find(x => x.id === b.dataset.id);
      if (pago) imprimirReciboPago(pago, proc);
    });
  };
  await pintar();
}

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
async function renderFinanzas() {
  loading();
  const [{ data: procs }, { data: hs }, { data: ps }] = await Promise.all([
    supabase.from('procesos').select('id,caratula,cliente_id,estado').eq('eliminado', false),
    supabase.from('honorarios').select('proceso_id,monto'),
    supabase.from('pagos').select('proceso_id,monto')
  ]);
  await loadClientes();
  const procList = procs || [];
  const sumBy = (arr) => { const o = {}; (arr || []).forEach(x => { o[x.proceso_id] = (o[x.proceso_id] || 0) + Number(x.monto || 0); }); return o; };
  const cargosByProc = sumBy(hs), pagosByProc = sumBy(ps);

  const filas = procList
    .map(p => ({ p, cargos: cargosByProc[p.id] || 0, pagos: pagosByProc[p.id] || 0 }))
    .filter(r => r.cargos > 0 || r.pagos > 0)
    .map(r => ({ ...r, saldo: r.cargos - r.pagos }))
    .sort((a, b) => b.saldo - a.saldo);

  const totCargos = filas.reduce((a, b) => a + b.cargos, 0);
  const totPagos = filas.reduce((a, b) => a + b.pagos, 0);
  const totSaldo = totCargos - totPagos;

  // Estado de cuenta agrupado por CLIENTE (suma de todos sus procesos).
  const cliAgg = {};
  filas.forEach(r => {
    const cid = r.p.cliente_id || '__sin__';
    const a = cliAgg[cid] || (cliAgg[cid] = { cid, cargos: 0, pagos: 0, nprocs: 0 });
    a.cargos += r.cargos; a.pagos += r.pagos; a.nprocs += 1;
  });
  const filasCli = Object.values(cliAgg).map(a => ({ ...a, saldo: a.cargos - a.pagos }))
    .sort((a, b) => b.saldo - a.saldo);
  const nombreCli = cid => cid === '__sin__' ? 'Sin cliente asignado' : clienteName(cid);

  const vista = state.finVista === 'cliente' ? 'cliente' : 'proceso';
  const toggle = `
    <div class="tabs-bar" role="tablist" style="margin-bottom:14px">
      <button class="btn btn--sm ${vista === 'proceso' ? 'btn--navy' : 'btn--ghost'}" id="finTabProc" role="tab">Por proceso</button>
      <button class="btn btn--sm ${vista === 'cliente' ? 'btn--navy' : 'btn--ghost'}" id="finTabCli" role="tab">Por cliente (estado de cuenta)</button>
    </div>`;
  const metrics = `
    <div class="stats-grid">
      <div class="metric"><div class="metric__top"><div class="metric__icon">${ICON.dinero}</div></div><div class="metric__num" style="font-size:1.5rem">${fmtMoneda(totCargos)}</div><div class="metric__label">Honorarios facturados</div></div>
      <div class="metric"><div class="metric__top"><div class="metric__icon">${ICON.dinero}</div></div><div class="metric__num" style="font-size:1.5rem">${fmtMoneda(totPagos)}</div><div class="metric__label">Cobrado</div></div>
      <div class="metric"><div class="metric__top"><div class="metric__icon">${ICON.alerta}</div></div><div class="metric__num" style="font-size:1.5rem">${fmtMoneda(totSaldo)}</div><div class="metric__label">Por cobrar</div></div>
    </div>`;

  const tablaProc = `<div class="card"><div class="card__head"><h3>Saldo por proceso</h3>${filas.length ? `<span style="display:flex;gap:8px"><button class="btn btn--ghost btn--sm" id="btnFinCSV">${ICON.descargar} Excel</button><button class="btn btn--ghost btn--sm" id="btnRepFin">${ICON.doc} Imprimir / PDF</button></span>` : ''}</div>
      <div class="card__body--flush">
        ${filas.length ? `<div class="table-wrap"><table class="data">
          <thead><tr><th>Proceso</th><th>Cliente</th><th>Honorarios</th><th>Pagado</th><th>Saldo</th></tr></thead>
          <tbody>${filas.map(r => `
            <tr data-id="${r.p.id}" data-cara="${esc(r.p.caratula)}" style="cursor:pointer">
              <td class="cell-strong">${esc(r.p.caratula)}</td>
              <td>${esc(clienteName(r.p.cliente_id))}</td>
              <td>${fmtMoneda(r.cargos)}</td>
              <td>${fmtMoneda(r.pagos)}</td>
              <td class="${r.saldo > 0 ? 'fin-debe' : ''}"><strong>${fmtMoneda(r.saldo)}</strong></td>
            </tr>`).join('')}</tbody></table></div>`
        : `<div class="empty">${ICON.dinero}<p>Aún no hay honorarios ni pagos registrados. Agréguelos desde el detalle de un proceso (botón “Honorarios”).</p></div>`}
      </div>
    </div>`;

  const tablaCli = `<div class="card"><div class="card__head"><h3>Estado de cuenta por cliente</h3>${filasCli.length ? `<span style="display:flex;gap:8px"><button class="btn btn--ghost btn--sm" id="btnFinCliCSV">${ICON.descargar} Excel</button></span>` : ''}</div>
      <div class="card__body--flush">
        ${filasCli.length ? `<div class="table-wrap"><table class="data">
          <thead><tr><th>Cliente</th><th>Procesos</th><th>Honorarios</th><th>Pagado</th><th>Saldo</th><th></th></tr></thead>
          <tbody>${filasCli.map(r => `
            <tr>
              <td class="cell-strong">${esc(nombreCli(r.cid))}</td>
              <td>${r.nprocs}</td>
              <td>${fmtMoneda(r.cargos)}</td>
              <td>${fmtMoneda(r.pagos)}</td>
              <td class="${r.saldo > 0 ? 'fin-debe' : ''}"><strong>${fmtMoneda(r.saldo)}</strong></td>
              <td>${r.saldo > 0 && r.cid !== '__sin__' ? `<button class="btn btn--ghost btn--sm js-cobro" data-cid="${r.cid}" data-saldo="${r.saldo}">${ICON.whatsapp} Recordar cobro</button>` : ''}</td>
            </tr>`).join('')}</tbody></table></div>`
        : `<div class="empty">${ICON.dinero}<p>Aún no hay honorarios ni pagos registrados.</p></div>`}
      </div>
    </div>`;

  content().innerHTML = toggle + metrics + (vista === 'cliente' ? tablaCli : tablaProc);

  $('#finTabProc').onclick = () => { state.finVista = 'proceso'; renderFinanzas(); };
  $('#finTabCli').onclick = () => { state.finVista = 'cliente'; renderFinanzas(); };

  if (vista === 'cliente') {
    content().querySelectorAll('.js-cobro').forEach(b => b.onclick = () => {
      const cli = (state.clientes || []).find(c => c.id === b.dataset.cid);
      if (cli) recordarCobro(cli, Number(b.dataset.saldo));
    });
    const btnCliCsv = $('#btnFinCliCSV');
    if (btnCliCsv) btnCliCsv.onclick = () => {
      const celda = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
      const lineas = [['Cliente', 'Procesos', 'Honorarios', 'Pagado', 'Saldo'].map(celda).join(';')];
      filasCli.forEach(r => lineas.push([nombreCli(r.cid), r.nprocs, r.cargos.toFixed(2), r.pagos.toFixed(2), r.saldo.toFixed(2)].map(celda).join(';')));
      lineas.push(['TOTALES', '', totCargos.toFixed(2), totPagos.toFixed(2), totSaldo.toFixed(2)].map(celda).join(';'));
      descargarArchivo('estado-cuenta-clientes-' + hoyISO() + '.csv', '\ufeff' + lineas.join('\r\n'), 'text/csv;charset=utf-8');
      toast('Estado de cuenta exportado a Excel (CSV).', 'success');
    };
    return;
  }

  content().querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => openHonorarios({ id: tr.dataset.id, caratula: tr.dataset.cara }));
  const btnFinCsv = $('#btnFinCSV');
  if (btnFinCsv) btnFinCsv.onclick = () => {
    const celda = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const lineas = [['Proceso', 'Cliente', 'Honorarios', 'Pagado', 'Saldo'].map(celda).join(';')];
    filas.forEach(r => lineas.push([r.p.caratula, clienteName(r.p.cliente_id), r.cargos.toFixed(2), r.pagos.toFixed(2), r.saldo.toFixed(2)].map(celda).join(';')));
    lineas.push(['TOTALES', '', totCargos.toFixed(2), totPagos.toFixed(2), totSaldo.toFixed(2)].map(celda).join(';'));
    descargarArchivo('honorarios-lexfive-' + hoyISO() + '.csv', '\ufeff' + lineas.join('\r\n'), 'text/csv;charset=utf-8');
    toast('Honorarios exportados a Excel (CSV).', 'success');
  };
  const btnRep = $('#btnRepFin');
  if (btnRep) btnRep.onclick = () => {
    const cuerpo = `<h1>Reporte de honorarios — cartera</h1>
      <table>
        <thead><tr><th>Proceso</th><th>Cliente</th><th>Honorarios</th><th>Pagado</th><th>Saldo</th></tr></thead>
        <tbody>${filas.map(r => `<tr>
          <td>${esc(r.p.caratula)}</td>
          <td>${esc(clienteName(r.p.cliente_id))}</td>
          <td>${esc(fmtMoneda(r.cargos))}</td>
          <td>${esc(fmtMoneda(r.pagos))}</td>
          <td>${esc(fmtMoneda(r.saldo))}</td>
        </tr>`).join('')}
        <tr class="tot"><td colspan="2">TOTALES</td><td>${esc(fmtMoneda(totCargos))}</td><td>${esc(fmtMoneda(totPagos))}</td><td>${esc(fmtMoneda(totSaldo))}</td></tr>
        </tbody>
      </table>`;
    abrirImpresion('Reporte de honorarios', cuerpo);
  };
}

// ============================================================
//  VISTA: REPORTES  (procesos por estado, materia y abogado, por período)
// ============================================================
async function renderReportes() {
  loading();
  const { data } = await supabase.from('procesos').select('*').eq('eliminado', false);
  const todos = data || [];
  // Honorarios y pagos para la tasa de cobranza (si el rol no tiene acceso, quedan vacíos).
  let honor = [], pag = [];
  try {
    const [h, p] = await Promise.all([
      supabase.from('honorarios').select('proceso_id,monto'),
      supabase.from('pagos').select('proceso_id,monto')
    ]);
    honor = h.data || []; pag = p.data || [];
  } catch (e) { honor = []; pag = []; }
  const bs = (n) => 'Bs ' + Number(n || 0).toFixed(2);
  const fechaProc = p => (p.fecha_inicio || (p.created_at ? p.created_at.slice(0, 10) : ''));
  const hoy = hoyISO();
  const iniAnio = hoy.slice(0, 4) + '-01-01';

  content().innerHTML = `
    <div class="toolbar">
      <label class="chk-inline">Desde&nbsp;<input type="date" id="rDesde" value="${iniAnio}"></label>
      <label class="chk-inline">Hasta&nbsp;<input type="date" id="rHasta" value="${hoy}"></label>
      <div class="spacer"></div>
      <button class="btn btn--ghost" id="rTodo">Todo el historial</button>
      <button class="btn btn--primary" id="rPrint">${ICON.doc} Imprimir / PDF</button>
    </div>
    <div id="repBody"></div>`;

  let rango = { desde: iniAnio, hasta: hoy };
  const enRango = p => {
    const f = fechaProc(p);
    if (!f) return true;
    if (rango.desde && f < rango.desde) return false;
    if (rango.hasta && f > rango.hasta) return false;
    return true;
  };

  let datos = {};
  function calc() {
    const filt = todos.filter(enRango);
    const activos = filt.filter(p => !['archivado', 'concluido'].includes(p.estado)).length;
    const judiciales = filt.filter(p => p.tipo !== 'administrativo').length;
    const administrativos = filt.length - judiciales;
    const porEstado = Object.entries(ESTADOS).map(([k, v]) => ({ label: v, value: filt.filter(p => p.estado === k).length }));
    const matCount = {}; filt.forEach(p => { const m = p.materia || 'Sin materia'; matCount[m] = (matCount[m] || 0) + 1; });
    const porMateria = Object.entries(matCount).map(([k, v]) => ({ label: k, value: v })).sort((a, b) => b.value - a.value);
    const aboCount = {}; filt.forEach(p => { const ids = (p.abogados_ids && p.abogados_ids.length) ? p.abogados_ids : (p.abogado_id ? [p.abogado_id] : []); ids.forEach(id => { aboCount[id] = (aboCount[id] || 0) + 1; }); });
    const porAbogado = Object.entries(aboCount).map(([id, v]) => ({ label: profName(id), value: v })).sort((a, b) => b.value - a.value);
    // Tasa de cobranza (pagado / facturado) de los procesos del período.
    const idsFilt = new Set(filt.map(p => p.id));
    const totHon = honor.filter(h => idsFilt.has(h.proceso_id)).reduce((a, b) => a + Number(b.monto || 0), 0);
    const totPag = pag.filter(p => idsFilt.has(p.proceso_id)).reduce((a, b) => a + Number(b.monto || 0), 0);
    const cobranza = totHon > 0 ? Math.round((totPag / totHon) * 100) : null;
    // Casos nuevos por mes (según fecha de inicio / alta).
    const mesCount = {};
    filt.forEach(p => { const f = fechaProc(p); if (f) { const k = f.slice(0, 7); mesCount[k] = (mesCount[k] || 0) + 1; } });
    const porMes = Object.keys(mesCount).sort().map(k => { const a = k.split('-'); return { label: a[1] + '/' + a[0].slice(2), value: mesCount[k] }; });
    datos = { filt, activos, judiciales, administrativos, porEstado, porMateria, porAbogado, cobranza, totHon, totPag, porMes };

    $('#repBody').innerHTML = `
      <div class="stats-grid">
        <div class="metric"><div class="metric__top"><div class="metric__icon">${ICON.procesos}</div></div><div class="metric__num">${filt.length}</div><div class="metric__label">Procesos en el período</div></div>
        <div class="metric"><div class="metric__top"><div class="metric__icon">${ICON.dashboard}</div></div><div class="metric__num">${activos}</div><div class="metric__label">Activos</div></div>
        <div class="metric"><div class="metric__top"><div class="metric__icon">${ICON.doc}</div></div><div class="metric__num">${judiciales}</div><div class="metric__label">Judiciales</div></div>
        <div class="metric"><div class="metric__top"><div class="metric__icon">${ICON.doc}</div></div><div class="metric__num">${administrativos}</div><div class="metric__label">Administrativos</div></div>
        ${cobranza !== null ? `<div class="metric"><div class="metric__top"><div class="metric__icon">${ICON.dinero}</div></div><div class="metric__num">${cobranza}%</div><div class="metric__label">Tasa de cobranza</div></div>` : ''}
      </div>
      ${cobranza !== null ? `<div class="card"><div class="card__head"><h3>${ICON.dinero} Cobranza del período</h3></div><div class="card__body" style="display:flex;flex-wrap:wrap;gap:24px">
        <div><div class="cell-sub">Facturado (honorarios)</div><div class="cell-strong" style="font-size:1.2rem">${bs(totHon)}</div></div>
        <div><div class="cell-sub">Cobrado (pagos)</div><div class="cell-strong" style="font-size:1.2rem">${bs(totPag)}</div></div>
        <div><div class="cell-sub">Saldo por cobrar</div><div class="cell-strong" style="font-size:1.2rem">${bs(totHon - totPag)}</div></div>
      </div></div>` : ''}
      <div class="charts-grid">
        <div class="card"><div class="card__head"><h3>${ICON.grafico} Por estado</h3></div><div class="card__body">${barChart(porEstado)}</div></div>
        <div class="card"><div class="card__head"><h3>${ICON.grafico} Por materia</h3></div><div class="card__body">${barChart(porMateria)}</div></div>
        <div class="card"><div class="card__head"><h3>${ICON.grafico} Por abogado</h3></div><div class="card__body">${barChart(porAbogado)}</div></div>
        ${porMes.length ? `<div class="card"><div class="card__head"><h3>${ICON.grafico} Casos nuevos por mes</h3></div><div class="card__body">${barChart(porMes)}</div></div>` : ''}
      </div>`;
  }
  calc();

  const aplicar = () => { rango = { desde: $('#rDesde').value, hasta: $('#rHasta').value }; calc(); };
  $('#rDesde').onchange = aplicar;
  $('#rHasta').onchange = aplicar;
  $('#rTodo').onclick = () => { $('#rDesde').value = ''; $('#rHasta').value = ''; aplicar(); };
  $('#rPrint').onclick = () => {
    const d = datos;
    const tabla = (titulo, colName, arr) => `<h2 style="font-size:13px;margin:16px 0 4px;color:#0e1b2c">${esc(titulo)}</h2>
      <table><thead><tr><th>${esc(colName)}</th><th style="width:120px">Cantidad</th></tr></thead>
      <tbody>${arr.filter(i => i.value > 0).map(i => `<tr><td>${esc(i.label)}</td><td>${i.value}</td></tr>`).join('') || '<tr><td colspan="2">Sin datos</td></tr>'}</tbody></table>`;
    const periodo = (rango.desde || rango.hasta)
      ? `Período: ${rango.desde ? fmtDate(rango.desde) : 'inicio'} — ${rango.hasta ? fmtDate(rango.hasta) : 'hoy'}`
      : 'Todo el historial';
    const body = `<h1>Reporte de procesos</h1>
      <p style="color:#5c6675;font-size:12px;margin:0 0 4px">${esc(periodo)} · ${d.filt.length} proceso(s) · ${d.activos} activo(s)${d.cobranza !== null ? ' · Cobranza: ' + d.cobranza + '%' : ''}</p>
      ${d.cobranza !== null ? `<p style="font-size:12px;margin:0 0 4px">Facturado: ${bs(d.totHon)} · Cobrado: ${bs(d.totPag)} · Saldo: ${bs(d.totHon - d.totPag)}</p>` : ''}
      ${tabla('Por estado', 'Estado', d.porEstado)}
      ${tabla('Por materia', 'Materia', d.porMateria)}
      ${tabla('Por abogado', 'Abogado', d.porAbogado)}
      ${d.porMes && d.porMes.length ? tabla('Casos nuevos por mes', 'Mes', d.porMes) : ''}`;
    abrirImpresion('Reporte de procesos', body);
  };
}

// ============================================================
//  VISTA: PLANTILLAS DE MEMORIALES  (texto con campos que se rellenan)
// ============================================================
// Campos disponibles para usar en las plantillas con la forma {{campo}}.
function placeholdersDisponibles() {
  return [
    ['caratula', 'Carátula'], ['numero', 'N.º expediente'], ['nurej', 'NUREJ'],
    ['materia', 'Materia'], ['tipo', 'Tipo'], ['juzgado', 'Juzgado / entidad'],
    ['parte_contraria', 'Parte contraria'], ['cliente', 'Cliente'],
    ['cliente_documento', 'Documento del cliente'], ['cliente_telefono', 'Tel. cliente'],
    ['cliente_email', 'Correo cliente'], ['cliente_direccion', 'Dirección cliente'],
    ['abogado', 'Abogado(s)'], ['procurador', 'Procurador(es)'],
    ['proxima_audiencia', 'Próxima audiencia'], ['fecha', 'Fecha de hoy'],
    ['fecha_larga', 'Fecha de hoy (en letras)']
  ];
}

// Construye los valores reales a partir del proceso y su cliente.
function buildMapaCampos(p, cli) {
  const hoy = new Date();
  return {
    caratula: p.caratula || '', numero: p.numero || '', nurej: p.nurej || '',
    materia: p.materia || '', tipo: p.tipo === 'administrativo' ? 'administrativo' : 'judicial',
    juzgado: p.juzgado || '', parte_contraria: p.parte_contraria || '',
    cliente: cli ? (cli.nombre || '') : '', cliente_documento: cli ? (cli.documento || '') : '',
    cliente_telefono: cli ? (cli.telefono || '') : '', cliente_email: cli ? (cli.email || '') : '',
    cliente_direccion: cli ? (cli.direccion || '') : '',
    abogado: namesFromIds(p.abogados_ids) || profName(p.abogado_id) || '',
    procurador: namesFromIds(p.procuradores_ids) || profName(p.procurador_id) || '',
    proxima_audiencia: p.proxima_audiencia ? fmtDateTime(p.proxima_audiencia) : '',
    fecha: fmtDate(hoy),
    fecha_larga: hoy.toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' })
  };
}

// Reemplaza {{campo}} por su valor. Campo conocido sin dato -> línea en blanco;
// campo desconocido -> se deja tal cual para que el usuario lo note.
function aplicarCampos(texto, mapa) {
  return (texto || '').replace(/{{\s*(\w+)\s*}}/g, (m, campo) => {
    if (Object.prototype.hasOwnProperty.call(mapa, campo)) return mapa[campo] !== '' ? mapa[campo] : '__________';
    return m;
  });
}

// HTML imprimible / Word del memorial generado.
// Abre una ventana con cabecera de LexFive lista para imprimir o guardar como PDF.
function abrirImpresion(titulo, bodyHTML) {
  const w = window.open('', '_blank');
  if (!w) { toast('Permita las ventanas emergentes para imprimir.', 'error'); return; }
  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${esc(titulo)}</title>
    <style>
      *{box-sizing:border-box;} body{font-family:Arial,Helvetica,sans-serif;color:#1a2330;margin:0;padding:32px;}
      .imp-head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0e1b2c;padding-bottom:12px;margin-bottom:18px;}
      .imp-brand{font-family:Georgia,serif;font-size:22px;font-weight:700;color:#0e1b2c;}
      .imp-brand span{color:#c2a25a;}
      .imp-sub{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#a8853c;}
      .imp-meta{font-size:12px;color:#5c6675;text-align:right;}
      h1{font-size:18px;color:#0e1b2c;margin:0 0 12px;font-family:Georgia,serif;}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px;}
      th,td{border:1px solid #d9dce1;padding:7px 9px;text-align:left;vertical-align:top;}
      thead th{background:#0e1b2c;color:#fff;text-transform:uppercase;font-size:10px;letter-spacing:.5px;}
      tr:nth-child(even) td{background:#f6f7f9;}
      .tot td,.tot th{font-weight:700;background:#eef0f3;}
      .imp-foot{margin-top:28px;font-size:11px;color:#5c6675;}
      @media print{@page{margin:14mm;}}
    </style></head><body>
    <div class="imp-head">
      <div><div class="imp-brand">Lex<span>Five</span></div><div class="imp-sub">Bufete de Abogados</div></div>
      <div class="imp-meta">La Paz / El Alto - Bolivia<br>Generado: ${esc(fmtDate(new Date()))}</div>
    </div>
    ${bodyHTML}
    <script>window.onload=function(){window.print();}<\/script>
    </body></html>`);
  w.document.close();
}

// Genera e imprime un recibo de un pago concreto.
async function imprimirReciboPago(pago, proc) {
  let clienteNombre = '—';
  try {
    const { data: pr } = await supabase.from('procesos').select('cliente_id').eq('id', proc.id).maybeSingle();
    if (pr && pr.cliente_id) {
      const { data: cl } = await supabase.from('clientes').select('nombre').eq('id', pr.cliente_id).maybeSingle();
      if (cl) clienteNombre = cl.nombre;
    }
  } catch (e) {}
  const nro = pago.nro_recibo
    ? String(pago.nro_recibo).padStart(5, '0')
    : String(pago.id || '').replace(/-/g, '').slice(0, 8).toUpperCase();
  const body = `
    <h1>Recibo de pago N.º ${esc(nro)}</h1>
    <table>
      <tr><th style="width:38%">Fecha</th><td>${esc(fmtDate(pago.fecha))}</td></tr>
      <tr><th>Recibí de</th><td>${esc(clienteNombre)}</td></tr>
      <tr><th>Por concepto de</th><td>Pago a cuenta de honorarios — ${esc(proc.caratula || '')}</td></tr>
      ${pago.metodo ? `<tr><th>Forma de pago</th><td>${esc(pago.metodo)}</td></tr>` : ''}
      ${pago.nota ? `<tr><th>Detalle</th><td>${esc(pago.nota)}</td></tr>` : ''}
      <tr class="tot"><th>Monto recibido</th><td>${esc(fmtMoneda(pago.monto, pago.moneda))}</td></tr>
      <tr><th>Son</th><td>${esc(montoEnLetras(pago.monto, pago.moneda))}</td></tr>
    </table>
    <div class="imp-foot">
      <p>Este recibo acredita el pago indicado a favor de LexFive por los servicios profesionales del proceso señalado.</p>
      <div style="display:flex;justify-content:space-between;gap:40px;margin-top:46px;">
        <div style="flex:1;border-top:1px solid #888;padding-top:6px;text-align:center;">Firma autorizada · LexFive</div>
        <div style="flex:1;border-top:1px solid #888;padding-top:6px;text-align:center;">Recibí conforme</div>
      </div>
    </div>`;
  abrirImpresion('Recibo ' + nro, body);
}

function memorialHTML(titulo, texto) {
  const cuerpo = esc(texto).replace(/\n/g, '<br>');
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${esc(titulo)}</title></head>
    <body style="font-family:Georgia,'Times New Roman',serif;font-size:12pt;line-height:1.7;color:#111;margin:2.5cm;text-align:justify;">
    <div>${cuerpo}</div></body></html>`;
}
function imprimirTexto(titulo, texto) {
  const w = window.open('', '_blank');
  if (!w) { toast('Permita las ventanas emergentes para imprimir.', 'error'); return; }
  w.document.write(memorialHTML(titulo, texto) + '<script>window.onload=function(){window.print();}<\/script>');
  w.document.close();
}
function descargarWord(titulo, texto) {
  const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head>' +
    memorialHTML(titulo, texto).replace(/^[\s\S]*<body/, '<body').replace(/<\/html>$/, '') + '</html>';
  const nombre = (titulo || 'memorial').toLowerCase().replace(/[^\w]+/g, '-').slice(0, 40) + '.doc';
  descargarArchivo(nombre, '\ufeff' + html, 'application/msword');
  toast('Documento descargado en Word.', 'success');
}

async function renderPlantillas() {
  loading();
  const { data } = await supabase.from('plantillas').select('*').order('titulo', { ascending: true });
  const L = data || [];
  content().innerHTML = `
    <div class="toolbar">
      <input type="search" id="qPlant" placeholder="Buscar plantilla...">
      <div class="spacer"></div>
      <button class="btn btn--primary" id="btnNuevaPlant">${ICON.plus} Nueva plantilla</button>
    </div>
    <p class="cell-sub" style="margin:-4px 2px 12px">Cree memoriales modelo con campos como <code>{{cliente}}</code>, <code>{{nurej}}</code>, <code>{{caratula}}</code>… Al usarlos, el sistema los rellena con los datos del proceso elegido.</p>
    <div id="plantList"></div>`;

  const paint = () => {
    const q = ($('#qPlant').value || '').toLowerCase();
    const rows = L.filter(p => !q || [p.titulo, p.categoria, p.cuerpo].some(v => (v || '').toLowerCase().includes(q)));
    $('#plantList').innerHTML = rows.length ? `<div class="plant-grid">${rows.map(p => `
      <div class="plant-card">
        <div class="plant-card__title">${esc(p.titulo)}</div>
        ${p.categoria ? `<span class="badge badge-mat">${esc(p.categoria)}</span>` : ''}
        <p class="cell-sub plant-card__preview">${esc((p.cuerpo || '').slice(0, 140))}${(p.cuerpo || '').length > 140 ? '…' : ''}</p>
        <div class="plant-card__actions">
          <button class="btn btn--primary btn--sm js-usar" data-id="${p.id}">Usar</button>
          <button class="btn btn--ghost btn--sm js-edit" data-id="${p.id}">Editar</button>
          ${(p.created_by === state.profile.id || state.profile.rol === 'admin') ? `<button class="btn btn--danger btn--sm js-del" data-id="${p.id}">Eliminar</button>` : ''}
        </div>
      </div>`).join('')}</div>`
      : `<div class="empty">${ICON.plantilla}<p>Aún no hay plantillas. Cree la primera con “Nueva plantilla”.</p></div>`;
    $('#plantList').querySelectorAll('.js-usar').forEach(b => b.onclick = () => { const p = L.find(x => x.id === b.dataset.id); if (p) usarPlantilla(p); });
    $('#plantList').querySelectorAll('.js-edit').forEach(b => b.onclick = () => { const p = L.find(x => x.id === b.dataset.id); if (p) plantillaForm(p); });
    $('#plantList').querySelectorAll('.js-del').forEach(b => b.onclick = () => { const p = L.find(x => x.id === b.dataset.id); if (p) deletePlantilla(p); });
  };
  paint();
  $('#qPlant').oninput = paint;
  $('#btnNuevaPlant').onclick = () => plantillaForm();
}

function plantillaForm(pl = null) {
  const p = pl || {};
  const chips = placeholdersDisponibles().map(([k, label]) =>
    `<button type="button" class="chip-campo" data-campo="${k}" title="Insertar ${esc(label)}">{{${k}}}</button>`).join('');
  const body = `
    <div class="field-row">
      <div class="field"><label>Título *</label><input id="pl_titulo" value="${esc(p.titulo || '')}" placeholder="Ej: Memorial de apersonamiento"></div>
      <div class="field"><label>Categoría</label><input id="pl_categoria" value="${esc(p.categoria || '')}" placeholder="Ej: Laboral"></div>
    </div>
    <div class="field">
      <label>Texto de la plantilla *</label>
      <p class="cell-sub" style="margin:0 0 6px">Haga clic en un campo para insertarlo donde está el cursor:</p>
      <div class="campos-chips">${chips}</div>
      <textarea id="pl_cuerpo" style="min-height:260px;font-family:Georgia,serif">${esc(p.cuerpo || '')}</textarea>
    </div>`;
  openModal(pl ? 'Editar plantilla' : 'Nueva plantilla', body, [
    { label: 'Cancelar', class: 'btn--ghost', onClick: closeModal },
    { label: 'Guardar', class: 'btn--primary', id: 'pl_save', onClick: () => savePlantilla(pl) }
  ], true);
  // Insertar campo en la posición del cursor del textarea
  document.querySelectorAll('.chip-campo').forEach(c => c.onclick = () => {
    const ta = $('#pl_cuerpo'); const ins = '{{' + c.dataset.campo + '}}';
    const s = ta.selectionStart || 0, e = ta.selectionEnd || 0;
    ta.value = ta.value.slice(0, s) + ins + ta.value.slice(e);
    ta.focus(); ta.selectionStart = ta.selectionEnd = s + ins.length;
  });
}

async function savePlantilla(pl) {
  const titulo = $('#pl_titulo').value.trim();
  const cuerpo = $('#pl_cuerpo').value;
  if (!titulo || !cuerpo.trim()) { toast('Indique título y texto de la plantilla.', 'error'); return; }
  $('#pl_save').disabled = true;
  const payload = { titulo, categoria: $('#pl_categoria').value.trim() || null, cuerpo };
  let error;
  if (pl) {
    payload.updated_at = new Date().toISOString();
    ({ error } = await supabase.from('plantillas').update(payload).eq('id', pl.id));
  } else {
    payload.created_by = state.profile.id;
    ({ error } = await supabase.from('plantillas').insert(payload));
  }
  if (error) { toast('Error al guardar: ' + error.message, 'error'); $('#pl_save').disabled = false; return; }
  await logAccion(pl ? 'editar' : 'crear', 'plantilla', pl ? pl.id : titulo, titulo);
  closeModal(); toast(pl ? 'Plantilla actualizada.' : 'Plantilla creada.', 'success');
  renderPlantillas();
}

async function deletePlantilla(pl) {
  if (!confirm('¿Eliminar esta plantilla?')) return;
  const { error } = await supabase.from('plantillas').delete().eq('id', pl.id);
  if (error) { toast('No se pudo eliminar: ' + error.message, 'error'); return; }
  await logAccion('eliminar', 'plantilla', pl.id, pl.titulo);
  toast('Plantilla eliminada.', 'success');
  renderPlantillas();
}

// Usar la plantilla: elegir un proceso y generar el memorial relleno.
async function usarPlantilla(pl) {
  const { data: procs } = await supabase.from('procesos').select('*').eq('eliminado', false).order('created_at', { ascending: false });
  const opts = (procs || []).map(p => `<option value="${p.id}">${esc(p.caratula)}</option>`).join('');
  const body = `
    <div class="field"><label>Elija el proceso *</label><select id="gen_proc"><option value="">— Seleccione —</option>${opts}</select></div>
    <button class="btn btn--navy" id="gen_btn">Generar memorial</button>
    <div id="gen_out" style="margin-top:14px"></div>`;
  openModal('Usar plantilla · ' + pl.titulo, body, [{ label: 'Cerrar', class: 'btn--primary', onClick: closeModal }], true);
  $('#gen_btn').onclick = async () => {
    const pid = $('#gen_proc').value;
    if (!pid) { toast('Elija un proceso.', 'error'); return; }
    const p = (procs || []).find(x => x.id === pid);
    let cli = null;
    if (p.cliente_id) { const { data } = await supabase.from('clientes').select('*').eq('id', p.cliente_id).maybeSingle(); cli = data; }
    const texto = aplicarCampos(pl.cuerpo, buildMapaCampos(p, cli));
    $('#gen_out').innerHTML = `
      <label class="cell-sub" style="display:block;margin-bottom:4px">Documento generado (puede editarlo antes de imprimir o descargar):</label>
      <textarea id="gen_texto" style="min-height:300px;font-family:Georgia,serif">${esc(texto)}</textarea>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
        <button class="btn btn--primary" id="gen_print">${ICON.doc} Imprimir / PDF</button>
        <button class="btn btn--ghost" id="gen_word">${ICON.descargar} Descargar Word</button>
      </div>
      <p class="cell-sub" style="margin-top:6px">Los campos sin dato aparecen como <code>__________</code> para completarlos a mano.</p>`;
    $('#gen_print').onclick = () => imprimirTexto(pl.titulo, $('#gen_texto').value);
    $('#gen_word').onclick = () => descargarWord(pl.titulo, $('#gen_texto').value);
  };
}

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
async function renderPapelera() {
  content().innerHTML = `
    <div class="tabs-bar" role="tablist">
      <button class="btn btn--sm btn--navy" id="papTabProc" role="tab">Procesos</button>
      <button class="btn btn--sm btn--ghost" id="papTabCli" role="tab">Clientes</button>
    </div>
    <div id="papContainer"></div>`;
  const sel = (tab) => {
    $('#papTabProc').className = 'btn btn--sm ' + (tab === 'proc' ? 'btn--navy' : 'btn--ghost');
    $('#papTabCli').className = 'btn btn--sm ' + (tab === 'cli' ? 'btn--navy' : 'btn--ghost');
    if (tab === 'proc') papeleraProcesos(); else papeleraClientes();
  };
  $('#papTabProc').onclick = () => sel('proc');
  $('#papTabCli').onclick = () => sel('cli');
  sel('proc');
}

async function papeleraProcesos() {
  const cont = $('#papContainer');
  cont.innerHTML = '<div class="loading"><div class="spinner"></div>Cargando...</div>';
  const { data, error } = await supabase.from('procesos').select('*').eq('eliminado', true).order('eliminado_at', { ascending: false });
  if (error) {
    cont.innerHTML = `<div class="card"><div class="card__body"><div class="empty">${ICON.papelera}
      <p>No se pudo cargar la papelera.<br>Verifique que ejecutó el script <strong>db/14_papelera_procesos.sql</strong> en Supabase.</p></div></div></div>`;
    return;
  }
  const list = data || [];
  cont.innerHTML = `
    <div class="card"><div class="card__body">
      <p class="cell-sub">Los procesos enviados a la papelera no aparecen en el sistema, pero <strong>no se borran</strong>. Puede <strong>restaurarlos</strong> o eliminarlos <strong>definitivamente</strong> (esto último no se puede deshacer).</p>
    </div></div>
    <div class="card"><div class="card__body--flush"><div id="papTable"></div></div></div>`;

  let page = 1;
  function paint() {
    const info = paginar(list, page);
    $('#papTable').innerHTML = list.length ? `<div class="table-wrap"><table class="data">
      <thead><tr><th>Carátula</th><th>Materia</th><th>Eliminado</th><th>Por</th><th></th></tr></thead>
      <tbody>${info.slice.map(p => `
        <tr>
          <td class="cell-strong">${esc(p.caratula)}<div class="cell-sub">${esc(p.numero || 'Sin número')}</div></td>
          <td><span class="badge badge-mat">${esc(p.materia || '—')}</span></td>
          <td>${p.eliminado_at ? fmtDate(p.eliminado_at) : '—'}</td>
          <td>${esc(profName(p.eliminado_por))}</td>
          <td style="white-space:nowrap;text-align:right">
            <button class="btn btn--navy btn--sm js-rest" data-id="${p.id}">Restaurar</button>
            <button class="btn btn--danger btn--sm js-purge" data-id="${p.id}" data-cara="${esc(p.caratula)}">Eliminar definitivamente</button>
          </td>
        </tr>`).join('')}</tbody></table></div>${pagerHTML(info)}`
      : `<div class="empty">${ICON.papelera}<p>La papelera de procesos está vacía.</p></div>`;
    $('#papTable').querySelectorAll('.js-rest').forEach(b => b.onclick = () => restaurarProceso(b.dataset.id));
    $('#papTable').querySelectorAll('.js-purge').forEach(b => b.onclick = () => eliminarProcesoDefinitivo(b.dataset.id, b.dataset.cara));
    wirePager($('#papTable'), info, (n) => { page = n; paint(); });
  }
  paint();
}

async function papeleraClientes() {
  const cont = $('#papContainer');
  cont.innerHTML = '<div class="loading"><div class="spinner"></div>Cargando...</div>';
  const { data, error } = await supabase.from('clientes').select('*').eq('eliminado', true).order('eliminado_at', { ascending: false });
  if (error) {
    cont.innerHTML = `<div class="card"><div class="card__body"><div class="empty">${ICON.papelera}
      <p>No se pudo cargar la papelera de clientes.<br>Verifique que ejecutó el script <strong>db/16_papelera_clientes.sql</strong> en Supabase.</p></div></div></div>`;
    return;
  }
  const list = data || [];
  cont.innerHTML = `
    <div class="card"><div class="card__body">
      <p class="cell-sub">Los clientes enviados a la papelera no aparecen en el sistema, pero <strong>no se borran</strong>. Puede <strong>restaurarlos</strong> o eliminarlos <strong>definitivamente</strong> (esto último no se puede deshacer).</p>
    </div></div>
    <div class="card"><div class="card__body--flush"><div id="papCliTable"></div></div></div>`;

  let page = 1;
  function paint() {
    const info = paginar(list, page);
    $('#papCliTable').innerHTML = list.length ? `<div class="table-wrap"><table class="data">
      <thead><tr><th>Nombre</th><th>Documento</th><th>Eliminado</th><th>Por</th><th></th></tr></thead>
      <tbody>${info.slice.map(c => `
        <tr>
          <td class="cell-strong">${esc(c.nombre)}<div class="cell-sub">${esc(c.email || c.telefono || '')}</div></td>
          <td>${esc(c.documento || '—')}</td>
          <td>${c.eliminado_at ? fmtDate(c.eliminado_at) : '—'}</td>
          <td>${esc(profName(c.eliminado_por))}</td>
          <td style="white-space:nowrap;text-align:right">
            <button class="btn btn--navy btn--sm js-crest" data-id="${c.id}">Restaurar</button>
            <button class="btn btn--danger btn--sm js-cpurge" data-id="${c.id}" data-nom="${esc(c.nombre)}">Eliminar definitivamente</button>
          </td>
        </tr>`).join('')}</tbody></table></div>${pagerHTML(info)}`
      : `<div class="empty">${ICON.papelera}<p>La papelera de clientes está vacía.</p></div>`;
    $('#papCliTable').querySelectorAll('.js-crest').forEach(b => b.onclick = () => restaurarCliente(b.dataset.id));
    $('#papCliTable').querySelectorAll('.js-cpurge').forEach(b => b.onclick = () => eliminarClienteDefinitivo(b.dataset.id, b.dataset.nom));
    wirePager($('#papCliTable'), info, (n) => { page = n; paint(); });
  }
  paint();
}

async function restaurarProceso(id) {
  const { error } = await supabase.from('procesos').update({ eliminado: false, eliminado_at: null, eliminado_por: null }).eq('id', id);
  if (error) { toast('No se pudo restaurar: ' + error.message, 'error'); return; }
  await logAccion('restaurar', 'proceso', id, '');
  toast('Proceso restaurado.', 'success');
  renderPapelera();
}

async function eliminarProcesoDefinitivo(id, caratula) {
  if (!confirm(`¿Eliminar DEFINITIVAMENTE el proceso "${caratula}"?\n\nSe borrarán también sus actuaciones y documentos. Esta acción NO se puede deshacer.`)) return;
  const { error } = await supabase.from('procesos').delete().eq('id', id);
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  await logAccion('eliminar_definitivo', 'proceso', id, caratula);
  toast('Proceso eliminado definitivamente.', 'success');
  renderPapelera();
}

async function restaurarCliente(id) {
  const { error } = await supabase.from('clientes').update({ eliminado: false, eliminado_at: null, eliminado_por: null }).eq('id', id);
  if (error) { toast('No se pudo restaurar: ' + error.message, 'error'); return; }
  await logAccion('restaurar', 'cliente', id, '');
  toast('Cliente restaurado.', 'success');
  papeleraClientes();
}

async function eliminarClienteDefinitivo(id, nombre) {
  if (!confirm(`¿Eliminar DEFINITIVAMENTE al cliente "${nombre}"?\n\nEsta acción NO se puede deshacer. Los procesos vinculados quedarán sin cliente asignado.`)) return;
  const { error } = await supabase.from('clientes').delete().eq('id', id);
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  await logAccion('eliminar_definitivo', 'cliente', id, nombre);
  toast('Cliente eliminado definitivamente.', 'success');
  papeleraClientes();
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
      <h3 class="intro-title" style="margin-bottom:8px;">Sobre los accesos</h3>
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
  const { data } = await supabase.from('auditoria').select('*').order('created_at', { ascending: false }).limit(500);
  const logs = data || [];
  content().innerHTML = `
    <div class="card"><div class="card__head"><h3>Bitácora de auditoría</h3></div>
    <div class="card__body--flush"><div id="audTable"></div></div></div>`;
  let page = 1;
  function paint() {
    const info = paginar(logs, page);
    $('#audTable').innerHTML = logs.length ? `<div class="table-wrap"><table class="data">
      <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>Detalle</th></tr></thead>
      <tbody>${info.slice.map(l => `<tr class="no-hover"><td>${fmtDateTime(l.created_at)}</td><td>${esc(profName(l.usuario_id))}</td><td><span class="badge badge-mat">${esc(l.accion || '—')}</span></td><td>${esc(l.entidad || '—')}</td><td class="cell-sub">${esc(l.detalle || '')}</td></tr>`).join('')}</tbody></table></div>${pagerHTML(info)}`
      : `<div class="empty">${ICON.auditoria}<p>Sin registros todavía.</p></div>`;
    wirePager($('#audTable'), info, (n) => { page = n; paint(); });
  }
  paint();
}

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
      const { data: d, error } = await enlaceDocumento(b.dataset.path);
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
      const { error: upErr } = await subirDocumento(path, file);
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

  let page = 1;
  function paint() {
    const q = ($('#qCons').value || '').toLowerCase();
    const fe = $('#fEstadoCons').value;
    const rows = list.filter(c =>
      (!fe || c.estado === fe) &&
      (!q || [c.nombre, c.apellido, c.email, c.telefono, c.area, c.mensaje].some(v => (v || '').toLowerCase().includes(q))));
    const info = paginar(rows, page);
    $('#consTable').innerHTML = rows.length ? `<div class="table-wrap"><table class="data">
      <thead><tr><th>Fecha</th><th>Nombre</th><th>Contacto</th><th>Área</th><th>Estado</th></tr></thead>
      <tbody>${info.slice.map(c => `
        <tr data-id="${c.id}">
          <td>${fmtDateTime(c.created_at)}</td>
          <td class="cell-strong">${esc(consultaNombre(c))}<div class="cell-sub">${esc((c.mensaje || '').slice(0, 60))}${(c.mensaje || '').length > 60 ? '…' : ''}</div></td>
          <td>${esc(c.email || c.telefono || '—')}</td>
          <td>${c.area ? `<span class="badge badge-mat">${esc(c.area)}</span>` : '—'}</td>
          <td>${consultaEstadoBadge(c.estado)}</td>
        </tr>`).join('')}</tbody></table></div>${pagerHTML(info)}`
      : `<div class="empty">${ICON.consultas}<p>No hay consultas que coincidan.<br>Las consultas enviadas desde el formulario de contacto de la web aparecerán aquí.</p></div>`;
    $('#consTable').querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => {
      const c = list.find(x => x.id === tr.dataset.id); openConsultaDetail(c);
    });
    wirePager($('#consTable'), info, (n) => { page = n; paint(); });
  }
  paint();
  const rePaintCons = () => { page = 1; paint(); };
  $('#qCons').oninput = rePaintCons;
  $('#fEstadoCons').onchange = rePaintCons;
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
  try { await withTimeout(ensureImgCache(), 8000, 'imágenes'); } catch (e) { console.warn('Sellos: ensureImgCache falló/timeout', e); }
  try { await withTimeout(hydrateBranding(), 8000, 'branding'); } catch (e) { console.warn('Sellos: hydrateBranding falló/timeout', e); }

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
}

async function renderCredenciales() {
  loading();
  // Blindaje: si la carga de imágenes/branding/credenciales se cuelga o falla,
  // NO dejamos la vista atascada en "Cargando..."; se renderiza igual con lo
  // que haya disponible (mismo criterio que el arranque con reintentos).
  try { await withTimeout(ensureImgCache(), 8000, 'imágenes'); } catch (e) { console.warn('Credenciales: ensureImgCache falló/timeout', e); }
  try { await withTimeout(hydrateBranding(), 8000, 'branding'); } catch (e) { console.warn('Credenciales: hydrateBranding falló/timeout', e); }
  let credList = [];
  try { credList = (await withTimeout(CredStore.listCached(), 8000, 'credenciales')) || []; } catch (e) { console.warn('Credenciales: CredStore.list falló/timeout', e); credList = []; }
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
          <div><span>Válido hasta</span><strong id="cv_validez">${esc(fmtFechaCorta(addAnios(datos.emision, 3)))}</strong></div>
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

    <div class="card" id="credSavedCard">
      <div class="card__head"><h3>${ICON.usuarios || ''} Credenciales guardadas (${credList.length})</h3></div>
      <div class="card__body">
        ${credList.length ? `
        <p class="cell-sub" style="margin-bottom:12px">Aquí quedan guardadas todas las credenciales que creó. Puede <strong>editarlas</strong>, <strong>volver a imprimirlas</strong> o eliminarlas. Se guardan en la nube y se ven en todos los dispositivos del bufete.</p>
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
        <p class="cred-saved-empty-search" id="credSearchNone" style="display:none">No se encontraron credenciales con ese texto.</p>` : '<p class="cell-sub">Todavía no ha guardado ninguna credencial. Complete los datos y pulse <strong>Guardar credencial</strong> para conservarla aquí.</p>'}
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

  // Buscador de credenciales guardadas (filtra en vivo por nombre, CI o cargo).
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


  // ---- Guardado, edición y eliminación de credenciales ----
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
  content().querySelectorAll('[data-cred-print]').forEach(b => b.onclick = async () => {
    const rec = credList.find(c => c.id === b.dataset.credPrint);
    if (!rec) return;
    credEditId = rec.id;
    Draft.save('credencial', {
      nombre: rec.nombre || '', cargo: rec.cargo || '', ci: rec.ci || '',
      telPersonal: rec.telPersonal || '', telOficina: rec.telOficina || '',
      emision: rec.emision || hoyISO(), validez: rec.validez || '',
      frase: rec.frase || '', representacion: rec.representacion || ''
    });
    if (rec.foto) { IMG.foto = rec.foto; try { await ImgDB.set('foto', rec.foto); } catch (e) {} }
    else { borrarImagen('foto'); }
    await renderCredenciales();
    toast('Preparando la credencial para imprimir/descargar...', 'success');
    setTimeout(imprimirCredencial, 250);
  });
  content().querySelectorAll('[data-cred-edit]').forEach(b => b.onclick = async () => {
    const rec = credList.find(c => c.id === b.dataset.credEdit);
    if (!rec) return;
    credEditId = rec.id;
    Draft.save('credencial', {
      nombre: rec.nombre || '', cargo: rec.cargo || '', ci: rec.ci || '',
      telPersonal: rec.telPersonal || '', telOficina: rec.telOficina || '',
      emision: rec.emision || hoyISO(), validez: rec.validez || '',
      frase: rec.frase || '', representacion: rec.representacion || ''
    });
    if (rec.foto) { IMG.foto = rec.foto; try { await ImgDB.set('foto', rec.foto); } catch (e) {} }
    else { borrarImagen('foto'); }
    renderCredenciales();
    const cap = content().querySelector('#credPrintArea');
    if (cap && cap.scrollIntoView) cap.scrollIntoView({ behavior: 'smooth', block: 'start' });
    toast('Credencial cargada. Edite los datos y pulse «Actualizar credencial».', 'success');
  });
  content().querySelectorAll('[data-cred-del]').forEach(b => b.onclick = async () => {
    if (!confirm('¿Eliminar esta credencial guardada? Se quitará de todos los dispositivos y no se podrá recuperar.')) return;
    const id = b.dataset.credDel;
    b.disabled = true;
    try {
      await CredStore.remove(id);
      if (credEditId === id) credEditId = null;
      renderCredenciales();
      toast('Credencial eliminada en todos los dispositivos.', 'success');
    } catch (e) {
      b.disabled = false;
      toast('No se pudo eliminar la credencial. Revise su conexión e intente de nuevo.', 'error');
    }
  });
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
  sellos: { title: 'Sellos y logos del bufete', render: renderSellos },
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
    if (key === 'sellos' && !['admin', 'abogado'].includes(state.profile.rol)) key = 'dashboard';
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
