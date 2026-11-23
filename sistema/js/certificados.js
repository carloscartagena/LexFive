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

export { PASANTIA_CRONOGRAMA_BASE, obtenerTratamiento, calcularJornadasPasantia, extraerHoras, fechaLarga };

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

// Catálogo base de 20 jornadas de práctica forense y actividades jurídicas (sincronizadas entre Asistencia e Informe Word)
const PASANTIA_CRONOGRAMA_BASE = [
  // SEMANA 1: Inducción, Deontología y Manejo de Expedientes
  { dia: 1, semana: 1, resumen: 'Inducción institucional, normativa deontológica, confidencialidad y protocolos de despacho.', detalle: 'Inducción institucional sobre normas deontológicas del ejercicio de la abogacía, protocolos de reserva, confidencialidad profesional y funcionamiento orgánico del bufete LexFive.' },
  { dia: 2, semana: 1, resumen: 'Revisión, organización física y foliado correlativo de cuadernos procesales civiles y familiares.', detalle: 'Revisión, organización física y foliado correlativo de cuadernos procesales en materias Civil, Comercial y Familiar.' },
  { dia: 3, semana: 1, resumen: 'Clasificación de resoluciones, autos interlocutorios y notificaciones judiciales.', detalle: 'Clasificación y archivo cronológico de actuaciones judiciales, resoluciones, providencias y notificaciones judiciales.' },
  { dia: 4, semana: 1, resumen: 'Capacitación y registro de causas activas en el sistema informático interno del despacho.', detalle: 'Capacitación en el uso y registro del sistema informático interno del despacho para control de plazos procesales y estado de causas.' },
  { dia: 5, semana: 1, resumen: 'Auditoría de términos y vencimiento de plazos perentorios en procesos ejecutivos y ordinarios.', detalle: 'Auditoría procesal y elaboración del rol de vencimiento de términos y plazos perentorios en procesos ejecutivos y ordinarios.' },

  // SEMANA 2: Diligenciamiento Judicial y Procuraduría Forense
  { dia: 6, semana: 2, resumen: 'Verificación de expedientes en juzgados públicos civiles y comerciales de El Alto.', detalle: 'Seguimiento y verificación de causas en juzgados públicos en materia civil y comercial del Tribunal Departamental de Justicia en El Alto.' },
  { dia: 7, semana: 2, resumen: 'Revisión de cuadernos de control jurisdiccional e investigaciones en materia penal.', detalle: 'Revisión de cuadernos procesales y de control jurisdiccional en juzgados de instrucción penal y fiscalías corporativas.' },
  { dia: 8, semana: 2, resumen: 'Diligenciamiento de órdenes judiciales, citaciones y emplazamientos a partes demandadas.', detalle: 'Diligenciamiento de mandamientos, órdenes judiciales, citaciones y emplazamientos a través de oficiales de diligencias.' },
  { dia: 9, semana: 2, resumen: 'Seguimiento a buzón judicial electrónico y notificaciones en sistema digital Hermes/Thor.', detalle: 'Revisión y compulsa de notificaciones en el buzón judicial electrónico y plataforma digital del Tribunal Supremo de Justicia.' },
  { dia: 10, semana: 2, resumen: 'Elaboración de fichas síntesis del estado procesal de causas asignadas para informe de cartera.', detalle: 'Elaboración de fichas síntesis de estado procesal de cada caso asignado con alerta de vencimiento de plazos y memoriales pendientes.' },

  // SEMANA 3: Redacción Jurídica, Borradores de Memoriales y Doctrina
  { dia: 11, semana: 3, resumen: 'Redacción de borradores de memoriales de apersonamiento y copias legalizadas.', detalle: 'Redacción de borradores de memoriales procesales de mero trámite: apersonamientos, solicitudes de fotocopias legalizadas y desarchivo de causas.' },
  { dia: 12, semana: 3, resumen: 'Redacción de borradores de señalamiento de audiencias y peticiones de conminatoria.', detalle: 'Elaboración de borradores de solicitudes de señalamiento de audiencia de juicio, conminatorias y liquidaciones procesales.' },
  { dia: 13, semana: 3, resumen: 'Apoyo en elaboración de contestaciones de demanda y planteamiento de excepciones previas.', detalle: 'Elaboración de borradores de contestaciones de demanda, incidentes y excepciones previas bajo la revisión del abogado patrocinante.' },
  { dia: 14, semana: 3, resumen: 'Búsqueda y compulsa de jurisprudencia y sentencias constitucionales en el portal del TCP.', detalle: 'Búsqueda y compulsa de jurisprudencia constitucional relevante en el portal del Tribunal Constitucional Plurinacional (TCP).' },
  { dia: 15, semana: 3, resumen: 'Redacción preliminar de contratos privados, minutas de transferencia y reconocimientos de firmas.', detalle: 'Apoyo técnico en la redacción de contratos privados, minutas de transferencia de bienes inmuebles, compromisos y acuerdos transaccionales.' },

  // SEMANA 4: Trámites Administrativos, Derechos Reales y Cierre
  { dia: 16, semana: 4, resumen: 'Diligencias de verificación de folios reales, gravámenes e hipotecas ante Derechos Reales (DDRR).', detalle: 'Diligencias de ingreso, verificación y retiro de trámites de registro de folios reales, gravámenes e hipotecas ante las oficinas de Derechos Reales.' },
  { dia: 17, semana: 4, resumen: 'Tramitación de certificados de estado civil y partidas registrales ante SERECI y SEGIP.', detalle: 'Tramitación de certificaciones de estado civil, partidas de matrimonio/defunción y saneamiento registral ante SERECI y trámites de filiación ante SEGIP.' },
  { dia: 18, semana: 4, resumen: 'Gestiones ante dependencias municipales (GAMEA) sobre catastro e impuestos de inmuebles litigiosos.', detalle: 'Gestiones administrativas ante dependencias del Gobierno Autónomo Municipal de El Alto (GAMEA) relacionadas a catastro y tributación de inmuebles en litigio.' },
  { dia: 19, semana: 4, resumen: 'Consolidación de cuadernos de seguimiento, digitalización de actuaciones y entrega de casos.', detalle: 'Consolidación final del archivo digital de causas, escaneo de actuaciones forenses y entrega de fichas de seguimiento a los abogados patrocinantes.' },
  { dia: 20, semana: 4, resumen: 'Cierre de pasantía, consolidación de la hoja de asistencia y preparación del Informe Único.', detalle: 'Consolidación del registro de asistencias y actividades cumplidas, recopilación del muestrario de actuaciones y redacción del Informe Único de Pasantía.' }
];

