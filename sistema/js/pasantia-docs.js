// ============================================================
//  LexFive — Generador Unificado de Documentos de Pasantía
//  Produce:
//   1) Vista Previa e Impresión multipágina en Hoja Membretada LexFive
//   2) Descarga de Informe en PDF (html2pdf con saltos de página limpios)
//   3) Descarga de Informe en Word (.doc compatible con tablas, Base64 logo y @page)
//   4) Hoja de Control de Asistencia y Permanencia (1 hoja Carta membretada)
// ============================================================
import { esc, fmtDate, hoyISO } from './util.js';
import { descargarArchivo } from './exportar.js';
import { membreteHeader, membreteFooter, PRINT_COLOR_CSS } from './membrete-base.js';
import { calcularJornadasHabilesBolivia } from './calendario-bo.js';
import { BANCO_TAREAS_AREAS } from './pasantia-ai.js';
import { toast } from './ui.js';

// Convierte cualquier ruta de imagen (local o remota) a Base64 para incrustar en Word/PDF
export async function getLogoBase64(src) {
  if (!src) return '';
  if (typeof src === 'string' && src.startsWith('data:image/')) return src;
  try {
    return await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 240;
          canvas.height = img.naturalHeight || img.height || 240;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch (e) {
          resolve(src);
        }
      };
      img.onerror = () => resolve(src);
      img.src = src;
    });
  } catch (e) {
    return src;
  }
}

export function fechaLarga(d) {
  if (!d) return '';
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const dia = parseInt(m[3], 10);
    const mes = meses[parseInt(m[2], 10) - 1];
    const anio = m[1];
    return `${dia} de ${mes} de ${anio}`;
  }
  return String(d);
}

// Catálogo base de 20 jornadas de práctica forense
export const PASANTIA_CRONOGRAMA_BASE = [
  { dia: 1, semana: 1, resumen: 'Inducción institucional, normativa deontológica, confidencialidad y protocolos de despacho.', detalle: 'Inducción institucional sobre normas deontológicas del ejercicio de la abogacía, protocolos de reserva, confidencialidad profesional y funcionamiento orgánico del bufete LexFive.' },
  { dia: 2, semana: 1, resumen: 'Revisión, organización física y foliado correlativo de cuadernos procesales civiles y familiares.', detalle: 'Revisión, organización física y foliado correlativo de cuadernos procesales en materias Civil, Comercial y Familiar.' },
  { dia: 3, semana: 1, resumen: 'Clasificación de resoluciones, autos interlocutorios y notificaciones judiciales.', detalle: 'Clasificación y archivo cronológico de actuaciones judiciales, resoluciones, providencias y notificaciones judiciales.' },
  { dia: 4, semana: 1, resumen: 'Capacitación y registro de causas activas en el sistema informático interno del despacho.', detalle: 'Capacitación en el uso y registro del sistema informático interno del despacho para control de plazos procesales y estado de causas.' },
  { dia: 5, semana: 1, resumen: 'Auditoría de términos y vencimiento de plazos perentorios en procesos ejecutivos y ordinarios.', detalle: 'Auditoría procesal y elaboración del rol de vencimiento de términos y plazos perentorios en procesos ejecutivos y ordinarios.' },
  { dia: 6, semana: 2, resumen: 'Verificación de expedientes en juzgados públicos civiles y comerciales de El Alto.', detalle: 'Seguimiento y verificación de causas en juzgados públicos en materia civil y comercial del Tribunal Departamental de Justicia en El Alto.' },
  { dia: 7, semana: 2, resumen: 'Revisión de cuadernos de control jurisdiccional e investigaciones en materia penal.', detalle: 'Revisión de cuadernos procesales y de control jurisdiccional en juzgados de instrucción penal y fiscalías corporativas.' },
  { dia: 8, semana: 2, resumen: 'Diligenciamiento de órdenes judiciales, citaciones y emplazamientos a partes demandadas.', detalle: 'Diligenciamiento de mandamientos, órdenes judiciales, citaciones y emplazamientos a través de oficiales de diligencias.' },
  { dia: 9, semana: 2, resumen: 'Seguimiento a buzón judicial electrónico y notificaciones en sistema digital Hermes/Thor.', detalle: 'Revisión y compulsa de notificaciones en el buzón judicial electrónico y plataforma digital del Tribunal Supremo de Justicia.' },
  { dia: 10, semana: 2, resumen: 'Elaboración de fichas síntesis del estado procesal de causas asignadas para informe de cartera.', detalle: 'Elaboración de fichas síntesis de estado procesal de cada caso asignado con alerta de vencimiento de plazos y memoriales pendientes.' },
  { dia: 11, semana: 3, resumen: 'Redacción de borradores de memoriales de apersonamiento y copias legalizadas.', detalle: 'Redacción de borradores de memoriales procesales de mero trámite: apersonamientos, solicitudes de fotocopias legalizadas y desarchivo de causas.' },
  { dia: 12, semana: 3, resumen: 'Redacción de borradores de señalamiento de audiencias y peticiones de conminatoria.', detalle: 'Elaboración de borradores de solicitudes de señalamiento de audiencia de juicio, conminatorias y liquidaciones procesales.' },
  { dia: 13, semana: 3, resumen: 'Apoyo en elaboración de contestaciones de demanda y planteamiento de excepciones previas.', detalle: 'Elaboración de borradores de contestaciones de demanda, incidentes y excepciones previas bajo la revisión del abogado patrocinante.' },
  { dia: 14, semana: 3, resumen: 'Búsqueda y compulsa de jurisprudencia y sentencias constitucionales en el portal del TCP.', detalle: 'Búsqueda y compulsa de jurisprudencia constitucional relevante en el portal del Tribunal Constitucional Plurinacional (TCP).' },
  { dia: 15, semana: 3, resumen: 'Redacción preliminar de contratos privados, minutas de transferencia y reconocimientos de firmas.', detalle: 'Apoyo técnico en la redacción de contratos privados, minutas de transferencia de bienes inmuebles, compromisos y acuerdos transaccionales.' },
  { dia: 16, semana: 4, resumen: 'Diligencias de verificación de folios reales, gravámenes e hipotecas ante Derechos Reales (DDRR).', detalle: 'Diligencias de ingreso, verificación y retiro de trámites de registro de folios reales, gravámenes e hipotecas ante las oficinas de Derechos Reales.' },
  { dia: 17, semana: 4, resumen: 'Tramitación de certificados de estado civil y partidas registrales ante SERECI y SEGIP.', detalle: 'Tramitación de certificaciones de estado civil, partidas de matrimonio/defunción y saneamiento registral ante SERECI y trámites de filiación ante SEGIP.' },
  { dia: 18, semana: 4, resumen: 'Gestiones ante dependencias municipales (GAMEA) sobre catastro e impuestos de inmuebles litigiosos.', detalle: 'Gestiones administrativas ante dependencias del Gobierno Autónomo Municipal de El Alto (GAMEA) relacionadas a catastro y tributación de inmuebles en litigio.' },
  { dia: 19, semana: 4, resumen: 'Consolidación de cuadernos de seguimiento, digitalización de actuaciones y entrega de casos.', detalle: 'Consolidación final del archivo digital de causas, escaneo de actuaciones forenses y entrega de fichas de seguimiento a los abogados patrocinantes.' },
  { dia: 20, semana: 4, resumen: 'Cierre de pasantía, consolidación de la hoja de asistencia y preparación del Informe Único.', detalle: 'Consolidación del registro de asistencias y actividades cumplidas, recopilación del muestrario de actuaciones y redacción del Informe Único de Pasantía.' }
];

