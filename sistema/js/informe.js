// ============================================================
//  VISTA: INFORME ÚNICO DE PASANTÍA
//  Documento de pasantía sobre la HOJA MEMBRETADA del bufete (logo, marca de
//  agua y sello), con encabezado (A / DE / REF / FECHA), cuerpo editable y dos
//  firmas. Incluye un CATÁLOGO de tareas administrable (CRUD) que se pueden
//  insertar por semana/día. Descargable en PDF y Word, tamaño Carta y Oficio.
// ============================================================
import { withTimeout } from './auth.js';
import { ICON } from './icons.js';
import { esc, hoyISO, fmtDate } from './util.js';
import { descargarArchivo } from './exportar.js';
import { $, content } from './dom.js';
import { toast, loading } from './ui.js';
import { ensureImgCache } from './media.js';
import { hydrateBranding, pickActiveLogo, pickActiveSello, brandLogoSrc, brandSelloSrc, wmOpacityActual, applyWmOpacity, pushBranding } from './branding.js';
import { supabase } from './supabase.js';

const PAGES = {
  carta:  { label: 'Carta',  w: '21.6cm', h: '27.9cm', css: '21.6cm 27.9cm' },
  oficio: { label: 'Oficio', w: '21.6cm', h: '33cm',   css: '21.6cm 33cm' }
};

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

// Catálogo de tareas de ejemplo (NUEVAS, distintas a las del modelo). Se pueden
// administrar (agregar / quitar) y se guardan en el equipo y, si hay conexión,
// en la nube (tabla "configuracion", clave 'informe_tareas').
const DEFAULT_TAREAS = [
  'Elaboración de minutas de transferencia de bienes inmuebles.',
  'Cotejo de poderes notariales y verificación de su vigencia.',
  'Redacción de cartas notariales y requerimientos de pago.',
  'Análisis de la Ley N.° 348 y su aplicación en casos de violencia familiar.',
  'Apoyo en la elaboración de recursos de casación en materia civil.',
  'Seguimiento de causas en el sistema judicial (consulta de estados procesales).',
  'Inventario y foliado de expedientes para su archivo definitivo.',
  'Preparación de proyectos de resolución para revisión del abogado.',
  'Investigación doctrinal sobre prescripción y caducidad de acciones.',
  'Asistencia en audiencias de conciliación y elaboración del acta respectiva.',
  'Revisión de contratos de arrendamiento y observación de cláusulas.',
  'Elaboración de cuadros de control de plazos procesales.',
  'Diligenciamiento de notificaciones en oficinas públicas (Derechos Reales, SEGIP).',
  'Redacción de memoriales de apersonamiento y señalamiento de domicilio.',
  'Estudio de jurisprudencia del Tribunal Constitucional Plurinacional.',
  'Apoyo en la constitución de sociedades comerciales ante FUNDEMPRESA.',
  'Elaboración de declaraciones juradas y formularios registrales.',
  'Clasificación y digitalización de la correspondencia del bufete.',
  'Preparación de la prueba documental para audiencia de juicio oral.',
  'Investigación sobre el procedimiento coactivo fiscal y tributario.',
  'Redacción de borradores de demanda de asistencia familiar.',
  'Verificación de antecedentes en registros públicos.',
  'Apoyo en la atención y orientación legal inicial a clientes.',
  'Elaboración del informe semanal de actividades de pasantía.'
];

const TAREAS_KEY = 'lexfive_informe_tareas';
function tareasLocales() {
  try { const a = JSON.parse(localStorage.getItem(TAREAS_KEY) || 'null'); return Array.isArray(a) ? a : null; }
  catch (e) { return null; }
}
async function cargarTareas() {
  try {
    const { data } = await withTimeout(
      supabase.from('configuracion').select('valor').eq('clave', 'informe_tareas').maybeSingle(), 6000, 'tareas');
    if (data && Array.isArray(data.valor) && data.valor.length) {
      try { localStorage.setItem(TAREAS_KEY, JSON.stringify(data.valor)); } catch (e) {}
      return data.valor.slice();
    }
  } catch (e) {}
  return tareasLocales() || DEFAULT_TAREAS.slice();
}
async function guardarTareas(arr) {
  try { localStorage.setItem(TAREAS_KEY, JSON.stringify(arr)); } catch (e) {}
  try { await supabase.from('configuracion').upsert({ clave: 'informe_tareas', valor: arr, updated_at: new Date().toISOString() }); } catch (e) {}
}