function obtenerTratamiento(genero) {
  if (genero === 'femenino') {
    return {
      artUniv: 'la universitaria',
      designado: 'designada',
      artPasante: 'la pasante',
      mencionado: 'La mencionada universitaria',
      interesado: 'la interesada',
      delInteresado: 'de la interesada',
      univAbrev: 'la Univ.',
      estudiante: 'la estudiante'
    };
  } else if (genero === 'masculino') {
    return {
      artUniv: 'el universitario',
      designado: 'designado',
      artPasante: 'el pasante',
      mencionado: 'El mencionado universitario',
      interesado: 'el interesado',
      delInteresado: 'del interesado',
      univAbrev: 'el Univ.',
      estudiante: 'el estudiante'
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
    estudiante: 'el(la) estudiante'
  };
}

function extraerHoras(horarioStr, modalidadStr) {
  const modLower = (modalidadStr || '').toLowerCase();
  const defHrs = (modLower.includes('8 horas') || modLower.includes('tiempo completo')) ? 8 : 4;
  const defIngreso = defHrs === 8 ? '08:30' : '14:00';
  const defSalida = defHrs === 8 ? '16:30' : '18:00';
  
  if (!horarioStr) return { ingreso: defIngreso, salida: defSalida, horas: defHrs };
  const m = horarioStr.match(/(\d{1,2}:\d{2})\s*(?:a|-|al|hasta)\s*(\d{1,2}:\d{2})/i);
  if (!m) return { ingreso: defIngreso, salida: defSalida, horas: defHrs };

  const ing = m[1];
  const sal = m[2];
  const [h1, min1] = ing.split(':').map(Number);
  const [h2, min2] = sal.split(':').map(Number);
  const diff = (h2 + min2 / 60) - (h1 + min1 / 60);
  const hrs = (diff > 0 && diff <= 12) ? Math.round(diff) : defHrs;
  return { ingreso: ing, salida: sal, horas: hrs };
}

function calcularJornadasPasantia(fechaInicioStr, fechaFinStr, modalidadStr) {
  const modLower = (modalidadStr || '').toLowerCase();
  let numJornadas = 20;
  if (modLower.includes('2 semanas') || modLower.includes('dos (2) semanas') || (modLower.includes('tiempo completo') && !modLower.includes('4 semanas'))) {
    numJornadas = 10;
  }
  
  if (!fechaInicioStr) {
    return Array.from({ length: numJornadas }, (_, i) => ({
      numero: i + 1,
      fecha: '',
      tarea: PASANTIA_CRONOGRAMA_BASE[i] || { resumen: 'Actividades de apoyo jurídico forense.', detalle: 'Apoyo jurídico forense.' }
    }));
  }

  const partes = fechaInicioStr.split('-');
  let cur = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
  let finDate = null;
  if (fechaFinStr) {
    const fPartes = fechaFinStr.split('-');
    finDate = new Date(Number(fPartes[0]), Number(fPartes[1]) - 1, Number(fPartes[2]));
  }

  const jornadas = [];
  let iter = 0;
  while (jornadas.length < numJornadas && iter < 60) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) { // Lunes a Viernes
      const dd = String(cur.getDate()).padStart(2, '0');
      const mm = String(cur.getMonth() + 1).padStart(2, '0');
      const yyyy = cur.getFullYear();
      jornadas.push({
        numero: jornadas.length + 1,
        fecha: `${dd}/${mm}/${yyyy}`,
        fechaRaw: `${yyyy}-${mm}-${dd}`,
        tarea: PASANTIA_CRONOGRAMA_BASE[jornadas.length] || { resumen: 'Actividades de apoyo jurídico forense.', detalle: 'Apoyo jurídico forense.' }
      });
      if (finDate && cur >= finDate && jornadas.length >= 10) break;
    }
    cur.setDate(cur.getDate() + 1);
    iter++;
  }

  while (jornadas.length < numJornadas) {
    jornadas.push({
      numero: jornadas.length + 1,
      fecha: '',
      tarea: PASANTIA_CRONOGRAMA_BASE[jornadas.length] || { resumen: 'Actividades de apoyo jurídico forense.', detalle: 'Apoyo jurídico forense.' }
    });
  }

  return jornadas;
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
      const desig = (d.nota_designacion && d.fecha_nota_designacion) 
        ? `, ${gen.designado} mediante ${d.nota_designacion} de fecha ${d.fecha_nota_designacion}, correspondiente a la asignatura ${d.asignatura || 'CJR-410 Pasantía I'}` 
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
      const modTxt = d.modalidad ? `, bajo la modalidad de ${d.modalidad}` : '';
      const horTxt = d.horario ? `, en el horario de ${d.horario}` : '';
      const p2 = `${gen.mencionado} cumplió el período de pasantía${lapso}${modTxt}${horTxt}.`;
      
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

