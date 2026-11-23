// ============================================================
//  VISTA: INFORME ÚNICO DE PASANTÍA (UMSA Y OTRAS UNIVERSIDADES)
//  Documento oficial multipágina sobre HOJA MEMBRETADA institucional de LexFive
//  (encabezado, marca de agua, pie y numeración "Página X de Y" en cada hoja).
//  Soporta importación automática desde Certificados de Pasantía, cronograma
//  extenso día por día (20 o 10 jornadas), 3 conclusiones desarrolladas, firmas
//  en 2 columnas, lista de anexos y cargador de fotografías (2 por hoja).
//  Exportable a PDF (html2pdf), Impresión y Word (.doc editable multipágina).
// ============================================================
import { withTimeout } from './auth.js';
import { Draft } from './draft.js';
import { ICON } from './icons.js';
import { esc, hoyISO, fmtDate } from './util.js';
import { descargarArchivo } from './exportar.js';
import { $, content } from './dom.js';
import { toast, loading } from './ui.js';
import { ensureImgCache } from './media.js';
import { hydrateBranding, pickActiveLogo, pickActiveSello, brandLogoSrc, brandSelloSrc, wmOpacityActual, applyWmOpacity, pushBranding } from './branding.js';
import { supabase } from './supabase.js';
import { state } from './state.js';
import { MEMBRETE_MODELOS, modeloMembrete, setModeloMembrete, membreteHeader, membreteFooter, PRINT_COLOR_CSS } from './membrete-base.js';
import { PASANTIA_CRONOGRAMA_BASE, obtenerTratamiento, calcularJornadasPasantia, fechaLarga } from './certificados.js';

function urlAbs(src) {
  if (!src) return '';
  return src.indexOf('data:') === 0 ? src : new URL(src, location.href).href;
}

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
  return tareasLocales() || PASANTIA_CRONOGRAMA_BASE.map(t => t.detalle);
}
async function guardarTareas(arr) {
  try { localStorage.setItem(TAREAS_KEY, JSON.stringify(arr)); } catch (e) {}
  try { await supabase.from('configuracion').upsert({ clave: 'informe_tareas', valor: arr, updated_at: new Date().toISOString() }); } catch (e) {}
}