const CUERPO_EJEMPLO = `I. ANTECEDENTES

1) Guía de Procedimiento para Pasantías en la Carrera de Derecho, aprobado mediante Resolución del Honorable Consejo Universitario.
2) Nota de Designación de Pasantía emitida por la Universidad.

II. DETALLE DE FUNCIONES REALIZADAS

A continuación, detallo las funciones asignadas y realizadas por mi persona durante el periodo de Duración de Pasantía:

PRIMERA SEMANA (del __ al __)
Lunes:
• (Use el catálogo de tareas de abajo para insertar actividades aquí.)

III. CONCLUSIONES Y VISTO BUENO

Habiendo descrito a detalle cada una de las funciones asignadas a mi persona en calidad de Pasante, se concluye:
Que mi persona ha desarrollado a cabalidad cada una de las funciones asignadas por el Bufete de Abogados, poniendo especial énfasis en la investigación jurídica, la gestión documental y el apoyo directo a la litigación.
Que mi persona ha desarrollado todas las actividades con transparencia, ética y responsabilidad, manteniendo la confidencialidad absoluta sobre la información de los clientes y los casos del Bufete.
Que se ha logrado poner en práctica y fortalecer los conocimientos teóricos adquiridos en la Universidad, especialmente en materia procesal, civil, familiar y laboral.
Es cuanto informo a su consideración, para fines consiguientes.`;

const DEF = {
  a: 'Dr. Franklin Rubén Pareja Aliaga',
  aCargo: 'DOCENTE DE LA CARRERA DE DERECHO\nGUÍA DE LA MATERIA DE PASANTÍA',
  de: 'Univ. Luis Joel Fernandez Pacosillo',
  deSub: 'Universitario(a) – R.U.: 1846019',
  ref: 'INFORME ÚNICO DE PASANTÍA',
  lugar: 'La Paz',
  duracion: '4 semanas a medio tiempo.',
  institucion: 'Bufete de Abogados LexFive',
  supervision: 'Abg. Carlos Cartagena - Abogado Director',
  f1: 'Luis Joel Fernandez Pacosillo',
  f1Sub: 'R.U.: 1846019',
  f2: 'Abg. Carlos Cartagena',
  f2Sub: 'R.P.A. Nº ________'
};

// Convierte el texto del cuerpo en HTML legible.
function bodyHTML(text) {
  return (text || '').split('\n').map(raw => {
    const t = raw.trim();
    if (!t) return '<div style="height:7px"></div>';
    const esTitulo = /^(I{1,3}|IV|V)\.\s/.test(t) || /SEMANA/.test(t);
    const esDia = /^[A-Za-zÁÉÍÓÚáéíóúÑñ]+:$/.test(t);
    const esBullet = /^[•·\-]/.test(t);
    if (esTitulo) return `<div style="font-weight:700;margin:12px 0 4px;color:#0e1b2c;">${esc(t)}</div>`;
    if (esDia) return `<div style="font-weight:700;margin:6px 0 2px;">${esc(t)}</div>`;
    if (esBullet) return `<div style="padding-left:20px;text-indent:-14px;margin:2px 0;text-align:justify;">${esc(t)}</div>`;
    return `<div style="margin:3px 0;text-align:justify;">${esc(t)}</div>`;
  }).join('');
}