export function obtenerTratamiento(genero) {
  const g = (genero || '').toLowerCase();
  const fem = g === 'femenino' || g === 'f' || g === 'ella' || g === 'mujer';
  const masc = g === 'masculino' || g === 'm' || g === 'el' || g === 'varon';

  if (fem) {
    return {
      artUniv: 'la universitaria',
      designado: 'designada',
      artPasante: 'la pasante',
      mencionado: 'La mencionada universitaria',
      interesado: 'la interesada',
      delInteresado: 'de la interesada',
      univAbrev: 'la Univ.',
      estudiante: 'la estudiante',
      tituloPasante: 'la señora',
      univ: 'de la Univ.',
      pasanteArticulo: 'la pasante'
    };
  } else if (masc) {
    return {
      artUniv: 'el universitario',
      designado: 'designado',
      artPasante: 'el pasante',
      mencionado: 'El mencionado universitario',
      interesado: 'el interesado',
      delInteresado: 'del interesado',
      univAbrev: 'el Univ.',
      estudiante: 'el estudiante',
      tituloPasante: 'el señor',
      univ: 'del Univ.',
      pasanteArticulo: 'el pasante'
    };
  }
  return {
    artUniv: 'el(la) universitario(a)',
    designado: 'designado(a)',
    artPasante: 'el(la) pasante',
    mencionado: 'El(la) mencionado(a) universitario(a)',
    interesado: 'el/la interesado/a',
    delInteresado: 'del/de la interesado/a',
    univAbrev: 'el(la) Univ.',
    estudiante: 'el(la) estudiante',
    tituloPasante: 'el(la) señor(a)',
    univ: 'del(de la) Univ.',
    pasanteArticulo: 'el(la) pasante'
  };
}

export function extraerHoras(horarioStr, modalidadStr) {
  const hStr = (horarioStr || '').toLowerCase();
  const mStr = (modalidadStr || '').toLowerCase();
  let defHrs = 4;
  if (mStr.includes('8 horas') || mStr.includes('tiempo completo') || mStr.includes('2 semanas')) defHrs = 8;

  const match = hStr.match(/(\d{1,2})[:.]?(\d{2})?\s*(?:a|-|al|hasta)\s*(\d{1,2})[:.]?(\d{2})?/);
  if (!match) return { ingreso: '14:00', salida: '18:00', horas: defHrs };

  const h1 = parseInt(match[1], 10);
  const min1 = match[2] ? parseInt(match[2], 10) : 0;
  const h2 = parseInt(match[3], 10);
  const min2 = match[4] ? parseInt(match[4], 10) : 0;

  const pad = n => String(n).padStart(2, '0');
  const ing = `${pad(h1)}:${pad(min1)}`;
  const sal = `${pad(h2)}:${pad(min2)}`;

  const diff = (h2 + min2 / 60) - (h1 + min1 / 60);
  const hrs = (diff > 0 && diff <= 12) ? Math.round(diff) : defHrs;
  return { ingreso: ing, salida: sal, horas: hrs };
}

// Calcula las jornadas hábiles de pasantía y les asigna su tarea sincronizada
export function calcularJornadasPasantia(fechaInicioStr, fechaFinStr, modalidadStr, feriadosExtraStr = '', customTareas = null) {
  const modLower = (modalidadStr || '').toLowerCase();
  let numJornadas = 20;
  if (modLower.includes('2 semanas') || modLower.includes('dos (2) semanas') || (modLower.includes('tiempo completo') && !modLower.includes('4 semanas'))) {
    numJornadas = 10;
  }

  // Si no hay fecha de inicio, devolvemos estructura vacía con tareas
  if (!fechaInicioStr) {
    return Array.from({ length: numJornadas }, (_, i) => {
      const semIdx = Math.floor(i / 5) + 1;
      const custom = customTareas && customTareas[i];
      return {
        numero: i + 1,
        num: i + 1,
        fecha: '',
        fechaRaw: '',
        diaSemana: ['Lunes','Martes','Miércoles','Jueves','Viernes'][i % 5],
        semanaIdx: semIdx,
        tarea: custom ? {
          resumen: custom.resumen || 'Práctica forense en despacho.',
          actividades: Array.isArray(custom.actividades) ? custom.actividades : [custom.detalle || custom.resumen || 'Práctica jurídica forense.']
        } : {
          resumen: `Práctica forense en despacho (Jornada ${i + 1}).`,
          actividades: [
            'Revisión y compulsa de expedientes judiciales en estrados.',
            'Redacción preliminar de memoriales de trámite procesal.',
            'Diligenciamiento y control de plazos perentorios en despacho.'
          ]
        }
      };
    });
  }

  const calc = calcularJornadasHabilesBolivia(fechaInicioStr, numJornadas, feriadosExtraStr);
  return calc.jornadas.map((jh, i) => {
    const custom = customTareas && customTareas[i];
    return {
      numero: jh.num,
      num: jh.num,
      fecha: jh.fechaCorta,
      fechaRaw: jh.iso,
      diaSemana: jh.diaSemana,
      semanaIdx: jh.semanaIdx,
      tarea: custom ? {
        resumen: custom.resumen || 'Práctica forense en despacho.',
        actividades: Array.isArray(custom.actividades) && custom.actividades.length
          ? custom.actividades
          : [custom.detalle || custom.resumen || 'Práctica forense en despacho.']
      } : {
        resumen: `Actividades de práctica jurídica forense (Día ${jh.num}).`,
        actividades: [
          'Revisión y compulsa de expedientes judiciales en estrados.',
          'Redacción preliminar de memoriales de trámite procesal.',
          'Diligenciamiento y control de plazos perentorios en despacho.'
        ]
      }
    };
  });
}

export function generarConclusionesTexto(genero, nombrePasante = '') {
  const t = obtenerTratamiento(genero);
  return `1) En el aspecto técnico-jurídico, ${t.pasanteArticulo} demostró sólida solvencia en la compulsa de expedientes, interpretación de doctrina y aplicación práctica del Código Procesal Civil (Ley 439), Código de las Familias (Ley 603) y normativa conexa, elaborando memoriales con fundamentación idónea.\n\n` +
    `2) En el ámbito ético y deontológico, su desempeño se caracterizó por la puntualidad, confidencialidad, lealtad procesal y probidad en la atención a patrocinados y custodia del archivo forense, consolidando las competencias prácticas exigidas por la Carrera de Derecho.\n\n` +
    `3) Por lo expuesto, se otorga plena CONFORMIDAD y VISTO BUENO institucional al período de prácticas pre-profesionales, recomendando la acreditación de la materia de Pasantía al haber cumplido satisfactoriamente con la totalidad de horas y objetivos formativos previstos.`;
}

