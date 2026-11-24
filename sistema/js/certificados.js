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
import { hydrateBranding, pickActiveLogo, pickActiveSello, brandLogoSrc, brandSelloSrc, wmOpacityActual, applyWmOpacity, pushBranding } from './branding.js';
import { supabase } from './supabase.js';
import { MEMBRETE_MODELOS, modeloMembrete, setModeloMembrete, membretePagina, PRINT_COLOR_CSS } from './membrete-base.js';
import { navigate } from './app.js';
import { calcularJornadasHabilesBolivia } from './calendario-bo.js';
import { generarCronogramaPasantia } from './pasantia-ai.js';
import {
  PASANTIA_CRONOGRAMA_BASE,
  obtenerTratamiento,
  extraerHoras,
  calcularJornadasPasantia,
  fechaLarga,
  getLogoBase64,
  buildHojaAsistenciaHTML,
  descargarHojaAsistenciaPDF,
  buildPaginasInforme,
  buildInformeWordDocument,
  descargarInformePDF,
  imprimirInformeDocumento,
  descargarInformeWordDoc,
  normalizarNotaDesig,
  formatearSupervision,
  formatearModalidadYHorario,
  buildExperienciaHTML,
  buildRecomendacionHTML,
  descargarExperienciaWordDoc,
  descargarRecomendacionWordDoc,
  buildNotaRemisionHTML,
  buildNotaRemisionWordDoc,
  descargarNotaRemisionWordDoc,
  extraerImagenesDeDocx,
  optimizarImagenBlob,
  calcularInicialApellido
} from './pasantia-docs.js';

export { PASANTIA_CRONOGRAMA_BASE, obtenerTratamiento, calcularJornadasPasantia, extraerHoras, fechaLarga };

function urlAbs(src) {
  if (!src) return '';
  return src.indexOf('data:') === 0 ? src : new URL(src, location.href).href;
}

// Enlace que codifica el QR del certificado: abre la página de verificación de
// CERTIFICADOS del bufete con los datos del documento emitido.
function qrCertificado(d) {
  let url = SITIO_URL + 'verificar-certificado.html?n=' + encodeURIComponent(d.nombre || '') +
    '&ci=' + encodeURIComponent(d.ci || '') +
    '&cargo=' + encodeURIComponent(d.cargo || '') +
    '&tipo=' + encodeURIComponent(d.tipo || '') +
    '&ref=' + encodeURIComponent(d.ref || '') +
    '&fecha=' + encodeURIComponent(d.fecha || '');
  if (d.ru) url += '&ru=' + encodeURIComponent(d.ru);
  if (d.universidad) url += '&uni=' + encodeURIComponent(d.universidad);
  if (d.carrera_plan) url += '&plan=' + encodeURIComponent(d.carrera_plan);
  if (d.asignatura) url += '&asig=' + encodeURIComponent(d.asignatura);
  if (d.modalidad) url += '&mod=' + encodeURIComponent(d.modalidad);
  if (d.periodo) url += '&per=' + encodeURIComponent(d.periodo);
  if (d.tipo_certificado) url += '&t=' + encodeURIComponent(d.tipo_certificado);
  return url;
}

const CERT_PLANTILLAS = [
  { id: 'trabajo_proc', nombre: 'Certificado de trabajo (Procurador)', titulo: 'CERTIFICADO DE TRABAJO',
    cuerpo: d => {
      const per = (d.periodo || '').trim();
      const perTxt = per ? (per.toLowerCase().startsWith('el período') || per.toLowerCase().startsWith('el periodo') ? per.slice(10).trim() : (per.toLowerCase().startsWith('durante el período') ? per.slice(18).trim() : per)) : 'indicado';
      return `Se CERTIFICA que el(la) Sr(a). ${d.nombre}${d.ci ? `, con Cédula de Identidad N.º ${d.ci}` : ''}, prestó sus servicios en el Bufete de Abogados LexFive en calidad de PROCURADOR(A), durante el período ${perTxt}, desempeñando con responsabilidad funciones de gestión, seguimiento y diligenciamiento de procesos judiciales y trámites administrativos ante estrados judiciales, oficinas públicas y privadas.\n\nDurante su permanencia demostró ética profesional, puntualidad, compromiso y un adecuado desempeño en las tareas encomendadas.\n\nSe extiende el presente certificado a solicitud del(la) interesado(a), para los fines que estime convenientes.`;
    }
  },
  { id: 'trabajo_gen', nombre: 'Certificado de trabajo (general)', titulo: 'CERTIFICADO DE TRABAJO',
    cuerpo: d => {
      const per = (d.periodo || '').trim();
      const perTxt = per ? (per.toLowerCase().startsWith('el período') || per.toLowerCase().startsWith('el periodo') ? per.slice(10).trim() : (per.toLowerCase().startsWith('durante el período') ? per.slice(18).trim() : per)) : 'indicado';
      return `Se CERTIFICA que el(la) Sr(a). ${d.nombre}${d.ci ? `, con C.I. N.º ${d.ci}` : ''}, trabajó en el Bufete de Abogados LexFive en el cargo de ${d.calidad || '—'}, durante el período ${perTxt}, cumpliendo satisfactoriamente las funciones propias de su cargo.\n\nSe extiende el presente a solicitud del(la) interesado(a), para los fines que vea por conveniente.`;
    }
  },
  { id: 'pasantia', nombre: 'Constancia de pasantía universitaria', titulo: 'CONSTANCIA DE PASANTÍA',
    cuerpo: d => `Se hace constar que el(la) universitario(a) ${d.nombre}${d.ci ? `, con C.I. N.º ${d.ci}` : ''}, estudiante de la carrera de ${d.carrera || '—'} de la ${d.universidad || '—'}, realizó su PASANTÍA / PRÁCTICA PRE-PROFESIONAL en el Bufete de Abogados LexFive durante el período ${d.periodo}${d.horas ? `, completando un total de ${d.horas} horas` : ''}.\n\nDurante la pasantía participó en labores de apoyo jurídico, revisión de expedientes, elaboración de memoriales y acompañamiento en diligencias, demostrando dedicación y responsabilidad.\n\nSe extiende la presente constancia a solicitud del(la) interesado(a), para fines académicos y los que estime convenientes.` },
  { id: 'horas', nombre: 'Certificado de horas de práctica', titulo: 'CERTIFICADO DE HORAS DE PRÁCTICA',
    cuerpo: d => `Se CERTIFICA que el(la) Sr(a). ${d.nombre}${d.ci ? `, con C.I. N.º ${d.ci}` : ''}${d.universidad ? `, de la ${d.universidad}` : ''}, cumplió un total de ${d.horas || '___'} horas de práctica en el Bufete de Abogados LexFive, durante el período ${d.periodo}, en tareas de apoyo legal y administrativo.\n\nSe extiende el presente para los fines académicos correspondientes.` },
  { id: 'recomendacion', nombre: 'Carta de recomendación', titulo: 'CARTA DE RECOMENDACIÓN',
    cuerpo: d => `Por medio de la presente, el Bufete de Abogados LexFive tiene a bien RECOMENDAR al(la) Sr(a). ${d.nombre}${d.ci ? `, con C.I. N.º ${d.ci}` : ''}, quien se desempeñó como ${d.calidad || 'colaborador(a)'} en nuestra institución durante el período ${d.periodo}.\n\nDurante este tiempo demostró ser una persona responsable, proactiva, honesta y con sólidos conocimientos en el área legal, cualidades que la hacen idónea para las funciones que requiera desempeñar.\n\nSe extiende la presente a solicitud del(la) interesado(a)${d.destinatario ? `, dirigida a ${d.destinatario}` : ''}.` },
  { id: 'desempeno', nombre: 'Constancia de desempeño / conducta', titulo: 'CONSTANCIA DE DESEMPEÑO',
    cuerpo: d => `Se hace constar que el(la) Sr(a). ${d.nombre}${d.ci ? `, con C.I. N.º ${d.ci}` : ''}, durante su permanencia en el Bufete de Abogados LexFive como ${d.calidad || '—'} (período ${d.periodo}), observó una conducta intachable y un desempeño sobresaliente, demostrando ética, disciplina y compromiso con la institución.\n\nSe extiende la presente a solicitud del(la) interesado(a).` },
  { id: 'servicios', nombre: 'Constancia de servicios prestados', titulo: 'CONSTANCIA DE SERVICIOS PRESTADOS',
    cuerpo: d => `Se hace constar que el(la) Sr(a). ${d.nombre}${d.ci ? `, con C.I. N.º ${d.ci}` : ''}, prestó servicios profesionales en el Bufete de Abogados LexFive en calidad de ${d.calidad || '—'}, durante el período ${d.periodo}.\n\nSe extiende la presente a solicitud del(la) interesado(a), para los fines que estime convenientes.` },
  { id: 'aceptacion_pasantia', nombre: 'Carta de Aceptación de Pasantía (UMSA u otras)', titulo: 'ACEPTACIÓN DE ASIGNATURA DE PASANTÍA',
    cuerpo: d => {
      const gen = obtenerTratamiento(d.genero);
      const dest = d.destinatario || 'Abg. Erick San Miguel R.\nRESPONSABLE DEL INSTITUTO DE INVESTIGACIONES, SEMINARIOS Y TESIS\nCARRERA DE DERECHO - UMSA';
      const ruTxt = d.registro_universitario ? `, con R.U. N.º ${d.registro_universitario}` : '';
      const ciTxt = d.ci ? ` y C.I. N.º ${d.ci}` : '';
      const asig = d.asignatura || 'CJR-410 Pasantía I';
      const mod = d.modalidad || (d.periodo || 'DOS (2) SEMANAS EN TIEMPO COMPLETO');
      const hor = d.horario ? ` en el horario de ${d.horario}` : '';
      const uni = d.universidad || 'Universidad Mayor de San Andrés (UMSA)';
      const car = d.carrera_plan || 'Carrera de Derecho – Plan de Estudios 2017';
      const univEst = d.genero === 'femenino' ? `de la Univ. ${d.nombre}` : (d.genero === 'masculino' ? `del Univ. ${d.nombre}` : `del(la) Univ. ${d.nombre}`);
      const delEst = d.genero === 'femenino' ? 'de la estudiante' : (d.genero === 'masculino' ? 'del estudiante' : 'del(la) estudiante');
      const delPas = d.genero === 'femenino' ? 'de la pasante' : (d.genero === 'masculino' ? 'del pasante' : 'del(la) pasante');

      return `Señor:\n${dest}\nPresente.\n\nREF.: ACEPTACIÓN DE LA ASIGNATURA DE PASANTÍA (${asig})\n\nDe mi mayor consideración:\n\nMediante la presente, reciba usted un cordial saludo, deseando éxitos en las funciones que desempeña en la Dirección de la Carrera de Derecho de la Facultad de Derecho y Ciencias Políticas de la ${uni}.\n\nEn atención a la solicitud ${univEst}${ciTxt}${ruTxt}, estudiante de la ${car}, el Bufete Jurídico "LexFive" de la ciudad de El Alto tiene a bien expresar su formal ACEPTACIÓN ${delEst} para la realización de sus prácticas correspondientes a la asignatura ${asig}, bajo la modalidad de ${mod}${hor}, las cuales se desarrollarán en el ámbito estrictamente jurídico-legal de nuestra institución.\n\nAsimismo, el bufete asume el compromiso institucional de supervisar el desempeño ${delPas}, orientar sus labores forenses y otorgar el correspondiente Visto Bueno en la presentación del Informe Único de Pasantía dirigido al Docente Guía.\n\nSin otro particular, saludamos a usted atentamente.`;
    }
  },
  { id: 'pasantia_universitaria', nombre: 'Certificado de Pasantía Universitaria', titulo: 'CERTIFICADO DE PASANTÍA',
    cuerpo: d => {
      const gen = obtenerTratamiento(d.genero);
      const intro = `El BUFETE DE ABOGADOS LEXFIVE, a través de su Dirección y cuerpo de abogados patrocinantes, en uso de sus legítimas atribuciones:`;
      const notaNorm = normalizarNotaDesig(d.nota_designacion);
      const desig = (notaNorm && d.fecha_nota_designacion) 
        ? `, ${gen.designado} mediante ${notaNorm} de fecha ${d.fecha_nota_designacion}, correspondiente a la asignatura ${d.asignatura || 'CJR-410 Pasantía I'}` 
        : (d.asignatura ? `, correspondiente a la asignatura ${d.asignatura}` : '');
      const ruTxt = d.registro_universitario ? ` y Registro Universitario N.º ${d.registro_universitario}` : '';
      const ciTxt = d.ci ? `, con Cédula de Identidad N.º ${d.ci}` : '';
      const p1 = `CERTIFICA que ${gen.artUniv} ${d.nombre}${ciTxt}${ruTxt}, estudiante de la ${d.carrera_plan || 'Carrera de Derecho – Plan de Estudios 2017'} de la ${d.universidad || 'Universidad Mayor de San Andrés (UMSA)'}${desig}, realizó su pasantía jurídica en calidad de PASANTE en las oficinas del Bufete de Abogados LexFive.`;
      
      let lapso = '';
      if (d.fecha_inicio_larga && d.fecha_fin_larga) {
        lapso = ` desde el ${d.fecha_inicio_larga} hasta el ${d.fecha_fin_larga}`;
      } else if (d.periodo && d.periodo !== 'correspondiente') {
        lapso = ` durante el período ${d.periodo}`;
      }
      const modHor = d.modalidad ? `, bajo la modalidad de ${formatearModalidadYHorario(d.modalidad, d.horario)}` : (d.horario ? `, en el horario de ${d.horario}` : '');
      const p2 = `${gen.mencionado} cumplió el período de pasantía${lapso}${modHor}.`;
      
      const p3 = `Durante su permanencia, ${gen.artPasante} participó activamente en labores de apoyo jurídico: seguimiento de procesos judiciales, organización y foliado de expedientes, elaboración de borradores de memoriales y contratos, diligencias ante estrados judiciales e instituciones públicas y registro en el sistema interno del despacho; demostrando solvencia, ética profesional, puntualidad y un alto grado de compromiso en el cumplimiento de sus labores.`;
      
      const p4 = `Es cuanto se certifica en honor a la verdad y para fines académicos y consiguientes ${gen.delInteresado}.`;
      
      return `${intro}\n\n${p1}\n\n${p2}\n\n${p3}\n\n${p4}`;
    }
  }
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
  const parrafos = (d.cuerpoTexto || '').split(/\n\s*\n/).map(p => {
    let html = resaltar(esc(p).replace(/\n/g, '<br>'));
    if (p.trim().toUpperCase().startsWith('REF.:') || p.trim().toUpperCase().startsWith('REF:')) {
      return `<p style="margin:0 0 15px;text-align:right;font-weight:bold;padding-left:30%;">${html}</p>`;
    }
    return `<p style="margin:0 0 13px;text-align:justify;">${html}</p>`;
  }).join('');
  // Marca de agua del logo: usa la intensidad configurable del branding (por
  // defecto 15%), para que SÍ se note. Antes estaba fija en 5% y casi no se veía.
  const hideAQuien = (d.cuerpoTexto || '').match(/Presente\.?-?/i);
  const isCarta = d.titulo === 'ACEPTACIÓN DE ASIGNATURA DE PASANTÍA';
  const isPasantiaDoc = d.titulo === 'CERTIFICADO DE PASANTÍA' || isCarta;

  const firmaHTML = isPasantiaDoc ? `
    <div style="text-align:center;flex:${d.selloSrc ? '1' : '0 1 340px'};max-width:${d.selloSrc ? '58%' : '340px'};margin:${d.selloSrc ? '0' : '0 auto'};">
      <div style="min-height:55px;"></div>
      <div style="border-top:1.5px solid #0e1b2c;padding-top:6px;font-size:11.5px;font-weight:700;color:#0e1b2c;letter-spacing:0.5px;">ABOGADO(A) PATROCINANTE / DIRECCIÓN</div>
      <div style="font-size:10px;color:#5c6675;font-family:Arial,sans-serif;margin-top:2px;">LexFive &middot; Bufete de Abogados</div>
    </div>` : `
    <div style="text-align:center;flex:${d.selloSrc ? '1' : '0 1 340px'};max-width:${d.selloSrc ? '58%' : '340px'};margin:${d.selloSrc ? '0' : '0 auto'};">
      <div style="border-top:1.5px solid #0e1b2c;padding-top:6px;font-size:12px;font-weight:700;color:#0e1b2c;">${esc(d.abogadoFirma) || 'Firma'}</div>
      <div style="font-size:10.5px;color:#5c6675;font-family:Arial,sans-serif;">${d.rpaFirma ? `R.P.A. ${esc(d.rpaFirma)}<br>` : ''}LexFive &middot; Bufete de Abogados</div>
    </div>`;

  const contentHTML = `
    <div style="text-align:right;font-size:10px;color:#5c6675;font-family:Arial,sans-serif;">Ref. N.º ${esc(d.ref || '')}</div>
    ${isCarta 
      ? `<div style="text-align:right;font-size:13px;margin:10px 0 30px;">La Paz, ${esc(d.fechaTxt)}</div>`
      : `<h1 style="text-align:center;font-size:20px;letter-spacing:1.5px;color:#0e1b2c;margin:8px 0 4px;text-transform:uppercase;">${esc(d.titulo)}</h1>`
    }
    ${(hideAQuien || isCarta) ? '' : '<div style="text-align:center;font-size:11px;color:#a8853c;font-family:Arial,sans-serif;letter-spacing:2px;margin-bottom:22px;">A QUIEN CORRESPONDA</div>'}
    <div style="font-size:14px;line-height:1.75;">${parrafos}</div>
    ${isCarta ? '' : `<p style="margin:22px 0 0;font-size:13px;">El Alto - Bolivia, ${esc(d.fechaTxt)}.</p>`}
    <div style="display:flex;justify-content:${d.selloSrc ? 'space-between' : 'center'};align-items:flex-end;margin-top:${d.selloSrc ? '28' : '38'}px;gap:20px;">
      ${firmaHTML}
      ${d.selloSrc ? `<img src="${d.selloSrc}" alt="" style="width:3.3cm;height:3.3cm;object-fit:contain;mix-blend-mode:multiply;filter:contrast(1.3) brightness(1.1);opacity:.95;transform:rotate(-6deg);">` : ''}
    </div>
    <div style="flex:1 1 auto;min-height:16px;"></div>
    <div style="display:flex;align-items:center;gap:12px;border-top:1px solid #d9dce1;padding-top:8px;">
      ${d.qrSrc ? `<img src="${d.qrSrc}" alt="QR de verificación" style="width:2.1cm;height:2.1cm;flex-shrink:0;">` : ''}
      <div style="font-size:9.5px;color:#5c6675;font-family:Arial,sans-serif;line-height:1.55;">
        <strong style="color:#0e1b2c;">Verificación:</strong> escanee el código QR para confirmar la autenticidad de este documento y la vinculación de la persona con el Bufete LexFive.
      </div>
    </div>`;
  return membretePagina({ model: d.model, logoSrc: d.logoSrc, pageW: '8.5in', pageH: '11in', wmOp: wmOpacityActual() / 100, contentHTML });
}

