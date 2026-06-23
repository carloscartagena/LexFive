// ============================================================
//  VISTA: CERTIFICADOS Y CONSTANCIAS
//  Genera, en hoja membretada de LexFive, certificados de trabajo, pasantías,
//  horas de práctica, recomendaciones, etc., con logo, sello y QR de
//  verificación. Incluye la galería de certificados ya emitidos.
//  Extraído de app.js (split por módulos).
// ============================================================
import { withTimeout } from './auth.js';
import { ICON } from './icons.js';
import { esc, hoyISO, qrURL, SITIO_URL, fmtDate } from './util.js';
import { descargarArchivo } from './exportar.js';
import { $, content } from './dom.js';
import { toast, loading } from './ui.js';
import { state } from './state.js';
import { profName } from './comunes.js';
import { ensureImgCache } from './media.js';
import { hydrateBranding, pickActiveLogo, pickActiveSello, brandLogoSrc, brandSelloSrc } from './branding.js';
import { supabase } from './supabase.js';

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

export async function renderCertificados() {
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