// ----------------------------------------------------------------------
// 1. RENDERIZADO DE PÁGINAS CARTA MEMBRETADAS (VISTA PREVIA, IMPRESIÓN Y PDF)
// ----------------------------------------------------------------------
export function renderPaginaHoja({ model, logoSrc, numPag, totalPags, contentHTML, wmOp, modoPresentacion }) {
  const isAcademico = modoPresentacion === 'umsa';
  let headHTML = '';
  let footHTML = '';

  if (isAcademico) {
    headHTML = `
      <div style="border-bottom:2px solid #0e1b2c;padding:12px 2.1cm 8px;text-align:center;font-family:Georgia,serif;">
        <div style="font-size:12px;font-weight:bold;color:#0e1b2c;letter-spacing:1px;text-transform:uppercase;">UNIVERSIDAD MAYOR DE SAN ANDRÉS · FACULTAD DE DERECHO Y CIENCIAS POLÍTICAS</div>
        <div style="font-size:9.5px;color:#a8853c;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;margin-top:2px;">INSTITUTO DE INVESTIGACIONES, SEMINARIOS Y TESIS (IIST) · PLAN DE ESTUDIOS 2017</div>
      </div>
    `;
    footHTML = `
      <div style="border-top:1px solid #d9dce1;padding:8px 2.1cm 12px;display:flex;justify-content:space-between;align-items:center;font-size:9px;color:#5c6675;font-family:Arial,sans-serif;">
        <span>LexFive Bufete de Abogados · Sede Central El Alto - La Paz</span>
        <span style="font-weight:bold;color:#0e1b2c;">Página ${numPag} de ${totalPags}</span>
      </div>
    `;
  } else {
    headHTML = membreteHeader(model, logoSrc);
    footHTML = membreteFooter(model).replace('</div>', `
      <span style="position:relative;z-index:2;font-weight:bold;color:#c2a25a;margin-left:14px;white-space:nowrap;">Página ${numPag} de ${totalPags}</span>
    </div>`);
  }

  const wmHTML = (logoSrc && wmOp && !isAcademico) ? `
    <img src="${logoSrc}" alt="" style="position:absolute;top:50%;left:50%;width:11.5cm;height:11.5cm;object-fit:contain;transform:translate(-50%,-50%);opacity:${Number(wmOp).toFixed(2)};pointer-events:none;z-index:0;">
  ` : '';

  return `
  <div class="hoja-carta" style="display:flex;flex-direction:column;width:21.59cm;min-height:27.94cm;max-height:27.94cm;height:27.94cm;margin:0 auto 24px;background:#fff;color:#101820;font-family:'Times New Roman',Georgia,serif;font-size:12px;line-height:1.45;box-sizing:border-box;overflow:hidden;box-shadow:0 3px 12px rgba(0,0,0,0.12);page-break-after:always;break-after:page;position:relative;">
    ${headHTML}
    <div style="position:relative;flex:1 1 auto;display:flex;flex-direction:column;padding:16px 2.1cm 12px;overflow:hidden;">
      ${wmHTML}
      <div style="position:relative;z-index:1;display:flex;flex-direction:column;flex:1 1 auto;justify-content:flex-start;">
        ${contentHTML}
      </div>
    </div>
    ${footHTML}
  </div>`;
}