function slugNombre(n) {
  return (n || 'pasante')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 45);
}

// Abre una ventana de impresión vectorial en tamaño carta sin márgenes
function abrirImpresionVectorial(tituloDoc, docHTML) {
  const w = window.open('', '_blank');
  if (!w) {
    toast('Permita las ventanas emergentes para imprimir o guardar en PDF.', 'error');
    return;
  }
  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${esc(tituloDoc)}</title>
    <style>
      @page { size: letter portrait; margin: 0; }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
        width: 100% !important;
      }
      .hoja-carta {
        box-shadow: none !important;
        margin: 0 auto !important;
        width: 21.59cm !important;
        height: 27.94cm !important;
        min-height: 27.94cm !important;
        max-height: 27.94cm !important;
        page-break-after: always !important;
        break-after: page !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
      }
      .hoja-carta:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }
      ${PRINT_COLOR_CSS}
    </style></head><body>${docHTML}
    <script>
      window.addEventListener('load', function() {
        var imgs = Array.from(document.images);
        var pending = imgs.filter(function(img) { return !img.complete; });
        function disparar() {
          setTimeout(function() {
            window.focus();
            window.print();
          }, 350);
        }
        if (pending.length === 0) {
          disparar();
        } else {
          var loaded = 0;
          pending.forEach(function(img) {
            img.addEventListener('load', check);
            img.addEventListener('error', check);
          });
          function check() {
            loaded++;
            if (loaded >= pending.length) disparar();
          }
        }
      });
    <\/script></body></html>`);
  w.document.close();
}

function abrirImpresionCert(titulo, docHTML) {
  return abrirImpresionVectorial(titulo, docHTML);
}

export async function renderCertificados() {
  loading();
  try { await withTimeout(ensureImgCache(), 8000, 'imágenes'); } catch (e) {}
  try { await withTimeout(hydrateBranding(), 8000, 'branding'); } catch (e) {}
  const logoSrc = urlAbs(brandLogoSrc(pickActiveLogo(localStorage.getItem('lexfive_logo'))));
  const selloSrc = urlAbs(brandSelloSrc(pickActiveSello(localStorage.getItem('lexfive_sello'))));
  // Devuelve el sello solo si el check «Incluir sello» está activo.
  const selloActivo = () => ($('#ce_sello') && $('#ce_sello').checked) ? selloSrc : '';

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
        <div id="ce_editbanner" style="display:none;background:var(--gold-tint);border:1px solid var(--gold);border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:.85rem;color:var(--ink);">
          Editando el certificado <strong id="ce_editref"></strong>. Los cambios se guardarán sobre el mismo registro al imprimir o descargar. <button class="btn btn--ghost btn--sm" id="ce_nuevo" type="button" style="margin-left:6px">Empezar uno nuevo</button>
        </div>
        <div class="field"><label>Categoría del certificado</label>
          <select id="ce_tipo_cert">
            <option value="trabajo">Certificado de Trabajo (Procuraduría)</option>
            <option value="pasantia">Certificado de Pasantía Universitaria</option>
            <option value="aceptacion">Carta de Aceptación de Pasantía</option>
          </select></div>
        <div class="field"><label>Tipo / variante</label>
          <select id="ce_tipo">${CERT_PLANTILLAS.map(t => `<option value="${t.id}">${esc(t.nombre)}</option>`).join('')}</select></div>
        <div class="cert-form">
          <div class="field"><label>Nombre completo *</label><input id="ce_nombre" placeholder="Nombre y apellidos"></div>
          <div class="field"><label>Cédula de identidad</label><input id="ce_ci" placeholder="Ej: 12345678 LP"></div>
          <div id="ce_trabajo_fields" style="display:contents">
          <div class="field"><label>Cargo / calidad</label><input id="ce_calidad" placeholder="Procurador, Pasante, Asistente legal..."></div>
          <div class="field"><label>Período / Lapso de tiempo</label><input id="ce_periodo" placeholder="Ej: DOS (2) SEMANAS EN TIEMPO COMPLETO" list="periodo_opciones">
            <datalist id="periodo_opciones">
              <option value="DOS (2) SEMANAS EN TIEMPO COMPLETO"></option>
              <option value="CUATRO (4) SEMANAS A MEDIO TIEMPO"></option>
            </datalist>
          </div>
          <div class="field"><label>Universidad (pasantías)</label><input id="ce_uni" placeholder="Ej: U.M.S.A."></div>
          <div class="field"><label>Carrera</label><input id="ce_carrera" placeholder="Ej: Derecho"></div>
          <div class="field"><label>Horas (opcional)</label><input id="ce_horas" type="number" min="0" placeholder="Ej: 240"></div>
          <div class="field"><label>Dirigido a (opcional)</label><input id="ce_dest" placeholder="A quien corresponda"></div>
          </div>
          <div id="ce_pasantia_fields" style="display:none;grid-column:1/-1">
            <div class="form-subbox">
              <div class="form-subbox__title">📋 Datos de Pasantía Universitaria</div>
              <div class="cert-form">
                <div class="field"><label>Tratamiento / Género</label>
                  <select id="ce_genero">
                    <option value="femenino">Femenino (la universitaria / la pasante)</option>
                    <option value="masculino">Masculino (el universitario / el pasante)</option>
                    <option value="neutro">Neutro / General (el(la) universitario(a))</option>
                  </select>
                </div>
                <div class="field"><label>Inicial de apellido (recuadro UMSA)</label>
                  <input id="ce_inicial_apellido" maxlength="2" placeholder="Ej. V" style="text-transform:uppercase;max-width:140px;font-weight:bold;">
                </div>
                <div class="field"><label>Registro Universitario (R.U.)</label><input id="ce_ru" placeholder="Ej: 20150001"></div>
                <div class="field"><label>Universidad</label><input id="ce_uni_pas" value="Universidad Mayor de San Andrés (UMSA)"></div>
                <div class="field"><label>Carrera y Plan de Estudios</label><input id="ce_carrera_plan" value="Carrera de Derecho – Plan de Estudios 2017"></div>
                <div class="field"><label>Asignatura</label><input id="ce_asignatura" value="CJR-410 Pasantía I"></div>
                <div class="field"><label>Docente Guía (para el Informe)</label><input id="ce_docente_guia" placeholder="Ej. Dr. Marcelo Silva Mollinedo" value=""></div>
                <div class="field"><label>Abogado(a) Patrocinante / Tutor(a) (para el Informe)</label><input id="ce_tutor_nombre" placeholder="Opcional: dejar vacío para formato institucional" value=""></div>
                <div class="field"><label>R.P.A. del Tutor(a) (opcional)</label><input id="ce_tutor_rpa" placeholder="Ej. 6059319 ZCCA" value=""></div>
                <div class="field"><label>N.º de Nota de Designación</label><input id="ce_nota_desig" placeholder="Ej: IIST-CA-003/2026 (opcional)"></div>
                <div class="field"><label>Fecha de Nota</label><input id="ce_fecha_nota" type="date"></div>
                <div class="field"><label>Fecha de inicio</label><input id="ce_fecha_inicio" type="date"></div>
                <div class="field"><label>Fecha de finalización (autocalculada)</label><input id="ce_fecha_fin" type="date"></div>
                <div class="field"><label>Modalidad</label>
                  <select id="ce_modalidad">
                    <option value="4 semanas a medio tiempo (4 horas diarias)">4 semanas a medio tiempo (4 h/día - 20 días hábiles)</option>
                    <option value="2 semanas a tiempo completo (8 horas diarias)">2 semanas a tiempo completo (8 h/día - 10 días hábiles)</option>
                    <option value="">Personalizada (edite el texto)</option>
                  </select></div>
                <div class="field"><label>Horario</label><input id="ce_horario" placeholder="Ej: 14:00 a 18:00"></div>
                <div class="field" style="grid-column:1/-1;">
                  <label>Feriados extra / tolerancias (opcional, YYYY-MM-DD separados por coma)</label>
                  <input id="ce_feriados_extra" placeholder="Ej: 2026-11-03, 2026-11-10">
                  <p class="cell-sub" id="ce_feriados_info" style="margin-top:2px;font-size:.78rem;color:var(--gold, #a8853c);display:none;"></p>
                </div>
                <div class="field" style="grid-column:1/-1;border-top:1px dashed var(--line);padding-top:8px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                    <label style="font-weight:600;">Áreas de práctica forense para actividades</label>
                    <button class="btn btn--ghost btn--sm" id="ce_btn_toggle_areas" type="button" style="font-size:.78rem;padding:2px 8px;">Marcar / desmarcar todas</button>
                  </div>
                  <div style="display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;font-size:.85rem;margin-top:6px;">
                    <label style="display:flex;align-items:center;gap:4px;white-space:nowrap;"><input type="checkbox" class="ce_area" value="civil" checked> Civil</label>
                    <label style="display:flex;align-items:center;gap:4px;white-space:nowrap;"><input type="checkbox" class="ce_area" value="familiar" checked> Familiar</label>
                    <label style="display:flex;align-items:center;gap:4px;white-space:nowrap;"><input type="checkbox" class="ce_area" value="laboral" checked> Laboral</label>
                    <label style="display:flex;align-items:center;gap:4px;white-space:nowrap;"><input type="checkbox" class="ce_area" value="penal" checked> Penal</label>
                    <label style="display:flex;align-items:center;gap:4px;white-space:nowrap;"><input type="checkbox" class="ce_area" value="administrativo" checked> Administrativo (GAMEA)</label>
                    <label style="display:flex;align-items:center;gap:4px;white-space:nowrap;"><input type="checkbox" class="ce_area" value="notarial" checked> DDRR / Notarial</label>
                    <label style="display:flex;align-items:center;gap:4px;white-space:nowrap;"><input type="checkbox" class="ce_area" value="legaltech" checked> Gestión Digital</label>
                  </div>
                  <div style="display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap;">
                    <input id="ce_enfoque" placeholder="Enfoque especial del pasante (ej. asistencia familiar y Derechos Reales)..." style="flex:1;min-width:220px;">
                    <button class="btn btn--ghost btn--sm" id="ce_btn_ia_cronograma" type="button" style="color:var(--primary, #c2a25a);font-weight:600;">✨ Generar nuevo cronograma único (IA)</button>
                    <span id="ce_ia_badge" style="display:none;padding:3px 8px;border-radius:12px;font-size:.78rem;font-weight:600;"></span>
                  </div>
                  <div id="ce_jornadas_editor_wrap" style="display:none;margin-top:10px;width:100%;"></div>
                </div>
                <label class="cell-sub" style="display:flex;align-items:center;gap:6px;grid-column:1/-1;margin-top:4px;">
                  <input type="checkbox" id="ce_prellenar_asistencia" checked> Prellenar fechas hábiles reales y actividades en Hoja de Asistencia
                </label>
                <div style="grid-column:1/-1;margin-top:6px;">
                  <details style="border:1px solid var(--line);border-radius:6px;padding:8px 12px;background:var(--card-sub-bg, transparent);">
                    <summary style="cursor:pointer;font-weight:600;font-size:.85rem;color:var(--primary, #c2a25a);">
                      ✍️ Observación o cualidad destacada para Carta de Recomendación (opcional)
                    </summary>
                    <div style="margin-top:8px;">
                      <textarea id="ce_observacion_rec" rows="2" placeholder="Ej. Destacada iniciativa y rigurosidad técnica en la revisión de expedientes civiles y asistencia en audiencias..." style="width:100%;font-size:.85rem;font-family:inherit;box-sizing:border-box;"></textarea>
                      <p class="cell-sub" style="margin:4px 0 0;font-size:.75rem;">Si se llena, este mérito se integrará de forma armónica en el cuerpo de la Carta de Recomendación.</p>
                    </div>
                  </details>
                </div>
                <!-- NOTA DE REMISIÓN UNIVERSITARIA (IIST / UMSA) -->
                <div style="grid-column:1/-1;margin-top:10px;">
                  <div class="card" style="margin:0;border:1px solid var(--line);background:var(--card-bg, rgba(255,255,255,0.03));border-radius:8px;">
                    <div class="card__head" style="padding:10px 14px;">
                      <strong style="font-size:.9rem;color:var(--text, #101820);display:flex;align-items:center;gap:6px;">
                        <span>📋</span> Nota de Remisión Universitaria (IIST / UMSA)
                      </strong>
                    </div>
                    <div class="card__body" style="padding:10px 14px;display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:10px;">
                      <div class="field">
                        <label>Destinatario de Nota de Remisión</label>
                        <input id="ce_remision_destinatario" value="Dr. Erick San Miguel R." placeholder="Ej. Dr. Erick San Miguel R.">
                      </div>
                      <div class="field">
                        <label>Cargo del Destinatario</label>
                        <input id="ce_remision_cargo" value="RESPONSABLE DEL INSTITUTO DE INVESTIGACIONES, SEMINARIOS Y TESIS (IIST)" placeholder="Ej. RESPONSABLE DEL INSTITUTO DE INVESTIGACIONES...">
                      </div>
                      <div class="field">
                        <label>Firmante de la Nota</label>
                        <select id="ce_remision_firmante">
                          <option value="estudiante" selected>Estudiante Pasante (entrega personal)</option>
                          <option value="direccion">Dirección LexFive (remisión institucional en hoja membretada)</option>
                        </select>
                      </div>
                      <div class="field">
                        <label>Celular del Pasante (opcional, para firma)</label>
                        <input id="ce_celular_pasante" value="" placeholder="Ej. 70123456">
                      </div>
                    </div>
                  </div>
                </div>

                <!-- ANEXO FOTOGRÁFICO (EVIDENCIA DE PASANTÍA) -->
                <div style="grid-column:1/-1;margin-top:10px;">
                  <div class="card" style="margin:0;border:1px solid var(--line);background:var(--card-bg, rgba(255,255,255,0.03));border-radius:8px;">
                    <div class="card__head" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;padding:10px 14px;">
                      <div style="display:flex;align-items:center;gap:8px;">
                        <span style="font-size:1.15rem;">📷</span>
                        <strong style="font-size:.9rem;color:var(--text, #101820);">Anexo Fotográfico (Evidencia de Pasantía)</strong>
                        <span id="ce_fotos_badge" style="font-size:.75rem;padding:2px 8px;border-radius:12px;background:rgba(184,148,70,0.15);color:#b89446;font-weight:600;display:none;">0 fotos</span>
                      </div>
                      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                        <label style="font-size:.78rem;display:flex;align-items:center;gap:4px;">
                          <span>Distribución:</span>
                          <select id="ce_fotos_layout" style="font-size:.78rem;padding:3px 6px;border-radius:4px;">
                            <option value="4" selected>4 fotos por hoja (2×2 — recomendado)</option>
                            <option value="2">2 fotos grandes por hoja (vertical)</option>
                          </select>
                        </label>
                        <button class="btn btn--ghost btn--sm" id="ce_btn_vaciar_fotos" type="button" style="font-size:.75rem;padding:2px 8px;display:none;color:#e11d48;">🗑️ Vaciar fotos</button>
                      </div>
                    </div>
                    <div class="card__body" style="padding:10px 14px;">
                      <!-- Zona de carga múltiple (dropzone + file input) -->
                      <div id="ce_fotos_dropzone" style="border:2px dashed var(--line);border-radius:6px;padding:16px;text-align:center;cursor:pointer;background:var(--card-sub-bg, rgba(255,255,255,0.02));transition:border-color .2s, background .2s;">
                        <input type="file" id="ce_file_fotos" multiple accept="image/*,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" style="display:none;">
                        <div style="font-size:1.8rem;margin-bottom:4px;">📂 📸</div>
                        <div style="font-weight:600;font-size:.85rem;color:var(--primary, #b89446);">
                          Arrastra aquí tus fotos o archivo Word (.docx), o haz clic para explorar
                        </div>
                        <p class="cell-sub" style="margin:4px 0 0;font-size:.78rem;">
                          Puedes subir fotos JPG/PNG o directamente el archivo Word (.docx) con las fotos pegadas; el sistema las extrae automáticamente.
                        </p>
                      </div>
                      <!-- Miniaturas de fotos cargadas -->
                      <div id="ce_fotos_grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(180px, 1fr));gap:10px;margin-top:12px;"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="field"><label>Fecha de emisión</label><input id="ce_fecha" type="date" value="${hoyISO()}"></div>
          <div id="ce_firma_fields" style="display:contents">
            <div class="field" style="grid-column: 1 / -1;"><hr style="border:0;border-top:1px solid var(--line);margin:8px 0;"></div>
            <div class="field"><label>Firma: Nombre del Abogado(a)</label><input id="ce_abogado_firma" placeholder="Ej: Abg. Carlos Cartagena"></div>
            <div class="field"><label>Firma: R.P.A.</label><input id="ce_rpa" placeholder="Ej: 1234567"></div>
          </div>
        </div>
        <div class="field" style="margin-top:8px">
          <label>Texto del certificado <button class="btn btn--ghost btn--sm" id="ce_restaurar" type="button" style="margin-left:8px">Restaurar texto automático</button></label>
          <textarea id="ce_cuerpo" rows="8" style="font-family:inherit"></textarea>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px">
          <button class="btn btn--primary" id="ce_guardar">Guardar registro</button>
        </div>
        <div class="field" style="margin-top:16px;max-width:440px"><label>Modelo de hoja membretada</label>
          <select id="ce_modelo">${MEMBRETE_MODELOS.map(m => `<option value="${m.id}">${esc(m.nombre)}</option>`).join('')}</select>
          <p class="cell-sub" style="margin:4px 0 0">El modelo se comparte con la hoja membretada y el informe.</p>
        </div>
        <div class="field" style="margin-top:16px;max-width:440px">
          <label>Intensidad de la marca de agua (logo de fondo)</label>
          <div style="display:flex;align-items:center;gap:10px">
            <input type="range" id="ce_wm" min="3" max="40" step="1" value="${wmOpacityActual()}" style="flex:1">
            <output id="ce_wm_out" style="min-width:42px;text-align:right">${wmOpacityActual()}%</output>
          </div>
          <p class="cell-sub" style="margin:4px 0 0">Hacia la derecha = marca de agua más oscura. Es el logo del bufete de fondo. (Se aplica igual a las credenciales.)</p>
        </div>
        <label class="cell-sub" style="display:flex;align-items:center;gap:6px;margin-top:12px"><input type="checkbox" id="ce_sello" checked> Incluir sello digital en el PDF</label>
        <p class="cell-sub" id="ce_sello_hint" style="display:none;margin:2px 0 0;font-size:.78rem;">En pasantías se recomienda dejar sin sello digital para firmar y sellar a mano.</p>
      </div>
    </div>

    <div class="card" id="ce_card_preview">
      <div class="card__head" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <h3 style="margin:0;">Vista previa</h3>
          <div id="ce_preview_tabs" style="display:none;gap:6px;flex-wrap:wrap;">
            <button type="button" class="btn btn--sm btn--primary js-prev-tab" data-tab="cert">Certificado de Pasantía</button>
            <button type="button" class="btn btn--sm btn--ghost js-prev-tab" data-tab="asistencia">Hoja de Asistencia</button>
            <button type="button" class="btn btn--sm btn--ghost js-prev-tab" data-tab="informe">Informe Único</button>
            <button type="button" class="btn btn--sm btn--ghost js-prev-tab" data-tab="experiencia">Experiencia Pre-Profesional</button>
            <button type="button" class="btn btn--sm btn--ghost js-prev-tab" data-tab="recomendacion">Carta de Recomendación</button>
            <button type="button" class="btn btn--sm btn--ghost js-prev-tab" data-tab="remision">Nota de Remisión</button>
          </div>
        </div>
        <div id="ce_preview_actions" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <button class="btn btn--primary btn--sm" id="ce_btn_imprimir_activo" type="button" style="font-weight:bold;background:#b89446;color:#fff;">🖨️ Guardar PDF / Imprimir</button>
          <button class="btn btn--ghost btn--sm" id="ce_btn_expediente_completo" type="button" style="display:none;font-weight:600;border:1px solid #b89446;color:#b89446;">📑 Expediente UMSA (4 en 1)</button>
          <button class="btn btn--ghost btn--sm" id="ce_btn_paquete_cv" type="button" style="display:none;font-weight:600;border:1px solid #0e1b2c;color:#0e1b2c;">🎓 Paquete CV (2 en 1)</button>
          <button class="btn btn--ghost btn--sm" id="ce_btn_word_activo" type="button">📄 Word (.doc)</button>
        </div>
      </div>
      <div class="card__body"><div class="cert-preview" id="certPreview"></div></div>
    </div>

    <div class="card">
      <div class="card__head">
        <div>
          <h3 style="margin:0 0 6px;">Certificados emitidos</h3>
          <div class="cert-filters" style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn btn--sm btn--primary js-filtro-cat" data-cat="todos" type="button">Todos</button>
            <button class="btn btn--sm btn--ghost js-filtro-cat" data-cat="trabajo" type="button">Trabajo</button>
            <button class="btn btn--sm btn--ghost js-filtro-cat" data-cat="pasantia" type="button">Pasantía</button>
            <button class="btn btn--sm btn--ghost js-filtro-cat" data-cat="aceptacion" type="button">Aceptación</button>
          </div>
        </div>
        <span style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <input type="search" id="ce_buscar" placeholder="Buscar nombre, C.I., referencia..." style="max-width:220px">
          <label class="cell-sub" style="display:flex;align-items:center;gap:4px">Desde <input type="date" id="ce_fdesde"></label>
          <label class="cell-sub" style="display:flex;align-items:center;gap:4px">Hasta <input type="date" id="ce_fhasta"></label>
        </span>
      </div>
      <div class="card__body--flush"><div id="certList"><div class="loading"><div class="spinner"></div>Cargando...</div></div></div>
    </div>`;

  let cuerpoEditado = false;
  let filtroCatActivo = 'todos';
  const tplActual = () => CERT_PLANTILLAS.find(t => t.id === $('#ce_tipo').value) || CERT_PLANTILLAS[0];
  const catActual = () => ($('#ce_tipo_cert') && $('#ce_tipo_cert').value) || 'trabajo';
  const esPasantia = () => catActual() === 'pasantia' || catActual() === 'aceptacion';
  const val = (id) => { const el = $('#' + id); return el ? (el.value || '').trim() : ''; };
  const nuevoRef = () => 'LF-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-5);
  let refActual = nuevoRef();
  let cronogramaPersonalizado = null;
  let fotosPasantiaArray = [];

  // Autocalcula fecha de finalización descartando feriados y fines de semana
  const autocalcularFechaFin = () => {
    const fIni = val('ce_fecha_inicio');
    if (!fIni) return;
    const mod = val('ce_modalidad') || '4 semanas a medio tiempo (4 horas diarias)';
    const numDias = (mod.includes('2 semanas') || mod.includes('tiempo completo')) ? 10 : 20;
    const feriadosExtra = val('ce_feriados_extra');
    const calc = calcularJornadasHabilesBolivia(fIni, numDias, feriadosExtra);
    if (calc.fechaFin && $('#ce_fecha_fin')) {
      $('#ce_fecha_fin').value = calc.fechaFin;
    }
    const infoEl = $('#ce_feriados_info');
    if (infoEl) {
      if (calc.feriadosOmitidos && calc.feriadosOmitidos.length) {
        infoEl.style.display = 'block';
        infoEl.textContent = `Se omitieron ${calc.feriadosOmitidos.length} feriado(s) oficial(es): ` + calc.feriadosOmitidos.map(f => `${f.fechaCorta} (${f.nombre})`).join(', ');
      } else {
        infoEl.style.display = 'none';
        infoEl.textContent = '';
      }
    }
  };

  const datos = () => ({
    ref: refActual,
    nombre: val('ce_nombre') || '___________________',
    ci: val('ce_ci'),
    calidad: val('ce_calidad'),
    periodo: val('ce_periodo') || 'correspondiente',
    universidad: esPasantia() ? (val('ce_uni_pas') || 'Universidad Mayor de San Andrés (UMSA)') : val('ce_uni'),
    carrera: val('ce_carrera'),
    horas: val('ce_horas'),
    destinatario: val('ce_dest'),
    fecha: val('ce_fecha'),
    fecha_emision: val('ce_fecha'),
    // Pasantía universitaria
    genero: val('ce_genero') || 'femenino',
    inicial_apellido: val('ce_inicial_apellido'),
    prellenar_asistencia: $('#ce_prellenar_asistencia') ? $('#ce_prellenar_asistencia').checked : true,
    registro_universitario: val('ce_ru'),
    carrera_plan: val('ce_carrera_plan') || 'Carrera de Derecho – Plan de Estudios 2017',
    asignatura: val('ce_asignatura') || 'CJR-410 Pasantía I',
    docente_guia: val('ce_docente_guia'),
    tutor_nombre: val('ce_tutor_nombre'),
    tutor_rpa: val('ce_tutor_rpa'),
    nota_designacion: val('ce_nota_desig'),
    fecha_nota_designacion: val('ce_fecha_nota') ? fechaLarga(val('ce_fecha_nota')) : '',
    modalidad: val('ce_modalidad'),
    horario: val('ce_horario'),
    feriados_extra: val('ce_feriados_extra'),
    fecha_inicio: val('ce_fecha_inicio'),
    fecha_fin: val('ce_fecha_fin'),
    fecha_inicio_larga: val('ce_fecha_inicio') ? fechaLarga(val('ce_fecha_inicio')) : '',
    fecha_fin_larga: val('ce_fecha_fin') ? fechaLarga(val('ce_fecha_fin')) : '',
    customTareas: cronogramaPersonalizado,
    observacion_rec: val('ce_observacion_rec'),
    fotos: fotosPasantiaArray,
    fotos_layout: ($('#ce_fotos_layout') ? $('#ce_fotos_layout').value : '4'),
    destinatario_remision: val('ce_remision_destinatario') || 'Dr. Erick San Miguel R.',
    cargo_remision: val('ce_remision_cargo') || 'RESPONSABLE DEL INSTITUTO DE INVESTIGACIONES, SEMINARIOS Y TESIS (IIST)',
    firmante_remision: val('ce_remision_firmante') || 'estudiante',
    celular_pasante: val('ce_celular_pasante') || '',
    abogadoFirma: val('ce_abogado_firma'),
    rpaFirma: val('ce_rpa')
  });
  const regenerar = () => { $('#ce_cuerpo').value = tplActual().cuerpo(datos()); cuerpoEditado = false; };
  // Muestra/oculta campos según la categoría de certificado (Trabajo / Pasantía / Aceptación).
  const aplicarTipoCert = (autoTemplate) => {
    const cat = catActual();
    const pas = esPasantia();
    const ft = $('#ce_trabajo_fields'); if (ft) ft.style.display = pas ? 'none' : 'contents';
    const fp = $('#ce_pasantia_fields'); if (fp) fp.style.display = pas ? '' : 'none';
    const ff = $('#ce_firma_fields'); if (ff) ff.style.display = pas ? 'none' : 'contents';
    const hint = $('#ce_sello_hint'); if (hint) {
      hint.style.display = pas ? '' : 'none';
      hint.textContent = 'En pasantías se recomienda dejar sin sello digital para firmar y sellar con sello húmedo original.';
    }

    const firstTabBtn = $('#ce_preview_tabs button[data-tab="cert"]');
    if (firstTabBtn) {
      firstTabBtn.textContent = (cat === 'aceptacion') ? 'Carta de Aceptación' : 'Certificado de Pasantía';
    }

    if (autoTemplate) {
      const sel = $('#ce_tipo');
      if (sel) {
        if (cat === 'aceptacion') sel.value = 'aceptacion_pasantia';
        else if (cat === 'pasantia') sel.value = 'pasantia_universitaria';
        else sel.value = 'trabajo_proc';
      }
      const sello = $('#ce_sello');
      if (sello) sello.checked = !pas;
    }
    if (!cuerpoEditado) regenerar();
    pintar();
  };
  let editando = false;
  let guardadoActual = false; // true cuando el certificado actual ya se emitió: el siguiente cambio crea uno nuevo
  // Si ya se emitió/guardó este certificado, el próximo cambio de datos genera
  // una referencia NUEVA (para no reemplazar el anterior y reutilizar los datos).
  const forkSiNecesario = () => { if (guardadoActual && !editando) { refActual = nuevoRef(); guardadoActual = false; } };
  const docActual = () => {
    const nombre = ($('#ce_nombre').value || '').trim();
    const ci = ($('#ce_ci').value || '').trim();
    const cargo = ($('#ce_calidad').value || '').trim();
    const fecha = $('#ce_fecha').value;
    const esPas = esPasantia();
    const periodoPas = (val('ce_fecha_inicio') && val('ce_fecha_fin'))
      ? `Del ${fmtDate(val('ce_fecha_inicio'))} al ${fmtDate(val('ce_fecha_fin'))}`
      : val('ce_periodo');
    return buildCertDoc({
      titulo: tplActual().titulo,
      cuerpoTexto: $('#ce_cuerpo').value,
      nombre, ci,
      fechaTxt: fechaLarga(fecha),
      ref: refActual,
      qrSrc: qrURL(qrCertificado({
        nombre,
        ci,
        cargo: esPas ? 'Pasante Universitario' : (cargo || 'Colaborador'),
        tipo: tplActual().titulo,
        ref: refActual,
        fecha,
        ru: esPas ? val('ce_ru') : '',
        universidad: esPas ? (val('ce_uni_pas') || 'Universidad Mayor de San Andrés (UMSA)') : '',
        carrera_plan: esPas ? val('ce_carrera_plan') : '',
        asignatura: esPas ? val('ce_asignatura') : '',
        modalidad: esPas ? val('ce_modalidad') : '',
        periodo: esPas ? periodoPas : val('ce_periodo'),
        tipo_certificado: esPas ? 'pasantia' : 'trabajo'
      })),
      abogadoFirma: $('#ce_abogado_firma') ? $('#ce_abogado_firma').value : '',
      rpaFirma: $('#ce_rpa') ? $('#ce_rpa').value : '',
      logoSrc, selloSrc: selloActivo(), model: modeloMembrete()
    });
  };
  let vistaPasantiaTab = 'cert'; // 'cert' | 'asistencia' | 'informe'

  const pintar = () => {
    try {
      const prevTabs = $('#ce_preview_tabs');
      const btnExp = $('#ce_btn_expediente_completo');
      const btnWord = $('#ce_btn_word_activo');
      const previewEl = $('#certPreview');
      if (!previewEl) return;
      const pas = esPasantia();

      const btnPaqCv = $('#ce_btn_paquete_cv');

      if (pas) {
        if (prevTabs) {
          prevTabs.style.display = 'flex';
          prevTabs.querySelectorAll('.js-prev-tab').forEach(b => {
            const isActive = (b.dataset.tab === vistaPasantiaTab);
            b.className = isActive ? 'btn btn--sm btn--primary js-prev-tab' : 'btn btn--sm btn--ghost js-prev-tab';
            if (isActive) {
              b.style.fontWeight = 'bold';
              b.style.outline = '2px solid var(--gold, #c2a25a)';
              b.style.outlineOffset = '1px';
            } else {
              b.style.fontWeight = 'normal';
              b.style.outline = 'none';
            }
          });
        }
        if (btnExp) btnExp.style.display = 'inline-flex';
        if (btnPaqCv) btnPaqCv.style.display = 'inline-flex';

        if (vistaPasantiaTab === 'asistencia') {
          if (btnWord) btnWord.style.display = 'none';
          previewEl.innerHTML = buildHojaAsistenciaHTML(datos(), logoSrc, modeloMembrete(), wmOpacityActual() / 100);
        } else if (vistaPasantiaTab === 'informe') {
          if (btnWord) btnWord.style.display = 'inline-flex';
          previewEl.innerHTML = buildPaginasInforme(datos(), logoSrc, modeloMembrete(), wmOpacityActual() / 100);
        } else if (vistaPasantiaTab === 'experiencia') {
          if (btnWord) btnWord.style.display = 'inline-flex';
          previewEl.innerHTML = buildExperienciaHTML(datos(), logoSrc, modeloMembrete(), wmOpacityActual() / 100);
        } else if (vistaPasantiaTab === 'recomendacion') {
          if (btnWord) btnWord.style.display = 'inline-flex';
          previewEl.innerHTML = buildRecomendacionHTML(datos(), logoSrc, modeloMembrete(), wmOpacityActual() / 100);
        } else if (vistaPasantiaTab === 'remision') {
          if (btnWord) btnWord.style.display = 'inline-flex';
          previewEl.innerHTML = buildNotaRemisionHTML(datos(), logoSrc, modeloMembrete(), wmOpacityActual() / 100);
        } else {
          if (btnWord) btnWord.style.display = 'inline-flex';
          previewEl.innerHTML = docActual();
        }
      } else {
        if (prevTabs) prevTabs.style.display = 'none';
        if (btnExp) btnExp.style.display = 'none';
        if (btnPaqCv) btnPaqCv.style.display = 'none';
        if (btnWord) btnWord.style.display = 'inline-flex';
        previewEl.innerHTML = docActual();
      }
    } catch (err) {
      console.error('Error renderizando vista previa en Certificados:', err);
      toast('Error al renderizar vista previa: ' + err.message, 'error');
      const previewEl = $('#certPreview');
      if (previewEl) {
        previewEl.innerHTML = `<div style="padding:24px;text-align:center;color:#e11d48;font-family:sans-serif;">
          <p style="font-weight:bold;margin-bottom:8px;">Error al renderizar vista previa:</p>
          <pre style="font-size:12px;background:rgba(0,0,0,0.05);padding:10px;border-radius:6px;overflow-x:auto;">${esc(err.message)}</pre>
        </div>`;
      }
    }
  };

  // Registra el certificado en la nube (best-effort) para que sea verificable
  // por su N.º de referencia. Si la tabla aún no existe (db/25), no pasa nada.
  const registrarCert = async () => {
    try {
      const tipoCert = esPasantia() ? 'pasantia' : 'trabajo';
      const docGuia = val('ce_docente_guia');
      const tutNom = val('ce_tutor_nombre');
      const tutRpa = val('ce_tutor_rpa');
      const genVal = val('ce_genero') || 'femenino';

      const destRem = val('ce_remision_destinatario') || 'Dr. Erick San Miguel R.';
      const cargoRem = val('ce_remision_cargo') || 'RESPONSABLE DEL INSTITUTO DE INVESTIGACIONES, SEMINARIOS Y TESIS (IIST)';
      const firmanteRem = val('ce_remision_firmante') || 'estudiante';
      const celPas = val('ce_celular_pasante') || '';

      // Respaldo local inmediato indexado por ref
      try {
        const extraPayload = {
          docente_guia: docGuia,
          tutor_nombre: tutNom,
          tutor_rpa: tutRpa,
          genero: genVal,
          inicial_apellido: val('ce_inicial_apellido'),
          observacion_rec: val('ce_observacion_rec'),
          fotos: fotosPasantiaArray,
          fotos_layout: ($('#ce_fotos_layout') ? $('#ce_fotos_layout').value : '4'),
          cronograma_json: cronogramaPersonalizado,
          destinatario_remision: destRem,
          cargo_remision: cargoRem,
          firmante_remision: firmanteRem,
          celular_pasante: celPas
        };
        localStorage.setItem('lexfive_cert_extra_' + refActual, JSON.stringify(extraPayload));
      } catch (_) {}

      const row = {
        ref: refActual,
        tipo: tplActual().titulo,
        tipo_certificado: tipoCert,
        nombre: val('ce_nombre') || null,
        ci: val('ce_ci') || null,
        cargo: val('ce_calidad') || null,
        periodo: val('ce_periodo') || null,
        cuerpo: $('#ce_cuerpo').value || null,
        fecha_emision: val('ce_fecha') || null,
        // Pasantía
        genero: genVal,
        registro_universitario: val('ce_ru') || null,
        universidad: esPasantia() ? (val('ce_uni_pas') || null) : (val('ce_uni') || null),
        carrera_plan: val('ce_carrera_plan') || null,
        asignatura: val('ce_asignatura') || null,
        docente_guia: docGuia || null,
        tutor_nombre: tutNom || null,
        tutor_rpa: tutRpa || null,
        nota_designacion: val('ce_nota_desig') || null,
        fecha_nota_designacion: val('ce_fecha_nota') || null,
        modalidad: val('ce_modalidad') || null,
        horario: val('ce_horario') || null,
        fecha_inicio: val('ce_fecha_inicio') || null,
        fecha_fin: val('ce_fecha_fin') || null,
        incluir_sello_digital: $('#ce_sello') ? $('#ce_sello').checked : true,
        // Persistencia de cronograma y remisión
        cronograma_json: cronogramaPersonalizado || null,
        destinatario_remision: destRem || null,
        cargo_remision: cargoRem || null,
        firmante_remision: firmanteRem || null,
        celular_pasante: celPas || null
      };
      // Solo al crear uno nuevo se fija el autor; al editar se conserva el original.
      if (!editando) row.created_by = state.profile.id;
      guardadoActual = true;

      try {
        const { error } = await supabase.from('certificados').upsert(row, { onConflict: 'ref' });
        if (error) {
          // Tolerancia ante columna inexistente antes de ejecutar la migración SQL
          if (error.code === '42703' || (error.message && error.message.includes('column'))) {
            const fallbackRow = Object.assign({}, row);
            delete fallbackRow.docente_guia;
            delete fallbackRow.tutor_nombre;
            delete fallbackRow.tutor_rpa;
            delete fallbackRow.genero;
            delete fallbackRow.cronograma_json;
            delete fallbackRow.destinatario_remision;
            delete fallbackRow.cargo_remision;
            delete fallbackRow.firmante_remision;
            delete fallbackRow.celular_pasante;
            await supabase.from('certificados').upsert(fallbackRow, { onConflict: 'ref' });
          }
        }
      } catch (errSup) {
        console.warn('Upsert en Supabase con fallback local:', errSup);
      }
      cargarEmitidos();
    } catch (e) { /* ignorado */ }
  };

  // ---- Certificados emitidos (lista, búsqueda, reimprimir, eliminar) ----
  let EMITIDOS = [];
  async function cargarEmitidos() {
    try {
      const { data } = await supabase.from('certificados')
        .select('*')
        .order('created_at', { ascending: false }).limit(500);
      EMITIDOS = data || [];
    } catch (e) { EMITIDOS = []; }
    pintarEmitidos();
  }
  // Trae el texto guardado (cuerpo) de un certificado solo cuando se necesita.
  async function fetchCuerpo(c) {
    if (c.cuerpo) return c.cuerpo;
    try { const { data } = await supabase.from('certificados').select('cuerpo').eq('id', c.id).maybeSingle(); return (data && data.cuerpo) || ''; }
    catch (e) { return ''; }
  }
  function pintarEmitidos() {
    const cont = $('#certList'); if (!cont) return;
    if (!EMITIDOS.length) { cont.innerHTML = `<div class="empty" style="padding:24px">${ICON.doc}<p>Aún no hay certificados registrados. Genere uno e imprímalo o descárguelo para que aparezca aquí.</p></div>`; return; }
    const q = ($('#ce_buscar') ? $('#ce_buscar').value : '').toLowerCase();
    const desde = $('#ce_fdesde') ? $('#ce_fdesde').value : '';
    const hasta = $('#ce_fhasta') ? $('#ce_fhasta').value : '';
    const list = EMITIDOS.filter(c => {
      if (filtroCatActivo !== 'todos') {
        const tipoCert = (c.tipo_certificado || '').toLowerCase();
        const tipoNom = (c.tipo || '').toLowerCase();
        if (filtroCatActivo === 'pasantia') {
          if (tipoCert !== 'pasantia' && !tipoNom.includes('pasantía') && !tipoNom.includes('pasantia') && !tipoNom.includes('horas')) return false;
        } else if (filtroCatActivo === 'trabajo') {
          if (tipoCert === 'pasantia' || tipoCert === 'aceptacion' || tipoNom.includes('pasantía') || tipoNom.includes('pasantia') || tipoNom.includes('aceptación') || tipoNom.includes('aceptacion')) return false;
        } else if (filtroCatActivo === 'aceptacion') {
          if (!tipoNom.includes('aceptación') && !tipoNom.includes('aceptacion') && tipoCert !== 'aceptacion') return false;
        }
      }
      if (q && ![c.nombre, c.ci, c.ref, c.tipo].some(v => (v || '').toLowerCase().includes(q))) return false;
      const dia = (c.created_at || '').slice(0, 10);
      if (desde && dia < desde) return false;
      if (hasta && dia > hasta) return false;
      return true;
    });
    if (!list.length) { cont.innerHTML = '<p class="cell-sub" style="padding:16px">Sin resultados para esos filtros.</p>'; return; }
    cont.innerHTML = `<div class="table-wrap"><table class="data">
      <thead><tr><th>Persona</th><th>Tipo</th><th>Emitido por</th><th>Referencia</th><th>Emitido</th><th></th></tr></thead>
      <tbody>${list.map(c => {
        const esPas = (c.tipo_certificado === 'pasantia') || (c.tipo && (c.tipo.includes('PASANTÍA') || c.tipo.includes('PASANTIA')));
        return `<tr>
        <td class="cell-strong">${esc(c.nombre)}${c.ci ? `<div class="cell-sub">C.I. ${esc(c.ci)}</div>` : ''}</td>
        <td>${esc(c.tipo || '')}</td>
        <td class="cell-sub">${esc(c.created_by ? profName(c.created_by) : '—')}</td>
        <td class="cell-sub">${esc(c.ref)}</td>
        <td class="cell-sub">${fmtDate(c.created_at)}</td>
        <td class="cell-actions" style="white-space:nowrap">
          <button class="btn btn--ghost btn--sm js-dupcert" data-id="${c.id}" title="Crear otro certificado para esta misma persona">Nuevo p/ esta persona</button>
          <button class="btn btn--ghost btn--sm js-editcert" data-id="${c.id}">Editar</button>
          <button class="btn btn--ghost btn--sm js-reimp" data-id="${c.id}">Reimprimir</button>
          ${esPas ? `
            <button class="btn btn--ghost btn--sm js-asistenciacert" data-id="${c.id}" title="Hoja de Control de Asistencia (PDF)">Asistencia (PDF)</button>
            <button class="btn btn--ghost btn--sm js-informecert" data-id="${c.id}" title="Borrador del Informe Único en Word (.doc)">Informe Word</button>
            <button class="btn btn--primary btn--sm js-abririnforme" data-id="${c.id}" title="Abrir y editar en el módulo de Informe Único">Abrir en Informe</button>
          ` : ''}
          <button class="btn btn--danger btn--sm js-delcert" data-id="${c.id}" title="Eliminar registro">&times;</button>
        </td>
      </tr>`;
      }).join('')}</tbody></table></div>`;
    cont.querySelectorAll('.js-reimp').forEach(b => b.onclick = () => { const c = EMITIDOS.find(x => x.id === b.dataset.id); if (c) reimprimirCert(c); });
    cont.querySelectorAll('.js-editcert').forEach(b => b.onclick = () => { const c = EMITIDOS.find(x => x.id === b.dataset.id); if (c) editarCert(c); });
    cont.querySelectorAll('.js-dupcert').forEach(b => b.onclick = () => { const c = EMITIDOS.find(x => x.id === b.dataset.id); if (c) nuevoConDatos(c); });
    cont.querySelectorAll('.js-asistenciacert').forEach(b => b.onclick = () => {
      const c = EMITIDOS.find(x => x.id === b.dataset.id);
      if (c) {
        const slug = slugNombre(c.nombre);
        const asisHTML = buildHojaAsistenciaHTML(c, logoSrc, modeloMembrete(), wmOpacityActual() / 100);
        abrirImpresionVectorial(`Hoja_Asistencia_${slug}`, asisHTML);
      }
    });
    cont.querySelectorAll('.js-informecert').forEach(b => b.onclick = () => {
      const c = EMITIDOS.find(x => x.id === b.dataset.id);
      if (c) descargarInformeWordDoc(c, logoSrc);
    });
    cont.querySelectorAll('.js-abririnforme').forEach(b => b.onclick = () => {
      const c = EMITIDOS.find(x => x.id === b.dataset.id);
      if (c) {
        try { localStorage.setItem('lexfive_precargar_pasantia', JSON.stringify(c)); } catch (e) {}
        navigate('informe');
      }
    });
    cont.querySelectorAll('.js-delcert').forEach(b => b.onclick = async () => {
      const c = EMITIDOS.find(x => x.id === b.dataset.id); if (!c) return;
      if (!confirm('¿Eliminar el registro del certificado ' + c.ref + '? Ya no se podrá verificar por su QR.')) return;
      try { await supabase.from('certificados').delete().eq('id', c.id); toast('Registro eliminado.', 'success'); cargarEmitidos(); }
      catch (e) { toast('No se pudo eliminar.', 'error'); }
    });
  }
  async function reimprimirCert(c) {
    let cuerpo = await fetchCuerpo(c);
    if (!cuerpo) {
      const tpl = CERT_PLANTILLAS.find(t => t.titulo === c.tipo) || CERT_PLANTILLAS[0];
      cuerpo = tpl.cuerpo({ nombre: c.nombre, ci: c.ci, calidad: c.cargo, periodo: c.periodo || 'indicado', universidad: c.universidad || '', carrera: c.carrera_plan || '', horas: '', destinatario: '', registro_universitario: c.registro_universitario, carrera_plan: c.carrera_plan, asignatura: c.asignatura, nota_designacion: c.nota_designacion, fecha_nota_designacion: c.fecha_nota_designacion ? fechaLarga(c.fecha_nota_designacion) : '', modalidad: c.modalidad, horario: c.horario, fecha_inicio_larga: c.fecha_inicio ? fechaLarga(c.fecha_inicio) : '', fecha_fin_larga: c.fecha_fin ? fechaLarga(c.fecha_fin) : '' });
    }
    const esPas = (c.tipo_certificado === 'pasantia') || (c.tipo === 'CERTIFICADO DE PASANTÍA');
    const periodoPas = (c.fecha_inicio && c.fecha_fin)
      ? `Del ${fmtDate(c.fecha_inicio)} al ${fmtDate(c.fecha_fin)}`
      : (c.periodo || '');
    const doc = buildCertDoc({
      titulo: c.tipo || 'CERTIFICADO', cuerpoTexto: cuerpo, nombre: c.nombre, ci: c.ci || '',
      fechaTxt: fechaLarga(c.fecha_emision), ref: c.ref,
      qrSrc: qrURL(qrCertificado({
        nombre: c.nombre,
        ci: c.ci,
        cargo: c.cargo || (esPas ? 'Pasante Universitario' : 'Colaborador'),
        tipo: c.tipo,
        ref: c.ref,
        fecha: c.fecha_emision,
        ru: c.registro_universitario || '',
        universidad: c.universidad || '',
        carrera_plan: c.carrera_plan || '',
        asignatura: c.asignatura || '',
        modalidad: c.modalidad || '',
        periodo: esPas ? periodoPas : (c.periodo || ''),
        tipo_certificado: esPas ? 'pasantia' : 'trabajo'
      })),
      abogadoFirma: $('#ce_abogado_firma') ? $('#ce_abogado_firma').value : '',
      rpaFirma: $('#ce_rpa') ? $('#ce_rpa').value : '',
      logoSrc, selloSrc: selloActivo(), model: modeloMembrete()
    });
    const slug = slugNombre(c.nombre);
    const prefijo = (c.tipo && c.tipo.includes('ACEPTACIÓN')) ? 'Carta_Aceptacion_' : (esPas ? 'Certificado_Pasantia_' : 'Certificado_');
    abrirImpresionVectorial(`${prefijo}${slug}`, doc);
  }

  // Carga un certificado emitido en el formulario para EDITARLO (se guarda sobre
  // el mismo registro / N.º de referencia, no crea uno nuevo).
  async function editarCert(c) {
    const tpl = CERT_PLANTILLAS.find(t => t.titulo === c.tipo) || CERT_PLANTILLAS[0];
    const cuerpoGuardado = await fetchCuerpo(c);
    const esPas = (c.tipo_certificado === 'pasantia') || (tpl.id === 'pasantia_universitaria');
    if ($('#ce_tipo_cert')) $('#ce_tipo_cert').value = esPas ? 'pasantia' : 'trabajo';
    $('#ce_tipo').value = tpl.id;
    aplicarTipoCert(false);
    $('#ce_nombre').value = c.nombre || '';
    $('#ce_ci').value = c.ci || '';
    $('#ce_calidad').value = c.cargo || '';
    $('#ce_periodo').value = c.periodo || '';
    $('#ce_fecha').value = (c.fecha_emision || hoyISO()).slice(0, 10);
    if (c.genero && $('#ce_genero')) $('#ce_genero').value = c.genero;
    if (c.registro_universitario && $('#ce_ru')) $('#ce_ru').value = c.registro_universitario;
    if (c.universidad && $('#ce_uni_pas')) $('#ce_uni_pas').value = c.universidad;
    if (c.carrera_plan && $('#ce_carrera_plan')) $('#ce_carrera_plan').value = c.carrera_plan;
    if (c.asignatura && $('#ce_asignatura')) $('#ce_asignatura').value = c.asignatura;
    if (c.nota_designacion && $('#ce_nota_desig')) $('#ce_nota_desig').value = c.nota_designacion;
    if (c.fecha_nota_designacion && $('#ce_fecha_nota')) $('#ce_fecha_nota').value = (c.fecha_nota_designacion || '').slice(0, 10);
    if (c.fecha_inicio && $('#ce_fecha_inicio')) $('#ce_fecha_inicio').value = (c.fecha_inicio || '').slice(0, 10);
    if (c.fecha_fin && $('#ce_fecha_fin')) $('#ce_fecha_fin').value = (c.fecha_fin || '').slice(0, 10);
    if (c.modalidad && $('#ce_modalidad')) $('#ce_modalidad').value = c.modalidad;
    if (c.horario && $('#ce_horario')) $('#ce_horario').value = c.horario;
    // Respaldo local de campos adicionales
    let localExtra = {};
    try {
      const stored = localStorage.getItem('lexfive_cert_extra_' + (c.id || c.ref)) || localStorage.getItem('lexfive_cert_extra_' + c.ref);
      if (stored) localExtra = JSON.parse(stored);
    } catch (_) {}

    const docGuiaVal = (c.docente_guia !== undefined && c.docente_guia !== null) ? c.docente_guia : (localExtra.docente_guia || '');
    const tutNomVal = (c.tutor_nombre !== undefined && c.tutor_nombre !== null) ? c.tutor_nombre : (localExtra.tutor_nombre || '');
    const tutRpaVal = (c.tutor_rpa !== undefined && c.tutor_rpa !== null) ? c.tutor_rpa : (localExtra.tutor_rpa || '');
    const generoVal = (c.genero !== undefined && c.genero !== null) ? c.genero : (localExtra.genero || 'femenino');
    const obsRecVal = (c.observacion_rec !== undefined && c.observacion_rec !== null) ? c.observacion_rec : (localExtra.observacion_rec || '');
    const destRemVal = (c.destinatario_remision !== undefined && c.destinatario_remision !== null) ? c.destinatario_remision : (localExtra.destinatario_remision || 'Dr. Erick San Miguel R.');
    const cargoRemVal = (c.cargo_remision !== undefined && c.cargo_remision !== null) ? c.cargo_remision : (localExtra.cargo_remision || 'RESPONSABLE DEL INSTITUTO DE INVESTIGACIONES, SEMINARIOS Y TESIS (IIST)');
    const firmanteRemVal = (c.firmante_remision !== undefined && c.firmante_remision !== null) ? c.firmante_remision : (localExtra.firmante_remision || 'estudiante');
    const celPasVal = (c.celular_pasante !== undefined && c.celular_pasante !== null) ? c.celular_pasante : (localExtra.celular_pasante || '');

    if ($('#ce_docente_guia')) $('#ce_docente_guia').value = docGuiaVal;
    if ($('#ce_tutor_nombre')) $('#ce_tutor_nombre').value = tutNomVal;
    if ($('#ce_tutor_rpa')) $('#ce_tutor_rpa').value = tutRpaVal;
    if ($('#ce_genero')) $('#ce_genero').value = generoVal;
    if ($('#ce_observacion_rec')) $('#ce_observacion_rec').value = obsRecVal;
    if ($('#ce_remision_destinatario')) $('#ce_remision_destinatario').value = destRemVal;
    if ($('#ce_remision_cargo')) $('#ce_remision_cargo').value = cargoRemVal;
    if ($('#ce_remision_firmante')) $('#ce_remision_firmante').value = firmanteRemVal;
    if ($('#ce_celular_pasante')) $('#ce_celular_pasante').value = celPasVal;
    if ($('#ce_fotos_layout')) $('#ce_fotos_layout').value = localExtra.fotos_layout || c.fotos_layout || '4';
    const inicialVal = (c.inicial_apellido !== undefined && c.inicial_apellido !== null)
      ? c.inicial_apellido
      : (localExtra.inicial_apellido !== undefined ? localExtra.inicial_apellido : calcularInicialApellido(c.nombre || ''));
    if ($('#ce_inicial_apellido')) {
      $('#ce_inicial_apellido').value = (inicialVal || '').toUpperCase();
      $('#ce_inicial_apellido').dataset.manual = '1';
    }
    fotosPasantiaArray = Array.isArray(localExtra.fotos) ? localExtra.fotos : (Array.isArray(c.fotos) ? c.fotos : []);
    pintarFotosGrid();
    if (typeof c.incluir_sello_digital === 'boolean' && $('#ce_sello')) $('#ce_sello').checked = c.incluir_sello_digital;
    $('#ce_cuerpo').value = cuerpoGuardado || tpl.cuerpo(datos());
    cuerpoEditado = true;
    refActual = c.ref;
    editando = true;
    guardadoActual = false;
    // Restaurar cronograma de 20 jornadas persistido
    cronogramaPersonalizado = null;
    if (esPas) {
      if (Array.isArray(c.cronograma_json) && c.cronograma_json.length) {
        cronogramaPersonalizado = c.cronograma_json;
      } else if (Array.isArray(c.customTareas) && c.customTareas.length) {
        cronogramaPersonalizado = c.customTareas;
      } else if (Array.isArray(localExtra.cronograma_json) && localExtra.cronograma_json.length) {
        cronogramaPersonalizado = localExtra.cronograma_json;
      }
      pintarEditorJornadas();
    }
    const banner = $('#ce_editbanner'); if (banner) { banner.style.display = ''; const r = $('#ce_editref'); if (r) r.textContent = c.ref; }
    pintar();
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
    toast('Editando el certificado ' + c.ref + '. Modifique y vuelva a imprimir/descargar para guardar los cambios.', 'success');
  }

  // Sale del modo edición y prepara un certificado nuevo (referencia nueva).
  function nuevoCert() {
    editando = false;
    guardadoActual = false;
    refActual = nuevoRef();
    cuerpoEditado = false;
    cronogramaPersonalizado = null;
    const editorWrap = $('#ce_jornadas_editor_wrap');
    if (editorWrap) editorWrap.style.display = 'none';
    fotosPasantiaArray = [];
    if ($('#ce_fotos_layout')) $('#ce_fotos_layout').value = '4';
    pintarFotosGrid();
    ['ce_nombre', 'ce_ci', 'ce_calidad', 'ce_periodo', 'ce_uni', 'ce_carrera', 'ce_horas', 'ce_dest',
     'ce_ru', 'ce_nota_desig', 'ce_fecha_nota', 'ce_fecha_inicio', 'ce_fecha_fin', 'ce_horario',
     'ce_docente_guia', 'ce_tutor_nombre', 'ce_tutor_rpa', 'ce_observacion_rec', 'ce_celular_pasante', 'ce_inicial_apellido'].forEach(id => { const el = $('#' + id); if (el) { el.value = ''; delete el.dataset.manual; } });
    if ($('#ce_remision_destinatario')) $('#ce_remision_destinatario').value = 'Dr. Erick San Miguel R.';
    if ($('#ce_remision_cargo')) $('#ce_remision_cargo').value = 'RESPONSABLE DEL INSTITUTO DE INVESTIGACIONES, SEMINARIOS Y TESIS (IIST)';
    if ($('#ce_remision_firmante')) $('#ce_remision_firmante').value = 'estudiante';
    if ($('#ce_genero')) $('#ce_genero').value = 'femenino';
    if ($('#ce_prellenar_asistencia')) $('#ce_prellenar_asistencia').checked = true;
    if ($('#ce_uni_pas')) $('#ce_uni_pas').value = 'Universidad Mayor de San Andrés (UMSA)';
    if ($('#ce_carrera_plan')) $('#ce_carrera_plan').value = 'Carrera de Derecho – Plan de Estudios 2017';
    if ($('#ce_asignatura')) $('#ce_asignatura').value = 'CJR-410 Pasantía I';
    if ($('#ce_modalidad')) $('#ce_modalidad').value = '4 semanas a medio tiempo (4 horas diarias)';
    $('#ce_fecha').value = hoyISO();
    const banner = $('#ce_editbanner'); if (banner) banner.style.display = 'none';
    aplicarTipoCert(false);
  }

  // Carga los DATOS de una persona (de un certificado emitido) en un certificado
  // NUEVO, para no volver a escribirlos. No reemplaza el anterior.
  function nuevoConDatos(c) {
    $('#ce_nombre').value = c.nombre || '';
    if ($('#ce_inicial_apellido')) {
      $('#ce_inicial_apellido').value = (c.inicial_apellido || calcularInicialApellido(c.nombre) || '').toUpperCase();
      delete $('#ce_inicial_apellido').dataset.manual;
    }
    $('#ce_ci').value = c.ci || '';
    $('#ce_calidad').value = c.cargo || '';
    $('#ce_periodo').value = c.periodo || '';
    $('#ce_fecha').value = hoyISO();
    editando = false; guardadoActual = false; refActual = nuevoRef(); cuerpoEditado = false;
    const banner = $('#ce_editbanner'); if (banner) banner.style.display = 'none';
    regenerar(); pintar();
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
    toast('Datos de ' + (c.nombre || 'la persona') + ' cargados. Elija el tipo y guarde un certificado NUEVO.', 'success');
  }

  // Campos que, si el texto no fue editado a mano, regeneran el borrador.
  ['ce_nombre', 'ce_ci', 'ce_calidad', 'ce_periodo', 'ce_uni', 'ce_carrera', 'ce_horas', 'ce_dest',
   'ce_ru', 'ce_uni_pas', 'ce_carrera_plan', 'ce_asignatura', 'ce_nota_desig', 'ce_horario'].forEach(id => {
    const el = $('#' + id); if (!el) return;
    el.oninput = () => { forkSiNecesario(); if (!cuerpoEditado) regenerar(); pintar(); };
  });
  ['ce_fecha_nota', 'ce_fecha_inicio', 'ce_fecha_fin', 'ce_modalidad', 'ce_genero', 'ce_feriados_extra',
   'ce_docente_guia', 'ce_tutor_nombre', 'ce_tutor_rpa', 'ce_observacion_rec', 'ce_fecha',
   'ce_remision_destinatario', 'ce_remision_cargo', 'ce_remision_firmante', 'ce_celular_pasante'].forEach(id => {
    const el = $('#' + id); if (!el) return;
    const handler = () => {
      forkSiNecesario();
      if (id === 'ce_fecha_inicio' || id === 'ce_modalidad' || id === 'ce_feriados_extra') {
        autocalcularFechaFin();
      }
      if (!cuerpoEditado) regenerar();
      pintar();
    };
    el.onchange = handler;
    el.oninput = handler;
  });

  const elNombreCe = $('#ce_nombre');
  const elIniCe = $('#ce_inicial_apellido');
  if (elNombreCe && elIniCe) {
    elNombreCe.addEventListener('input', () => {
      if (!elIniCe.dataset.manual) {
        elIniCe.value = calcularInicialApellido(elNombreCe.value);
      }
    });
    elIniCe.addEventListener('input', () => {
      elIniCe.dataset.manual = '1';
      forkSiNecesario();
      pintar();
    });
  }

    // ---- Pestañas de Vista Previa (Delegación de eventos sobre el contenedor) ----
  const tabsContainer = $('#ce_preview_tabs');
  if (tabsContainer) {
    tabsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.js-prev-tab');
      if (!btn) return;
      e.preventDefault();
      const nuevaTab = btn.dataset.tab;
      if (nuevaTab && ['cert', 'asistencia', 'informe', 'experiencia', 'recomendacion', 'remision'].includes(nuevaTab)) {
        vistaPasantiaTab = nuevaTab;
        pintar();
      }
    });
  }



  // ---- Gestión visual de fotos y extracción .docx ----
  const pintarFotosGrid = () => {
    const grid = $('#ce_fotos_grid');
    const badge = $('#ce_fotos_badge');
    const btnVaciar = $('#ce_btn_vaciar_fotos');
    if (!grid) return;

    if (!fotosPasantiaArray.length) {
      grid.innerHTML = '<p class="cell-sub" style="grid-column:1/-1;margin:0;font-size:.8rem;opacity:.7;">No hay fotos cargadas aún.</p>';
      if (badge) badge.style.display = 'none';
      if (btnVaciar) btnVaciar.style.display = 'none';
      return;
    }

    if (badge) {
      badge.style.display = 'inline-block';
      badge.textContent = `${fotosPasantiaArray.length} foto${fotosPasantiaArray.length > 1 ? 's' : ''}`;
    }
    if (btnVaciar) btnVaciar.style.display = 'inline-block';

    grid.innerHTML = fotosPasantiaArray.map((f, i) => `
      <div style="border:1px solid var(--line);border-radius:6px;padding:6px;background:var(--card-sub-bg, rgba(255,255,255,0.03));position:relative;display:flex;flex-direction:column;">
        <div style="position:relative;width:100%;height:115px;border-radius:4px;overflow:hidden;background:rgba(0,0,0,0.05);display:flex;align-items:center;justify-content:center;">
          <img src="${f.src}" style="max-width:100%;max-height:100%;object-fit:cover;" alt="">
          <span style="position:absolute;top:4px;left:4px;background:rgba(14,27,44,0.75);color:#fff;font-size:10px;padding:1px 5px;border-radius:3px;font-weight:600;">N.º ${i + 1}</span>
          <button class="btn btn--danger btn--sm js-ce-foto-del" data-idx="${i}" style="position:absolute;top:4px;right:4px;padding:2px 6px;line-height:1;font-size:11px;" type="button" title="Eliminar foto">&times;</button>
        </div>
        <input class="js-ce-foto-pie" data-idx="${i}" value="${esc(f.pie || '')}" placeholder="Pie de foto..." style="width:100%;font-size:.75rem;margin-top:6px;padding:3px 6px;box-sizing:border-box;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
          <button class="btn btn--ghost btn--sm js-ce-foto-prev" data-idx="${i}" type="button" style="padding:1px 6px;font-size:11px;" ${i === 0 ? 'disabled' : ''} title="Mover a la izquierda">◀</button>
          <span style="font-size:10px;color:var(--text-muted, #888);">${i + 1}/${fotosPasantiaArray.length}</span>
          <button class="btn btn--ghost btn--sm js-ce-foto-next" data-idx="${i}" type="button" style="padding:1px 6px;font-size:11px;" ${i === fotosPasantiaArray.length - 1 ? 'disabled' : ''} title="Mover a la derecha">▶</button>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.js-ce-foto-pie').forEach(inp => {
      inp.oninput = () => {
        const idx = Number(inp.dataset.idx);
        if (fotosPasantiaArray[idx]) {
          fotosPasantiaArray[idx].pie = inp.value;
          pintar();
        }
      };
    });

    grid.querySelectorAll('.js-ce-foto-del').forEach(btn => {
      btn.onclick = () => {
        const idx = Number(btn.dataset.idx);
        fotosPasantiaArray.splice(idx, 1);
        pintarFotosGrid();
        pintar();
      };
    });

    grid.querySelectorAll('.js-ce-foto-prev').forEach(btn => {
      btn.onclick = () => {
        const idx = Number(btn.dataset.idx);
        if (idx > 0) {
          const item = fotosPasantiaArray.splice(idx, 1)[0];
          fotosPasantiaArray.splice(idx - 1, 0, item);
          pintarFotosGrid();
          pintar();
        }
      };
    });

    grid.querySelectorAll('.js-ce-foto-next').forEach(btn => {
      btn.onclick = () => {
        const idx = Number(btn.dataset.idx);
        if (idx < fotosPasantiaArray.length - 1) {
          const item = fotosPasantiaArray.splice(idx, 1)[0];
          fotosPasantiaArray.splice(idx + 1, 0, item);
          pintarFotosGrid();
          pintar();
        }
      };
    });
  };

  const agregarArchivosFotos = async (files) => {
    if (!files || !files.length) return;
    toast('Procesando archivos...', 'info');
    let fotosNuevas = 0;
    for (const file of files) {
      const isDocx = file.name.toLowerCase().endsWith('.docx') || file.type.includes('wordprocessingml');
      if (isDocx) {
        try {
          const extraidas = await extraerImagenesDeDocx(file);
          if (extraidas && extraidas.length) {
            extraidas.forEach((f, idx) => {
              fotosPasantiaArray.push({
                src: f.src,
                pie: f.pie || ''
              });
            });
            fotosNuevas += extraidas.length;
            toast(`Se extrajeron ${extraidas.length} fotografías del archivo Word.`, 'success');
          } else {
            toast(`No se encontraron imágenes en ${file.name}.`, 'warning');
          }
        } catch (err) {
          console.error('Error al extraer imágenes del .docx:', err);
          toast(`Error al leer archivo Word: ${err.message}`, 'error');
        }
      } else if (file.type.startsWith('image/')) {
        try {
          const dataUrl = await optimizarImagenBlob(file, 1200, 0.85);
          fotosPasantiaArray.push({
            src: dataUrl,
            pie: ''
          });
          fotosNuevas++;
        } catch (err) {
          console.warn('Error al procesar imagen:', err);
        }
      }
    }
    if (fotosNuevas > 0) {
      pintarFotosGrid();
      pintar();
      toast(`${fotosNuevas} fotografía(s) agregada(s) correctamente.`, 'success');
    }
  };

  const dropzone = $('#ce_fotos_dropzone');
  const fileInputFotos = $('#ce_file_fotos');
  if (dropzone && fileInputFotos) {
    dropzone.onclick = () => fileInputFotos.click();

    dropzone.ondragover = (e) => {
      e.preventDefault();
      dropzone.style.borderColor = 'var(--gold, #b89446)';
      dropzone.style.background = 'rgba(184,148,70,0.08)';
    };

    dropzone.ondragleave = (e) => {
      e.preventDefault();
      dropzone.style.borderColor = 'var(--line)';
      dropzone.style.background = 'var(--card-sub-bg, rgba(255,255,255,0.02))';
    };

    dropzone.ondrop = async (e) => {
      e.preventDefault();
      dropzone.style.borderColor = 'var(--line)';
      dropzone.style.background = 'var(--card-sub-bg, rgba(255,255,255,0.02))';
      const files = Array.from(e.dataTransfer.files || []);
      await agregarArchivosFotos(files);
    };

    fileInputFotos.onchange = async (e) => {
      const files = Array.from(e.target.files || []);
      await agregarArchivosFotos(files);
      fileInputFotos.value = '';
    };
  }

  const btnVaciarFotos = $('#ce_btn_vaciar_fotos');
  if (btnVaciarFotos) {
    btnVaciarFotos.onclick = () => {
      if (!fotosPasantiaArray.length) return;
      fotosPasantiaArray = [];
      pintarFotosGrid();
      pintar();
      toast('Fotos eliminadas.', 'info');
    };
  }

  const selLayout = $('#ce_fotos_layout');
  if (selLayout) {
    selLayout.onchange = () => {
      pintar();
    };
  }

  // Pegar imágenes con Ctrl + V
  document.addEventListener('paste', async (e) => {
    if (!esPasantia()) return;
    const items = (e.clipboardData || window.clipboardData)?.items;
    if (!items) return;
    const imgFiles = [];
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) imgFiles.push(file);
      }
    }
    if (imgFiles.length) {
      e.preventDefault();
      await agregarArchivosFotos(imgFiles);
    }
  });

  // Editor plegable de actividades generadas
  const editorWrap = $('#ce_jornadas_editor_wrap');
  const pintarEditorJornadas = () => {
    if (!editorWrap || !cronogramaPersonalizado || !cronogramaPersonalizado.length) return;
    editorWrap.style.display = 'block';
    editorWrap.innerHTML = `
      <details style="border:1px solid var(--line);border-radius:6px;padding:8px 12px;background:var(--card-sub-bg, transparent);" open>
        <summary style="cursor:pointer;font-weight:600;font-size:.85rem;color:var(--primary, #c2a25a);display:flex;align-items:center;justify-content:space-between;">
          <span>🗓️ Retocar actividades por jornada (${cronogramaPersonalizado.length} días hábiles)</span>
          <span style="font-size:.75rem;opacity:.7;">Plegar/Desplegar</span>
        </summary>
        <div style="display:flex;flex-direction:column;gap:10px;margin-top:10px;max-height:360px;overflow-y:auto;padding-right:4px;">
          ${cronogramaPersonalizado.map((j, idx) => `
            <div style="border-bottom:1px dashed var(--line);padding-bottom:8px;" data-jornada-idx="${idx}">
              <div style="display:flex;justify-content:space-between;font-size:.8rem;font-weight:600;margin-bottom:3px;">
                <span>Día ${j.num || (idx + 1)} · ${j.diaSemana || ''} ${j.fecha || ''}</span>
                <span style="opacity:.6;font-size:.75rem;">Semana ${j.semanaIdx || Math.floor(idx/5)+1}</span>
              </div>
              <div style="margin-bottom:4px;">
                <label style="font-size:.72rem;opacity:.75;display:block;">Resumen (Asistencia):</label>
                <input class="js-jornada-resumen" data-idx="${idx}" value="${esc(j.resumen || '')}" style="width:100%;font-size:.8rem;padding:3px 6px;">
              </div>
              <div>
                <label style="font-size:.72rem;opacity:.75;display:block;">Detalle de actividades (Informe Único, 1 a 3 puntos separados por salto de línea):</label>
                <textarea class="js-jornada-acts" data-idx="${idx}" rows="2" style="width:100%;font-size:.78rem;padding:3px 6px;font-family:inherit;">${esc(Array.isArray(j.actividades) ? j.actividades.join('\n') : (j.detalle || ''))}</textarea>
              </div>
            </div>
          `).join('')}
        </div>
      </details>
    `;

    editorWrap.querySelectorAll('.js-jornada-resumen').forEach(inp => {
      inp.oninput = () => {
        const idx = parseInt(inp.dataset.idx, 10);
        if (cronogramaPersonalizado && cronogramaPersonalizado[idx]) {
          cronogramaPersonalizado[idx].resumen = inp.value;
          pintar();
        }
      };
    });
    editorWrap.querySelectorAll('.js-jornada-acts').forEach(txt => {
      txt.oninput = () => {
        const idx = parseInt(txt.dataset.idx, 10);
        if (cronogramaPersonalizado && cronogramaPersonalizado[idx]) {
          cronogramaPersonalizado[idx].actividades = txt.value.split('\n').map(s => s.trim()).filter(Boolean);
          cronogramaPersonalizado[idx].detalle = txt.value;
          pintar();
        }
      };
    });
  };

    const btnToggleAreas = $('#ce_btn_toggle_areas');
  if (btnToggleAreas) {
    btnToggleAreas.onclick = () => {
      const cbs = content().querySelectorAll('.ce_area');
      const allChecked = Array.from(cbs).every(c => c.checked);
      cbs.forEach(c => { c.checked = !allChecked; });
      pintar();
    };
  }

    const badgeIA = $('#ce_ia_badge');

  content().addEventListener('click', async (e) => {
    const btn = e.target.closest('#ce_btn_ia_cronograma');
    if (!btn) return;
    e.preventDefault();

    const fIni = val('ce_fecha_inicio');
    if (!fIni) { toast('Seleccione la fecha de inicio primero.', 'error'); return; }
    autocalcularFechaFin();
    const mod = val('ce_modalidad') || '4 semanas a medio tiempo (4 horas diarias)';
    const numDias = (mod.includes('2 semanas') || mod.includes('tiempo completo')) ? 10 : 20;
    const feriadosExtra = val('ce_feriados_extra');
    const calc = calcularJornadasHabilesBolivia(fIni, numDias, feriadosExtra);

    const areas = Array.from(content().querySelectorAll('.ce_area:checked')).map(c => c.value);
    const enfoque = val('ce_enfoque');
    const nombre = val('ce_nombre');

    btn.disabled = true;
    btn.textContent = '⏳ Generando con IA (puede tardar 20–40 s)...';
    toast('Generando actividades exclusivas con IA (espera hasta 75s)...', 'info');

    try {
      // Timeout amplio de 75000 ms (75 segundos)
      const iaPromise = generarCronogramaPasantia({
        jornadas: calc.jornadas,
        areas,
        enfoque,
        nombrePasante: nombre,
        usarIA: true
      });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT_75S')), 75000)
      );

      const crono = await Promise.race([iaPromise, timeoutPromise]);

      if (crono && crono.length) {
        cronogramaPersonalizado = crono;
        const bBadge = $('#ce_ia_badge');
        if (bBadge) {
          bBadge.style.display = 'inline-block';
          if (crono.origen === 'ia') {
            bBadge.style.background = 'rgba(34,197,94,0.15)';
            bBadge.style.color = '#16a34a';
            bBadge.style.border = '1px solid rgba(34,197,94,0.3)';
            bBadge.textContent = '✓ Generado con IA';
            bBadge.title = 'Actividades generadas exitosamente con Google Gemini';
          } else {
            bBadge.style.background = 'rgba(234,179,8,0.15)';
            bBadge.style.color = '#ca8a04';
            bBadge.style.border = '1px solid rgba(234,179,8,0.3)';
            bBadge.textContent = '⚠️ Generado con banco local';
            bBadge.title = crono.motivo ? `Motivo: ${crono.motivo}` : 'Banco normativo local';
          }
        }
        pintarEditorJornadas();
        pintar();
        toast(`Informe y Hoja de Asistencia actualizados (${crono.length} jornadas)`, 'success');
      }
    } catch (err) {
      console.error('Error al generar con IA:', err);
      if (err && err.message === 'TIMEOUT_75S') {
        toast('El servicio de IA tardó más de 75s. Se aplicó el banco normativo local.', 'info');
      } else {
        toast('Error al generar con IA, usando tareas predeterminadas.', 'error');
      }
      // Fallback a banco local
      try {
        const fallback = await generarCronogramaPasantia({
          jornadas: calc.jornadas,
          areas,
          enfoque,
          nombrePasante: nombre,
          usarIA: false
        });
        if (fallback && fallback.length) {
          cronogramaPersonalizado = fallback;
          pintarEditorJornadas();
          pintar();
        }
      } catch (_) {}
    } finally {
      const activeBtn = $('#ce_btn_ia_cronograma');
      if (activeBtn) {
        activeBtn.disabled = false;
        activeBtn.textContent = '✨ Generar nuevo cronograma único (IA)';
      }
    }
  });
  const chkAsis = $('#ce_prellenar_asistencia');
  if (chkAsis) chkAsis.onchange = () => { forkSiNecesario(); };
  const ceTipoCert = $('#ce_tipo_cert');
  if (ceTipoCert) ceTipoCert.onchange = () => { forkSiNecesario(); aplicarTipoCert(true); };
  $('#ce_tipo').onchange = () => {
    // Cambiar el TIPO nunca debe reemplazar un certificado ya guardado: se crea
    // uno nuevo conservando los datos de la persona.
    if (editando) { editando = false; guardadoActual = false; refActual = nuevoRef(); const b = $('#ce_editbanner'); if (b) b.style.display = 'none'; toast('Nuevo certificado (se conservan los datos de la persona).', 'success'); }
    else forkSiNecesario();
    regenerar(); pintar();
  };
  // $('#ce_fecha') ya está enlazado en el listener multivariable superior
  $('#ce_cuerpo').oninput = () => { forkSiNecesario(); cuerpoEditado = true; pintar(); };
  $('#ce_restaurar').onclick = () => { regenerar(); pintar(); toast('Texto regenerado a partir de los datos.', 'success'); };
  const btnNuevo = $('#ce_nuevo'); if (btnNuevo) btnNuevo.onclick = nuevoCert;
  // Control de opacidad de la marca de agua (logo de fondo), igual que en credenciales.
  const wmS = $('#ce_wm'), wmOut = $('#ce_wm_out');
  if (wmS) {
    wmS.addEventListener('input', () => { localStorage.setItem('lexfive_wm_op', wmS.value); applyWmOpacity(wmS.value); if (wmOut) wmOut.textContent = wmS.value + '%'; pintar(); });
    wmS.addEventListener('change', () => { pushBranding(); });
  }
  const ceSello = $('#ce_sello'); if (ceSello) ceSello.onchange = pintar;
  const ceModelo = $('#ce_modelo'); if (ceModelo) { ceModelo.value = modeloMembrete(); ceModelo.onchange = () => { setModeloMembrete(ceModelo.value); pintar(); }; }

  $('#ce_guardar').onclick = () => {
    if (!($('#ce_nombre').value || '').trim()) { toast('Escriba el nombre completo.', 'error'); return; }
    registrarCert();
    editando = false;
    const banner = $('#ce_editbanner'); if (banner) banner.style.display = 'none';
    toast('Registro guardado en «Certificados emitidos». Para la misma persona, cambie el tipo y vuelva a Guardar registro: se crea otro sin reemplazar este.', 'success');
  };

  // 🖨️ Guardar PDF / Imprimir pestaña activa (Vectorial nativo en tamaño carta)
  const btnImpActivo = $('#ce_btn_imprimir_activo');
  if (btnImpActivo) {
    btnImpActivo.onclick = () => {
      const nom = (val('ce_nombre') || '').trim();
      if (!nom) { toast('Escriba el nombre completo.', 'error'); return; }
      registrarCert();
      const slug = slugNombre(nom);
      const pas = esPasantia();
      let tituloDoc = '';
      let docHTML = '';

      if (!pas || vistaPasantiaTab === 'cert') {
        const prefijo = catActual() === 'aceptacion' ? 'Carta_Aceptacion_' : (pas ? 'Certificado_Pasantia_' : 'Certificado_');
        tituloDoc = `${prefijo}${slug}`;
        docHTML = docActual();
      } else if (vistaPasantiaTab === 'asistencia') {
        tituloDoc = `Hoja_Asistencia_${slug}`;
        docHTML = buildHojaAsistenciaHTML(datos(), logoSrc, modeloMembrete(), wmOpacityActual() / 100);
      } else if (vistaPasantiaTab === 'informe') {
        tituloDoc = `Informe_Pasantia_${slug}`;
        docHTML = buildPaginasInforme(datos(), logoSrc, modeloMembrete(), wmOpacityActual() / 100);
      } else if (vistaPasantiaTab === 'experiencia') {
        tituloDoc = `Certificado_Experiencia_PreProfesional_${slug}`;
        docHTML = buildExperienciaHTML(datos(), logoSrc, modeloMembrete(), wmOpacityActual() / 100);
      } else if (vistaPasantiaTab === 'recomendacion') {
        tituloDoc = `Carta_Recomendacion_${slug}`;
        docHTML = buildRecomendacionHTML(datos(), logoSrc, modeloMembrete(), wmOpacityActual() / 100);
      } else if (vistaPasantiaTab === 'remision') {
        tituloDoc = `Nota_Remision_${slug}`;
        docHTML = buildNotaRemisionHTML(datos(), logoSrc, modeloMembrete(), wmOpacityActual() / 100);
      }
      abrirImpresionVectorial(tituloDoc, docHTML);
    };
  }

  // 📑 Expediente UMSA (4 en 1: Nota de Remisión + Certificado + Asistencia + Informe Único)
  const btnExpCompleto = $('#ce_btn_expediente_completo');
  if (btnExpCompleto) {
    btnExpCompleto.onclick = () => {
      const nom = (val('ce_nombre') || '').trim();
      if (!nom) { toast('Escriba el nombre completo.', 'error'); return; }
      registrarCert();
      const slug = slugNombre(nom);
      const tituloDoc = `Expediente_UMSA_${slug}`;
      toast('Preparando Expediente UMSA (4 en 1: Nota de Remisión + Certificado + Asistencia + Informe)...', 'info');
      const notaHTML = buildNotaRemisionHTML(datos(), logoSrc, modeloMembrete(), wmOpacityActual() / 100);
      const certHTML = docActual();
      const asisHTML = buildHojaAsistenciaHTML(datos(), logoSrc, modeloMembrete(), wmOpacityActual() / 100);
      const infHTML = buildPaginasInforme(datos(), logoSrc, modeloMembrete(), wmOpacityActual() / 100);
      abrirImpresionVectorial(tituloDoc, notaHTML + certHTML + asisHTML + infHTML);
    };
  }

  // 🎓 Paquete CV (2 en 1: Experiencia Pre-Profesional + Carta de Recomendación)
  const btnPaqCv = $('#ce_btn_paquete_cv');
  if (btnPaqCv) {
    btnPaqCv.onclick = () => {
      const nom = (val('ce_nombre') || '').trim();
      if (!nom) { toast('Escriba el nombre completo.', 'error'); return; }
      registrarCert();
      const slug = slugNombre(nom);
      const tituloDoc = `Paquete_CV_${slug}`;
      toast('Preparando Paquete CV (2 en 1: Experiencia + Recomendación)...', 'info');
      const expHTML = buildExperienciaHTML(datos(), logoSrc, modeloMembrete(), wmOpacityActual() / 100);
      const recHTML = buildRecomendacionHTML(datos(), logoSrc, modeloMembrete(), wmOpacityActual() / 100);
      abrirImpresionVectorial(tituloDoc, expHTML + recHTML);
    };
  }

  // 📄 Word (.doc) correspondiente a la pestaña activa (oculto en asistencia)
  const btnWordActivo = $('#ce_btn_word_activo');
  if (btnWordActivo) {
    btnWordActivo.onclick = async () => {
      const nom = (val('ce_nombre') || '').trim();
      if (!nom) { toast('Escriba el nombre completo.', 'error'); return; }
      registrarCert();
      const slug = slugNombre(nom);
      if (esPasantia() && vistaPasantiaTab === 'informe') {
        await descargarInformeWordDoc(datos(), logoSrc);
      } else if (esPasantia() && vistaPasantiaTab === 'experiencia') {
        await descargarExperienciaWordDoc(datos(), logoSrc);
      } else if (esPasantia() && vistaPasantiaTab === 'recomendacion') {
        await descargarRecomendacionWordDoc(datos(), logoSrc);
      } else if (esPasantia() && vistaPasantiaTab === 'remision') {
        await descargarNotaRemisionWordDoc(datos(), logoSrc);
      } else {
        const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body>' + docActual() + '</body></html>';
        const prefijo = catActual() === 'aceptacion' ? 'carta-aceptacion-' : (esPasantia() ? 'certificado-pasantia-' : 'certificado-');
        const nombreArch = `${prefijo}${slug.toLowerCase().replace(/_/g, '-')}.doc`;
        descargarArchivo(nombreArch, '\ufeff' + html, 'application/msword');
        toast('Documento descargado en Word.', 'success');
      }
    };
  }

  // Filtros rápidos de categoría en la galería
  content().querySelectorAll('.js-filtro-cat').forEach(btn => {
    btn.onclick = () => {
      filtroCatActivo = btn.dataset.cat;
      content().querySelectorAll('.js-filtro-cat').forEach(b => {
        if (b.dataset.cat === filtroCatActivo) {
          b.className = 'btn btn--sm btn--primary js-filtro-cat';
        } else {
          b.className = 'btn btn--sm btn--ghost js-filtro-cat';
        }
      });
      pintarEmitidos();
    };
  });

  const bce = $('#ce_buscar'); if (bce) bce.oninput = pintarEmitidos;
  const bfd = $('#ce_fdesde'); if (bfd) bfd.onchange = pintarEmitidos;
  const bfh = $('#ce_fhasta'); if (bfh) bfh.onchange = pintarEmitidos;

  const ce_abogado_firma = $('#ce_abogado_firma');
  const ce_rpa = $('#ce_rpa');
  if (ce_abogado_firma) {
    ce_abogado_firma.value = localStorage.getItem('lexfive_cert_abogado') || 'Abg. Zenón Carlos Cartagena Álvarez';
    ce_abogado_firma.oninput = () => { localStorage.setItem('lexfive_cert_abogado', ce_abogado_firma.value); pintar(); };
  }
  if (ce_rpa) {
    ce_rpa.value = localStorage.getItem('lexfive_cert_rpa') || '6059319 ZCCA';
    ce_rpa.oninput = () => { localStorage.setItem('lexfive_cert_rpa', ce_rpa.value); pintar(); };
  }

  aplicarTipoCert(false);
  cargarEmitidos();
}