function buildInforme(d) {
  const fila = (et, val) => `<tr><td style="padding:1px 10px 1px 0;vertical-align:top;font-weight:700;white-space:nowrap;">${esc(et)}</td><td style="padding:1px 0;vertical-align:top;">:&nbsp;&nbsp;${val}</td></tr>`;
  const aCargo = esc(d.aCargo || '').replace(/\n/g, '<br>');
  const deSub = esc(d.deSub || '').replace(/\n/g, '<br>');
  const f1Sub = esc(d.f1Sub || '').replace(/\n/g, '<br>');
  const f2Sub = esc(d.f2Sub || '').replace(/\n/g, '<br>');
  const wmOp = (wmOpacityActual() / 100).toFixed(2);
  const wm = d.logoSrc ? `<img src="${d.logoSrc}" alt="" style="position:absolute;top:46%;left:50%;width:12cm;height:12cm;object-fit:contain;transform:translate(-50%,-50%);opacity:${wmOp};pointer-events:none;z-index:0;">` : '';
  const logoBadge = d.logoSrc ? `<img src="${d.logoSrc}" alt="" style="width:66px;height:66px;object-fit:cover;border-radius:50%;display:block;margin:0 auto 6px;box-shadow:0 0 0 2px rgba(194,162,90,.6);">` : '';
  return `
  <div style="position:relative;font-family:'Times New Roman',Georgia,serif;color:#101820;background:#fff;width:${d.pageW};min-height:${d.pageH};margin:0 auto;padding:1.5cm 2.2cm 1.6cm;box-sizing:border-box;font-size:12.5px;line-height:1.5;overflow:hidden;">
    <div style="position:absolute;top:0;left:0;bottom:0;width:0.45cm;background:linear-gradient(#0e1b2c,#16273d);"></div>
    ${wm}
    <div style="position:relative;z-index:1;text-align:center;border-bottom:2px solid #c2a25a;padding-bottom:10px;margin-bottom:14px;">
      ${logoBadge}
      <div style="font-size:24px;font-weight:700;color:#0e1b2c;letter-spacing:1px;font-family:Georgia,serif;">Lex<span style="color:#c2a25a;">Five</span></div>
      <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#a8853c;font-family:Arial,sans-serif;">Bufete de Abogados</div>
    </div>
    <table style="position:relative;z-index:1;border-collapse:collapse;font-size:12.5px;margin-bottom:6px;">
      ${fila('A', '<strong>' + esc(d.a) + '</strong>' + (aCargo ? '<br>' + aCargo : ''))}
      ${fila('DE', '<strong>' + esc(d.de) + '</strong>' + (deSub ? '<br>' + deSub : ''))}
      ${fila('REF', '<strong>' + esc(d.ref) + '</strong>')}
      ${fila('FECHA', esc(d.fechaTxt))}
    </table>
    <hr style="position:relative;z-index:1;border:none;border-top:1px solid #101820;margin:8px 0 14px;">
    <div style="position:relative;z-index:1;">
      <p style="margin:0 0 10px;">Señor docente guía:</p>
      <p style="margin:0 0 10px;text-align:justify;">A continuación, pongo a su consideración el Informe Único de Pasantía, que detalla mis actividades realizadas como Pasante, bajo las siguientes características:</p>
      <div style="margin:0 0 14px;">
        <div><strong>Duración de Pasantía:</strong> ${esc(d.duracion)}</div>
        <div><strong>Institución:</strong> ${esc(d.institucion)}</div>
        <div><strong>Supervisión:</strong> ${esc(d.supervision)}</div>
      </div>
      <div>${bodyHTML(d.cuerpo)}</div>
      <p style="margin:14px 0 0;">Atentamente,</p>
      <table style="width:100%;border-collapse:collapse;margin-top:64px;font-size:12px;position:relative;">
        ${d.selloSrc ? `<tr><td colspan="2" style="text-align:center;padding:0;height:0;"><img src="${d.selloSrc}" alt="" style="position:absolute;left:50%;top:-58px;transform:translateX(-50%) rotate(-6deg);width:3cm;height:3cm;object-fit:contain;mix-blend-mode:multiply;filter:contrast(1.25) brightness(1.08);opacity:.92;"></td></tr>` : ''}
        <tr>
          <td style="width:50%;text-align:center;vertical-align:bottom;padding:0 12px;">
            <div style="border-top:1px solid #101820;padding-top:5px;font-weight:700;">${esc(d.f1)}</div>
            <div>${f1Sub}</div>
          </td>
          <td style="width:50%;text-align:center;vertical-align:bottom;padding:0 12px;">
            <div style="border-top:1px solid #101820;padding-top:5px;font-weight:700;">${esc(d.f2)}</div>
            <div>${f2Sub}</div>
          </td>
        </tr>
      </table>
      <div style="border-top:1px solid #d9dce1;padding-top:8px;margin-top:22px;text-align:center;font-size:9px;color:#5c6675;font-family:Arial,sans-serif;line-height:1.5;">
        LexFive &middot; Bufete de Abogados &middot; Derecho &amp; Tecnolog&iacute;a &middot; El Alto - La Paz, Bolivia &middot; Tel/WhatsApp +591 78360469 &middot; lexfive.netlify.app
      </div>
    </div>
  </div>`;
}