export function buildPaginasInforme(d, logoSrc, model, wmOp) {
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
  const fechaDoc = fechaLarga(d.fecha || d.fecha_emision || hoyISO());

  // Docente Guía
  const docente = esc(d.docente_guia || 'Dr. Franklin Rubén Pareja Aliaga');
  const docenteCargo = 'Docente Guía de la Materia de Pasantía · Carrera de Derecho UMSA';

  // Tutor / Abogado Patrocinante
  const tutorNombre = (d.tutor_nombre || '').trim();
  const tutorRpa = (d.tutor_rpa || '').trim();
  let supervisionHtml = '<strong>Abogado(a) Patrocinante – LexFive Bufete de Abogados</strong>';
  let firmaTutorTitulo = 'V.º B.º Abogado(a) Patrocinante / Dirección';
  let firmaTutorSub = 'LexFive · Bufete de Abogados';

  if (tutorNombre) {
    supervisionHtml = `<strong>Abg. ${esc(tutorNombre)}</strong>${tutorRpa ? ` (R.P.A. ${esc(tutorRpa)})` : ''} · LexFive Bufete de Abogados`;
    firmaTutorTitulo = `V.º B.º Abg. ${esc(tutorNombre)}`;
    firmaTutorSub = `${tutorRpa ? `R.P.A. ${esc(tutorRpa)}<br>` : ''}Tutor(a) Institucional · LexFive Bufete de Abogados`;
  }

  const antecedentes = esc(d.antecedentes || `1) Guía de Procedimiento para Pasantías en la Carrera de Derecho, aprobada mediante Resolución del Honorable Consejo Universitario N.º 104/2016.\n2) Nota de Designación de Pasantía N.º ${notaDesig} de fecha ${fechaNota}.`);
  const conclusiones = esc(d.conclusiones || generarConclusionesTexto(d.genero, nombre));
  const fotos = Array.isArray(d.fotos) ? d.fotos : [];
  const modo = d.modo_presentacion || 'lexfive';

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
      <div style="margin-bottom:3px;"><strong>• Supervisión Forense:</strong> ${supervisionHtml}.</div>
      <div><strong>• Ubicación del Despacho:</strong> Av. Alfredo Franco Valle N.º 708-51, Edif. Real, Planta Baja Of. A-6, Ciudad de El Alto - Bolivia.</div>
    </div>

    <div style="font-weight:bold;font-size:12px;color:#0e1b2c;margin-bottom:4px;border-bottom:1px solid #d9dce1;padding-bottom:2px;">I. ANTECEDENTES Y MARCO NORMATIVO</div>
    <div style="white-space:pre-line;text-align:justify;font-size:11.5px;line-height:1.45;">${antecedentes}</div>
  `;

  // PÁGINAS DE ACTIVIDADES CRONOLÓGICAS (Semana a semana)
  const jornadas = calcularJornadasPasantia(d.fecha_inicio, d.fecha_fin, d.modalidad, d.feriados_extra, d.customTareas);
  const semanasMap = {};
  jornadas.forEach(j => {
    const sem = j.semanaIdx || Math.floor((j.numero - 1) / 5) + 1;
    if (!semanasMap[sem]) semanasMap[sem] = [];
    semanasMap[sem].push(j);
  });

  const paginasActividades = [];
  const semanasKeys = Object.keys(semanasMap);

  if (semanasKeys.length) {
    // Si hay semanas, empaquetamos 1 o 2 semanas por página según cantidad
    const semPorPagina = (semanasKeys.length <= 2) ? 1 : (jornadas.length <= 10 ? 1 : 2);
    for (let i = 0; i < semanasKeys.length; i += semPorPagina) {
      const slice = semanasKeys.slice(i, i + semPorPagina);
      let content = `
        <div style="font-weight:bold;font-size:12px;color:#0e1b2c;margin-bottom:8px;border-bottom:1px solid #d9dce1;padding-bottom:2px;page-break-after:avoid;">
          ${i === 0 ? 'II. DETALLE CRONOLÓGICO DE FUNCIONES Y ACTIVIDADES REALIZADAS' : 'II. DETALLE CRONOLÓGICO DE FUNCIONES (Continuación)'}
        </div>
        <p style="margin:0 0 8px;font-size:11px;text-align:justify;">Las funciones se desempeñaron de lunes a viernes en el horario asignado:</p>
      `;

      slice.forEach(semNum => {
        const diasSem = semanasMap[semNum];
        content += `
          <div style="background:#f4f6f9;border-left:3px solid #a8853c;padding:3px 8px;margin:8px 0 4px;font-size:11px;font-weight:bold;color:#0e1b2c;">
            SEMANA ${semNum} (Jornadas ${diasSem[0].numero} a ${diasSem[diasSem.length - 1].numero})
          </div>
        `;
        diasSem.forEach(dj => {
          content += `
            <div style="margin-bottom:6px;padding-left:4px;">
              <div style="font-size:10.5px;font-weight:bold;color:#101820;">
                • Jornada ${dj.numero} (${dj.diaSemana} ${dj.fecha || '—'}): <span style="font-weight:normal;color:#333;">${esc(dj.tarea.resumen)}</span>
              </div>
              <ul style="margin:2px 0 4px 16px;padding:0;font-size:9.5px;line-height:1.3;color:#444;">
                ${dj.tarea.actividades.map(act => `<li>${esc(act)}</li>`).join('')}
              </ul>
            </div>
          `;
        });
      });

      paginasActividades.push(content);
    }
  } else {
    // Fallback a texto libre de actividades si no hay jornadas estructuradas
    paginasActividades.push(`
      <div style="font-weight:bold;font-size:12px;color:#0e1b2c;margin-bottom:8px;border-bottom:1px solid #d9dce1;padding-bottom:2px;page-break-after:avoid;">II. DETALLE DE FUNCIONES REALIZADAS</div>
      <p style="margin:0 0 10px;text-align:justify;">A continuación se describen las funciones asignadas y ejecutadas:</p>
      <div style="white-space:pre-line;font-size:11px;line-height:1.4;">${esc(d.actividades || 'Práctica forense en estrados judiciales y despacho.')}</div>
    `);
  }

  // PÁGINA DE CONCLUSIONES Y VISTO BUENO (Termina con firmas limpias)
  const pagConclusionesHTML = `
    <div style="font-weight:bold;font-size:12px;color:#0e1b2c;margin-bottom:8px;border-bottom:1px solid #d9dce1;padding-bottom:2px;page-break-after:avoid;">III. CONCLUSIONES Y VISTO BUENO INSTITUCIONAL</div>
    <p style="margin:0 0 10px;text-align:justify;text-indent:18px;">
      Habiendo concluido satisfactoriamente el ciclo programado de prácticas pre-profesionales, se establecen las siguientes conclusiones institucionales y valorativas:
    </p>

    <div style="white-space:pre-line;font-size:11px;line-height:1.45;text-align:justify;margin-bottom:16px;">${conclusiones}</div>

    <p style="margin:0 0 24px;text-align:justify;">
      Es cuanto tengo a bien informar a su autoridad en honor a la verdad, para los fines académicos consiguientes.
    </p>

    <div style="margin-top:auto;border:1px solid #d9dce1;border-radius:6px;padding:12px 16px;background:#fafbfc;">
      <div style="text-align:center;font-size:9px;font-weight:bold;letter-spacing:1px;color:#0e1b2c;margin-bottom:8px;">VALIDACIÓN Y CONFORMIDAD INSTITUCIONAL</div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:20px;">
        <div style="text-align:center;flex:1;">
          <div style="min-height:55px;"></div>
          <div style="border-top:1.2px solid #0e1b2c;padding-top:4px;font-size:10px;font-weight:bold;color:#0e1b2c;">Univ. ${nombre}</div>
          <div style="font-size:8.5px;color:#5c6675;">Estudiante Pasante<br>R.U. ${ru} · C.I. ${ci}</div>
        </div>
        <div style="text-align:center;flex:1;">
          <div style="min-height:55px;"></div>
          <div style="border-top:1.2px solid #0e1b2c;padding-top:4px;font-size:10px;font-weight:bold;color:#0e1b2c;">${firmaTutorTitulo}</div>
          <div style="font-size:8.5px;color:#5c6675;">${firmaTutorSub}</div>
        </div>
      </div>
    </div>
  `;

  // PÁGINA DE ANEXOS (Siempre en hoja nueva limpia)
  const pagAnexosHTML = `
    <div style="font-weight:bold;font-size:12px;color:#0e1b2c;margin-bottom:8px;border-bottom:1px solid #d9dce1;padding-bottom:2px;page-break-after:avoid;">IV. ÍNDICE DE ANEXOS Y CONSTANCIAS DE RESPALDO</div>
    <p style="margin:0 0 12px;text-align:justify;text-indent:18px;">
      En cumplimiento a los requerimientos normativos del Instituto de Investigaciones, Seminarios y Tesis (IIST) de la Carrera de Derecho, se adjunta al presente informe la documentación de respaldo que acredita fehacientemente la realización efectiva de la pasantía:
    </p>

    <table style="width:100%;border-collapse:collapse;font-size:10.5px;margin-bottom:16px;">
      <thead>
        <tr style="background:#0e1b2c;color:#fff;">
          <th style="padding:6px 8px;text-align:center;width:35px;border:1px solid #0e1b2c;">N.º</th>
          <th style="padding:6px 10px;text-align:left;border:1px solid #0e1b2c;">Instrumento o Constancia de Respaldo</th>
          <th style="padding:6px 8px;text-align:center;width:150px;border:1px solid #0e1b2c;">Verificación</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:6px;text-align:center;border:1px solid #d9dce1;font-weight:bold;">1</td>
          <td style="padding:6px 10px;border:1px solid #d9dce1;"><strong>Nota Oficial de Designación de Pasantía</strong> emitida por la Dirección de Carrera / IIST</td>
          <td style="padding:6px;text-align:center;border:1px solid #d9dce1;">N.º ${notaDesig}</td>
        </tr>
        <tr style="background:#f8f9fb;">
          <td style="padding:6px;text-align:center;border:1px solid #d9dce1;font-weight:bold;">2</td>
          <td style="padding:6px 10px;border:1px solid #d9dce1;"><strong>Carta de Aceptación Institucional</strong> emitida por el Bufete de Abogados LexFive</td>
          <td style="padding:6px;text-align:center;border:1px solid #d9dce1;">Original adjunto</td>
        </tr>
        <tr>
          <td style="padding:6px;text-align:center;border:1px solid #d9dce1;font-weight:bold;">3</td>
          <td style="padding:6px 10px;border:1px solid #d9dce1;"><strong>Certificado Oficial de Conclusión de Pasantía</strong> con código QR de verificación digital</td>
          <td style="padding:6px;text-align:center;border:1px solid #d9dce1;">Ref. ${esc(d.ref || 'Verificable')}</td>
        </tr>
        <tr style="background:#f8f9fb;">
          <td style="padding:6px;text-align:center;border:1px solid #d9dce1;font-weight:bold;">4</td>
          <td style="padding:6px 10px;border:1px solid #d9dce1;"><strong>Hoja de Control de Asistencia y Permanencia</strong> (20 jornadas hábiles con sellos institucionales)</td>
          <td style="padding:6px;text-align:center;border:1px solid #d9dce1;">Formulario sellado</td>
        </tr>
        <tr>
          <td style="padding:6px;text-align:center;border:1px solid #d9dce1;font-weight:bold;">5</td>
          <td style="padding:6px 10px;border:1px solid #d9dce1;"><strong>Muestrario de Actuaciones Forenses</strong> (copias simples de memoriales redactados y diligenciados)</td>
          <td style="padding:6px;text-align:center;border:1px solid #d9dce1;">Compulsa adjunta</td>
        </tr>
        <tr style="background:#f8f9fb;">
          <td style="padding:6px;text-align:center;border:1px solid #d9dce1;font-weight:bold;">6</td>
          <td style="padding:6px 10px;border:1px solid #d9dce1;"><strong>Registro Fotográfico de Prácticas Forenses</strong> (acompañamiento en estrados e instalaciones)</td>
          <td style="padding:6px;text-align:center;border:1px solid #d9dce1;">${fotos.length ? `${fotos.length} fotos adjuntas` : 'Fotografías anexas'}</td>
        </tr>
      </tbody>
    </table>

    <div style="background:#f8f9fb;border-left:3px solid #a8853c;padding:8px 12px;font-size:10px;color:#555;line-height:1.4;">
      <strong>Nota aclaratoria:</strong> Todos los respaldos adjuntos cuentan con la firma, sello y conformidad de los abogados directores y tutores del Despacho Jurídico LexFive, gozando de plena validez para la evaluación académica.
    </div>
  `;

  // PÁGINAS FOTOGRÁFICAS (Opcional, 2 fotos por hoja)
  const paginasFotos = [];
  if (fotos.length) {
    for (let fIdx = 0; fIdx < fotos.length; fIdx += 2) {
      const sliceFotos = fotos.slice(fIdx, fIdx + 2);
      const fotoContent = `
        <div style="font-weight:bold;font-size:12px;color:#0e1b2c;margin-bottom:8px;border-bottom:1px solid #d9dce1;padding-bottom:2px;page-break-after:avoid;">
          REGISTRO FOTOGRÁFICO DE PRÁCTICAS FORENSES (Fotografías ${fIdx + 1} a ${fIdx + sliceFotos.length})
        </div>
        <p style="margin:0 0 10px;font-size:10px;color:#555;">Evidencia gráfica del desarrollo de labores forenses y académicas:</p>
        <div style="display:flex;flex-direction:column;gap:16px;align-items:center;margin-top:4px;">
          ${sliceFotos.map((foto, idx) => `
            <div style="border:1px solid #d9dce1;border-radius:6px;padding:6px;background:#fafbfc;width:100%;max-width:16cm;text-align:center;">
              <div style="height:8.8cm;width:100%;display:flex;align-items:center;justify-content:center;background:#000;border-radius:4px;overflow:hidden;">
                <img src="${foto.src}" style="max-height:100%;max-width:100%;object-fit:contain;" alt="">
              </div>
              <div style="font-size:9.5px;color:#333;margin-top:6px;font-family:Arial,sans-serif;">
                <strong>Fotografía N.º ${fIdx + idx + 1}:</strong> ${esc(foto.pie || 'Práctica jurídica en dependencias del despacho LexFive')}
              </div>
            </div>
          `).join('')}
        </div>
      `;
      paginasFotos.push(fotoContent);
    }
  }

  // Juntar todas las páginas y numerar
  const rawPaginas = [pag1HTML, ...paginasActividades, pagConclusionesHTML, pagAnexosHTML, ...paginasFotos];
  const total = rawPaginas.length;

  return rawPaginas.map((html, idx) => renderPaginaHoja({
    model,
    logoSrc,
    numPag: idx + 1,
    totalPags: total,
    contentHTML: html,
    wmOp,
    modoPresentacion: modo
  })).join('');
}

// ----------------------------------------------------------------------
// 2. DOCUMENTO WORD (.DOC) COMPATIBLE CON TABLAS, BASE64 LOGO Y @PAGE
// ----------------------------------------------------------------------
export function buildInformeWordDocument(d, logoSrc) {
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
  const fechaDoc = fechaLarga(d.fecha || d.fecha_emision || hoyISO());
  const ref = esc(d.ref || 'LF-2026-00000');

  // Docente Guía
  const docente = esc(d.docente_guia || 'Dr. Franklin Rubén Pareja Aliaga');
  const docenteCargo = 'Docente Guía de la Materia de Pasantía · Carrera de Derecho UMSA';

  // Tutor / Abogado Patrocinante
  const tutorNombre = (d.tutor_nombre || '').trim();
  const tutorRpa = (d.tutor_rpa || '').trim();
  let supervisionHtml = '<strong>Abogado(a) Patrocinante – LexFive Bufete de Abogados</strong>';
  let firmaTutorTitulo = 'V.º B.º Abogado(a) Patrocinante / Dirección';
  let firmaTutorSub = 'LexFive · Bufete de Abogados';

  if (tutorNombre) {
    supervisionHtml = `<strong>Abg. ${esc(tutorNombre)}</strong>${tutorRpa ? ` (R.P.A. ${esc(tutorRpa)})` : ''} · LexFive Bufete de Abogados`;
    firmaTutorTitulo = `V.º B.º Abg. ${esc(tutorNombre)}`;
    firmaTutorSub = `${tutorRpa ? `R.P.A. ${esc(tutorRpa)}<br>` : ''}Tutor(a) Institucional · LexFive Bufete de Abogados`;
  }

  const antecedentes = esc(d.antecedentes || `1) Guía de Procedimiento para Pasantías en la Carrera de Derecho, aprobada mediante Resolución del Honorable Consejo Universitario N.º 104/2016.\n2) Nota de Designación de Pasantía N.º ${notaDesig} de fecha ${fechaNota}.`);
  const conclusiones = esc(d.conclusiones || generarConclusionesTexto(d.genero, nombre));
  const fotos = Array.isArray(d.fotos) ? d.fotos : [];

  // Agrupar jornadas por semanas para Word
  const jornadas = calcularJornadasPasantia(d.fecha_inicio, d.fecha_fin, d.modalidad, d.feriados_extra, d.customTareas);
  const semanasMap = {};
  jornadas.forEach(j => {
    const sem = j.semanaIdx || Math.floor((j.numero - 1) / 5) + 1;
    if (!semanasMap[sem]) semanasMap[sem] = [];
    semanasMap[sem].push(j);
  });

  let cronogramaWordHtml = '';
  Object.keys(semanasMap).forEach(semNum => {
    const dias = semanasMap[semNum];
    cronogramaWordHtml += `
      <h3 style="font-size:11pt;font-weight:bold;color:#8a6d2b;border-bottom:1pt solid #ccc;padding-bottom:2pt;margin-top:14pt;page-break-after:avoid;">
        SEMANA ${semNum} (Jornadas ${dias[0].numero} a ${dias[dias.length - 1].numero})
      </h3>
    `;
    dias.forEach(dj => {
      cronogramaWordHtml += `
        <div style="margin-bottom:6pt;page-break-inside:avoid;">
          <p style="margin:0 0 2pt;font-weight:bold;font-size:10pt;text-indent:0;">
            • Día ${dj.numero} (${dj.diaSemana} ${dj.fecha}): <span style="font-weight:normal;color:#222;">${esc(dj.tarea.resumen)}</span>
          </p>
          <ul style="margin:2pt 0 4pt 20pt;font-size:9.5pt;line-height:1.35;">
            ${dj.tarea.actividades.map(act => `<li>${esc(act)}</li>`).join('')}
          </ul>
        </div>
      `;
    });
  });

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
    margin: 2.54cm 2.2cm 2.54cm 2.2cm;
    mso-header-margin: 1.25cm;
    mso-footer-margin: 1.25cm;
    mso-header: h1;
    mso-footer: f1;
  }
  div.Section1 { page: Section1; }
  p, li, td, th, div {
    font-family: 'Times New Roman', Georgia, serif;
    font-size: 11pt;
    line-height: 1.4;
    color: #000;
  }
  h1, h2, h3, h4 {
    page-break-after: avoid;
    break-after: avoid;
    color: #0e1b2c;
  }
  h1 {
    font-size: 15pt;
    text-align: center;
    text-transform: uppercase;
    margin: 0 0 4pt;
    font-weight: bold;
  }
  h2 {
    font-size: 12pt;
    font-weight: bold;
    border-bottom: 1.5pt solid #b89446;
    padding-bottom: 2pt;
    margin: 16pt 0 6pt;
  }
  p {
    margin: 0 0 6pt;
    text-align: justify;
    text-indent: 18pt;
  }
  .p-noint {
    text-indent: 0;
  }
  table.data-table {
    width: 100%;
    border-collapse: collapse;
    margin: 8pt 0 12pt;
  }
  table.data-table th, table.data-table td {
    border: 1pt solid #444;
    padding: 4pt 6pt;
    font-size: 10pt;
    text-align: left;
  }
  table.data-table th {
    background-color: #f2f2f2;
    font-weight: bold;
  }
  .page-break {
    page-break-before: always;
    break-before: page;
  }
</style>
</head>
<body>
<div class="Section1">

<!-- Encabezado Word -->
<div style="mso-element:header" id="h1">
  <table width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;border-bottom:2pt solid #b89446;margin-bottom:12pt;">
    <tr>
      <td width="75" style="width:75px;vertical-align:middle;padding:3pt 6pt 5pt 0;">
        ${logoSrc ? `<img src="${logoSrc}" width="65" height="65" style="width:65px;height:65px;" alt="LexFive">` : ''}
      </td>
      <td style="vertical-align:middle;text-align:right;padding:3pt 0 5pt 6pt;">
        <div style="font-family:Georgia,serif;font-size:17pt;font-weight:bold;color:#0e1b2c;">Lex<span style="color:#b89446;">Five</span></div>
        <div style="font-family:Arial,sans-serif;font-size:8pt;font-weight:bold;letter-spacing:1.5pt;color:#8a6d2b;text-transform:uppercase;">Bufete de Abogados · Área de Litigio y Diligenciamiento</div>
        <div style="font-family:Arial,sans-serif;font-size:7.5pt;color:#555;">Av. Alfredo Franco Valle 708-51, Edif. Real Of. A-6 · El Alto - Bolivia · Tel: +591 78360469</div>
      </td>
    </tr>
  </table>
</div>

<!-- Pie de página Word -->
<div style="mso-element:footer" id="f1">
  <table width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;border-top:1pt solid #b89446;margin-top:10pt;">
    <tr>
      <td style="font-family:Arial,sans-serif;font-size:8pt;color:#555;padding-top:3pt;text-align:left;">
        LexFive Bufete de Abogados · Sede Central El Alto - La Paz · Ref. N.º ${ref}
      </td>
      <td style="font-family:Arial,sans-serif;font-size:8pt;color:#555;padding-top:3pt;text-align:right;">
        Página <span style="mso-field-code:' PAGE '"></span> de <span style="mso-field-code:' NUMPAGES '"></span>
      </td>
    </tr>
  </table>
</div>

<h1>INFORME ÚNICO DE PASANTÍA PRE-PROFESIONAL</h1>
<div style="text-align:center;font-size:10.5pt;color:#8a6d2b;font-weight:bold;margin-bottom:12pt;">${uni} · ${carrera}</div>

<table width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;border-top:1.5pt solid #0e1b2c;border-bottom:1.5pt solid #0e1b2c;margin-bottom:12pt;font-size:10.5pt;">
  <tr><td width="70" style="width:70pt;font-weight:bold;padding:3pt 0;">A:</td><td style="padding:3pt 0;"><strong>${docente}</strong><br><span style="font-size:9pt;color:#444;">${docenteCargo}</span></td></tr>
  <tr><td style="font-weight:bold;padding:3pt 0;">DE:</td><td style="padding:3pt 0;"><strong>Univ. ${nombre}</strong> &nbsp;|&nbsp; R.U.: ${ru} &nbsp;|&nbsp; C.I.: ${ci}</td></tr>
  <tr><td style="font-weight:bold;padding:3pt 0;">REF.:</td><td style="padding:3pt 0;"><strong>INFORME ÚNICO DE PASANTÍA PRE-PROFESIONAL (${asignatura})</strong></td></tr>
  <tr><td style="font-weight:bold;padding:3pt 0;">FECHA:</td><td style="padding:3pt 0;">${fechaDoc}</td></tr>
</table>

<p class="p-noint"><strong>Distinguido Docente Guía:</strong></p>
<p>A tiempo de hacerle llegar un cordial y distinguido saludo, en cumplimiento a las normativas de la Carrera de Derecho de la Universidad Mayor de San Andrés, pongo a su conocimiento el presente <strong>Informe Único de Pasantía</strong> bajo las siguientes características institucionales:</p>

<table class="data-table">
  <tr><th width="30%">Institución Receptora:</th><td>Bufete de Abogados "LexFive" (Área de Litigio, Asesoría Jurídica y Diligenciamiento Procesal)</td></tr>
  <tr><th>Duración y Modalidad:</th><td>${duracion} (${modalidad} · Horario: ${horario})</td></tr>
  <tr><th>Supervisión Forense:</th><td>${supervisionHtml}</td></tr>
  <tr><th>Ubicación del Despacho:</th><td>Av. Alfredo Franco Valle 708-51, Edif. Real Of. A-6, La Ceja, El Alto - Bolivia</td></tr>
</table>

<h2>I. ANTECEDENTES Y MARCO NORMATIVO</h2>
<div style="white-space:pre-line;font-size:10.5pt;line-height:1.45;margin-bottom:10pt;">${antecedentes}</div>

<div class="page-break"></div>

<h2>II. DETALLE CRONOLÓGICO DE FUNCIONES Y ACTIVIDADES REALIZADAS</h2>
<p class="p-noint">Las funciones forenses se ejecutaron de lunes a viernes bajo el cronograma oficial coordinado con el despacho:</p>
${cronogramaWordHtml}

<div class="page-break"></div>

<h2>III. CONCLUSIONES Y VISTO BUENO INSTITUCIONAL</h2>
<p class="p-noint">Habiendo completado satisfactoriamente el ciclo de pasantía, se formulan las siguientes conclusiones:</p>
<div style="white-space:pre-line;font-size:10.5pt;line-height:1.45;margin-bottom:16pt;">${conclusiones}</div>

<p style="margin-top:14pt;" class="p-noint">Es cuanto se informa en honor a la verdad y para los fines académicos consiguientes.</p>

<table width="100%" cellspacing="0" cellpadding="0" style="width:100%;margin-top:36pt;border-collapse:collapse;">
  <tr>
    <td width="50%" align="center" style="width:50%;text-align:center;padding:0 15pt;vertical-align:bottom;">
      <div style="border-top:1.5pt solid #000;padding-top:4pt;font-weight:bold;font-size:10pt;">Univ. ${nombre}</div>
      <div style="font-size:8.5pt;color:#555;">Estudiante Pasante<br>R.U. ${ru} · C.I. ${ci}</div>
    </td>
    <td width="50%" align="center" style="width:50%;text-align:center;padding:0 15pt;vertical-align:bottom;">
      <div style="border-top:1.5pt solid #000;padding-top:4pt;font-weight:bold;font-size:10pt;">${firmaTutorTitulo}</div>
      <div style="font-size:8.5pt;color:#555;">${firmaTutorSub}</div>
    </td>
  </tr>
</table>

<div class="page-break"></div>

<h2>IV. ÍNDICE DE ANEXOS Y CONSTANCIAS DE RESPALDO</h2>
<p class="p-noint">Se adjuntan al presente informe los instrumentos de respaldo correspondientes:</p>

<table class="data-table">
  <tr><th width="35">N.º</th><th>Documento</th><th width="160">Verificación</th></tr>
  <tr><td align="center">1</td><td>Nota Oficial de Designación de Pasantía</td><td>N.º ${notaDesig}</td></tr>
  <tr><td align="center">2</td><td>Carta de Aceptación de Pasantía de LexFive</td><td>Original adjunto</td></tr>
  <tr><td align="center">3</td><td>Certificado Oficial de Pasantía Jurídica LexFive</td><td>Ref. ${ref}</td></tr>
  <tr><td align="center">4</td><td>Hoja de Control de Asistencia y Permanencia</td><td>Validada por LexFive (20 días hábiles)</td></tr>
  <tr><td align="center">5</td><td>Muestrario de Actuaciones Forenses</td><td>Compulsa adjunta</td></tr>
  <tr><td align="center">6</td><td>Registro Fotográfico de Prácticas Forenses</td><td>${fotos.length ? `${fotos.length} fotografías adjuntas` : 'Anexo fotográfico'}</td></tr>
</table>

${fotos.length ? `
  <div class="page-break"></div>
  <h2>ANEXO: REGISTRO FOTOGRÁFICO DE ACTIVIDADES</h2>
  ${fotos.map((f, i) => `
    <div style="text-align:center;margin-bottom:18pt;page-break-inside:avoid;">
      <img src="${f.src}" style="max-width:16cm;max-height:9.5cm;" alt=""><br>
      <span style="font-size:8.5pt;font-family:Arial,sans-serif;"><strong>Fotografía N.º ${i + 1}:</strong> ${esc(f.pie || 'Práctica forense en LexFive')}</span>
    </div>
  `).join('')}
