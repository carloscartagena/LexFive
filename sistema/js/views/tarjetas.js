// ============================================================
//  VISTA: TARJETAS DE PRESENTACIÓN
//  Genera tarjetas de presentación del bufete (85 × 55 mm, doble cara).
//  Pensada para reflejar el doble perfil de los miembros del equipo
//  (p. ej. Abogado + Ingeniero de Sistemas). Campos editables, vista
//  previa en vivo e impresión / PDF. Usa la identidad visual de LexFive
//  (azul marino + dorado jurídico + acento tecnológico) y el emblema
//  que une la balanza de la justicia con un microchip.
// ============================================================
import { ICON } from '@/utils/icons.js';
import { esc } from '@/utils/util.js';
import { $, content } from '@/utils/dom.js';
import { toast } from '@/utils/ui.js';

// Datos por defecto (tomados de la información del bufete). Editables en pantalla.
const DEFAULTS = {
  nombre: 'Zenón Carlos Cartagena Álvarez',
  prof1: 'Abogado',
  prof2: 'Ingeniero de Sistemas',
  cargo: 'Socio Fundador',
  badge: 'Derecho Informático',
  tel: '+591 78360469',
  email: 'alba23meira@gmail.com',
  web: 'lexfive.netlify.app',
  direccion: 'Av. Alfredo Franco Valle 708-51, Ed. Real, of. 6-A · El Alto, Bolivia',
  areas: 'Derecho Laboral, Derecho Informático, Derecho Administrativo, Asesoría Legal Tech'
};