function abrirImpresion(titulo, docHTML, pageCss) {
  const w = window.open('', '_blank');
  if (!w) { toast('Permita las ventanas emergentes para imprimir.', 'error'); return; }
  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${esc(titulo)}</title>
    <style>@page{size:${pageCss};margin:0;} html,body{margin:0;background:#fff;}</style></head><body>${docHTML}
    <script>window.addEventListener('load',function(){setTimeout(function(){window.print();},400);});<\/script></body></html>`);
  w.document.close();
}

export async function renderInforme() {
  loading();
  try { await withTimeout(ensureImgCache(), 8000, 'imágenes'); } catch (e) {}
  try { await withTimeout(hydrateBranding(), 8000, 'branding'); } catch (e) {}
  const logoSrc = urlAbs(brandLogoSrc(pickActiveLogo(localStorage.getItem('lexfive_logo'))));
  const selloSrc = urlAbs(brandSelloSrc(pickActiveSello(localStorage.getItem('lexfive_sello'))));
  let TAREAS = await cargarTareas();

  const campo = (id, label, val, ph) => `<div class="field"><label>${label}</label><input id="${id}" value="${esc(val)}" placeholder="${esc(ph || '')}"></div>`;
  const campoArea = (id, label, val, rows) => `<div class="field"><label>${label}</label><textarea id="${id}" rows="${rows || 2}" style="font-family:inherit">${esc(val)}</textarea></div>`;

  content().innerHTML = `
    <div class="card"><div class="card__body">
      <h3 class="intro-title">Informe Único de Pasantía</h3>
      <p class="cell-sub">Sale en la hoja membretada del bufete (logo, marca de agua y sello). Complete el encabezado y las firmas, arme el cuerpo usando el catálogo de tareas y descárguelo en PDF o Word (Carta u Oficio).</p>
    </div></div>

    <div class="card">
      <div class="card__head"><h3>Encabezado</h3></div>
      <div class="card__body">
        <div class="cert-form">
          ${campo('in_a', 'A (docente / destinatario)', DEF.a)}
          ${campo('in_de', 'DE (pasante)', DEF.de)}
          ${campo('in_desub', 'Datos del pasante (R.U.)', DEF.deSub)}
          ${campo('in_ref', 'Referencia', DEF.ref)}
          ${campo('in_lugar', 'Lugar', DEF.lugar)}
          <div class="field"><label>Fecha</label><input id="in_fecha" type="date" value="${hoyISO()}"></div>
          ${campo('in_dur', 'Duración de la pasantía', DEF.duracion)}
          ${campo('in_inst', 'Institución', DEF.institucion)}
          ${campo('in_sup', 'Supervisión', DEF.supervision)}
        </div>
        ${campoArea('in_acargo', 'Cargo del destinatario (debajo del nombre en «A»)', DEF.aCargo, 2)}
      </div>
    </div>

    <div class="card">
      <div class="card__head"><h3>Catálogo de tareas</h3>
        <button class="btn btn--ghost btn--sm" id="in_tarea_restaurar" type="button">Restaurar catálogo</button>
      </div>
      <div class="card__body">
        <p class="cell-sub">Marque tareas y pulse «Insertar» para agregarlas al cuerpo como viñetas. Puede agregar tareas nuevas o quitar las que no use. Los botones de semana/día ayudan a estructurar.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0">
          <input id="in_tarea_nueva" placeholder="Escriba una tarea nueva..." style="flex:1;min-width:200px">
          <button class="btn btn--ghost" id="in_tarea_add" type="button">Agregar tarea</button>
        </div>
        <div id="in_tareas_list" style="max-height:260px;overflow:auto;border:1px solid var(--line);border-radius:8px;padding:8px"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
          <button class="btn btn--primary btn--sm" id="in_insertar" type="button">Insertar seleccionadas en el cuerpo</button>
          <button class="btn btn--ghost btn--sm" id="in_add_semana" type="button">+ Título de semana</button>
          <button class="btn btn--ghost btn--sm" id="in_add_dia" type="button">+ Día</button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card__head"><h3>Cuerpo del informe</h3>
        <button class="btn btn--ghost btn--sm" id="in_restaurar" type="button">Restaurar modelo</button>
      </div>
      <div class="card__body">
        ${campoArea('in_cuerpo', 'Antecedentes, detalle de funciones y conclusiones', CUERPO_EJEMPLO, 16)}
      </div>
    </div>

    <div class="card">
      <div class="card__head"><h3>Firmas</h3></div>
      <div class="card__body"><div class="cert-form">
        ${campo('in_f1', 'Firma izquierda (pasante)', DEF.f1)}
        ${campoArea('in_f1sub', 'Datos (firma izquierda)', DEF.f1Sub, 2)}
        ${campo('in_f2', 'Firma derecha (supervisor)', DEF.f2)}
        ${campoArea('in_f2sub', 'Datos (firma derecha)', DEF.f2Sub, 2)}
      </div></div>
    </div>

    <div class="card"><div class="card__body">
      <div style="display:flex;gap:18px;flex-wrap:wrap;align-items:flex-end;">
        <div class="field" style="margin:0;min-width:200px"><label>Tamaño de hoja</label>
          <select id="in_tam">
            <option value="carta">Carta (21.6 &times; 27.9 cm)</option>
            <option value="oficio">Oficio (21.6 &times; 33 cm)</option>
          </select></div>
        <label class="cell-sub" style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="in_sello" checked> Incluir sello del bufete</label>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn btn--primary" id="in_print">${ICON.doc} Imprimir / Guardar PDF</button>
          <button class="btn btn--ghost" id="in_word">Descargar Word</button>
        </div>
      </div>
      <div class="field" style="margin:14px 0 0;max-width:440px">
        <label>Intensidad de la marca de agua (logo de fondo)</label>
        <div style="display:flex;align-items:center;gap:10px">
          <input type="range" id="in_wm" min="3" max="40" step="1" value="${wmOpacityActual()}" style="flex:1">
          <output id="in_wm_out" style="min-width:42px;text-align:right">${wmOpacityActual()}%</output>
        </div>
        <p class="cell-sub" style="margin:4px 0 0">Más a la derecha = marca de agua más oscura. (Se comparte con certificados y credenciales.)</p>
      </div>
    </div></div>

    <div class="card">
      <div class="card__head"><h3>Vista previa</h3></div>
      <div class="card__body"><div class="cert-preview" id="inPreview"></div></div>
    </div>`;

  const val = id => ($('#' + id) ? $('#' + id).value : '');
  const page = () => PAGES[$('#in_tam').value] || PAGES.carta;
  const datos = () => {
    const p = page();
    return {
      a: val('in_a'), aCargo: val('in_acargo'), de: val('in_de'), deSub: val('in_desub'),
      ref: val('in_ref'),
      fechaTxt: (val('in_lugar') ? val('in_lugar') + ', ' : '') + fechaLarga(val('in_fecha')),
      duracion: val('in_dur'), institucion: val('in_inst'), supervision: val('in_sup'),
      cuerpo: val('in_cuerpo'), f1: val('in_f1'), f1Sub: val('in_f1sub'),
      f2: val('in_f2'), f2Sub: val('in_f2sub'),
      logoSrc, selloSrc: ($('#in_sello') && $('#in_sello').checked) ? selloSrc : '', pageW: p.w, pageH: p.h
    };
  };
  const pintar = () => { $('#inPreview').innerHTML = buildInforme(datos()); };

  // ---- Catálogo de tareas (CRUD) ----
  let caretCuerpo = null; // última posición del cursor en el cuerpo (si la hubo)
  function pintarTareas() {
    const cont = $('#in_tareas_list'); if (!cont) return;
    if (!TAREAS.length) { cont.innerHTML = '<p class="cell-sub" style="margin:6px">Catálogo vacío. Agregue tareas o restaure el catálogo.</p>'; return; }
    cont.innerHTML = TAREAS.map((t, i) => `
      <label style="display:flex;align-items:flex-start;gap:8px;padding:4px 2px;border-bottom:1px solid var(--line)">
        <input type="checkbox" class="in_tk" data-i="${i}" style="margin-top:3px">
        <span style="flex:1;font-size:.88rem">${esc(t)}</span>
        <button class="btn btn--ghost btn--sm in_tk_del" data-i="${i}" type="button" title="Quitar">&times;</button>
      </label>`).join('');
    cont.querySelectorAll('.in_tk_del').forEach(b => b.onclick = async () => {
      const i = Number(b.dataset.i); TAREAS.splice(i, 1); await guardarTareas(TAREAS); pintarTareas();
    });
  }
  function insertarEnCuerpo(texto) {
    const ta = $('#in_cuerpo'); if (!ta) return;
    // Si el usuario colocó el cursor en algún punto, inserta ahí; si no, agrega al FINAL.
    const pos = (caretCuerpo != null) ? caretCuerpo : ta.value.length;
    const antes = ta.value.slice(0, pos), despues = ta.value.slice(pos);
    const sep = (antes && !antes.endsWith('\n')) ? '\n' : '';
    ta.value = antes + sep + texto + (despues.startsWith('\n') || !despues ? '' : '\n') + despues;
    const nuevaPos = (antes + sep + texto).length;
    caretCuerpo = nuevaPos;
    try { ta.focus(); ta.setSelectionRange(nuevaPos, nuevaPos); } catch (e) {}
    pintar();
  }

  pintarTareas();
  $('#in_tarea_add').onclick = async () => {
    const inp = $('#in_tarea_nueva'); const v = (inp.value || '').trim();
    if (!v) { toast('Escriba la tarea.', 'error'); return; }
    TAREAS.push(v); inp.value = ''; await guardarTareas(TAREAS); pintarTareas(); toast('Tarea agregada al catálogo.', 'success');
  };
  $('#in_tarea_restaurar').onclick = async () => {
    if (!confirm('¿Restaurar el catálogo a las tareas de ejemplo? Se reemplazará el catálogo actual.')) return;
    TAREAS = DEFAULT_TAREAS.slice(); await guardarTareas(TAREAS); pintarTareas(); toast('Catálogo restaurado.', 'success');
  };
  $('#in_insertar').onclick = () => {
    const sel = Array.from(content().querySelectorAll('.in_tk:checked')).map(c => TAREAS[Number(c.dataset.i)]).filter(Boolean);
    if (!sel.length) { toast('Marque al menos una tarea.', 'error'); return; }
    insertarEnCuerpo(sel.map(t => '• ' + t).join('\n'));
    content().querySelectorAll('.in_tk:checked').forEach(c => { c.checked = false; });
  };
  $('#in_add_semana').onclick = () => { const t = (prompt('Título de la semana:', 'PRIMERA SEMANA (del __ al __)') || '').trim(); if (t) insertarEnCuerpo('\n' + t); };
  $('#in_add_dia').onclick = () => { const d = (prompt('Día:', 'Lunes') || '').trim(); if (d) insertarEnCuerpo(d.replace(/:+$/, '') + ':'); };

  ['in_a', 'in_acargo', 'in_de', 'in_desub', 'in_ref', 'in_lugar', 'in_dur', 'in_inst', 'in_sup', 'in_cuerpo', 'in_f1', 'in_f1sub', 'in_f2', 'in_f2sub'].forEach(id => {
    const el = $('#' + id); if (el) el.oninput = pintar;
  });
  $('#in_fecha').onchange = pintar;
  // Recuerda dónde está el cursor en el cuerpo, para insertar las tareas ahí.
  const taC = $('#in_cuerpo');
  if (taC) ['keyup', 'click', 'select', 'focus', 'input'].forEach(ev => taC.addEventListener(ev, () => { caretCuerpo = taC.selectionStart; }));
  $('#in_tam').onchange = pintar;
  // Control de opacidad de la marca de agua (igual que en certificados/credenciales).
  const wmS = $('#in_wm'), wmOut = $('#in_wm_out');
  if (wmS) {
    wmS.addEventListener('input', () => { localStorage.setItem('lexfive_wm_op', wmS.value); applyWmOpacity(wmS.value); if (wmOut) wmOut.textContent = wmS.value + '%'; pintar(); });
    wmS.addEventListener('change', () => { pushBranding(); });
  }
  $('#in_restaurar').onclick = () => { $('#in_cuerpo').value = CUERPO_EJEMPLO; caretCuerpo = null; pintar(); toast('Cuerpo restaurado al modelo.', 'success'); };

  $('#in_print').onclick = () => { const p = page(); abrirImpresion('Informe Único de Pasantía', buildInforme(datos()), p.css); };
  $('#in_word').onclick = () => {
    const p = page();
    const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>@page{size:' + p.css + ';margin:0;}</style></head><body>' + buildInforme(datos()) + '</body></html>';
    descargarArchivo('informe-pasantia-' + p.label.toLowerCase() + '.doc', '\ufeff' + html, 'application/msword');
    toast('Informe descargado en Word.', 'success');
  };

  pintar();
}