` : ''}

</div>
</body>
</html>`;
}

// ----------------------------------------------------------------------
// 3. HOJA DE ASISTENCIA Y PERMANENCIA (1 HOJA CARTA MEMBRETADA)
// ----------------------------------------------------------------------
export function buildHojaAsistenciaHTML(d, logoSrc, model) {
  const nombre = esc(d.nombre || '___________________');
  const ci = esc(d.ci || '—');
  const ru = esc(d.registro_universitario || d.ru || '—');
  const uni = esc(d.universidad || 'Universidad Mayor de San Andrés (UMSA)');
  const carrera = esc(d.carrera_plan || 'Carrera de Derecho – Plan de Estudios 2017');
  const asignatura = esc(d.asignatura || 'CJR-410 Pasantía I');
  const modalidad = esc(d.modalidad || '4 semanas a medio tiempo (4 horas diarias)');
  const horario = esc(d.horario || '14:00 a 18:00');
  const prellenar = d.prellenar_asistencia !== false;

  const jornadas = calcularJornadasPasantia(d.fecha_inicio, d.fecha_fin, d.modalidad, d.feriados_extra, d.customTareas);
  const infoHoras = extraerHoras(d.horario, d.modalidad);

  const totalJornadas = jornadas.length;
  const totalHoras = totalJornadas * infoHoras.horas;

  let rows = '';
  for (let i = 0; i < totalJornadas; i++) {
    const j = jornadas[i];
    const fecha = prellenar ? (j.fecha || '') : '';
    const ing = prellenar ? infoHoras.ingreso : '';
    const sal = prellenar ? infoHoras.salida : '';
    const act = prellenar ? esc(j.tarea.resumen) : '';
    const hrs = prellenar ? infoHoras.horas : '';

    rows += `
      <tr style="height:19px;">
        <td style="text-align:center;font-weight:bold;color:#444;font-size:8px;padding:2px 3px;border:1px solid #d9dce1;">${j.numero}</td>
        <td style="padding:2px 3px;font-size:8px;text-align:center;border:1px solid #d9dce1;white-space:nowrap;">${fecha}</td>
        <td style="padding:2px 3px;font-size:8px;text-align:center;border:1px solid #d9dce1;">${ing}</td>
        <td style="padding:2px 3px;font-size:8px;text-align:center;border:1px solid #d9dce1;">${sal}</td>
        <td style="padding:2px 5px;font-size:7.5px;color:#222;border:1px solid #d9dce1;line-height:1.25;">${act}</td>
        <td style="padding:2px 3px;font-size:8px;text-align:center;border:1px solid #d9dce1;font-weight:600;">${hrs}</td>
      </tr>`;
  }

  const contentHTML = `
    <div style="text-align:right;font-size:9.5px;color:#5c6675;font-family:Arial,sans-serif;margin-bottom:2px;">Ref. N.º ${esc(d.ref || '')} · Hoja de Asistencia</div>
    <h1 style="text-align:center;font-size:14.5px;letter-spacing:1px;color:#0e1b2c;margin:2px 0 1px;text-transform:uppercase;">HOJA DE CONTROL DE ASISTENCIA Y PERMANENCIA</h1>
    <div style="text-align:center;font-size:9px;color:#a8853c;font-family:Arial,sans-serif;letter-spacing:1.5px;margin-bottom:6px;font-weight:bold;">PRÁCTICA PRE-PROFESIONAL / PASANTÍA JURÍDICA</div>

    <div style="background:#f8f9fb;border:1px solid #d9dce1;border-radius:6px;padding:5px 8px;margin-bottom:6px;font-size:8.5px;line-height:1.35;color:#1a2332;">
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:4px;">
        <div><strong>Estudiante / Pasante:</strong> ${nombre}</div>
        <div><strong>C.I.:</strong> ${ci}</div>
        <div><strong>R.U.:</strong> ${ru}</div>
      </div>
      <div style="display:grid;grid-template-columns:2fr 2fr;gap:4px;margin-top:2px;">
        <div><strong>Universidad:</strong> ${uni}</div>
        <div><strong>Carrera:</strong> ${carrera}</div>
      </div>
      <div style="display:grid;grid-template-columns:1.5fr 1.5fr 1fr;gap:4px;margin-top:2px;">
        <div><strong>Asignatura:</strong> ${asignatura}</div>
        <div><strong>Modalidad:</strong> ${modalidad}</div>
        <div><strong>Horario:</strong> ${horario}</div>
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;font-size:8px;margin-bottom:6px;">
      <thead>
        <tr style="background:#0e1b2c;color:#fff;">
          <th style="padding:3px 2px;width:24px;border:1px solid #0e1b2c;text-align:center;">N.º</th>
          <th style="padding:3px 2px;width:65px;border:1px solid #0e1b2c;text-align:center;">Fecha</th>
          <th style="padding:3px 2px;width:48px;border:1px solid #0e1b2c;text-align:center;">Ingreso</th>
          <th style="padding:3px 2px;width:48px;border:1px solid #0e1b2c;text-align:center;">Salida</th>
          <th style="padding:3px 4px;border:1px solid #0e1b2c;text-align:left;">Resumen de Actividades Forenses Desarrolladas</th>
          <th style="padding:3px 2px;width:34px;border:1px solid #0e1b2c;text-align:center;">Horas</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
      <tfoot>
        <tr style="background:#eef1f5;font-weight:bold;">
          <td colspan="5" style="text-align:right;padding:3px 8px;border:1px solid #d9dce1;font-size:8.5px;">TOTAL HORAS REGISTRADAS:</td>
          <td style="text-align:center;padding:3px 2px;border:1px solid #d9dce1;color:#0e1b2c;font-size:9px;">${totalHoras} hrs</td>
        </tr>
      </tfoot>
    </table>

    <div style="border:1px solid #d9dce1;border-radius:5px;padding:6px 12px;background:#f8f9fb;margin-top:auto;">
      <div style="text-align:center;font-size:8px;font-weight:bold;color:#0e1b2c;letter-spacing:1px;margin-bottom:4px;">VALIDACIÓN Y CONFORMIDAD INSTITUCIONAL</div>
      <div style="display:flex;justify-content:center;align-items:flex-end;gap:12px;">
        <div style="text-align:center;width:260px;">
          <div style="min-height:38px;"></div>
          <div style="border-top:1.2px solid #0e1b2c;padding-top:2px;font-size:8.5px;font-weight:bold;color:#0e1b2c;">Sello y Firma · Abogado(a) Patrocinante</div>
          <div style="font-size:7.5px;color:#5c6675;">LexFive · Bufete de Abogados</div>
        </div>
      </div>
    </div>
  `;

  return `
    <div class="hoja-carta" style="display:flex;flex-direction:column;width:21.59cm;min-height:27.94cm;max-height:27.94cm;height:27.94cm;margin:0 auto;background:#fff;color:#101820;box-sizing:border-box;overflow:hidden;box-shadow:0 3px 12px rgba(0,0,0,0.12);position:relative;">
      ${membreteHeader(model, logoSrc)}
      <div style="position:relative;flex:1 1 auto;display:flex;flex-direction:column;padding:12px 2.1cm 8px;overflow:hidden;">
        ${contentHTML}
      </div>
      ${membreteFooter(model)}
    </div>`;
}