// Emblema LexFive: balanza de la justicia dentro de un microchip (Derecho + Sistemas).
function emblema(id) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="LexFive">
    <defs>
      <linearGradient id="tjbg${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a2f49"/><stop offset="1" stop-color="#0d1826"/></linearGradient>
      <linearGradient id="tjgold${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ecdcb2"/><stop offset="0.45" stop-color="#cba765"/><stop offset="1" stop-color="#a07f3a"/></linearGradient>
    </defs>
    <rect width="64" height="64" rx="14" fill="url(#tjbg${id})"/>
    <rect x="3.25" y="3.25" width="57.5" height="57.5" rx="11" fill="none" stroke="url(#tjgold${id})" stroke-width="0.8" opacity="0.55"/>
    <g fill="none" stroke="url(#tjgold${id})" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <rect x="19" y="13" width="26" height="26" rx="3.5"/>
      <path d="M25 13 L25 9.5 M32 13 L32 9.5 M39 13 L39 9.5"/>
      <path d="M25 39 L25 42.5 M32 39 L32 42.5 M39 39 L39 42.5"/>
      <path d="M19 20 L15.5 20 M19 26 L15.5 26 M19 32 L15.5 32"/>
      <path d="M45 20 L48.5 20 M45 26 L48.5 26 M45 32 L48.5 32"/>
    </g>
    <g fill="none" stroke="url(#tjgold${id})" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M32 18 L32 34"/><path d="M24 22 L40 22"/>
      <path d="M24 22 L21.5 27 M24 22 L26.5 27"/><path d="M40 22 L37.5 27 M40 22 L42.5 27"/>
      <path d="M20.5 27 Q24 30.8 27.5 27"/><path d="M36.5 27 Q40 30.8 43.5 27"/>
      <path d="M28 34 L36 34"/>
    </g>
    <circle cx="32" cy="17.4" r="1.7" fill="url(#tjgold${id})"/>
    <circle cx="32" cy="22" r="1.2" fill="url(#tjgold${id})"/>
  </svg>`;
}

// CSS de la tarjeta (mm = tamaño real al imprimir). Se reutiliza en la vista
// previa del panel y en la ventana de impresión.
const TARJETA_CSS = `
  .tjc{ --navy:#0e1b2c; --navy-700:#16273d; --navy-800:#0a1420;
    --gold:#b8923f; --gold-soft:#c8a558; --gold-bright:#e7d3a1;
    --tech-cyan:#38bdf8;
    width:85mm; height:55mm; border-radius:9px; overflow:hidden; position:relative;
    color:#fff; background:#0e1b2c; font-family:'Inter',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
    -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .tjc *{ box-sizing:border-box; margin:0; padding:0; }
  .tjc::before{ content:""; position:absolute; inset:0;
    background:
      radial-gradient(120% 120% at 0% 0%, rgba(47,123,214,.18), transparent 55%),
      linear-gradient(135deg, var(--navy-700) 0%, var(--navy) 55%, var(--navy-800) 100%); }
  .tjc::after{ content:""; position:absolute; inset:0; opacity:.10;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='84' height='84' fill='none'%3E%3Cg stroke='%2338bdf8' stroke-width='1'%3E%3Cpath d='M12 12h26v26'/%3E%3Cpath d='M72 24H46v22h26'/%3E%3Cpath d='M12 56h16v20'/%3E%3Cpath d='M56 72V50h16'/%3E%3C/g%3E%3Cg fill='%23c8a558'%3E%3Ccircle cx='12' cy='12' r='2.4'/%3E%3Ccircle cx='38' cy='38' r='2.4'/%3E%3Ccircle cx='46' cy='24' r='2.4'/%3E%3Ccircle cx='28' cy='56' r='2.4'/%3E%3Ccircle cx='56' cy='50' r='2.4'/%3E%3C/g%3E%3C/svg%3E");
    background-size:84px 84px; }
  .tjc > *{ position:relative; z-index:1; }
  .tjc__edge{ position:absolute; top:0; left:0; right:0; height:4px; z-index:2;
    background:linear-gradient(90deg,var(--gold) 0%,var(--gold-bright) 50%,var(--gold) 100%); }

  .tjc--front{ display:flex; flex-direction:column; padding:7mm 8mm; }
  .tjc__top{ display:flex; align-items:center; gap:3.4mm; }
  .tjc__logo{ width:15mm; height:15mm; flex-shrink:0; border-radius:3mm; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,.35); }
  .tjc__logo svg{ width:100%; height:100%; display:block; }
  .tjc__brand-name{ font-family:'Cormorant Garamond',Georgia,serif; font-size:7.6mm; font-weight:700; line-height:1; letter-spacing:.5px; }
  .tjc__brand-name b{ color:var(--gold-soft); font-weight:700; }
  .tjc__brand-tag{ font-size:2.5mm; letter-spacing:.32em; text-transform:uppercase; color:rgba(255,255,255,.62); margin-top:1.4mm; }
  .tjc__name{ margin-top:auto; }
  .tjc__name h2{ font-family:'Cormorant Garamond',Georgia,serif; font-size:6.4mm; font-weight:600; color:#fff; line-height:1.05; }
  .tjc__roles{ display:flex; align-items:center; gap:2.4mm; margin-top:2mm; flex-wrap:wrap; }
  .tjc__role{ display:inline-flex; align-items:center; gap:1.4mm; font-size:2.7mm; font-weight:600; }
  .tjc__role svg{ width:3.4mm; height:3.4mm; }
  .tjc__role--law{ color:var(--gold-bright); }
  .tjc__role--tech{ color:var(--tech-cyan); }
  .tjc__sep{ width:1px; height:3.6mm; background:rgba(255,255,255,.28); }
  .tjc__foot{ margin-top:3mm; display:flex; align-items:center; justify-content:space-between; gap:3mm; }
  .tjc__cargo{ font-size:2.5mm; color:rgba(255,255,255,.7); }
  .tjc__badge{ font-size:2.2mm; letter-spacing:.14em; text-transform:uppercase; color:var(--navy);
    background:linear-gradient(90deg,var(--gold-bright),var(--gold-soft)); padding:1mm 2.6mm; border-radius:999px; font-weight:700; white-space:nowrap; }

  .tjc--back{ padding:6.5mm 8mm; display:flex; flex-direction:column; }
  .tjc__bhead{ display:flex; align-items:center; gap:2.6mm; padding-bottom:3mm; border-bottom:1px solid rgba(255,255,255,.14); }
  .tjc__bhead .tjc__logo{ width:9mm; height:9mm; border-radius:2mm; }
  .tjc__bhead h3{ font-family:'Cormorant Garamond',Georgia,serif; font-size:4.4mm; font-weight:600; line-height:1; }
  .tjc__bhead p{ font-size:2.3mm; color:rgba(255,255,255,.6); letter-spacing:.05em; margin-top:.8mm; text-transform:uppercase; }
  .tjc__contact{ margin-top:3.2mm; display:flex; flex-direction:column; gap:2mm; }
  .tjc__row{ display:flex; align-items:center; gap:2.6mm; font-size:2.8mm; color:rgba(255,255,255,.9); }
  .tjc__ico{ width:5mm; height:5mm; border-radius:1.6mm; flex-shrink:0; display:flex; align-items:center; justify-content:center;
    background:rgba(56,189,248,.14); border:1px solid rgba(56,189,248,.28); }
  .tjc__ico svg{ width:3mm; height:3mm; color:var(--tech-cyan); }
  .tjc__areas{ margin-top:auto; padding-top:3mm; border-top:1px solid rgba(255,255,255,.14); }
  .tjc__areas .lbl{ font-size:2.2mm; letter-spacing:.16em; text-transform:uppercase; color:var(--gold-soft); font-weight:700; margin-bottom:1.6mm; }
  .tjc__chips{ display:flex; flex-wrap:wrap; gap:1.6mm; }
  .tjc__chip{ font-size:2.3mm; padding:.9mm 2.2mm; border-radius:999px; background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.16); color:rgba(255,255,255,.85); }
