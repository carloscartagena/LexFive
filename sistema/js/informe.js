// ============================================================
//  VISTA: INFORME ÚNICO DE PASANTÍA (UMSA Y OTRAS UNIVERSIDADES)
//  Documento oficial multipágina sobre HOJA MEMBRETADA institucional de LexFive
//  (encabezado, marca de agua, pie y numeración "Página X de Y" en cada hoja).
//  Soporta importación automática desde Certificados de Pasantía, calendario hábil
//  de Bolivia (descarte automático de feriados), generación de tareas con IA y
//  fallback determinista, firmas institucionales, lista de anexos y fotos.
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
  generarConclusionesTexto,
  renderPaginaHoja,
  extraerImagenesDeDocx,
  optimizarImagenBlob
} from './pasantia-docs.js';

export { buildInformeWordDocument };

function urlAbs(src) {
  if (!src) return '';
  return src.indexOf('data:') === 0 ? src : new URL(src, location.href).href;
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

// Estructura de conclusiones institucionales
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
    in_feriados_extra: '',
    in_enfoque: '',
    in_docente: '',
    in_docente_cargo: '',
    in_tutor_nombre: '',
    in_tutor_rpa: '',
    in_supervision: 'Abogado(a) Patrocinante – LexFive Bufete de Abogados',
    in_fecha_pres: hoyISO(),
    in_antecedentes: `1) Guía de Procedimiento para Pasantías en la Carrera de Derecho, aprobada mediante Resolución del Honorable Consejo Universitario N.º 104/2016.\n2) Nota de Designación de Pasantía N.º IIST-001/2026 de fecha ${fechaLarga(hoyISO())}.`,
    in_actividades: '',
    in_conclusiones: '',
    in_modo_pres: 'lexfive',
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
    if (precargado.docente_guia !== undefined) V.in_docente = precargado.docente_guia || '';
    if (precargado.tutor_nombre !== undefined) V.in_tutor_nombre = precargado.tutor_nombre || '';
    if (precargado.tutor_rpa !== undefined) V.in_tutor_rpa = precargado.tutor_rpa || '';
    V.in_ref = precargado.ref || '';
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
          <div class="field"><label>Fecha de finalización (autocalculada)</label><input id="in_fecha_fin" type="date" value="${esc(V.in_fecha_fin)}"></div>
          <div class="field"><label>Modalidad</label>
            <select id="in_modalidad">
              <option value="4 semanas a medio tiempo (4 horas diarias)" ${V.in_modalidad.includes('4 semanas') ? 'selected' : ''}>4 semanas a medio tiempo (4 h/día - 20 días hábiles)</option>
              <option value="2 semanas a tiempo completo (8 horas diarias)" ${V.in_modalidad.includes('2 semanas') ? 'selected' : ''}>2 semanas a tiempo completo (8 h/día - 10 días hábiles)</option>
            </select>
          </div>
          ${campo('in_horario', 'Horario', V.in_horario)}
          ${campo('in_ref_cert', 'N.º Referencia del Certificado (Anexo 3)', V.in_ref || 'LF-2026-00000')}
          <div class="field" style="grid-column:1/-1;">
            <label>Feriados extra / tolerancias (opcional, YYYY-MM-DD separados por coma)</label>
            <input id="in_feriados_extra" value="${esc(V.in_feriados_extra || '')}" placeholder="Ej: 2026-11-03, 2026-11-10">
            <p class="cell-sub" id="in_feriados_info" style="margin-top:2px;font-size:.78rem;color:var(--gold, #a8853c);display:none;"></p>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. DOCENTE GUÍA Y SUPERVISIÓN -->
    <div class="card">
      <div class="card__head"><h3>🎓 Destinatario, Docente Guía y Supervisión</h3></div>
      <div class="card__body">
        <div class="cert-form">
          ${campo('in_docente', 'Docente Guía / Destinatario (A:)', V.in_docente, 'Ej. Dr. Marcelo Silva Mollinedo')}
          ${campo('in_docente_cargo', 'Cargo del Docente Guía', V.in_docente_cargo, 'Docente Guía de la Materia de Pasantía · Carrera de Derecho UMSA')}
          ${campo('in_tutor_nombre', 'Abogado(a) Patrocinante / Tutor(a) (opcional)', V.in_tutor_nombre, 'Ej: Abg. Carlos Cartagena')}
          ${campo('in_tutor_rpa', 'R.P.A. del Tutor(a) (opcional)', V.in_tutor_rpa, 'Ej: 9876543-LP')}
          ${campo('in_supervision', 'Supervisión Institucional en Bufete (texto resumen)', V.in_supervision)}
          <div class="field"><label>Fecha de presentación del informe</label><input id="in_fecha_pres" type="date" value="${esc(V.in_fecha_pres)}"></div>
        </div>
        ${campoArea('in_antecedentes', 'Antecedentes y Resoluciones Universitarias', V.in_antecedentes, 3)}
      </div>
    </div>

    <!-- 4. GENERACIÓN DE ACTIVIDADES CON IA -->
    <div class="card">
      <div class="card__head">
        <h3>📅 Detalle de Actividades (Día por Día)</h3>
      </div>
      <div class="card__body">
        <div style="background:var(--card-bg, rgba(255,255,255,0.03));border:1px solid var(--line);border-radius:8px;padding:12px;margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:6px;">
            <label style="font-weight:600;">Áreas de práctica jurídica desarrolladas:</label>
            <button class="btn btn--ghost btn--sm" id="in_btn_toggle_areas" type="button" style="font-size:.78rem;padding:2px 8px;">Marcar / desmarcar todas</button>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;font-size:.85rem;margin-bottom:8px;">
            <label style="display:flex;align-items:center;gap:4px;white-space:nowrap;"><input type="checkbox" class="in_area" value="civil" checked> Civil</label>
            <label style="display:flex;align-items:center;gap:4px;white-space:nowrap;"><input type="checkbox" class="in_area" value="familiar" checked> Familiar</label>
            <label style="display:flex;align-items:center;gap:4px;white-space:nowrap;"><input type="checkbox" class="in_area" value="laboral" checked> Laboral</label>
            <label style="display:flex;align-items:center;gap:4px;white-space:nowrap;"><input type="checkbox" class="in_area" value="penal" checked> Penal</label>
            <label style="display:flex;align-items:center;gap:4px;white-space:nowrap;"><input type="checkbox" class="in_area" value="administrativo" checked> Administrativo (GAMEA)</label>
            <label style="display:flex;align-items:center;gap:4px;white-space:nowrap;"><input type="checkbox" class="in_area" value="notarial" checked> DDRR / Notarial</label>
            <label style="display:flex;align-items:center;gap:4px;white-space:nowrap;"><input type="checkbox" class="in_area" value="legaltech" checked> Gestión Digital</label>
          </div>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
            <input id="in_enfoque" value="${esc(V.in_enfoque || '')}" placeholder="Enfoque especial del pasante (ej. asistencia familiar, procesos monitorios en El Alto)..." style="flex:1;min-width:240px;">
            <button class="btn btn--primary btn--sm" id="in_btn_ia_cronograma" type="button">✨ Generar nuevo cronograma único (IA)</button>
            <span id="in_ia_badge" style="display:none;padding:3px 8px;border-radius:12px;font-size:.78rem;font-weight:600;"></span>
            <button class="btn btn--ghost btn--sm" id="in_btn_regen_act" type="button">🔄 Restaurar predeterminadas</button>
          </div>
        </div>

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
      <div class="card__head" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <h3 style="margin:0;">📷 Anexo Fotográfico (Evidencia de Pasantía)</h3>
          <span id="in_fotos_badge" style="font-size:.75rem;padding:2px 8px;border-radius:12px;background:rgba(184,148,70,0.15);color:#b89446;font-weight:600;display:none;">0 fotos</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <label style="font-size:.78rem;display:flex;align-items:center;gap:4px;">
            <span>Distribución:</span>
            <select id="in_fotos_layout" style="font-size:.78rem;padding:3px 6px;border-radius:4px;">
              <option value="4" ${(V.in_fotos_layout !== '2') ? 'selected' : ''}>4 fotos por hoja (2×2 — recomendado)</option>
              <option value="2" ${(V.in_fotos_layout === '2') ? 'selected' : ''}>2 fotos grandes por hoja (vertical)</option>
            </select>
          </label>
          <button class="btn btn--ghost btn--sm" id="in_btn_vaciar_fotos" type="button" style="font-size:.75rem;padding:2px 8px;display:none;color:#e11d48;">🗑️ Vaciar fotos</button>
        </div>
      </div>
      <div class="card__body">
        <div id="in_fotos_dropzone" style="border:2px dashed var(--line);border-radius:6px;padding:16px;text-align:center;cursor:pointer;background:var(--card-sub-bg, rgba(255,255,255,0.02));transition:border-color .2s, background .2s;">
          <input type="file" id="in_file_fotos" multiple accept="image/*,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" style="display:none;">
          <div style="font-size:1.8rem;margin-bottom:4px;">📂 📸</div>
          <div style="font-weight:600;font-size:.85rem;color:var(--primary, #b89446);">
            Arrastra aquí tus fotos o archivo Word (.docx), o haz clic para explorar
          </div>
          <p class="cell-sub" style="margin:4px 0 0;font-size:.78rem;">
            Puedes subir fotos JPG/PNG o directamente el archivo Word (.docx) con las fotos pegadas; el sistema las extrae automáticamente.
          </p>
        </div>
        <div id="in_fotos_grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(180px, 1fr));gap:10px;margin-top:12px;"></div>
      </div>
    </div>

    <!-- BARRA DE ACCIONES Y DESCARGAS -->
    <div class="card"><div class="card__body">
      <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-end;">
        <div class="field" style="margin:0;min-width:230px"><label>Presentación del documento</label>
          <select id="in_modo_pres">
            <option value="lexfive" ${V.in_modo_pres !== 'umsa' ? 'selected' : ''}>Hoja Membretada LexFive (recomendado)</option>
            <option value="umsa" ${V.in_modo_pres === 'umsa' ? 'selected' : ''}>Encabezado Académico UMSA</option>
          </select>
        </div>
        <div class="field" style="margin:0;min-width:210px"><label>Modelo de membrete</label>
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

  // Autocalcula fecha de finalización
  const autocalcularFechaFin = () => {
    const fIni = val('in_fecha_inicio');
    if (!fIni) return;
    const mod = val('in_modalidad') || '4 semanas a medio tiempo (4 horas diarias)';
    const numDias = (mod.includes('2 semanas') || mod.includes('tiempo completo')) ? 10 : 20;
    const feriadosExtra = val('in_feriados_extra');
    const calc = calcularJornadasHabilesBolivia(fIni, numDias, feriadosExtra);
    if (calc.fechaFin && $('#in_fecha_fin')) {
      $('#in_fecha_fin').value = calc.fechaFin;
    }
    const infoEl = $('#in_feriados_info');
    if (infoEl) {
      if (calc.feriadosOmitidos && calc.feriadosOmitidos.length) {
        infoEl.style.display = 'block';
        infoEl.textContent = `Se omitieron ${calc.feriadosOmitidos.length} feriado(s) oficial(es): ` + calc.feriadosOmitidos.map(f => `${f.fechaCorta} (${f.nombre})`).join(', ');
      } else {
        infoEl.style.display = 'none';
        infoEl.textContent = '';
      }
    }
    return calc;
  };

  const formatearCronogramaTexto = (crono) => {
    let out = '';
    let curSem = 0;
    const numSemRoman = ['I', 'II', 'III', 'IV', 'V', 'VI'];
    const semNombres = ['PRIMERA', 'SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA', 'SEXTA'];

    crono.forEach(item => {
      if (item.semanaIdx !== curSem) {
        curSem = item.semanaIdx;
        const semNom = semNombres[curSem - 1] || `${curSem}ª`;
        out += `\n${numSemRoman[curSem - 1] || curSem}. ${semNom} SEMANA:\n`;
      }
      out += `\n• ${item.diaSemana || ''}, ${item.fecha} — ${item.resumen}\n`;
      if (Array.isArray(item.actividades)) {
        item.actividades.forEach((act, idx) => {
          const ltr = ['a', 'b', 'c', 'd'][idx] || '-';
          out += `  ${ltr}) ${act}\n`;
        });
      }
    });
    return out.trim();
  };

  // Genera actividades iniciales si no existen
  if (!V.in_actividades) {
    const calc = autocalcularFechaFin() || calcularJornadasHabilesBolivia(val('in_fecha_inicio') || hoyISO(), 20, '');
    const crono = calc.jornadas.map((j, i) => {
      const base = PASANTIA_CRONOGRAMA_BASE[i] || { resumen: 'Práctica forense en despacho.', detalle: 'Práctica jurídica forense.' };
      return {
        num: j.num,
        fecha: j.fechaCorta,
        diaSemana: j.diaSemana,
        semanaIdx: j.semanaIdx,
        resumen: base.resumen,
        actividades: [
          base.detalle,
          'Registro, digitalización y actualización del estado procesal en el sistema informático interno del bufete LexFive.',
          'Compulsa normativa del Código Procesal aplicable, doctrina jurídica y control de plazos perentorios bajo supervisión.'
        ]
      };
    });
    V.in_actividades = formatearCronogramaTexto(crono);
    if ($('#in_actividades')) $('#in_actividades').value = V.in_actividades;
  }

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
    feriados_extra: val('in_feriados_extra'),
    enfoque: val('in_enfoque'),
    docente_guia: val('in_docente'),
    docente_cargo: val('in_docente_cargo'),
    tutor_nombre: val('in_tutor_nombre'),
    tutor_rpa: val('in_tutor_rpa'),
    supervision: val('in_supervision'),
    fecha: val('in_fecha_pres'),
    antecedentes: val('in_antecedentes'),
    actividades: val('in_actividades'),
    conclusiones: val('in_conclusiones'),
    modo_presentacion: val('in_modo_pres') || 'lexfive',
    fotos: fotosArray,
    fotos_layout: ($('#in_fotos_layout') ? $('#in_fotos_layout').value : '4')
  });

  const pintar = () => {
    const d = recolectar();
    $('#inPreview').innerHTML = buildPaginasInforme(d, logoSrc, modeloMembrete(), wmOpacityActual() / 100);
  };

  const pintarFotosGrid = () => {
    const grid = $('#in_fotos_grid');
    const badge = $('#in_fotos_badge');
    const btnVaciar = $('#in_btn_vaciar_fotos');
    if (!grid) return;

    if (!fotosArray.length) {
      grid.innerHTML = '<p class="cell-sub" style="grid-column:1/-1;margin:0;font-size:.8rem;opacity:.7;">No hay fotos cargadas aún.</p>';
      if (badge) badge.style.display = 'none';
      if (btnVaciar) btnVaciar.style.display = 'none';
      return;
    }

    if (badge) {
      badge.style.display = 'inline-block';
      badge.textContent = `${fotosArray.length} foto${fotosArray.length > 1 ? 's' : ''}`;
    }
    if (btnVaciar) btnVaciar.style.display = 'inline-block';

    grid.innerHTML = fotosArray.map((f, i) => `
      <div style="border:1px solid var(--line);border-radius:6px;padding:6px;background:var(--card-sub-bg, rgba(255,255,255,0.03));position:relative;display:flex;flex-direction:column;">
        <div style="position:relative;width:100%;height:115px;border-radius:4px;overflow:hidden;background:rgba(0,0,0,0.05);display:flex;align-items:center;justify-content:center;">
          <img src="${f.src}" style="max-width:100%;max-height:100%;object-fit:cover;" alt="">
          <span style="position:absolute;top:4px;left:4px;background:rgba(14,27,44,0.75);color:#fff;font-size:10px;padding:1px 5px;border-radius:3px;font-weight:600;">N.º ${i + 1}</span>
          <button class="btn btn--danger btn--sm js-foto-del" data-i="${i}" style="position:absolute;top:4px;right:4px;padding:2px 6px;line-height:1;font-size:11px;" type="button" title="Eliminar foto">&times;</button>
        </div>
        <input class="js-foto-pie" data-i="${i}" value="${esc(f.pie || '')}" placeholder="Pie de foto..." style="width:100%;font-size:.75rem;margin-top:6px;padding:3px 6px;box-sizing:border-box;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
          <button class="btn btn--ghost btn--sm js-foto-prev" data-i="${i}" type="button" style="padding:1px 6px;font-size:11px;" ${i === 0 ? 'disabled' : ''} title="Mover a la izquierda">◀</button>
          <span style="font-size:10px;color:var(--text-muted, #888);">${i + 1}/${fotosArray.length}</span>
          <button class="btn btn--ghost btn--sm js-foto-next" data-i="${i}" type="button" style="padding:1px 6px;font-size:11px;" ${i === fotosArray.length - 1 ? 'disabled' : ''} title="Mover a la derecha">▶</button>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.js-foto-pie').forEach(inp => {
      inp.oninput = () => { fotosArray[Number(inp.dataset.i)].pie = inp.value; pintar(); saveDraft(); };
    });
    grid.querySelectorAll('.js-foto-del').forEach(btn => {
      btn.onclick = () => { fotosArray.splice(Number(btn.dataset.i), 1); pintarFotosGrid(); pintar(); saveDraft(); };
    });
    grid.querySelectorAll('.js-foto-prev').forEach(btn => {
      btn.onclick = () => {
        const idx = Number(btn.dataset.i);
        if (idx > 0) {
          const item = fotosArray.splice(idx, 1)[0];
          fotosArray.splice(idx - 1, 0, item);
          pintarFotosGrid();
          pintar();
          saveDraft();
        }
      };
    });
    grid.querySelectorAll('.js-foto-next').forEach(btn => {
      btn.onclick = () => {
        const idx = Number(btn.dataset.i);
        if (idx < fotosArray.length - 1) {
          const item = fotosArray.splice(idx, 1)[0];
          fotosArray.splice(idx + 1, 0, item);
          pintarFotosGrid();
          pintar();
          saveDraft();
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
            extraidas.forEach(f => {
              fotosArray.push({
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
          fotosArray.push({
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
      saveDraft();
      toast(`${fotosNuevas} fotografía(s) agregada(s) correctamente.`, 'success');
    }
  };

  const dropzoneIn = $('#in_fotos_dropzone');
  const fInp = $('#in_file_fotos');
  if (dropzoneIn && fInp) {
    dropzoneIn.onclick = () => fInp.click();

    dropzoneIn.ondragover = (e) => {
      e.preventDefault();
      dropzoneIn.style.borderColor = 'var(--gold, #b89446)';
      dropzoneIn.style.background = 'rgba(184,148,70,0.08)';
    };

    dropzoneIn.ondragleave = (e) => {
      e.preventDefault();
      dropzoneIn.style.borderColor = 'var(--line)';
      dropzoneIn.style.background = 'var(--card-sub-bg, rgba(255,255,255,0.02))';
    };

    dropzoneIn.ondrop = async (e) => {
      e.preventDefault();
      dropzoneIn.style.borderColor = 'var(--line)';
      dropzoneIn.style.background = 'var(--card-sub-bg, rgba(255,255,255,0.02))';
      const files = Array.from(e.dataTransfer.files || []);
      await agregarArchivosFotos(files);
    };

    fInp.onchange = async (e) => {
      const files = Array.from(e.target.files || []);
      await agregarArchivosFotos(files);
      fInp.value = '';
    };
  }

  const btnVaciarInFotos = $('#in_btn_vaciar_fotos');
  if (btnVaciarInFotos) {
    btnVaciarInFotos.onclick = () => {
      if (!fotosArray.length) return;
      fotosArray = [];
      pintarFotosGrid();
      pintar();
      saveDraft();
      toast('Fotos eliminadas.', 'info');
    };
  }

  const selLayoutIn = $('#in_fotos_layout');
  if (selLayoutIn) {
    selLayoutIn.onchange = () => {
      pintar();
      saveDraft();
    };
  }

  // Pegar imágenes con Ctrl + V
  document.addEventListener('paste', async (e) => {
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
      in_feriados_extra: val('in_feriados_extra'),
      in_enfoque: val('in_enfoque'),
      in_docente: val('in_docente'),
      in_docente_cargo: val('in_docente_cargo'),
      in_supervision: val('in_supervision'),
      in_fecha_pres: val('in_fecha_pres'),
      in_antecedentes: val('in_antecedentes'),
      in_actividades: val('in_actividades'),
      in_conclusiones: val('in_conclusiones'),
      in_modo_pres: val('in_modo_pres'),
      in_fotos_layout: ($('#in_fotos_layout') ? $('#in_fotos_layout').value : '4'),
      in_fotos: fotosArray
    });
  }

  // Eventos de campos
  [
    'in_nombre', 'in_ci', 'in_ru', 'in_uni', 'in_carrera', 'in_asignatura',
    'in_nota_desig', 'in_horario', 'in_ref_cert', 'in_docente',
    'in_docente_cargo', 'in_supervision', 'in_enfoque'
  ].forEach(id => {
    const el = $('#' + id); if (el) el.oninput = () => { pintar(); saveDraft(); };
  });

  ['in_genero', 'in_fecha_nota', 'in_fecha_inicio', 'in_fecha_fin', 'in_modalidad', 'in_fecha_pres', 'in_feriados_extra', 'in_modo_pres', 'in_docente', 'in_docente_cargo', 'in_tutor_nombre', 'in_tutor_rpa'].forEach(id => {
    const el = $('#' + id);
    if (el) {
      el.onchange = () => {
        if (id === 'in_genero') {
          $('#in_conclusiones').value = generarConclusionesTexto(val('in_genero'));
        }
        if (id === 'in_fecha_inicio' || id === 'in_modalidad' || id === 'in_feriados_extra') {
          autocalcularFechaFin();
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
      if ($('#in_docente')) $('#in_docente').value = c.docente_guia || '';
      if ($('#in_tutor_nombre')) $('#in_tutor_nombre').value = c.tutor_nombre || '';
      if ($('#in_tutor_rpa')) $('#in_tutor_rpa').value = c.tutor_rpa || '';
      if ($('#in_nota_desig')) $('#in_nota_desig').value = c.nota_designacion || '';
      if ($('#in_fecha_nota')) $('#in_fecha_nota').value = (c.fecha_nota_designacion || hoyISO()).slice(0, 10);
      if ($('#in_fecha_inicio')) $('#in_fecha_inicio').value = (c.fecha_inicio || hoyISO()).slice(0, 10);
      if ($('#in_fecha_fin')) $('#in_fecha_fin').value = (c.fecha_fin || hoyISO()).slice(0, 10);
      if ($('#in_modalidad') && c.modalidad) $('#in_modalidad').value = c.modalidad;
      if ($('#in_horario')) $('#in_horario').value = c.horario || '14:00 a 18:00';
      if ($('#in_ref_cert')) $('#in_ref_cert').value = c.ref || '';

      autocalcularFechaFin();
      if (Array.isArray(c.cronograma_json) && c.cronograma_json.length) {
        $('#in_actividades').value = formatearCronogramaTexto(c.cronograma_json);
      }
      $('#in_antecedentes').value = `1) Guía de Procedimiento para Pasantías en la Carrera de Derecho, aprobada mediante Resolución del Honorable Consejo Universitario N.º 104/2016.\n2) Nota de Designación de Pasantía N.º ${c.nota_designacion || 'IIST-001/2026'} de fecha ${fechaLarga(c.fecha_nota_designacion || c.fecha_emision)}.`;
      $('#in_conclusiones').value = generarConclusionesTexto(val('in_genero'));

      pintar();
      saveDraft();
      toast(`Datos de ${c.nombre} importados al informe.`, 'success');
    };
  }

  // Generador de actividades únicas con IA
    const btnToggleInAreas = $('#in_btn_toggle_areas');
  if (btnToggleInAreas) {
    btnToggleInAreas.onclick = () => {
      const cbs = content().querySelectorAll('.in_area');
      const allChecked = Array.from(cbs).every(c => c.checked);
      cbs.forEach(c => { c.checked = !allChecked; });
    };
  }

    content().addEventListener('click', async (e) => {
    const btn = e.target.closest('#in_btn_ia_cronograma');
    if (!btn) return;
    e.preventDefault();

    const fIni = val('in_fecha_inicio');
    if (!fIni) { toast('Seleccione la fecha de inicio primero.', 'error'); return; }
    const calc = autocalcularFechaFin();
    const areas = Array.from(content().querySelectorAll('.in_area:checked')).map(c => c.value);
    const enfoque = val('in_enfoque');
    const nombre = val('in_nombre');

    btn.disabled = true;
    btn.textContent = '⏳ Generando con IA (puede tardar 20–40 s)...';
    toast('Generando actividades exclusivas con IA (espera hasta 75s)...', 'info');

    try {
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
        const txt = formatearCronogramaTexto(crono);
        $('#in_actividades').value = txt;
        pintar();
        saveDraft();
        toast(`Informe y Hoja de Asistencia actualizados (${crono.length} jornadas)`, 'success');
      }
    } catch (err) {
      console.error('Error al generar con IA:', err);
      if (err && err.message === 'TIMEOUT_75S') {
        toast('El servicio de IA tardó más de 75s. Se aplicó el banco normativo local.', 'info');
      } else {
        toast('Error al generar con IA, usando tareas predeterminadas.', 'error');
      }
      try {
        const fallback = await generarCronogramaPasantia({
          jornadas: calc.jornadas,
          areas,
          enfoque,
          nombrePasante: nombre,
          usarIA: false
        });
        if (fallback && fallback.length) {
          $('#in_actividades').value = formatearCronogramaTexto(fallback);
          pintar();
          saveDraft();
        }
      } catch (_) {}
    } finally {
      const activeBtn = $('#in_btn_ia_cronograma');
      if (activeBtn) {
        activeBtn.disabled = false;
        activeBtn.textContent = '✨ Generar nuevo cronograma único (IA)';
      }
    }
  });

  // Botón restaurar predeterminadas
  $('#in_btn_regen_act').onclick = () => {
    const calc = autocalcularFechaFin() || calcularJornadasHabilesBolivia(val('in_fecha_inicio') || hoyISO(), 20, '');
    const crono = calc.jornadas.map((j, i) => {
      const base = PASANTIA_CRONOGRAMA_BASE[i] || { resumen: 'Práctica forense en despacho.', detalle: 'Práctica jurídica forense.' };
      return {
        num: j.num,
        fecha: j.fechaCorta,
        diaSemana: j.diaSemana,
        semanaIdx: j.semanaIdx,
        resumen: base.resumen,
        actividades: [
          base.detalle,
          'Registro, digitalización y actualización del estado procesal en el sistema informático interno del bufete LexFive.',
          'Compulsa normativa del Código Procesal aplicable, doctrina jurídica y control de plazos perentorios bajo supervisión.'
        ]
      };
    });
    $('#in_actividades').value = formatearCronogramaTexto(crono);
    pintar();
    saveDraft();
    toast('Actividades cronológicas restauradas.', 'success');
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
    imprimirInformeDocumento(recolectar(), logoSrc, modeloMembrete(), wmOpacityActual() / 100);
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

  autocalcularFechaFin();
  pintarFotosGrid();
  pintar();
  cargarInformes();
}
