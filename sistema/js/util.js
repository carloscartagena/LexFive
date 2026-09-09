// ============================================================
//  LexFive — Utilidades puras del panel
//  Funciones sin estado ni dependencias del resto de la app
//  (formato de fechas/moneda, escape de HTML, QR, validaciones).
//  Se separan de app.js para aligerarlo y poder reutilizarlas.
// ============================================================

// Escapa texto para insertarlo de forma segura en HTML (evita XSS).
export function esc(s) {
  return (s == null ? '' : String(s)).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// Fecha de hoy en formato ISO (AAAA-MM-DD) para el input type=date.
export function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Suma n años a una fecha ISO. Si no es ISO (texto antiguo), la devuelve igual.
export function addAnios(iso, n) {
  const p = String(iso || '').split('-');
  if (p.length !== 3) return iso || '';
  return `${parseInt(p[0], 10) + n}-${p[1]}-${p[2]}`;
}

// Muestra una fecha ISO como DD/MM/AAAA (o tal cual si era texto libre).
export function fmtFechaCorta(iso) {
  const p = String(iso || '').split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : (iso || '');
}

// Genera la URL de un código QR (servicio público) a partir de un texto. ecc=M para mejor lectura.
export function qrURL(texto) {
  return 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=0&ecc=M&data=' + encodeURIComponent(texto || 'LexFive');
}

// URL fija del certificado SAJ-RPA del abogado responsable (va igual en TODAS las credenciales).
export const RPA_URL = 'https://rpa2.justicia.gob.bo/#/certificado-funcionamiento?codigo=52348873-02ea-4065-9b69-3c27a86c9dd9';
export const SITIO_URL = 'https://lexfive.netlify.app/';

// Enlace que codifica el QR personal del procurador: abre la página de verificación del bufete con sus datos.
export function qrPersona(d) {
  d = d || {};
  return SITIO_URL + 'verificar.html?n=' + encodeURIComponent(d.nombre || '') + '&ci=' + encodeURIComponent(d.ci || '') + '&rol=' + encodeURIComponent(d.cargo || 'Procurador');
}

// Resalta en negrita las palabras/cláusulas importantes del texto legal del reverso.
export function resaltarRepre(txt) {
  let s = esc(txt || '');
  const palabras = ['AUTORIZADO', 'FACULTADO', 'ENTREGAR', 'EXAMINAR', 'SOLICITAR', 'RECOGER', 'ABOGADO', 'PORTADOR', 'Procesos', 'Trámites Administrativos', 'Constitución Política del Estado'];
  palabras.forEach(p => { s = s.replace(new RegExp('\\b(' + p + ')\\b', 'g'), '<strong>$1</strong>'); });
  // Referencias legales (Ley NNN, Art. NN)
  s = s.replace(/\b(Ley\s\d{2,4})/g, '<strong>$1</strong>');
  s = s.replace(/\b(Art\.\s?\d{1,3})/g, '<strong>$1</strong>');
  return s;
}

// Fecha legible: DD/MM/AAAA (o "—" si está vacía/!inválida).
export function fmtDate(d) {
  if (!d) return '—';
  const x = new Date(d);
  if (isNaN(x)) return '—';
  return x.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Fecha y hora legibles: DD/MM/AAAA HH:MM (o "—").
export function fmtDateTime(d) {
  if (!d) return '—';
  const x = new Date(d);
  if (isNaN(x)) return '—';
  return x.toLocaleString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Solo la hora: HH:MM (o cadena vacía).
export function fmtHora(d) {
  if (!d) return '';
  const x = new Date(d);
  if (isNaN(x)) return '';
  return x.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
}

// Iniciales (hasta 2) de un nombre, en mayúsculas. Para avatares.
export function initials(name) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// Valida de forma sencilla un correo electrónico (algo@algo.dominio).
export function esEmailValido(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());
}