`;

function leerDatos() {
  const v = (id) => ($('#' + id) ? $('#' + id).value.trim() : '');
  return {
    nombre: v('tj_nombre') || DEFAULTS.nombre,
    prof1: v('tj_prof1'),
    prof2: v('tj_prof2'),
    cargo: v('tj_cargo'),
    badge: v('tj_badge'),
    tel: v('tj_tel'),
    email: v('tj_email'),
    web: v('tj_web'),
    direccion: v('tj_direccion'),
    areas: v('tj_areas')
  };
}

function nombrePartido(nombre) {
  const partes = (nombre || '').trim().split(/\s+/);
  if (partes.length <= 2) return esc(nombre);
  const mitad = Math.ceil(partes.length / 2);
  return esc(partes.slice(0, mitad).join(' ')) + '<br>' + esc(partes.slice(mitad).join(' '));
}

// Construye las dos caras de la tarjeta a partir de los datos.
function buildTarjeta(d) {
  const iconLaw = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M5 7h14M7 7l-3 6h6L7 7Zm10 0-3 6h6l-3-6ZM8 21h8"/></svg>`;
  const iconTech = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M10 7V4M14 7V4M10 20v-3M14 20v-3M7 10H4M7 14H4M20 10h-3M20 14h-3"/></svg>`;

  const roles = [];
  if (d.prof1) roles.push(`<span class="tjc__role tjc__role--law">${iconLaw}${esc(d.prof1)}</span>`);
  if (d.prof2) roles.push(`<span class="tjc__role tjc__role--tech">${iconTech}${esc(d.prof2)}</span>`);
  const rolesHTML = roles.join('<span class="tjc__sep"></span>');

  const anverso = `
    <div class="tjc tjc--front">
      <span class="tjc__edge"></span>
      <div class="tjc__top">
        <div class="tjc__logo">${emblema('f')}</div>
        <div>
          <div class="tjc__brand-name">Lex<b>Five</b></div>
          <div class="tjc__brand-tag">Abogados · Derecho + Tecnología</div>
        </div>
      </div>
      <div class="tjc__name">
        <h2>${nombrePartido(d.nombre)}</h2>
        ${rolesHTML ? `<div class="tjc__roles">${rolesHTML}</div>` : ''}
      </div>
      <div class="tjc__foot">
        ${d.cargo ? `<span class="tjc__cargo">${esc(d.cargo)}</span>` : '<span></span>'}
        ${d.badge ? `<span class="tjc__badge">${esc(d.badge)}</span>` : ''}
      </div>
    </div>`;

  const subt = [d.prof1, d.prof2].filter(Boolean).join(' · ').toUpperCase();
  const rows = [];
  if (d.tel) rows.push(`<div class="tjc__row"><span class="tjc__ico"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.4 0 .8-.3 1l-2.2 2.2Z"/></svg></span>${esc(d.tel)} · WhatsApp</div>`);
  if (d.email) rows.push(`<div class="tjc__row"><span class="tjc__ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg></span>${esc(d.email)}</div>`);
  if (d.web) rows.push(`<div class="tjc__row"><span class="tjc__ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15.5 0 18M12 3c-2.5 2.5-2.5 15.5 0 18"/></svg></span>${esc(d.web)}</div>`);
  if (d.direccion) rows.push(`<div class="tjc__row"><span class="tjc__ico"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"/></svg></span>${esc(d.direccion)}</div>`);

  const chips = (d.areas || '').split(',').map(s => s.trim()).filter(Boolean)
    .map(a => `<span class="tjc__chip">${esc(a)}</span>`).join('');

  const reverso = `
    <div class="tjc tjc--back">
      <span class="tjc__edge"></span>
      <div class="tjc__bhead">
        <div class="tjc__logo">${emblema('b')}</div>
        <div>
          <h3>${esc(d.nombre)}</h3>
          ${subt ? `<p>${esc(subt)}</p>` : ''}
        </div>
      </div>
      <div class="tjc__contact">${rows.join('')}</div>
      ${chips ? `<div class="tjc__areas"><div class="lbl">Áreas de práctica</div><div class="tjc__chips">${chips}</div></div>` : ''}
    </div>`;

  return { anverso, reverso };
}