// Abre una ventana de impresión (tamaño carta) con un documento de certificado.
function abrirImpresionCert(titulo, docHTML) {
  const w = window.open('', '_blank');
  if (!w) { toast('Permita las ventanas emergentes para imprimir.', 'error'); return; }
  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${esc(titulo)}</title>
    <style>
      @page { size: letter; margin: 0; }
      html, body { margin: 0; padding: 0; background: #fff; width: 100%; height: 100%; overflow: hidden; }
      body > div { width: 100% !important; height: 100vh !important; max-height: 100vh !important; box-sizing: border-box; overflow: hidden; }
      ${PRINT_COLOR_CSS}
    </style></head><body>${docHTML}
    <script>window.addEventListener('load',function(){setTimeout(function(){window.print();},400);});<\/script></body></html>`);
  w.document.close();
}

// Hoja de Control de Asistencia y Permanencia (Pasantía Jurídica)
function buildHojaAsistenciaHTML(d, logoSrc, model) {
  const nombre = esc(d.nombre || '___________________');
  const ci = esc(d.ci || '—');
  const ru = esc(d.registro_universitario || d.ru || '—');
  const uni = esc(d.universidad || 'Universidad Mayor de San Andrés (UMSA)');
  const carrera = esc(d.carrera_plan || 'Carrera de Derecho – Plan de Estudios 2017');
  const asignatura = esc(d.asignatura || 'CJR-410 Pasantía I');
  const modalidad = esc(d.modalidad || '4 semanas a medio tiempo (4 horas diarias)');
  const horario = esc(d.horario || '14:00 a 18:00');
  const prellenar = d.prellenar_asistencia !== false;

  const jornadas = calcularJornadasPasantia(d.fecha_inicio, d.fecha_fin, d.modalidad);
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
          <th style="padding:3px 5px;border:1px solid #0e1b2c;text-align:left;">Actividades y Tareas Jurídicas Desarrolladas</th>
          <th style="padding:3px 2px;width:34px;border:1px solid #0e1b2c;text-align:center;">Hrs.</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr style="background:#f0f2f5;font-weight:bold;font-size:8px;border-top:1.5px solid #0e1b2c;">
          <td colspan="5" style="padding:3px 6px;text-align:left;border:1px solid #d9dce1;color:#0e1b2c;">
            TOTAL DE JORNADAS CUMPLIDAS: ${totalJornadas} DÍAS &nbsp;|&nbsp; CARGA HORARIA TOTAL: ${prellenar ? totalHoras : '___'} HORAS &nbsp;|&nbsp; ASISTENCIA: 100 %
          </td>
          <td style="padding:3px 2px;text-align:center;border:1px solid #d9dce1;font-weight:bold;">${prellenar ? totalHoras : ''}</td>
        </tr>
      </tbody>
    </table>

    <div style="border:1px solid #d9dce1;border-radius:5px;padding:6px 10px;background:#fafbfc;">
      <div style="text-align:center;font-size:8.5px;font-weight:bold;letter-spacing:1px;color:#0e1b2c;margin-bottom:4px;">VALIDACIÓN Y CONFORMIDAD INSTITUCIONAL</div>
      <div style="display:flex;justify-content:center;align-items:flex-end;padding:0 15px;">
        <div style="text-align:center;width:100%;max-width:280px;">
          <div style="min-height:52px;"></div>
          <div style="border-top:1.2px solid #0e1b2c;padding-top:4px;font-size:9px;font-weight:bold;color:#0e1b2c;">Sello y Firma · Abogado(a) Patrocinante</div>
          <div style="font-size:8px;color:#5c6675;font-family:Arial,sans-serif;">LexFive · Bufete de Abogados</div>
        </div>
      </div>
    </div>`;

  return membretePagina({
    model: model || modeloMembrete(),
    logoSrc: logoSrc,
    pageW: '8.5in',
    pageH: '10.9in',
    wmOp: 0.08,
    contentHTML
  });
}

function descargarHojaAsistenciaPDF(d, logoSrc, model) {
  toast('Generando Hoja de Asistencia en PDF...', 'info');
  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'fixed';
  tempDiv.style.left = '-9999px';
  tempDiv.style.top = '0';
  tempDiv.style.width = '8.5in';
  tempDiv.innerHTML = buildHojaAsistenciaHTML(d, logoSrc, model);
  document.body.appendChild(tempDiv);

  const element = tempDiv.firstElementChild || tempDiv;
  const nombreStr = (d.nombre || 'pasante').toLowerCase().replace(/[^\w]+/g, '-').slice(0, 30);
  const opt = {
    margin: 0,
    filename: `hoja-asistencia-${nombreStr}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, scrollY: 0, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  const ejecutar = () => {
    html2pdf().set(opt).from(element).save().then(() => {
      tempDiv.remove();
      toast('Hoja de Asistencia descargada en PDF.', 'success');
    }).catch(e => {
      tempDiv.remove();
      console.error(e);
      toast('Error al generar la Hoja de Asistencia en PDF.', 'error');
    });
  };

  if (typeof window.html2pdf === 'undefined') {
    const script = document.createElement('script');
    script.src = 'js/html2pdf.bundle.min.js';
    script.onload = ejecutar;
    script.onerror = () => { tempDiv.remove(); toast('Error al cargar módulo PDF.', 'error'); };
    document.head.appendChild(script);
  } else {
    ejecutar();
  }
}

// Borrador oficial del Informe Único de Pasantía en formato Microsoft Word (.doc)
function buildInformeWordHTML(d) {
  const nombre = esc(d.nombre || '___________________');
  const ci = esc(d.ci || '—');
  const ru = esc(d.registro_universitario || d.ru || '—');
  const uni = esc(d.universidad || 'Universidad Mayor de San Andrés (UMSA)');
  const carrera = esc(d.carrera_plan || 'Carrera de Derecho – Plan de Estudios 2017');
  const asignatura = esc(d.asignatura || 'CJR-410 Pasantía I');
  const notaDesig = esc(d.nota_designacion || 'IIST/CJR-410/2026');
  const fechaNota = esc(d.fecha_nota_designacion || fechaLarga(d.fecha_emision));
  const modalidad = esc(d.modalidad || '4 semanas a medio tiempo (4 horas diarias)');
  const horario = esc(d.horario || '14:00 a 18:00');
  const periodo = esc(d.periodo || ((d.fecha_inicio && d.fecha_fin) ? `del ${fmtDate(d.fecha_inicio)} al ${fmtDate(d.fecha_fin)}` : 'el período indicado'));
  const fechaDoc = fechaLarga(d.fecha_emision || d.fecha);
  const ref = esc(d.ref || 'LF-2026-00000');
  const jornadas = calcularJornadasPasantia(d.fecha_inicio, d.fecha_fin, d.modalidad);
  const totalJornadas = jornadas.length;

  const tareasSem1 = PASANTIA_CRONOGRAMA_BASE.filter(t => t.semana === 1).map(t => `<li>${esc(t.detalle)}</li>`).join('');
  const tareasSem2 = PASANTIA_CRONOGRAMA_BASE.filter(t => t.semana === 2).map(t => `<li>${esc(t.detalle)}</li>`).join('');
  const tareasSem3 = PASANTIA_CRONOGRAMA_BASE.filter(t => t.semana === 3).map(t => `<li>${esc(t.detalle)}</li>`).join('');
  const tareasSem4 = PASANTIA_CRONOGRAMA_BASE.filter(t => t.semana === 4).map(t => `<li>${esc(t.detalle)}</li>`).join('');

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
  @page { size: letter; margin: 2.5cm 2.5cm 2.5cm 2.5cm; mso-page-orientation: portrait; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; color: #000; text-align: justify; }
  .header-umsa { text-align: center; font-weight: bold; font-size: 13pt; margin-bottom: 18pt; line-height: 1.3; }
  .sub-header { font-size: 11pt; color: #333; margin-top: 3pt; font-weight: normal; }
  .memo-block { margin: 18pt 0; border-top: 2pt solid #000; border-bottom: 2pt solid #000; padding: 10pt 4pt; }
  .memo-row { margin-bottom: 5pt; font-size: 11pt; }
  h2 { font-size: 12pt; font-weight: bold; margin: 16pt 0 6pt; text-transform: uppercase; border-bottom: 1pt solid #444; padding-bottom: 2pt; }
  h3 { font-size: 11pt; font-weight: bold; margin: 10pt 0 4pt; color: #111; }
  p { margin: 0 0 8pt; text-align: justify; text-indent: 20pt; line-height: 1.5; }
  .p-noint { margin: 0 0 8pt; text-align: justify; text-indent: 0; }
  ul { margin: 4pt 0 10pt 25pt; }
  li { margin-bottom: 4pt; line-height: 1.4; }
  table.data-table { width: 100%; border-collapse: collapse; margin: 10pt 0 14pt; }
  table.data-table th, table.data-table td { border: 1pt solid #333; padding: 6pt 8pt; font-size: 10.5pt; text-align: left; }
  table.data-table th { background-color: #f2f2f2; font-weight: bold; }
  .page-break { page-break-before: always; }
  .firma-table { width: 100%; border-collapse: collapse; margin-top: 40pt; }
  .firma-table td { width: 50%; vertical-align: top; text-align: center; padding: 0 15pt; }
  .firma-line { border-top: 1.5pt solid #000; margin-top: 50pt; padding-top: 6pt; font-size: 10.5pt; font-weight: bold; }
  .firma-sub { font-size: 9.5pt; color: #444; line-height: 1.35; margin-top: 2pt; font-weight: normal; }
</style>
</head>
<body>

<div class="header-umsa">
  ${uni.toUpperCase()}<br>
  FACULTAD DE DERECHO Y CIENCIAS POLÍTICAS<br>
  ${carrera.toUpperCase()}<br>
  <div class="sub-header">INSTITUTO DE INVESTIGACIONES, SEMINARIOS Y TESIS (IIST)</div>
</div>

<div class="memo-block">
  <div class="memo-row"><strong>A:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; DOCENTE GUÍA DE ASIGNATURA DE PASANTÍA / RESPONSABLE IIST - UMSA</div>
  <div class="memo-row"><strong>DE:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Univ. ${nombre} &nbsp;|&nbsp; R.U.: ${ru} &nbsp;|&nbsp; C.I.: ${ci}</div>
  <div class="memo-row"><strong>REF.:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>INFORME ÚNICO DE PASANTÍA PRE-PROFESIONAL (${asignatura})</strong></div>
  <div class="memo-row"><strong>FECHA:</strong> &nbsp;&nbsp;&nbsp; ${fechaDoc}</div>
</div>

<h2>I. CARACTERÍSTICAS GENERALES DE LA PASANTÍA</h2>
<p class="p-noint">En cumplimiento a las disposiciones normativas de la Carrera de Derecho de la Universidad Mayor de San Andrés, se detallan las características institucionales de las prácticas pre-profesionales:</p>

<table class="data-table">
  <tr>
    <th style="width:30%;">Institución receptora:</th>
    <td><strong>Bufete de Abogados "LexFive"</strong> (Área de Litigio, Asesoría Jurídica y Diligenciamiento Procesal)</td>
  </tr>
  <tr>
    <th>Supervisión Institucional:</th>
    <td><strong>Abogado(a) Patrocinante – LexFive Bufete de Abogados</strong></td>
  </tr>
  <tr>
    <th>Asignatura y Plan:</th>
    <td>${asignatura} · ${carrera}</td>
  </tr>
  <tr>
    <th>Modalidad y Carga Horaria:</th>
    <td>${modalidad} · Horario: ${horario}</td>
  </tr>
  <tr>
    <th>Período de Prácticas:</th>
    <td>${periodo}</td>
  </tr>
  <tr>
    <th>Ubicación del Despacho:</th>
    <td>Av. Alfredo Franco Valle N.º 708-51, Edif. Real, Planta Baja Of. A-6, Ciudad de El Alto, La Paz - Bolivia</td>
  </tr>
</table>

<h2>II. ANTECEDENTES Y MARCO NORMATIVO</h2>
<p>El presente informe se suscribe en estricto cumplimiento a la <strong>Resolución del Honorable Consejo Universitario N.º 104/2016</strong>, que aprueba e implementa el Plan de Estudios 2017 de la Carrera de Derecho de la Facultad de Derecho y Ciencias Políticas de la UMSA, el cual instituye la modalidad de Pasantías / Prácticas Pre-Profesionales como requisito académico sustancial para vincular el conocimiento teórico con la práctica jurídica en estrados judiciales y foros profesionales.</p>
<p>Asimismo, tiene como antecedente formal la <strong>Nota de Designación N.º ${notaDesig}</strong>, de fecha ${fechaNota}, emitida por el Instituto de Investigaciones, Seminarios y Tesis (IIST), mediante la cual se me autorizó el desarrollo de la pasantía jurídica bajo la supervisión directa del cuerpo de abogados patrocinantes del Bufete LexFive.</p>

<h2>III. DETALLE CRONOLÓGICO DE FUNCIONES Y ACTIVIDADES REALIZADAS</h2>
<p>Durante el período de permanencia en el bufete LexFive, las labores se ejecutaron de manera planificada y progresiva de lunes a viernes en el horario asignado, bajo el siguiente esquema sincronizado con la Hoja de Control de Asistencia:</p>

<h3>PRIMERA SEMANA: Inducción Institucional, Manejo de Despacho y Organización Procesal</h3>
<ul>
  ${tareasSem1}
</ul>

<h3>SEGUNDA SEMANA: Diligenciamiento Judicial y Procuraduría ante Estrados Judiciales</h3>
<ul>
  ${tareasSem2}
</ul>

<h3>TERCERA SEMANA: Apoyo en Redacción Jurídica, Borradores de Memoriales y Contratos</h3>
<ul>
  ${tareasSem3}
</ul>

<h3>CUARTA SEMANA: Diligencias Administrativas Externas, Derechos Reales y Cierre</h3>
<ul>
  ${tareasSem4}
</ul>

<h2>IV. CONCLUSIONES Y RECOMENDACIONES (VISTO BUENO)</h2>
<p>En el marco del proceso de aprendizaje práctico, se arriban a las siguientes conclusiones ordenadas en los tres ejes institucionales:</p>
<p><strong>1. Eje Académico-Jurídico:</strong> La pasantía permitió contrastar positivamente la doctrina y normativa procesal con la realidad práctica forense, adquiriendo destreza técnica en la fundamentación y articulación de memoriales y recursos ordinarios.</p>
<p><strong>2. Eje Práctico y Forense:</strong> Se adquirió amplio conocimiento del movimiento procesal en juzgados, la celeridad requerida en el cumplimiento de plazos y el desenvolvimiento ante operadores de justicia y entidades de registro público.</p>
<p><strong>3. Eje Ético y Deontológico:</strong> Se consolidó el compromiso con la ética profesional, la honestidad en el trato con los patrocinados, el respeto irrestricto al principio de lealtad procesal y la vocación de servicio al ciudadano.</p>

<p style="margin-top:20pt;">Es cuanto se informa en honor a la verdad y para los fines académicos consiguientes.</p>

<table class="firma-table">
  <tr>
    <td>
      <div class="firma-line">
        Univ. ${nombre}<br>
        <span class="firma-sub">Estudiante Pasante<br>R.U. ${ru} · C.I. ${ci}<br>${carrera} · ${uni}</span>
      </div>
    </td>
    <td>
      <div class="firma-line">
        V.º B.º Abogado(a) Patrocinante<br>
        <span class="firma-sub">LexFive Bufete de Abogados<br>Área de Litigio y Práctica Forense<br>El Alto — La Paz, Bolivia</span>
      </div>
    </td>
  </tr>
</table>

<div class="page-break"></div>

<div class="header-umsa">
  ${uni.toUpperCase()}<br>
  CARRERA DE DERECHO · PLAN DE ESTUDIOS 2017<br>
  <div class="sub-header">PASANTÍA PRE-PROFESIONAL (${asignatura})</div>
</div>

<h2>V. ANEXOS Y CONSTANCIAS DE RESPALDO</h2>
<p class="p-noint">Se adjuntan al presente informe único los documentos de respaldo correspondientes debidamente legalizados y refrendados:</p>

<table class="data-table">
  <thead>
    <tr>
      <th style="width:8%;text-align:center;">N.º</th>
      <th style="width:62%;">Documento de Respaldo</th>
      <th style="width:30%;text-align:center;">Estado / Verificación</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="text-align:center;font-weight:bold;">1</td>
      <td><strong>Nota Oficial de Designación de Pasantía</strong> emitida por el Instituto de Investigaciones, Seminarios y Tesis (IIST) de la Carrera de Derecho UMSA.</td>
      <td style="text-align:center;">N.º ${notaDesig}</td>
    </tr>
    <tr>
      <td style="text-align:center;font-weight:bold;">2</td>
      <td><strong>Carta de Aceptación de Pasantía</strong> suscrita por la Dirección del Bufete de Abogados LexFive.</td>
      <td style="text-align:center;">Copia Original adjunta</td>
    </tr>
    <tr>
      <td style="text-align:center;font-weight:bold;">3</td>
      <td><strong>Certificado Oficial de Pasantía Jurídica</strong> emitido por el Bufete de Abogados LexFive con código QR institucional verificable.</td>
      <td style="text-align:center;">Ref. ${ref}</td>
    </tr>
    <tr>
      <td style="text-align:center;font-weight:bold;">4</td>
      <td><strong>Hoja de Control de Asistencia y Permanencia</strong> (${totalJornadas} jornadas hábiles) debidamente rubricada por el pasante y el abogado(a) patrocinante supervisor.</td>
      <td style="text-align:center;">Registro completo</td>
    </tr>
    <tr>
      <td style="text-align:center;font-weight:bold;">5</td>
      <td><strong>Muestrario de Actuaciones Jurídicas</strong> (Borradores de memoriales, fichas de seguimiento procesal y constancias de diligencias forenses).</td>
      <td style="text-align:center;">Compulsa adjunta</td>
    </tr>
  </tbody>
</table>

<p style="margin-top:30pt;text-align:center;font-size:10pt;color:#666;">
  LexFive Bufete de Abogados · El Alto — La Paz, Bolivia · Tel/WhatsApp: +591 78360469 · https://lexfive.netlify.app
</p>

</body>
</html>`;
}

function descargarInformePasantiaWord(d) {
  toast('Generando Informe Único de Pasantía en Word (.doc)...', 'info');
  const html = buildInformeWordHTML(d);
  const nombre = 'informe-pasantia-' + ((d.nombre || 'umsa').toLowerCase().replace(/[^\w]+/g, '-').slice(0, 35)) + '.doc';
  descargarArchivo(nombre, '\ufeff' + html, 'application/msword');
  toast('Informe de Pasantía descargado en Word.', 'success');
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
                <div class="field"><label>Registro Universitario (R.U.)</label><input id="ce_ru" placeholder="Ej: 20150001"></div>
                <div class="field"><label>Universidad</label><input id="ce_uni_pas" value="Universidad Mayor de San Andrés (UMSA)"></div>
                <div class="field"><label>Carrera y Plan de Estudios</label><input id="ce_carrera_plan" value="Carrera de Derecho – Plan de Estudios 2017"></div>
                <div class="field"><label>Asignatura</label><input id="ce_asignatura" value="CJR-410 Pasantía I"></div>
                <div class="field"><label>N.º de Nota de Designación</label><input id="ce_nota_desig" placeholder="Ej: IIST-CA-003/2026 (opcional)"></div>
                <div class="field"><label>Fecha de Nota</label><input id="ce_fecha_nota" type="date"></div>
                <div class="field"><label>Fecha de inicio</label><input id="ce_fecha_inicio" type="date"></div>
                <div class="field"><label>Fecha de finalización</label><input id="ce_fecha_fin" type="date"></div>
                <div class="field"><label>Modalidad</label>
                  <select id="ce_modalidad">
                    <option value="4 semanas a medio tiempo (4 horas diarias)">4 semanas a medio tiempo (4 h/día)</option>
                    <option value="2 semanas a tiempo completo (8 horas diarias)">2 semanas a tiempo completo (8 h/día)</option>
                    <option value="">Personalizada (edite el texto)</option>
                  </select></div>
                <div class="field"><label>Horario</label><input id="ce_horario" placeholder="Ej: 14:00 a 18:00"></div>
                <label class="cell-sub" style="display:flex;align-items:center;gap:6px;grid-column:1/-1;margin-top:4px;">
                  <input type="checkbox" id="ce_prellenar_asistencia" checked> Prellenar fechas hábiles y 20 tareas jurídicas en Hoja de Asistencia
                </label>
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
          <button class="btn btn--primary" id="ce_guardar">Guardar</button>
          <button class="btn btn--ghost" id="ce_print">${ICON.doc} Imprimir</button>
          <button class="btn btn--ghost" id="ce_pdf">Descargar PDF</button>
          <button class="btn btn--ghost" id="ce_word">Descargar Word</button>
          <button class="btn btn--ghost" id="ce_asistencia" style="display:none;" title="Hoja de control de asistencia de 20 días en PDF">Hoja de Asistencia (PDF)</button>
          <button class="btn btn--ghost" id="ce_informe_word" style="display:none;" title="Borrador oficial editable del Informe Único UMSA en Word">Descargar Informe Word (.doc)</button>
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

    <div class="card">
      <div class="card__head"><h3>Vista previa</h3></div>
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
    // Pasantía universitaria
    genero: val('ce_genero') || 'femenino',
    prellenar_asistencia: $('#ce_prellenar_asistencia') ? $('#ce_prellenar_asistencia').checked : true,
    registro_universitario: val('ce_ru'),
    carrera_plan: val('ce_carrera_plan') || 'Carrera de Derecho – Plan de Estudios 2017',
    asignatura: val('ce_asignatura') || 'CJR-410 Pasantía I',
    nota_designacion: val('ce_nota_desig'),
    fecha_nota_designacion: val('ce_fecha_nota') ? fechaLarga(val('ce_fecha_nota')) : '',
    modalidad: val('ce_modalidad'),
    horario: val('ce_horario'),
    fecha_inicio: val('ce_fecha_inicio'),
    fecha_fin: val('ce_fecha_fin'),
    fecha_inicio_larga: val('ce_fecha_inicio') ? fechaLarga(val('ce_fecha_inicio')) : '',
    fecha_fin_larga: val('ce_fecha_fin') ? fechaLarga(val('ce_fecha_fin')) : '',
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

    // Botones de acción específicos de pasantía
    const btnAsis = $('#ce_asistencia'); if (btnAsis) btnAsis.style.display = pas ? '' : 'none';
    const btnInf = $('#ce_informe_word'); if (btnInf) btnInf.style.display = (cat === 'pasantia') ? '' : 'none';

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
  const pintar = () => { $('#certPreview').innerHTML = docActual(); };

  // Registra el certificado en la nube (best-effort) para que sea verificable
  // por su N.º de referencia. Si la tabla aún no existe (db/25), no pasa nada.
  const registrarCert = () => {
    try {
      const tipoCert = esPasantia() ? 'pasantia' : 'trabajo';
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
        registro_universitario: val('ce_ru') || null,
        universidad: esPasantia() ? (val('ce_uni_pas') || null) : (val('ce_uni') || null),
        carrera_plan: val('ce_carrera_plan') || null,
        asignatura: val('ce_asignatura') || null,
        nota_designacion: val('ce_nota_desig') || null,
        fecha_nota_designacion: val('ce_fecha_nota') || null,
        modalidad: val('ce_modalidad') || null,
        horario: val('ce_horario') || null,
        fecha_inicio: val('ce_fecha_inicio') || null,
        fecha_fin: val('ce_fecha_fin') || null,
        incluir_sello_digital: $('#ce_sello') ? $('#ce_sello').checked : true
      };
      // Solo al crear uno nuevo se fija el autor; al editar se conserva el original.
      if (!editando) row.created_by = state.profile.id;
      guardadoActual = true;
      supabase.from('certificados').upsert(row, { onConflict: 'ref' }).then(() => { cargarEmitidos(); }, () => {});
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
      if (c) descargarHojaAsistenciaPDF(c, logoSrc, modeloMembrete());
    });
    cont.querySelectorAll('.js-informecert').forEach(b => b.onclick = () => {
      const c = EMITIDOS.find(x => x.id === b.dataset.id);
      if (c) descargarInformePasantiaWord(c);
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
    abrirImpresionCert(c.tipo || 'Certificado', doc);
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
    if (typeof c.incluir_sello_digital === 'boolean' && $('#ce_sello')) $('#ce_sello').checked = c.incluir_sello_digital;
    $('#ce_cuerpo').value = cuerpoGuardado || tpl.cuerpo(datos());
    cuerpoEditado = true;
    refActual = c.ref;
    editando = true;
    guardadoActual = false;
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
    ['ce_nombre', 'ce_ci', 'ce_calidad', 'ce_periodo', 'ce_uni', 'ce_carrera', 'ce_horas', 'ce_dest',
     'ce_ru', 'ce_nota_desig', 'ce_fecha_nota', 'ce_fecha_inicio', 'ce_fecha_fin', 'ce_horario'].forEach(id => { const el = $('#' + id); if (el) el.value = ''; });
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
  ['ce_fecha_nota', 'ce_fecha_inicio', 'ce_fecha_fin', 'ce_modalidad', 'ce_genero'].forEach(id => {
    const el = $('#' + id); if (!el) return;
    const handler = () => { forkSiNecesario(); if (!cuerpoEditado) regenerar(); pintar(); };
    el.onchange = handler;
    el.oninput = handler;
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
  $('#ce_fecha').onchange = () => { forkSiNecesario(); pintar(); };
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
    toast('Certificado guardado en «Certificados emitidos». Para la misma persona, cambie el tipo y vuelva a Guardar: se crea otro sin reemplazar este.', 'success');
  };
  $('#ce_print').onclick = () => {
    if (!($('#ce_nombre').value || '').trim()) { toast('Escriba el nombre completo.', 'error'); return; }
    registrarCert();
    abrirImpresionCert(tplActual().titulo, docActual());
  };
  $('#ce_pdf').onclick = () => {
    if (!($('#ce_nombre').value || '').trim()) { toast('Escriba el nombre completo.', 'error'); return; }
    registrarCert();
    const generarPDF = () => {
      toast('Generando PDF, por favor espere...', 'info');
      
      const element = $('#certPreview').firstElementChild;
      if (!element) {
        toast('No hay vista previa para exportar.', 'error');
        return;
      }
      
      const originalShadow = element.style.boxShadow;
      const originalHeight = element.style.height;
      element.style.boxShadow = 'none';
      element.style.height = '10.9in'; // Reducir 0.1in para evitar que jsPDF genere una segunda página por decimales

      const nombreStr = ($('#ce_nombre').value || 'lexfive').toLowerCase().replace(/[^\w]+/g, '-').slice(0, 40);
      const opt = {
        margin:       0,
        filename:     `certificado-${nombreStr}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
          scale: 2, 
          useCORS: true, 
          scrollY: 0,
          backgroundColor: '#ffffff'
        },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      
      html2pdf().set(opt).from(element).save().then(() => {
        element.style.boxShadow = originalShadow;
        element.style.height = originalHeight;
        toast('Certificado descargado en PDF.', 'success');
      }).catch((e) => {
        element.style.boxShadow = originalShadow;
        element.style.height = originalHeight;
        console.error(e);
        toast('Error al generar el PDF.', 'error');
      });
    };

    if (typeof window.html2pdf === 'undefined') {
      toast('Cargando módulo PDF...', 'info');
      const script = document.createElement('script');
      script.src = 'js/html2pdf.bundle.min.js';
      script.onload = generarPDF;
      script.onerror = () => toast('Error al cargar módulo PDF. Revise su conexión.', 'error');
      document.head.appendChild(script);
    } else {
      generarPDF();
    }
  };
  $('#ce_word').onclick = () => {
    if (!($('#ce_nombre').value || '').trim()) { toast('Escriba el nombre completo.', 'error'); return; }
    registrarCert();
    const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body>' + docActual() + '</body></html>';
    const nombre = 'certificado-' + (($('#ce_nombre').value || 'lexfive').toLowerCase().replace(/[^\w]+/g, '-').slice(0, 40)) + '.doc';
    descargarArchivo(nombre, '\ufeff' + html, 'application/msword');
    toast('Certificado descargado en Word.', 'success');
  };

  const btnAsistencia = $('#ce_asistencia');
  if (btnAsistencia) {
    btnAsistencia.onclick = () => {
      if (!($('#ce_nombre').value || '').trim()) { toast('Escriba el nombre completo.', 'error'); return; }
      registrarCert();
      descargarHojaAsistenciaPDF(datos(), logoSrc, modeloMembrete());
    };
  }

  const btnInformeWord = $('#ce_informe_word');
  if (btnInformeWord) {
    btnInformeWord.onclick = () => {
      if (!($('#ce_nombre').value || '').trim()) { toast('Escriba el nombre completo.', 'error'); return; }
      registrarCert();
      descargarInformePasantiaWord(datos());
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