const INFORMES_CACHE = 'lexfive_informes_cache';
let informeEditId = null;
function cacheInformes() { try { const a = JSON.parse(localStorage.getItem(INFORMES_CACHE) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
async function fetchInformes() {
  try {
    const { data } = await withTimeout(supabase.from('informes').select('id, etiqueta, updated_at, created_at').order('updated_at', { ascending: false }).limit(200), 8000, 'informes');
    if (Array.isArray(data)) { try { localStorage.setItem(INFORMES_CACHE, JSON.stringify(data)); } catch (e) {} return data; }
  } catch (e) {}
  return cacheInformes();
}

// Trae los certificados de pasantía para el selector de importación rápida
async function fetchCertificadosPasantia() {
  try {
    const { data } = await withTimeout(
      supabase.from('certificados')
        .select('*')
        .or('tipo_certificado.eq.pasantia,tipo.ilike.%pasantía%,tipo.ilike.%pasantia%')
        .order('created_at', { ascending: false })
        .limit(100),
      8000, 'certificados_pasantia'
    );
    if (Array.isArray(data)) return data;
  } catch (e) {}
  return [];
}

// Genera el texto extendido día por día (3 actividades jurídicas por jornada)
function generarActividadesTexto(fechaInicio, fechaFin, modalidad) {
  const jornadas = calcularJornadasPasantia(fechaInicio, fechaFin, modalidad);
  const total = jornadas.length;
  let out = '';
  let curSem = 0;
  const numSemRoman = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  const semNombres = ['PRIMERA', 'SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA', 'SEXTA'];

  for (let i = 0; i < total; i++) {
    const sem = Math.floor(i / 5) + 1;
    if (sem !== curSem) {
      curSem = sem;
      const jIni = jornadas[i];
      const jFin = jornadas[Math.min(i + 4, total - 1)];
      const lapso = (jIni.fecha && jFin.fecha) ? ` (del ${jIni.fecha} al ${jFin.fecha})` : '';
      const semNom = semNombres[curSem - 1] || `${curSem}ª`;
      out += `\n${numSemRoman[curSem - 1] || curSem}. ${semNom} SEMANA${lapso}:\n`;
    }

    const j = jornadas[i];
    const baseTarea = j.tarea || { resumen: 'Práctica jurídica forense.', detalle: 'Práctica forense en despacho.' };
    const fLabel = j.fecha ? `${j.fecha}` : `Día ${j.numero}`;
    out += `\n• ${fLabel} — ${baseTarea.resumen}\n`;
    out += `  a) ${baseTarea.detalle}\n`;
    out += `  b) Registro, digitalización y actualización del estado procesal en el sistema informático interno del bufete LexFive.\n`;
    out += `  c) Compulsa normativa del Código Procesal aplicable, doctrina jurídica y control de plazos perentorios bajo supervisión.\n`;
  }
  return out.trim();
}

// Estructura de conclusiones institucionales
function generarConclusionesTexto(genero) {
  const t = obtenerTratamiento(genero);
  return `1. EFICIENCIA Y PROACTIVIDAD EN EL DESEMPEÑO:
${t.mencionado} ha desarrollado a cabalidad cada una de las labores asignadas por el cuerpo de abogados patrocinantes del Bufete LexFive, demostrando alto grado de diligencia, proactividad y rigor técnico en la investigación forense, manejo de cuadernos procesales y redacción de borradores.

2. COMPROMISO ÉTICO, DEONTOLÓGICO Y LEALTAD PROFESIONAL:
Todas las funciones forenses y administrativas fueron desempeñadas en estricta observancia a la Ley N.º 387 del Ejercicio de la Abogacía y el Código de Ética Profesional, preservando el deber de reserva, secreto profesional y custodia responsable de la documentación confidencial del despacho y de los patrocinados.

3. APLICACIÓN PRÁCTICA Y FORTALECIMIENTO DE HABILIDADES JURÍDICAS:
La pasantía jurídica permitió articular satisfactoriamente la formación teórica adquirida en las aulas universitarias con la praxis judicial cotidiana, consolidando criterios de argumentación, celeridad procesal y resolución de controversias en materia Civil, Familiar, Laboral y Penal.`;
}

// Divide el documento en páginas tamaño Carta estructuradas
function renderPaginaHoja({ model, logoSrc, numPag, totalPags, contentHTML, wmOp }) {
  const foot = membreteFooter(model).replace('</div>', `
    <span style="position:relative;z-index:2;font-weight:bold;color:#c2a25a;margin-left:14px;white-space:nowrap;">Página ${numPag} de ${totalPags}</span>
  </div>`);

  const wmHTML = (logoSrc && wmOp) ? `
    <img src="${logoSrc}" alt="" style="position:absolute;top:50%;left:50%;width:11.5cm;height:11.5cm;object-fit:contain;transform:translate(-50%,-50%);opacity:${Number(wmOp).toFixed(2)};pointer-events:none;z-index:0;">
  ` : '';

  return `
  <div class="hoja-carta" style="display:flex;flex-direction:column;width:21.59cm;min-height:27.94cm;max-height:27.94cm;height:27.94cm;margin:0 auto 24px;background:#fff;color:#101820;font-family:'Times New Roman',Georgia,serif;font-size:12px;line-height:1.45;box-sizing:border-box;overflow:hidden;box-shadow:0 3px 12px rgba(0,0,0,0.12);page-break-after:always;break-after:page;position:relative;">
    ${membreteHeader(model, logoSrc)}
    <div style="position:relative;flex:1 1 auto;display:flex;flex-direction:column;padding:16px 2.1cm 12px;overflow:hidden;">
      ${wmHTML}
      <div style="position:relative;z-index:1;display:flex;flex-direction:column;flex:1 1 auto;justify-content:flex-start;">
        ${contentHTML}
      </div>
    </div>
    ${foot}
  </div>`;
}

// Arma las páginas del documento multipágina de acuerdo al contenido
function buildPaginasInforme(d, logoSrc, model, wmOp) {
  const nombre = esc(d.nombre || '___________________');
  const ci = esc(d.ci || '—');
  const ru = esc(d.ru || d.registro_universitario || '—');
  const uni = esc(d.universidad || 'Universidad Mayor de San Andrés (UMSA)');
  const carrera = esc(d.carrera_plan || 'Carrera de Derecho – Plan de Estudios 2017');
  const asignatura = esc(d.asignatura || 'CJR-410 Pasantía I');
  const notaDesig = esc(d.nota_designacion || 'IIST-001/2026');
  const fechaNota = esc(d.fecha_nota_designacion || fechaLarga(d.fecha_emision || d.fecha));
  const modalidad = esc(d.modalidad || '4 semanas a medio tiempo (4 horas diarias)');
  const horario = esc(d.horario || '14:00 a 18:00');
  const duracion = esc(d.duracion || modalidad);
  const fechaDoc = fechaLarga(d.fecha || hoyISO());
  const docente = esc(d.docente_guia || 'Dr. Franklin Rubén Pareja Aliaga');
  const docenteCargo = esc(d.docente_cargo || 'Docente de la Carrera de Derecho – Guía de la Materia de Pasantía');
  const supervision = esc(d.supervision || 'Abogado(a) Patrocinante – LexFive Bufete de Abogados');
  const antecedentes = esc(d.antecedentes || `1) Guía de Procedimiento para Pasantías en la Carrera de Derecho, aprobada mediante Resolución del Honorable Consejo Universitario N.º 104/2016.\n2) Nota de Designación de Pasantía N.º ${notaDesig} de fecha ${fechaNota}.`);
  const actividades = d.actividades || '';
  const conclusiones = esc(d.conclusiones || generarConclusionesTexto(d.genero));
  const fotos = Array.isArray(d.fotos) ? d.fotos : [];

  // PÁGINA 1: Portada institucional, datos y antecedentes
  const pag1HTML = `
    <div style="text-align:center;font-family:Georgia,serif;margin-bottom:12px;">
      <h1 style="font-size:16px;letter-spacing:1.5px;color:#0e1b2c;margin:0 0 4px;text-transform:uppercase;">INFORME ÚNICO DE PASANTÍA</h1>
      <div style="font-size:11px;font-weight:bold;color:#a8853c;letter-spacing:1px;text-transform:uppercase;">${uni} · ${carrera}</div>
      <div style="font-size:10px;color:#555;margin-top:2px;">ASIGNATURA: ${asignatura}</div>
    </div>

    <div style="border-top:1.5px solid #0e1b2c;border-bottom:1.5px solid #0e1b2c;padding:6px 0;margin-bottom:12px;font-size:11.5px;">
      <div style="display:grid;grid-template-columns:85px 1fr;gap:3px;margin-bottom:3px;">
        <strong>A:</strong>
        <div><strong>${docente}</strong><br><span style="font-size:10px;color:#444;">${docenteCargo}</span></div>
      </div>
      <div style="display:grid;grid-template-columns:85px 1fr;gap:3px;margin-bottom:3px;">
        <strong>DE:</strong>
        <div><strong>Univ. ${nombre}</strong> &nbsp;|&nbsp; R.U.: ${ru} &nbsp;|&nbsp; C.I.: ${ci}</div>
      </div>
      <div style="display:grid;grid-template-columns:85px 1fr;gap:3px;margin-bottom:3px;">
        <strong>REF.:</strong>
        <div><strong>INFORME ÚNICO DE PASANTÍA PRE-PROFESIONAL (${asignatura})</strong></div>
      </div>
      <div style="display:grid;grid-template-columns:85px 1fr;gap:3px;">
        <strong>FECHA:</strong>
        <div>${fechaDoc}</div>
      </div>
    </div>

    <p style="margin:0 0 8px;font-weight:bold;">Señor Docente Guía:</p>
    <p style="margin:0 0 10px;text-align:justify;text-indent:18px;">
      A tiempo de hacerle llegar un cordial y distinguido saludo, en cumplimiento a las normativas vigentes de la Carrera de Derecho de la Universidad Mayor de San Andrés, pongo a su consideración el presente <strong>Informe Único de Pasantía</strong>, el cual sintetiza y documenta pormenorizadamente las actividades, diligencias y labores técnico-jurídicas desarrolladas durante mi permanencia en calidad de Pasante en el Bufete de Abogados LexFive, bajo las siguientes especificaciones:
    </p>

    <div style="background:#f8f9fb;border:1px solid #d9dce1;border-radius:6px;padding:8px 12px;margin-bottom:12px;font-size:11px;">
      <div style="margin-bottom:3px;"><strong>• Institución Receptora:</strong> Bufete de Abogados LexFive (Área de Litigio, Asesoría Jurídica y Diligenciamiento Procesal).</div>
      <div style="margin-bottom:3px;"><strong>• Duración y Modalidad:</strong> ${duracion} (${modalidad} · Horario: ${horario}).</div>
      <div><strong>• Supervisión Forense:</strong> ${supervision}.</div>
    </div>

    <div style="font-weight:bold;font-size:12px;color:#0e1b2c;margin-bottom:4px;border-bottom:1px solid #d9dce1;padding-bottom:2px;">I. ANTECEDENTES Y MARCO NORMATIVO</div>
    <div style="white-space:pre-line;text-align:justify;font-size:11.5px;line-height:1.45;">${antecedentes}</div>
  `;

  // Desglosar semanas de actividades
  const semanasBlocks = actividades.split(/(?=\n?[I|V|X]+\.\s+[A-ZÁÉÍÓÚÑ\s]+SEMANA)/i).map(s => s.trim()).filter(Boolean);
  const paginasActividades = [];

  if (!semanasBlocks.length) {
    paginasActividades.push(`
      <div style="font-weight:bold;font-size:12px;color:#0e1b2c;margin-bottom:8px;border-bottom:1px solid #d9dce1;padding-bottom:2px;">II. DETALLE DE FUNCIONES REALIZADAS</div>
      <p style="margin:0 0 10px;text-align:justify;">A continuación se describen las funciones asignadas y ejecutadas:</p>
      <div style="white-space:pre-line;font-size:11px;line-height:1.4;">${esc(actividades)}</div>
    `);
  } else {
    // Si hay semanas, agrupamos de forma equilibrada (1 o 2 semanas por página)
    for (let idx = 0; idx < semanasBlocks.length; idx++) {
      const semContent = semanasBlocks[idx];
      paginasActividades.push(`
        <div style="font-weight:bold;font-size:12px;color:#0e1b2c;margin-bottom:8px;border-bottom:1px solid #d9dce1;padding-bottom:2px;">${idx === 0 ? 'II. DETALLE DE FUNCIONES REALIZADAS' : 'II. DETALLE DE FUNCIONES REALIZADAS (Continuación)'}</div>
        <div style="white-space:pre-line;font-size:10.5px;line-height:1.4;text-align:justify;">${esc(semContent)}</div>
      `);
    }
  }

  // PÁGINA DE CONCLUSIONES Y VISTO BUENO
  const pagConclusionesHTML = `
    <div style="font-weight:bold;font-size:12px;color:#0e1b2c;margin-bottom:8px;border-bottom:1px solid #d9dce1;padding-bottom:2px;">III. CONCLUSIONES Y VISTO BUENO</div>
    <p style="margin:0 0 10px;text-align:justify;text-indent:18px;">
      Habiendo concluido satisfactoriamente el ciclo programado de prácticas pre-profesionales, se establecen las siguientes conclusiones institucionales y valorativas:
    </p>

    <div style="white-space:pre-line;font-size:11px;line-height:1.45;text-align:justify;margin-bottom:16px;">${conclusiones}</div>

    <p style="margin:0 0 24px;text-align:justify;">
      Es cuanto tengo a bien informar a su autoridad en honor a la verdad, para los fines académicos consiguientes.
    </p>

    <div style="margin-top:auto;border:1px solid #d9dce1;border-radius:6px;padding:10px 14px;background:#fafbfc;">
      <div style="text-align:center;font-size:9px;font-weight:bold;letter-spacing:1px;color:#0e1b2c;margin-bottom:8px;">CONFORMIDAD INSTITUCIONAL Y VISTO BUENO</div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:20px;">
        <div style="text-align:center;flex:1;">
          <div style="min-height:50px;"></div>
          <div style="border-top:1.2px solid #0e1b2c;padding-top:4px;font-size:10px;font-weight:bold;color:#0e1b2c;">Univ. ${nombre}</div>
          <div style="font-size:8.5px;color:#5c6675;">Estudiante Pasante<br>R.U. ${ru} · C.I. ${ci}</div>
        </div>
        <div style="text-align:center;flex:1;">
          <div style="min-height:50px;"></div>
          <div style="border-top:1.2px solid #0e1b2c;padding-top:4px;font-size:10px;font-weight:bold;color:#0e1b2c;">V.º B.º Abogado(a) Patrocinante / Dirección</div>
          <div style="font-size:8.5px;color:#5c6675;">LexFive · Bufete de Abogados</div>
        </div>
      </div>
    </div>
  `;

  // PÁGINA DE ANEXOS
  const pagAnexosHTML = `
    <div style="font-weight:bold;font-size:12px;color:#0e1b2c;margin-bottom:8px;border-bottom:1px solid #d9dce1;padding-bottom:2px;">IV. ÍNDICE DE ANEXOS Y CONSTANCIAS DE RESPALDO</div>
    <p style="margin:0 0 12px;text-align:justify;text-indent:18px;">
      En calidad de respaldo fáctico y documental de las funciones desarrolladas, se acompañan los siguientes instrumentos forenses y acreditaciones oficiales:
    </p>

    <table style="width:100%;border-collapse:collapse;font-size:10.5px;margin-bottom:16px;">
      <thead>
        <tr style="background:#0e1b2c;color:#fff;">
          <th style="padding:5px 8px;border:1px solid #0e1b2c;width:35px;text-align:center;">N.º</th>
          <th style="padding:5px 10px;border:1px solid #0e1b2c;text-align:left;">Documento de Respaldo</th>
          <th style="padding:5px 8px;border:1px solid #0e1b2c;width:150px;text-align:center;">Estado / Verificación</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:6px;border:1px solid #d9dce1;text-align:center;font-weight:bold;">1</td>
          <td style="padding:6px;border:1px solid #d9dce1;"><strong>Nota Oficial de Designación de Pasantía</strong> emitida por el Instituto de Investigaciones, Seminarios y Tesis (IIST).</td>
          <td style="padding:6px;border:1px solid #d9dce1;text-align:center;">N.º ${notaDesig}</td>
        </tr>
        <tr style="background:#f8f9fb;">
          <td style="padding:6px;border:1px solid #d9dce1;text-align:center;font-weight:bold;">2</td>
          <td style="padding:6px;border:1px solid #d9dce1;"><strong>Carta de Aceptación de Pasantía</strong> emitida por la Dirección del Bufete LexFive.</td>
          <td style="padding:6px;border:1px solid #d9dce1;text-align:center;">Original adjunto</td>
        </tr>
        <tr>
          <td style="padding:6px;border:1px solid #d9dce1;text-align:center;font-weight:bold;">3</td>
          <td style="padding:6px;border:1px solid #d9dce1;"><strong>Certificado Oficial de Pasantía Jurídica</strong> refrendado por LexFive con QR verificable.</td>
          <td style="padding:6px;border:1px solid #d9dce1;text-align:center;">Ref. ${esc(d.ref || 'Emitido')}</td>
        </tr>
        <tr style="background:#f8f9fb;">
          <td style="padding:6px;border:1px solid #d9dce1;text-align:center;font-weight:bold;">4</td>
          <td style="padding:6px;border:1px solid #d9dce1;"><strong>Hoja de Control de Asistencia y Permanencia</strong> con registro diario rubricado.</td>
          <td style="padding:6px;border:1px solid #d9dce1;text-align:center;">20 jornadas / 100%</td>
        </tr>
        <tr>
          <td style="padding:6px;border:1px solid #d9dce1;text-align:center;font-weight:bold;">5</td>
          <td style="padding:6px;border:1px solid #d9dce1;"><strong>Muestrario Forense</strong> (Borradores de memoriales, fichas procesales y copias de actuaciones).</td>
          <td style="padding:6px;border:1px solid #d9dce1;text-align:center;">Compulsa adjunta</td>
        </tr>
        <tr style="background:#f8f9fb;">
          <td style="padding:6px;border:1px solid #d9dce1;text-align:center;font-weight:bold;">6</td>
          <td style="padding:6px;border:1px solid #d9dce1;"><strong>Registro Fotográfico de Prácticas Forenses</strong> (Despacho, estrados judiciales y notarías).</td>
          <td style="padding:6px;border:1px solid #d9dce1;text-align:center;">${fotos.length ? `${fotos.length} fotografías` : 'Anexo fotográfico'}</td>
        </tr>
      </tbody>
    </table>

    <div style="background:#fdfaf2;border:1px solid #e7d3a1;border-radius:6px;padding:10px 14px;font-size:10.5px;color:#7a5a18;">
      <strong>Nota Institucional:</strong> La documentación precedentemente enunciada se adjunta correlativamente al expediente académico del pasante para su compulsa por el tribunal evaluador y la emisión de la nota de aprobación final.
    </div>
  `;

  // PÁGINAS DE FOTOGRAFÍAS (2 fotos por página Carta)
  const paginasFotos = [];
  if (fotos.length) {
    for (let f = 0; f < fotos.length; f += 2) {
      const f1 = fotos[f];
      const f2 = fotos[f + 1];
      const itemFoto = (foto, num) => `
        <div style="margin-bottom:14px;text-align:center;">
          <div style="height:8.8cm;border:1px solid #d9dce1;border-radius:6px;overflow:hidden;background:#f5f6f8;display:flex;align-items:center;justify-content:center;">
            <img src="${foto.src}" style="max-width:100%;max-height:100%;object-fit:contain;" alt="">
          </div>
          <div style="font-size:9.5px;color:#333;margin-top:4px;font-family:Arial,sans-serif;">
            <strong>Fotografía N.º ${num}:</strong> ${esc(foto.pie || 'Desarrollo de actividades forenses en Bufete LexFive.')}
          </div>
        </div>
      `;

      paginasFotos.push(`
        <div style="font-weight:bold;font-size:12px;color:#0e1b2c;margin-bottom:8px;border-bottom:1px solid #d9dce1;padding-bottom:2px;">ANEXO: REGISTRO FOTOGRÁFICO DE ACTIVIDADES</div>
        ${itemFoto(f1, f + 1)}
        ${f2 ? itemFoto(f2, f + 2) : ''}
      `);
    }
  }

  const todasLasPaginas = [pag1HTML, ...paginasActividades, pagConclusionesHTML, pagAnexosHTML, ...paginasFotos];
  const total = todasLasPaginas.length;

  return todasLasPaginas.map((html, i) => renderPaginaHoja({
    model,
    logoSrc,
    numPag: i + 1,
    totalPags: total,
    contentHTML: html,
    wmOp
  })).join('');
}

// Genera el documento Word (.doc) multipágina con encabezado y pie de página de Microsoft Word
function buildInformeWordDocument(d, logoSrc) {
  const nombre = esc(d.nombre || '___________________');
  const ci = esc(d.ci || '—');
  const ru = esc(d.ru || d.registro_universitario || '—');
  const uni = esc(d.universidad || 'Universidad Mayor de San Andrés (UMSA)');
  const carrera = esc(d.carrera_plan || 'Carrera de Derecho – Plan de Estudios 2017');
  const asignatura = esc(d.asignatura || 'CJR-410 Pasantía I');
  const notaDesig = esc(d.nota_designacion || 'IIST-001/2026');
  const fechaNota = esc(d.fecha_nota_designacion || fechaLarga(d.fecha_emision || d.fecha));
  const modalidad = esc(d.modalidad || '4 semanas a medio tiempo (4 horas diarias)');
  const horario = esc(d.horario || '14:00 a 18:00');
  const duracion = esc(d.duracion || modalidad);
  const fechaDoc = fechaLarga(d.fecha || hoyISO());
  const docente = esc(d.docente_guia || 'Dr. Franklin Rubén Pareja Aliaga');
  const docenteCargo = esc(d.docente_cargo || 'Docente de la Carrera de Derecho – Guía de la Materia de Pasantía');
  const supervision = esc(d.supervision || 'Abogado(a) Patrocinante – LexFive Bufete de Abogados');
  const antecedentes = esc(d.antecedentes || `1) Guía de Procedimiento para Pasantías en la Carrera de Derecho, aprobada mediante Resolución del Honorable Consejo Universitario N.º 104/2016.\n2) Nota de Designación de Pasantía N.º ${notaDesig} de fecha ${fechaNota}.`);
  const actividades = d.actividades || '';
  const conclusiones = esc(d.conclusiones || generarConclusionesTexto(d.genero));
  const fotos = Array.isArray(d.fotos) ? d.fotos : [];

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>Informe Único de Pasantía - ${nombre}</title>
<!--[if gte mso 9]>
<xml>
 <w:WordDocument>
  <w:View>Print</w:View>
  <w:Zoom>100</w:Zoom>
  <w:DoNotOptimizeForBrowser/>
 </w:WordDocument>
</xml>
<![endif]-->
<style>
  @page Section1 {
    size: 21.59cm 27.94cm;
    margin: 2.5cm 2.2cm 2.5cm 2.2cm;
    mso-header-margin: 1.2cm;
    mso-footer-margin: 1.2cm;
    mso-header: h1;
    mso-footer: f1;
  }
  div.Section1 { page: Section1; }
  table#headerTable { width: 100%; border-bottom: 2pt solid #c2a25a; margin-bottom: 15pt; }
  table#footerTable { width: 100%; border-top: 1.5pt solid #c2a25a; font-family: Arial, sans-serif; font-size: 8.5pt; color: #555; }
  body { font-family: 'Times New Roman', Georgia, serif; font-size: 12pt; line-height: 1.45; color: #000; }
  h1 { font-size: 15pt; text-align: center; color: #0e1b2c; margin: 0 0 4pt; text-transform: uppercase; }
  h2 { font-size: 12pt; font-weight: bold; color: #0e1b2c; border-bottom: 1pt solid #d9dce1; padding-bottom: 3pt; margin: 16pt 0 6pt; }
  p { margin: 0 0 8pt; text-align: justify; text-indent: 18pt; }
  .p-noint { margin: 0 0 8pt; text-align: justify; text-indent: 0; }
  .table-data { width: 100%; border-collapse: collapse; margin: 8pt 0 14pt; }
  .table-data th, .table-data td { border: 1pt solid #444; padding: 5pt 7pt; font-size: 10pt; text-align: left; }
  .table-data th { background: #f2f2f2; font-weight: bold; }
  .page-break { page-break-before: always; }
</style>
</head>
<body>
<div class="Section1">

<!-- Encabezado de Word -->
<table id="headerTable">
  <tr>
    <td style="width:70px;vertical-align:middle;padding-bottom:6pt;">
      ${logoSrc ? `<img src="${logoSrc}" width="60" height="60" alt="LexFive">` : ''}
    </td>
    <td style="vertical-align:middle;padding-bottom:6pt;">
      <div style="font-size:18pt;font-weight:bold;color:#0e1b2c;font-family:Georgia,serif;">Lex<span style="color:#c2a25a;">Five</span></div>
      <div style="font-size:9pt;letter-spacing:2pt;color:#a8853c;font-family:Arial,sans-serif;text-transform:uppercase;">Bufete de Abogados · Área de Litigio y Práctica Forense</div>
      <div style="font-size:8pt;color:#666;font-family:Arial,sans-serif;">Av. Alfredo Franco Valle 708-51, Edif. Real Of. A-6 · El Alto - Bolivia · Tel: +591 78360469</div>
    </td>
  </tr>
</table>

<!-- Pie de página de Word -->
<table id="footerTable">
  <tr>
    <td style="text-align:left;padding-top:4pt;">LexFive Bufete de Abogados · El Alto, Bolivia</td>
    <td style="text-align:right;padding-top:4pt;">Página <span style="mso-field-code:' PAGE '"></span> de <span style="mso-field-code:' NUMPAGES '"></span></td>
  </tr>
</table>

<h1>INFORME ÚNICO DE PASANTÍA PRE-PROFESIONAL</h1>
<div style="text-align:center;font-size:11pt;color:#a8853c;font-weight:bold;margin-bottom:14pt;">${uni} · ${carrera}</div>

<table style="width:100%;border-top:1.5pt solid #0e1b2c;border-bottom:1.5pt solid #0e1b2c;margin-bottom:14pt;font-size:11pt;">
  <tr><td style="width:70pt;font-weight:bold;padding:2pt 0;">A:</td><td><strong>${docente}</strong><br><span style="font-size:9.5pt;color:#444;">${docenteCargo}</span></td></tr>
  <tr><td style="font-weight:bold;padding:2pt 0;">DE:</td><td><strong>Univ. ${nombre}</strong> &nbsp;|&nbsp; R.U.: ${ru} &nbsp;|&nbsp; C.I.: ${ci}</td></tr>
  <tr><td style="font-weight:bold;padding:2pt 0;">REF.:</td><td><strong>INFORME ÚNICO DE PASANTÍA PRE-PROFESIONAL (${asignatura})</strong></td></tr>
  <tr><td style="font-weight:bold;padding:2pt 0;">FECHA:</td><td>${fechaDoc}</td></tr>
</table>

<p class="p-noint"><strong>Señor Docente Guía:</strong></p>
<p>A tiempo de hacerle llegar un cordial y distinguido saludo, en cumplimiento a las normativas de la Carrera de Derecho de la Universidad Mayor de San Andrés, pongo a su consideración el presente <strong>Informe Único de Pasantía</strong> bajo las siguientes características institucionales:</p>

<table class="table-data">
  <tr><th style="width:28%;">Institución Receptora:</th><td>Bufete de Abogados "LexFive" (Área de Litigio y Asesoría Jurídica)</td></tr>
  <tr><th>Duración y Modalidad:</th><td>${duracion} (${modalidad} · Horario: ${horario})</td></tr>
  <tr><th>Supervisión Forense:</th><td>${supervision}</td></tr>
</table>

<h2>I. ANTECEDENTES Y MARCO NORMATIVO</h2>
<div style="white-space:pre-line;font-size:11pt;line-height:1.45;">${antecedentes}</div>

<div class="page-break"></div>

<h2>II. DETALLE DE FUNCIONES Y ACTIVIDADES REALIZADAS</h2>
<p class="p-noint">Las funciones forenses se ejecutaron de lunes a viernes bajo el cronograma oficial coordinado con el despacho:</p>
<div style="white-space:pre-line;font-size:10.5pt;line-height:1.4;">${esc(actividades)}</div>

<div class="page-break"></div>

<h2>III. CONCLUSIONES Y VISTO BUENO INSTITUCIONAL</h2>
<p class="p-noint">Habiendo completado el período de prácticas, se formulan las siguientes conclusiones:</p>
<div style="white-space:pre-line;font-size:11pt;line-height:1.45;">${conclusiones}</div>

<p style="margin-top:20pt;">Es cuanto se informa en honor a la verdad y para los fines académicos consiguientes.</p>

<table style="width:100%;margin-top:40pt;border-collapse:collapse;">
  <tr>
    <td style="width:50%;text-align:center;padding:0 15pt;vertical-align:bottom;">
      <div style="border-top:1.5pt solid #000;padding-top:4pt;font-weight:bold;font-size:10pt;">Univ. ${nombre}</div>
      <div style="font-size:9pt;color:#555;">Estudiante Pasante<br>R.U. ${ru} · C.I. ${ci}</div>
    </td>
    <td style="width:50%;text-align:center;padding:0 15pt;vertical-align:bottom;">
      <div style="border-top:1.5pt solid #000;padding-top:4pt;font-weight:bold;font-size:10pt;">V.º B.º Abogado(a) Patrocinante / Dirección</div>
      <div style="font-size:9pt;color:#555;">LexFive · Bufete de Abogados</div>
    </td>
  </tr>
</table>

<div class="page-break"></div>

<h2>IV. ÍNDICE DE ANEXOS Y CONSTANCIAS DE RESPALDO</h2>
<p class="p-noint">Se adjuntan al presente informe los instrumentos de respaldo correspondientes:</p>

<table class="table-data">
  <tr><th>N.º</th><th>Documento</th><th>Verificación</th></tr>
  <tr><td>1</td><td>Nota Oficial de Designación de Pasantía</td><td>N.º ${notaDesig}</td></tr>
  <tr><td>2</td><td>Carta de Aceptación de Pasantía de LexFive</td><td>Original adjunto</td></tr>
  <tr><td>3</td><td>Certificado Oficial de Pasantía Jurídica LexFive</td><td>Ref. ${esc(d.ref || 'Verificable por QR')}</td></tr>
  <tr><td>4</td><td>Hoja de Control de Asistencia y Permanencia</td><td>Registro completo de 20 jornadas</td></tr>
  <tr><td>5</td><td>Muestrario de Actuaciones Forenses</td><td>Compulsa adjunta</td></tr>
  <tr><td>6</td><td>Registro Fotográfico de Prácticas Forenses</td><td>${fotos.length ? `${fotos.length} fotografías adjuntas` : 'Anexo fotográfico'}</td></tr>
</table>

${fotos.length ? `
  <div class="page-break"></div>
  <h2>ANEXO: REGISTRO FOTOGRÁFICO DE ACTIVIDADES</h2>
  ${fotos.map((f, i) => `
    <div style="text-align:center;margin-bottom:20pt;">
      <img src="${f.src}" style="max-width:16cm;max-height:10cm;" alt=""><br>
      <span style="font-size:9pt;font-family:Arial,sans-serif;"><strong>Fotografía N.º ${i + 1}:</strong> ${esc(f.pie || 'Práctica forense en LexFive')}</span>
    </div>
  `).join('')}
` : ''}

</div>
</body>
</html>`;
}

export async function renderInforme() {
  loading();
  try { await withTimeout(ensureImgCache(), 8000, 'imágenes'); } catch (e) {}
  try { await withTimeout(hydrateBranding(), 8000, 'branding'); } catch (e) {}
  const logoSrc = urlAbs(brandLogoSrc(pickActiveLogo(localStorage.getItem('lexfive_logo'))));
  const selloSrc = urlAbs(brandSelloSrc(pickActiveSello(localStorage.getItem('lexfive_sello'))));
  
  // Revisar si viene precargado desde certificados
  let precargado = null;
  try {
    const raw = localStorage.getItem('lexfive_precargar_pasantia');
    if (raw) {
      precargado = JSON.parse(raw);
      localStorage.removeItem('lexfive_precargar_pasantia');
    }
  } catch (e) {}

  const certsPasantia = await fetchCertificadosPasantia();
  const sv = (Draft.load('informe') || {}).data || {};

  // Valores iniciales
  const V = Object.assign({
    in_nombre: 'Luis Joel Fernandez Pacosillo',
    in_ci: '8492019 LP',
    in_ru: '1846019',
    in_genero: 'masculino',
    in_uni: 'Universidad Mayor de San Andrés (UMSA)',
    in_carrera: 'Carrera de Derecho – Plan de Estudios 2017',
    in_asignatura: 'CJR-410 Pasantía I',
    in_nota_desig: 'IIST-001/2026',
    in_fecha_nota: hoyISO(),
    in_fecha_inicio: hoyISO(),
    in_fecha_fin: hoyISO(),
    in_modalidad: '4 semanas a medio tiempo (4 horas diarias)',
    in_horario: '14:00 a 18:00',
    in_docente: 'Dr. Franklin Rubén Pareja Aliaga',
    in_docente_cargo: 'Docente de la Carrera de Derecho – Guía de la Materia de Pasantía',
    in_supervision: 'Abogado(a) Patrocinante – LexFive Bufete de Abogados',
    in_fecha_pres: hoyISO(),
    in_antecedentes: `1) Guía de Procedimiento para Pasantías en la Carrera de Derecho, aprobada mediante Resolución del Honorable Consejo Universitario N.º 104/2016.\n2) Nota de Designación de Pasantía N.º IIST-001/2026 de fecha ${fechaLarga(hoyISO())}.`,
    in_actividades: '',
    in_conclusiones: '',
    in_fotos: []
  }, sv);

  if (precargado) {
    V.in_nombre = precargado.nombre || V.in_nombre;
    V.in_ci = precargado.ci || V.in_ci;
    V.in_ru = precargado.registro_universitario || V.in_ru;
    V.in_genero = precargado.genero || V.in_genero;
    V.in_uni = precargado.universidad || V.in_uni;
    V.in_carrera = precargado.carrera_plan || V.in_carrera;
    V.in_asignatura = precargado.asignatura || V.in_asignatura;
    V.in_nota_desig = precargado.nota_designacion || V.in_nota_desig;
    V.in_fecha_nota = precargado.fecha_nota_designacion ? precargado.fecha_nota_designacion.slice(0, 10) : V.in_fecha_nota;
    V.in_fecha_inicio = precargado.fecha_inicio ? precargado.fecha_inicio.slice(0, 10) : V.in_fecha_inicio;
    V.in_fecha_fin = precargado.fecha_fin ? precargado.fecha_fin.slice(0, 10) : V.in_fecha_fin;
    V.in_modalidad = precargado.modalidad || V.in_modalidad;
    V.in_horario = precargado.horario || V.in_horario;
    V.in_ref = precargado.ref || '';
    V.in_actividades = generarActividadesTexto(V.in_fecha_inicio, V.in_fecha_fin, V.in_modalidad);
    V.in_conclusiones = generarConclusionesTexto(V.in_genero);
  } else if (!V.in_actividades) {
    V.in_actividades = generarActividadesTexto(V.in_fecha_inicio, V.in_fecha_fin, V.in_modalidad);
  }
  if (!V.in_conclusiones) {
    V.in_conclusiones = generarConclusionesTexto(V.in_genero);
  }

  let fotosArray = Array.isArray(V.in_fotos) ? V.in_fotos : [];

  const campo = (id, label, val, ph) => `<div class="field"><label>${label}</label><input id="${id}" value="${esc(val)}" placeholder="${esc(ph || '')}"></div>`;
  const campoArea = (id, label, val, rows) => `<div class="field"><label>${label}</label><textarea id="${id}" rows="${rows || 3}" style="font-family:inherit">${esc(val)}</textarea></div>`;

  content().innerHTML = `
    <div class="card"><div class="card__body">
      <h3 class="intro-title">Informe Único de Pasantía</h3>
      <p class="cell-sub">Documento oficial multipágina con membrete institucional de LexFive en todas las hojas. Formato homologado para la Carrera de Derecho UMSA y universidades públicas o privadas. Descargable en PDF (Carta) y Microsoft Word (.doc).</p>
    </div></div>

    <!-- 1. IMPORTACIÓN DESDE CERTIFICADOS -->
    <div class="card">
      <div class="card__head"><h3>📥 Cargar datos desde Certificado de Pasantía</h3></div>
      <div class="card__body">
        <div class="field">
          <label>Seleccionar certificado de pasantía emitido</label>
          <select id="in_sel_cert">
            <option value="">-- Elija un pasante registrado para autollenar todos los campos --</option>
            ${certsPasantia.map(c => `
              <option value="${esc(c.id)}">${esc(c.nombre)} (${esc(c.ref)}) — ${esc(c.carrera_plan || 'Derecho')}</option>
            `).join('')}
          </select>
          <p class="cell-sub" style="margin-top:4px;">Al elegir un pasante se rellenan automáticamente C.I., R.U., género, universidad, asignatura, notas, fechas y actividades.</p>
        </div>
      </div>
    </div>

    <!-- 2. DATOS DEL PASANTE Y ASIGNATURA -->
    <div class="card">
      <div class="card__head"><h3>📋 Datos del Pasante y Asignatura</h3></div>
      <div class="card__body">
        <div class="cert-form">
          ${campo('in_nombre', 'Nombre completo del pasante', V.in_nombre)}
          ${campo('in_ci', 'Cédula de Identidad (C.I.)', V.in_ci)}
          ${campo('in_ru', 'Registro Universitario (R.U.)', V.in_ru)}
          <div class="field"><label>Género / Tratamiento</label>
            <select id="in_genero">
              <option value="femenino" ${V.in_genero === 'femenino' ? 'selected' : ''}>Femenino (la universitaria / la pasante)</option>
              <option value="masculino" ${V.in_genero === 'masculino' ? 'selected' : ''}>Masculino (el universitario / el pasante)</option>
              <option value="neutro" ${V.in_genero === 'neutro' ? 'selected' : ''}>Neutro (el(la) universitario(a))</option>
            </select>
          </div>
          ${campo('in_uni', 'Universidad', V.in_uni)}
          ${campo('in_carrera', 'Carrera y Plan de Estudios', V.in_carrera)}
          ${campo('in_asignatura', 'Asignatura', V.in_asignatura)}
          ${campo('in_nota_desig', 'N.º Nota de Designación', V.in_nota_desig)}
          <div class="field"><label>Fecha de Nota de Designación</label><input id="in_fecha_nota" type="date" value="${esc(V.in_fecha_nota)}"></div>
          <div class="field"><label>Fecha de inicio</label><input id="in_fecha_inicio" type="date" value="${esc(V.in_fecha_inicio)}"></div>
          <div class="field"><label>Fecha de finalización</label><input id="in_fecha_fin" type="date" value="${esc(V.in_fecha_fin)}"></div>
          <div class="field"><label>Modalidad</label>
            <select id="in_modalidad">
              <option value="4 semanas a medio tiempo (4 horas diarias)" ${V.in_modalidad.includes('4 semanas') ? 'selected' : ''}>4 semanas a medio tiempo (4 h/día - 20 días)</option>
              <option value="2 semanas a tiempo completo (8 horas diarias)" ${V.in_modalidad.includes('2 semanas') ? 'selected' : ''}>2 semanas a tiempo completo (8 h/día - 10 días)</option>
            </select>
          </div>
          ${campo('in_horario', 'Horario', V.in_horario)}
          ${campo('in_ref_cert', 'N.º Referencia del Certificado (Anexo 3)', V.in_ref || 'LF-2026-00000')}
        </div>
      </div>
    </div>

    <!-- 3. DOCENTE GUÍA Y SUPERVISIÓN -->
    <div class="card">
      <div class="card__head"><h3>🎓 Destinatario, Docente Guía y Supervisión</h3></div>
      <div class="card__body">
        <div class="cert-form">
          ${campo('in_docente', 'Docente Guía / Destinatario (A:)', V.in_docente)}
          ${campo('in_docente_cargo', 'Cargo del Docente Guía', V.in_docente_cargo)}
          ${campo('in_supervision', 'Supervisión Institucional en Bufete', V.in_supervision)}
          <div class="field"><label>Fecha de presentación del informe</label><input id="in_fecha_pres" type="date" value="${esc(V.in_fecha_pres)}"></div>
        </div>
        ${campoArea('in_antecedentes', 'Antecedentes y Resoluciones Universitarias', V.in_antecedentes, 3)}
      </div>
    </div>

    <!-- 4. ACTIVIDADES DÍA POR DÍA -->
    <div class="card">
      <div class="card__head">
        <h3>📅 Detalle de Actividades (Día por Día)</h3>
        <button class="btn btn--ghost btn--sm" id="in_btn_regen_act" type="button">🔄 Regenerar actividades automáticas</button>
      </div>
      <div class="card__body">
        <p class="cell-sub" style="margin-bottom:8px;">Actividades cronológicas agrupadas por semana con 3 funciones forenses por día sincronizadas con el plan oficial UMSA. Puede modificarlas libremente:</p>
        ${campoArea('in_actividades', 'Actividades por semana y día', V.in_actividades, 16)}
      </div>
    </div>

    <!-- 5. CONCLUSIONES -->
    <div class="card">
      <div class="card__head">
        <h3>✍️ Conclusiones y Valoración Forense</h3>
        <button class="btn btn--ghost btn--sm" id="in_btn_regen_conc" type="button">🔄 Regenerar conclusiones</button>
      </div>
      <div class="card__body">
        ${campoArea('in_conclusiones', 'Tres conclusiones desarrolladas (adaptadas al género)', V.in_conclusiones, 8)}
      </div>
    </div>

    <!-- 6. REGISTRO FOTOGRÁFICO (ANEXOS) -->
    <div class="card">
      <div class="card__head"><h3>📷 Anexo Fotográfico (Opcional)</h3></div>
      <div class="card__body">
        <p class="cell-sub">Suba fotografías de las prácticas en despacho, juzgados o notarías. Se integran al final del informe en hojas membretadas (2 fotos por página Carta):</p>
        <div style="margin:10px 0;">
          <input type="file" id="in_file_fotos" multiple accept="image/*" class="btn btn--ghost">
        </div>
        <div id="in_fotos_grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(220px, 1fr));gap:12px;margin-top:10px;"></div>
      </div>
    </div>

    <!-- BARRA DE ACCIONES Y DESCARGAS -->
    <div class="card"><div class="card__body">
      <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-end;">
        <div class="field" style="margin:0;min-width:230px"><label>Modelo de hoja membretada</label>
          <select id="in_modelo">${MEMBRETE_MODELOS.map(m => `<option value="${m.id}">${esc(m.nombre)}</option>`).join('')}</select>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn btn--primary" id="in_btn_pdf">${ICON.doc} Descargar PDF Multipágina</button>
          <button class="btn btn--ghost" id="in_btn_print">Imprimir</button>
          <button class="btn btn--ghost" id="in_btn_word">Descargar Word (.doc)</button>
          <button class="btn" id="in_btn_guardar">Guardar en la nube</button>
          <button class="btn btn--ghost" id="in_btn_limpiar" type="button">Limpiar</button>
        </div>
      </div>
      <div class="field" style="margin:14px 0 0;max-width:440px">
        <label>Intensidad de la marca de agua (logo de fondo)</label>
        <div style="display:flex;align-items:center;gap:10px">
          <input type="range" id="in_wm" min="3" max="40" step="1" value="${wmOpacityActual()}" style="flex:1">
          <output id="in_wm_out" style="min-width:42px;text-align:right">${wmOpacityActual()}%</output>
        </div>
      </div>
    </div></div>

    <!-- INFORMES GUARDADOS -->
    <div class="card">
      <div class="card__head"><h3>📁 Informes Guardados en la Nube</h3></div>
      <div class="card__body--flush"><div id="inGuardados"></div></div>
    </div>

    <!-- VISTA PREVIA MULTIPÁGINA -->
    <div class="card">
      <div class="card__head"><h3>👁️ Vista previa multipágina (Hojas Carta membretadas)</h3></div>
      <div class="card__body" style="background:#4b5563;padding:24px 12px;border-radius:0 0 10px 10px;overflow-x:auto;">
        <div id="inPreview" style="display:flex;flex-direction:column;align-items:center;"></div>
      </div>
    </div>
  `;

  const val = id => ($('#' + id) ? $('#' + id).value : '');
  const recolectar = () => ({
    nombre: val('in_nombre'),
    ci: val('in_ci'),
    ru: val('in_ru'),
    genero: val('in_genero') || 'femenino',
    universidad: val('in_uni'),
    carrera_plan: val('in_carrera'),
    asignatura: val('in_asignatura'),
    nota_designacion: val('in_nota_desig'),
    fecha_nota_designacion: val('in_fecha_nota'),
    fecha_inicio: val('in_fecha_inicio'),
    fecha_fin: val('in_fecha_fin'),
    modalidad: val('in_modalidad'),
    horario: val('in_horario'),
    ref: val('in_ref_cert'),
    docente_guia: val('in_docente'),
    docente_cargo: val('in_docente_cargo'),
    supervision: val('in_supervision'),
    fecha: val('in_fecha_pres'),
    antecedentes: val('in_antecedentes'),
    actividades: val('in_actividades'),
    conclusiones: val('in_conclusiones'),
    fotos: fotosArray
  });

  const pintar = () => {
    const d = recolectar();
    $('#inPreview').innerHTML = buildPaginasInforme(d, logoSrc, modeloMembrete(), wmOpacityActual() / 100);
  };

  const pintarFotosGrid = () => {
    const grid = $('#in_fotos_grid');
    if (!grid) return;
    if (!fotosArray.length) {
      grid.innerHTML = '<p class="cell-sub" style="grid-column:1/-1;">No hay fotos cargadas aún.</p>';
      return;
    }
    grid.innerHTML = fotosArray.map((f, i) => `
      <div style="border:1px solid var(--line);border-radius:8px;padding:8px;background:var(--card-bg, rgba(255,255,255,0.05));position:relative;">
        <img src="${f.src}" style="width:100%;height:120px;object-fit:cover;border-radius:4px;" alt="">
        <input class="js-foto-pie" data-i="${i}" value="${esc(f.pie || '')}" placeholder="Pie de foto..." style="width:100%;font-size:.8rem;margin-top:6px;">
        <button class="btn btn--danger btn--sm js-foto-del" data-i="${i}" style="position:absolute;top:12px;right:12px;padding:2px 6px;" type="button">&times;</button>
      </div>
    `).join('');

    grid.querySelectorAll('.js-foto-pie').forEach(inp => {
      inp.oninput = () => { fotosArray[Number(inp.dataset.i)].pie = inp.value; pintar(); saveDraft(); };
    });
    grid.querySelectorAll('.js-foto-del').forEach(btn => {
      btn.onclick = () => { fotosArray.splice(Number(btn.dataset.i), 1); pintarFotosGrid(); pintar(); saveDraft(); };
    });
  };

  // Carga de fotografías
  const fInp = $('#in_file_fotos');
  if (fInp) {
    fInp.onchange = (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      let count = 0;
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          fotosArray.push({ src: ev.target.result, pie: `Práctica forense en LexFive (${file.name.slice(0, 20)})` });
          count++;
          if (count === files.length) {
            pintarFotosGrid();
            pintar();
            saveDraft();
            toast(`${count} fotografía(s) agregada(s).`, 'success');
          }
        };
        reader.readAsDataURL(file);
      });
      fInp.value = '';
    };
  }

  function saveDraft() {
    Draft.save('informe', {
      in_nombre: val('in_nombre'),
      in_ci: val('in_ci'),
      in_ru: val('in_ru'),
      in_genero: val('in_genero'),
      in_uni: val('in_uni'),
      in_carrera: val('in_carrera'),
      in_asignatura: val('in_asignatura'),
      in_nota_desig: val('in_nota_desig'),
      in_fecha_nota: val('in_fecha_nota'),
      in_fecha_inicio: val('in_fecha_inicio'),
      in_fecha_fin: val('in_fecha_fin'),
      in_modalidad: val('in_modalidad'),
      in_horario: val('in_horario'),
      in_ref: val('in_ref_cert'),
      in_docente: val('in_docente'),
      in_docente_cargo: val('in_docente_cargo'),
      in_supervision: val('in_supervision'),
      in_fecha_pres: val('in_fecha_pres'),
      in_antecedentes: val('in_antecedentes'),
      in_actividades: val('in_actividades'),
      in_conclusiones: val('in_conclusiones'),
      in_fotos: fotosArray
    });
  }

  // Eventos de campos
  [
    'in_nombre', 'in_ci', 'in_ru', 'in_uni', 'in_carrera', 'in_asignatura',
    'in_nota_desig', 'in_horario', 'in_ref_cert', 'in_docente',
    'in_docente_cargo', 'in_supervision'
  ].forEach(id => {
    const el = $('#' + id); if (el) el.oninput = () => { pintar(); saveDraft(); };
  });

  ['in_genero', 'in_fecha_nota', 'in_fecha_inicio', 'in_fecha_fin', 'in_modalidad', 'in_fecha_pres'].forEach(id => {
    const el = $('#' + id);
    if (el) {
      el.onchange = () => {
        if (id === 'in_genero') {
          $('#in_conclusiones').value = generarConclusionesTexto(val('in_genero'));
        }
        if (id === 'in_fecha_inicio' || id === 'in_fecha_fin' || id === 'in_modalidad') {
          $('#in_actividades').value = generarActividadesTexto(val('in_fecha_inicio'), val('in_fecha_fin'), val('in_modalidad'));
        }
        pintar();
        saveDraft();
      };
    }
  });

  ['in_antecedentes', 'in_actividades', 'in_conclusiones'].forEach(id => {
    const el = $('#' + id); if (el) el.oninput = () => { pintar(); saveDraft(); };
  });

  // Selector de importación desde certificado emitido
  const selCert = $('#in_sel_cert');
  if (selCert) {
    selCert.onchange = () => {
      const c = certsPasantia.find(x => x.id === selCert.value);
      if (!c) return;
      if ($('#in_nombre')) $('#in_nombre').value = c.nombre || '';
      if ($('#in_ci')) $('#in_ci').value = c.ci || '';
      if ($('#in_ru')) $('#in_ru').value = c.registro_universitario || '';
      if ($('#in_genero') && c.genero) $('#in_genero').value = c.genero;
      if ($('#in_uni')) $('#in_uni').value = c.universidad || 'Universidad Mayor de San Andrés (UMSA)';
      if ($('#in_carrera')) $('#in_carrera').value = c.carrera_plan || 'Carrera de Derecho – Plan de Estudios 2017';
      if ($('#in_asignatura')) $('#in_asignatura').value = c.asignatura || 'CJR-410 Pasantía I';
      if ($('#in_nota_desig')) $('#in_nota_desig').value = c.nota_designacion || '';
      if ($('#in_fecha_nota')) $('#in_fecha_nota').value = (c.fecha_nota_designacion || hoyISO()).slice(0, 10);
      if ($('#in_fecha_inicio')) $('#in_fecha_inicio').value = (c.fecha_inicio || hoyISO()).slice(0, 10);
      if ($('#in_fecha_fin')) $('#in_fecha_fin').value = (c.fecha_fin || hoyISO()).slice(0, 10);
      if ($('#in_modalidad') && c.modalidad) $('#in_modalidad').value = c.modalidad;
      if ($('#in_horario')) $('#in_horario').value = c.horario || '14:00 a 18:00';
      if ($('#in_ref_cert')) $('#in_ref_cert').value = c.ref || '';

      $('#in_antecedentes').value = `1) Guía de Procedimiento para Pasantías en la Carrera de Derecho, aprobada mediante Resolución del Honorable Consejo Universitario N.º 104/2016.\n2) Nota de Designación de Pasantía N.º ${c.nota_designacion || 'IIST-001/2026'} de fecha ${fechaLarga(c.fecha_nota_designacion || c.fecha_emision)}.`;
      $('#in_actividades').value = generarActividadesTexto(val('in_fecha_inicio'), val('in_fecha_fin'), val('in_modalidad'));
      $('#in_conclusiones').value = generarConclusionesTexto(val('in_genero'));

      pintar();
      saveDraft();
      toast(`Datos de ${c.nombre} importados al informe.`, 'success');
    };
  }

  // Botones de regeneración
  $('#in_btn_regen_act').onclick = () => {
    $('#in_actividades').value = generarActividadesTexto(val('in_fecha_inicio'), val('in_fecha_fin'), val('in_modalidad'));
    pintar();
    saveDraft();
    toast('Actividades cronológicas regeneradas.', 'success');
  };

  $('#in_btn_regen_conc').onclick = () => {
    $('#in_conclusiones').value = generarConclusionesTexto(val('in_genero'));
    pintar();
    saveDraft();
    toast('Conclusiones adaptadas y regeneradas.', 'success');
  };

  // Modelo de membrete y marca de agua
  const inModelo = $('#in_modelo');
  if (inModelo) {
    inModelo.value = modeloMembrete();
    inModelo.onchange = () => { setModeloMembrete(inModelo.value); pintar(); };
  }
  const wmS = $('#in_wm'), wmOut = $('#in_wm_out');
  if (wmS) {
    wmS.addEventListener('input', () => {
      localStorage.setItem('lexfive_wm_op', wmS.value);
      applyWmOpacity(wmS.value);
      if (wmOut) wmOut.textContent = wmS.value + '%';
      pintar();
    });
    wmS.addEventListener('change', () => { pushBranding(); });
  }

  // DESCARGA PDF MULTIPÁGINA VÍA HTML2PDF
  $('#in_btn_pdf').onclick = () => {
    const d = recolectar();
    if (!d.nombre.trim()) { toast('Escriba el nombre del pasante.', 'error'); return; }
    toast('Generando PDF Multipágina del Informe...', 'info');

    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'fixed';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    tempDiv.style.width = '21.59cm';
    tempDiv.innerHTML = buildPaginasInforme(d, logoSrc, modeloMembrete(), wmOpacityActual() / 100);
    document.body.appendChild(tempDiv);

    const ejecutar = () => {
      const opt = {
        margin: 0,
        filename: 'informe-pasantia-' + ((d.nombre || 'umsa').toLowerCase().replace(/[^\w]+/g, '-').slice(0, 35)) + '.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
      };
      html2pdf().set(opt).from(tempDiv).save().then(() => {
        tempDiv.remove();
        toast('Informe descargado en PDF.', 'success');
      }).catch(err => {
        tempDiv.remove();
        console.error(err);
        toast('Error al exportar PDF.', 'error');
      });
    };

    if (typeof window.html2pdf === 'undefined') {
      const script = document.createElement('script');
      script.src = 'js/html2pdf.bundle.min.js';
      script.onload = ejecutar;
      script.onerror = () => { tempDiv.remove(); toast('Error al cargar html2pdf.', 'error'); };
      document.head.appendChild(script);
    } else {
      ejecutar();
    }
  };

  // IMPRESIÓN DIRECTA
  $('#in_btn_print').onclick = () => {
    const d = recolectar();
    const docHTML = buildPaginasInforme(d, logoSrc, modeloMembrete(), wmOpacityActual() / 100);
    const w = window.open('', '_blank');
    if (!w) { toast('Permita las ventanas emergentes para imprimir.', 'error'); return; }
    w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Informe Único de Pasantía - ${esc(d.nombre)}</title>
      <style>
        @page { size: letter; margin: 0; }
        html, body { margin: 0; background: #fff; }
        .hoja-carta { box-shadow: none !important; margin: 0 !important; width: 100% !important; min-height: 100vh !important; }
        ${PRINT_COLOR_CSS}
      </style></head><body>${docHTML}
      <script>window.addEventListener('load', function(){ setTimeout(function(){ window.print(); }, 400); });<\/script></body></html>`);
    w.document.close();
  };

  // DESCARGA EN MICROSOFT WORD (.DOC) MULTIPÁGINA
  $('#in_btn_word').onclick = () => {
    const d = recolectar();
    const html = buildInformeWordDocument(d, logoSrc);
    const nombre = 'informe-pasantia-' + ((d.nombre || 'umsa').toLowerCase().replace(/[^\w]+/g, '-').slice(0, 35)) + '.doc';
    descargarArchivo(nombre, '\ufeff' + html, 'application/msword');
    toast('Informe descargado en Word con membrete en todas las páginas.', 'success');
  };

  // GUARDADO EN SUPABASE (informes)
  $('#in_btn_guardar').onclick = async () => {
    const d = recolectar();
    if (!d.nombre.trim()) { toast('Escriba el nombre del pasante.', 'error'); return; }
    const etiqueta = `Informe - ${d.nombre} (${d.asignatura})`;
    const payload = {
      etiqueta,
      datos: d,
      updated_at: new Date().toISOString()
    };
    if (informeEditId) payload.id = informeEditId;
    else payload.created_by = state.profile.id;

    const btn = $('#in_btn_guardar');
    if (btn) btn.disabled = true;
    try {
      const { error } = await supabase.from('informes').upsert(payload);
      if (error) throw error;
      informeEditId = null;
      Draft.clear('informe');
      toast('Informe guardado y sincronizado con Supabase.', 'success');
      cargarInformes();
    } catch (e) {
      toast('Error al guardar informe en la nube.', 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  // LIMPIAR
  $('#in_btn_limpiar').onclick = () => {
    if (!confirm('¿Limpiar formulario y empezar un informe nuevo?')) return;
    informeEditId = null;
    Draft.clear('informe');
    renderInforme();
  };

  // LISTADO DE INFORMES GUARDADOS
  let INFORMES = cacheInformes();
  function pintarInformes() {
    const cont = $('#inGuardados');
    if (!cont) return;
    if (!INFORMES.length) {
      cont.innerHTML = '<p class="cell-sub" style="padding:16px">No hay informes guardados aún en la nube.</p>';
      return;
    }
    cont.innerHTML = `<div class="table-wrap"><table class="data"><thead><tr><th>Pasante / Etiqueta</th><th>Guardado</th><th></th></tr></thead><tbody>${INFORMES.map(it => `<tr>
        <td class="cell-strong">${esc(it.etiqueta || 'Informe de Pasantía')}</td>
        <td class="cell-sub">${esc(new Date(it.updated_at || it.created_at || Date.now()).toLocaleString('es-BO'))}</td>
        <td class="cell-actions" style="white-space:nowrap">
          <button class="btn btn--ghost btn--sm js-inf-open" data-id="${esc(it.id)}">Reabrir</button>
          <button class="btn btn--danger btn--sm js-inf-del" data-id="${esc(it.id)}" title="Eliminar">&times;</button>
        </td>
      </tr>`).join('')}</tbody></table></div>`;

    cont.querySelectorAll('.js-inf-open').forEach(b => b.onclick = async () => {
      const id = b.dataset.id;
      try {
        const { data } = await supabase.from('informes').select('datos').eq('id', id).maybeSingle();
        if (data && data.datos) {
          informeEditId = id;
          Draft.save('informe', data.datos);
          renderInforme();
          toast('Informe cargado para edición.', 'success');
        }
      } catch (e) {
        toast('Error al abrir informe.', 'error');
      }
    });

    cont.querySelectorAll('.js-inf-del').forEach(b => b.onclick = async () => {
      if (!confirm('¿Eliminar este informe guardado de la nube?')) return;
      try {
        await supabase.from('informes').delete().eq('id', b.dataset.id);
        toast('Informe eliminado.', 'success');
        cargarInformes();
      } catch (e) {
        toast('Error al eliminar.', 'error');
      }
    });
  }

  async function cargarInformes() {
    INFORMES = await fetchInformes();
    pintarInformes();
  }

  pintarFotosGrid();
  pintar();
  cargarInformes();
}