function pintarPreview() {
  const d = leerDatos();
  const { anverso, reverso } = buildTarjeta(d);
  const prev = $('#tjPreview');
  if (prev) prev.innerHTML = anverso + reverso;
}

const FONTS_LINK = '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">';

function imprimirTarjeta() {
  const d = leerDatos();
  const { anverso, reverso } = buildTarjeta(d);
  const w = window.open('', '_blank');
  if (!w) { toast('Permita las ventanas emergentes para imprimir.', 'error'); return; }
  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <title>Tarjeta de presentación · ${esc(d.nombre)}</title>
    ${FONTS_LINK}
    <style>
      @page{ size:auto; margin:10mm; }
      body{ margin:0; background:#fff; display:flex; flex-direction:column; align-items:center; gap:8mm; padding:10mm; }
      ${TARJETA_CSS}
      .tjc{ outline:.2mm solid #d8dbe0; }
    </style></head><body>
    ${anverso}${reverso}
    <script>window.addEventListener('load',function(){setTimeout(function(){window.print();},500);});<\/script>
    </body></html>`);
  w.document.close();
}

export function renderTarjetas() {
  const d = DEFAULTS;
  content().innerHTML = `
    <style id="tjStyle">${TARJETA_CSS}
      #tjPreview{ display:flex; flex-wrap:wrap; gap:22px; justify-content:center; padding:6px 0; }
    </style>

    <div class="card"><div class="card__body">
      <h3 class="intro-title">Tarjetas de presentación</h3>
      <p class="cell-sub">Genere la tarjeta de presentación del bufete (85 × 55 mm, doble cara). Pensada para reflejar el doble perfil profesional (por ejemplo, <strong>Abogado</strong> e <strong>Ingeniero de Sistemas</strong>). Edite los campos, vea la vista previa y pulse «Imprimir / Guardar PDF» (active «Gráficos de fondo» para conservar los colores).</p>
    </div></div>

    <div class="card"><div class="card__body">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;">
        <div class="field" style="margin:0"><label>Nombre completo</label><input id="tj_nombre" value="${esc(d.nombre)}"></div>
        <div class="field" style="margin:0"><label>Profesión 1 (jurídica)</label><input id="tj_prof1" value="${esc(d.prof1)}"></div>
        <div class="field" style="margin:0"><label>Profesión 2 (tecnológica) <span class="cell-sub">— opcional</span></label><input id="tj_prof2" value="${esc(d.prof2)}"></div>
        <div class="field" style="margin:0"><label>Cargo</label><input id="tj_cargo" value="${esc(d.cargo)}"></div>
        <div class="field" style="margin:0"><label>Distintivo (badge)</label><input id="tj_badge" value="${esc(d.badge)}"></div>
        <div class="field" style="margin:0"><label>Teléfono / WhatsApp</label><input id="tj_tel" value="${esc(d.tel)}"></div>
        <div class="field" style="margin:0"><label>Correo</label><input id="tj_email" value="${esc(d.email)}"></div>
        <div class="field" style="margin:0"><label>Sitio web</label><input id="tj_web" value="${esc(d.web)}"></div>
        <div class="field" style="margin:0;grid-column:1/-1"><label>Dirección</label><input id="tj_direccion" value="${esc(d.direccion)}"></div>
        <div class="field" style="margin:0;grid-column:1/-1"><label>Áreas de práctica <span class="cell-sub">— separadas por comas</span></label><input id="tj_areas" value="${esc(d.areas)}"></div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;">
        <button class="btn btn--primary" id="tj_print">${ICON.doc} Imprimir / Guardar PDF</button>
        <button class="btn btn--ghost" id="tj_reset">Restaurar valores</button>
      </div>
    </div></div>

    <div class="card">
      <div class="card__head"><h3>Vista previa (anverso y reverso)</h3></div>
      <div class="card__body"><div id="tjPreview"></div></div>
    </div>`;

  ['tj_nombre','tj_prof1','tj_prof2','tj_cargo','tj_badge','tj_tel','tj_email','tj_web','tj_direccion','tj_areas']
    .forEach(id => { const el = $('#' + id); if (el) el.oninput = pintarPreview; });

  $('#tj_print').onclick = imprimirTarjeta;
  $('#tj_reset').onclick = () => { renderTarjetas(); };

  pintarPreview();
}