// ----------------------------------------------------------------------
// 4. ACCIONES DE EXPORTACIÓN (PDF, WORD, IMPRESIÓN)
// ----------------------------------------------------------------------
export function descargarHojaAsistenciaPDF(d, logoSrc, model) {
  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'fixed';
  tempDiv.style.left = '-9999px';
  tempDiv.style.top = '0';
  tempDiv.innerHTML = buildHojaAsistenciaHTML(d, logoSrc, model);
  document.body.appendChild(tempDiv);

  const ejecutar = () => {
    const opt = {
      margin: 0,
      filename: `asistencia-${(d.nombre || 'pasante').toLowerCase().replace(/[^\w]+/g, '-')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    window.html2pdf().set(opt).from(tempDiv).save().then(() => {
      tempDiv.remove();
      toast('Hoja de asistencia descargada en PDF.', 'success');
    }).catch(err => {
      tempDiv.remove();
      console.error(err);
      toast('Error al generar PDF de asistencia.', 'error');
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
}

export function descargarInformePDF(d, logoSrc, model, wmOp) {
  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'fixed';
  tempDiv.style.left = '-9999px';
  tempDiv.style.top = '0';
  tempDiv.innerHTML = buildPaginasInforme(d, logoSrc, model, wmOp);
  document.body.appendChild(tempDiv);

  const ejecutar = () => {
    const opt = {
      margin: 0,
      filename: `informe-pasantia-${(d.nombre || 'umsa').toLowerCase().replace(/[^\w]+/g, '-')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    };
    window.html2pdf().set(opt).from(tempDiv).save().then(() => {
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
}

export function imprimirInformeDocumento(d, logoSrc, model, wmOp) {
  const docHTML = buildPaginasInforme(d, logoSrc, model, wmOp);
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
}

export async function descargarInformeWordDoc(d, logoSrc) {
  toast('Preparando documento Word membretado...', 'info');
  const base64Logo = await getLogoBase64(logoSrc);
  const html = buildInformeWordDocument(d, base64Logo);
  const nombre = 'informe-pasantia-' + ((d.nombre || 'umsa').toLowerCase().replace(/[^\w]+/g, '-').slice(0, 35)) + '.doc';
  descargarArchivo(nombre, '\ufeff' + html, 'application/msword');
  toast('Informe descargado en Word.', 'success');
}
