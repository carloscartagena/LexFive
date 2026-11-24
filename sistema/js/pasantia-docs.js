// ============================================================
//  LexFive — Generador Unificado de Documentos de Pasantía
//  (Hoja de Asistencia Multipágina, Informe Único Académico en Arial 12 · 1.5,
//  y Exportación PDF Hoja por Hoja sin Lienzos en Blanco)
// ============================================================
import { esc, hoyISO, SITIO_URL, qrURL } from './util.js';
import { toast } from './ui.js';
import { descargarArchivo } from './exportar.js';
import { membreteHeader, membreteFooter, PRINT_COLOR_CSS } from './membrete-base.js';
import { calcularJornadasHabilesBolivia } from './calendario-bo.js';

// Cache para Base64 del logotipo institucional
let cachedLogoBase64 = null;
let lastLogoSrc = null;

export async function getLogoBase64(logoSrc) {
  if (!logoSrc) return '';
  if (cachedLogoBase64 && lastLogoSrc === logoSrc) return cachedLogoBase64;
  try {
    const res = await fetch(logoSrc);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        cachedLogoBase64 = reader.result;
        lastLogoSrc = logoSrc;
        resolve(cachedLogoBase64);
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('No se pudo convertir logo a base64:', e);
    return '';
  }
}

export function fechaLarga(d) {
  if (!d) return '';
  const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const anio = parseInt(m[1], 10);
    const mes = parseInt(m[2], 10) - 1;
    const dia = parseInt(m[3], 10);
    const dt = new Date(anio, mes, dia);
    const diaNum = dt.getDate();
    const mesNom = meses[dt.getMonth()];
    const anioNum = dt.getFullYear();
    return `${diaNum} de ${mesNom} de ${anioNum}`;
  }
  return String(d);
}

// Catálogo base de 20 jornadas de práctica forense
export const PASANTIA_CRONOGRAMA_BASE = [
  { dia: 1, semana: 1, resumen: 'Inducción institucional, normativa deontológica, confidencialidad y protocolos de despacho.', detalle: 'Inducción institucional sobre normas deontológicas del ejercicio de la abogacía, protocolos de reserva, confidencialidad profesional y funcionamiento orgánico del bufete LexFive.' },
  { dia: 2, semana: 1, resumen: 'Revisión, organización física y foliado correlativo de cuadernos procesales civiles y familiares.', detalle: 'Revisión, organización física y foliado correlativo de cuadernos procesales en materias Civil, Comercial y Familiar conforme a la Ley 439 y Ley 603.' },
  { dia: 3, semana: 1, resumen: 'Clasificación de resoluciones, autos interlocutorios y notificaciones judiciales.', detalle: 'Clasificación y archivo cronológico de actuaciones judiciales, resoluciones, providencias y notificaciones judiciales en estrados.' },
  { dia: 4, semana: 1, resumen: 'Capacitación y registro de causas activas en el sistema informático interno del despacho.', detalle: 'Capacitación en el uso y registro del sistema informático interno del despacho para control de plazos procesales y estado de causas.' },
  { dia: 5, semana: 1, resumen: 'Auditoría de términos y vencimiento de plazos perentorios en procesos ejecutivos y ordinarios.', detalle: 'Auditoría procesal y elaboración del rol de vencimiento de términos y plazos perentorios en procesos ejecutivos y ordinarios conforme a la Ley 439.' },
  { dia: 6, semana: 2, resumen: 'Verificación de expedientes en juzgados públicos civiles y comerciales de El Alto.', detalle: 'Seguimiento y verificación de causas en juzgados públicos en materia civil y comercial del Tribunal Departamental de Justicia en El Alto.' },
  { dia: 7, semana: 2, resumen: 'Revisión de cuadernos de control jurisdiccional e investigaciones en materia penal.', detalle: 'Revisión de cuadernos procesales y de control jurisdiccional en juzgados de instrucción penal cautelar y fiscalías corporativas.' },
  { dia: 8, semana: 2, resumen: 'Diligenciamiento de órdenes judiciales, citaciones y emplazamientos a partes demandadas.', detalle: 'Diligenciamiento de mandamientos, órdenes judiciales, citaciones y emplazamientos a través de oficiales de diligencias.' },
  { dia: 9, semana: 2, resumen: 'Seguimiento a buzón judicial electrónico y notificaciones en sistema digital Hermes/Thor.', detalle: 'Revisión y compulsa de notificaciones en el buzón judicial electrónico Hermes/Thor y plataforma digital del Órgano Judicial.' },
  { dia: 10, semana: 2, resumen: 'Elaboración de fichas síntesis del estado procesal de causas asignadas para informe de cartera.', detalle: 'Elaboración de fichas síntesis de estado procesal de cada caso asignado con alerta de vencimiento de plazos y memoriales pendientes.' },
  { dia: 11, semana: 3, resumen: 'Redacción de borradores de memoriales de apersonamiento y copias legalizadas.', detalle: 'Redacción de borradores de memoriales procesales de mero trámite: apersonamientos, solicitudes de fotocopias legalizadas y desarchivo de causas.' },
  { dia: 12, semana: 3, resumen: 'Redacción de borradores de señalamiento de audiencias y peticiones de conminatoria.', detalle: 'Elaboración de borradores de solicitudes de señalamiento de audiencia de juicio, conminatorias de pago y liquidaciones en juzgados de familia (Ley 603).' },
  { dia: 13, semana: 3, resumen: 'Apoyo en elaboración de contestaciones de demanda y planteamiento de excepciones previas.', detalle: 'Elaboración de borradores de contestaciones de demanda, incidentes y excepciones previas bajo la revisión del abogado patrocinante conforme al CPC.' },
  { dia: 14, semana: 3, resumen: 'Búsqueda y compulsa de jurisprudencia y sentencias constitucionales en el portal del TCP.', detalle: 'Búsqueda y compulsa de jurisprudencia constitucional relevante en el portal del Tribunal Constitucional Plurinacional (TCP).' },
  { dia: 15, semana: 3, resumen: 'Redacción preliminar de contratos privados, minutas de transferencia y reconocimientos de firmas.', detalle: 'Apoyo técnico en la redacción de contratos privados, minutas de transferencia de bienes inmuebles, compromisos y acuerdos transaccionales.' },
  { dia: 16, semana: 4, resumen: 'Diligencias en Derechos Reales (DDRR): certificaciones decenales / treintañales, folios reales y gravámenes.', detalle: 'Diligencias de ingreso, verificación y retiro de certificaciones decenales / treintañales, registro de folios reales, gravámenes e hipotecas ante las oficinas de Derechos Reales.' },
  { dia: 17, semana: 4, resumen: 'Tramitación de certificados de estado civil y partidas registrales ante SERECI y SEGIP.', detalle: 'Tramitación de certificaciones de estado civil, partidas de matrimonio/defunción y saneamiento registral ante SERECI y trámites de filiación ante SEGIP.' },
  { dia: 18, semana: 4, resumen: 'Gestiones ante dependencias municipales (GAMEA) sobre catastro e impuestos de inmuebles litigiosos.', detalle: 'Gestiones administrativas ante dependencias del Gobierno Autónomo Municipal de El Alto (GAMEA) relacionadas a catastro, visado y tributación de inmuebles.' },
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
      pasanteArticulo: 'la Pasante Universitaria'
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
      pasanteArticulo: 'el Pasante Universitario'
    };
  }
  return {
    artUniv: 'el(la) universitario(a)',
    designado: 'designado(a)',
    artPasante: 'el(la) pasante',
    mencionado: 'El(la) mencionado(a) universitario(a)',
    interesado: 'el(la) interesado(a)',
    delInteresado: 'del(la) interesado(a)',
    univAbrev: 'el(la) Univ.',
    estudiante: 'el(la) estudiante',
    pasanteArticulo: 'el(la) Pasante Universitario(a)'
  };
}

export function normalizarNotaDesig(nota) {
  const n = (nota || '').trim();
  if (!n) return '';
  if (/(nota|n[°º.]|nro)/i.test(n)) return n;
  return `N.º ${n}`;
}

export function formatearSupervision(tutorNombre, tutorRpa) {
  const nombre = (tutorNombre || '').trim();
  const rpa = (tutorRpa || '').trim();
  if (!nombre) {
    return {
      html: '<strong>Abogado(a) Patrocinante – LexFive Bufete de Abogados</strong>',
      firmaTitulo: 'V.º B.º Abogado(a) Patrocinante / Dirección',
      firmaSub: 'LexFive · Bufete de Abogados'
    };
  }
  const tieneTitulo = /^(abg|dr|dra|lic|msc|m\.sc|mgtr|ing)\.?\s/i.test(nombre);
  const prefijo = tieneTitulo ? '' : 'Abg. ';
  const nombreCompleto = `${prefijo}${nombre}`;

  return {
    html: `<strong>${esc(nombreCompleto)}</strong>${rpa ? ` (R.P.A. ${esc(rpa)})` : ''} · LexFive Bufete de Abogados`,
    firmaTitulo: `V.º B.º ${esc(nombreCompleto)}`,
    firmaSub: `${rpa ? `R.P.A. ${esc(rpa)}<br>` : ''}Tutor(a) Institucional · LexFive Bufete de Abogados`
  };
}

export function formatearModalidadYHorario(modalidadStr, horarioStr) {
  let mod = (modalidadStr || '4 semanas a medio tiempo (4 horas diarias)').trim();
  const hor = (horarioStr || '14:00 a 18:00').trim();

  // Limpiar duplicaciones de tipo "X (X)"
  const dupMatch = mod.match(/^(.+?)\s*\(\1\)$/i);
  if (dupMatch) mod = dupMatch[1].trim();

  return `${mod} · Horario: ${hor}`;
}

export function extraerHoras(horarioStr, modalidadStr) {
  const hStr = (horarioStr || '').toLowerCase();
  const mStr = (modalidadStr || '').toLowerCase();

  let horas = 4;
  let ingreso = '14:00';
  let salida = '18:00';

  if (mStr.includes('8 horas') || mStr.includes('tiempo completo') || mStr.includes('completo')) {
    horas = 8;
    ingreso = '08:30';
    salida = '16:30';
  }

  const matchRango = hStr.match(/(\d{1,2}:\d{2})\s*(?:a|-|al|hasta)\s*(\d{1,2}:\d{2})/);
  if (matchRango) {
    ingreso = matchRango[1];
    salida = matchRango[2];
  }

  return { horas, ingreso, salida };
}

// Catálogo extendido de actividades forenses bolivianas detalladas (3 actividades reales por día, 18-30 palabras cada una)
const ACTIVIDADES_BOLIVIA_POR_DIA = [
  // Jornada 1
  [
    'Inducción institucional sobre normas deontológicas de la abogacía, deberes de probidad, confidencialidad profesional y funcionamiento orgánico del bufete LexFive.',
    'Estudio del protocolo interno de atención al usuario, custodia de credenciales de plataformas informáticas y régimen de reserva de expedientes litigiosos.',
    'Familiarización con los sistemas de registro físico y nomenclatura archivística para cuadernos de control jurisdiccional y carpetas de clientes.'
  ],
  // Jornada 2
  [
    'Revisión, organización física y foliado correlativo de cuadernos procesales en materias Civil, Comercial y Familiar conforme a las exigencias de la Ley 439 y Ley 603.',
    'Verificación de la foliatura de demandas principales, excepciones previas, contestaciones y actas de audiencia preliminar para evitar reposiciones procesales.',
    'Digitalización e indexación de memoriales y providencias judiciales en las carpetas virtuales del servidor institucional de LexFive.'
  ],
  // Jornada 3
  [
    'Clasificación y archivo cronológico de actuaciones judiciales, resoluciones de mero trámite, autos interlocutorios simples y definitivos notificados en estrados.',
    'Control y compulsa de cédulas de notificación física recabadas en juzgados públicos civiles y comerciales de la ciudad de La Paz y El Alto.',
    'Registro de plazos fatales y perentorios en la pizarra de control y agenda jurídica institucional del despacho para su seguimiento oportuno.'
  ],
  // Jornada 4
  [
    'Capacitación técnica en el uso y registro de causas en el sistema informático interno del bufete para seguimiento en tiempo real.',
    'Verificación y actualización del estado procesal de procesos ejecutivos, coactivos civiles y procesos ordinarios de usucapión decenal y reivindicación.',
    'Elaboración de fichas informativas de clientes con detalle de pretensiones, jueces asignados, número de NURIS y memoriales pendientes de proveído.'
  ],
  // Jornada 5
  [
    'Auditoría procesal y elaboración del rol semanal de vencimiento de términos probatorios y plazos para interposición de recursos ordinarios según el CPC.',
    'Revisión minuciosa de plazos de apelación en efecto devolutivo y suspensivo contra autos interlocutorios que rechazan medidas cautelares patrimoniales.',
    'Reunión de balance semanal con el abogado tutor para la asignación y planificación de diligencias de estrado de la siguiente semana.'
  ],
  // Jornada 6
  [
    'Diligenciamiento y seguimiento de expedientes en juzgados públicos civiles y comerciales del Tribunal Departamental de Justicia en la ciudad de El Alto.',
    'Entrevista con secretarios de juzgado para la búsqueda y remisión a despacho de cuadernos procesales pendientes de admisión de demanda y autos de intimación.',
    'Revisión en estrados judiciales de listas de despacho y cuadernos de control de notificaciones de juzgados de familia.'
  ],
  // Jornada 7
  [
    'Revisión de cuadernos de control jurisdiccional e investigaciones en fiscalías corporativas y juzgados de instrucción penal cautelar.',
    'Seguimiento y compulsa del cuaderno de investigaciones en la plataforma digital Justicia Libre 2.0 (JL2) del Ministerio Público.',
    'Verificación de plazos de la etapa preliminar y etapa preparatoria, verificando la emisión de requerimientos conclusivos de imputación o sobreseimiento.'
  ],
  // Jornada 8
  [
    'Diligenciamiento de mandamientos judiciales, órdenes instruidas, citaciones y emplazamientos coordinando con oficiales de diligencias en estrados.',
    'Acompañamiento a la central de notificaciones para la verificación de entrega de cédulas a partes demandadas en procesos familiares y civiles.',
    'Redacción de representaciones y actas de representación formal cuando los domicilios procesales o reales se encuentran cerrados o deshabitados.'
  ],
  // Jornada 9
  [
    'Revisión diaria del buzón judicial electrónico y notificaciones digitales en las plataformas del Órgano Judicial Hermes y Thor.',
    'Descarga, cotejo y archivo digital de notificaciones electrónicas verificando el cómputo de plazos a partir de su recepción formal.',
    'Alerta inmediata a los abogados patrocinantes sobre resoluciones con plazo fatal para interposición de recursos de reposición o apelación.'
  ],
  // Jornada 10
  [
    'Elaboración de fichas síntesis del estado procesal de causas asignadas para el informe quincenal de cartera y auditoría legal.',
    'Verificación de medidas cautelares patrimoniales trabadas, tales como anotaciones preventivas en DDRR y retención de fondos ante la ASFI.',
    'Revisión y actualización de los estados de cuenta procesales y liquidaciones preliminares de asistencia familiar devengada conforme a la Ley 603.'
  ],
  // Jornada 11
  [
    'Redacción de borradores de memoriales de mero trámite: apersonamientos formales, solicitudes de copias legalizadas y desarchivo de expedientes.',
    'Elaboración de solicitudes de desglose de documentos originales previa presentación de fotocopias legalizadas de respaldo conforme al art. 85 del CPC.',
    'Revisión de fundamentación procesal y formalidades de patrocinio profesional junto al abogado guía del bufete.'
  ],
  // Jornada 12
  [
    'Redacción de borradores de memoriales solicitando señalamiento de audiencia preliminar, audiencia de juicio y liquidación de pensiones de asistencia familiar.',
    'Elaboración de liquidaciones periciales de asistencia familiar conforme al Código de las Familias y del Proceso Familiar (Ley 603).',
    'Solicitud de mandamientos de apremio corporal y arraigo nacional en causas de asistencia familiar con liquidación debidamente aprobada.'
  ],
  // Jornada 13
  [
    'Apoyo en la redacción preliminar de memoriales de contestación de demanda, allanamiento o reconvención en procesos ordinarios y extraordinarios.',
    'Planteamiento estructurado de excepciones previas de incompetencia, litispendencia y cosa juzgada conforme a los arts. 127 y 128 del Código Procesal Civil.',
    'Recopilación y ofrecimiento de prueba documental, testifical e inspección judicial adjunta a los memoriales de contestación.'
  ],
  // Jornada 14
  [
    'Búsqueda, sistematización y compulsa de jurisprudencia y sentencias constitucionales plurinacionales en el portal del Tribunal Constitucional Plurinacional (TCP).',
    'Análisis de precedentes constitucionales vinculantes sobre debido proceso, valoración razonable de la prueba y tutela judicial efectiva.',
    'Extracción de ratio decidendi y elaboración de citas jurisprudenciales aplicables a memoriales de apelación y amparos constitucionales.'
  ],
  // Jornada 15
  [
    'Redacción de borradores de contratos privados de compraventa de inmuebles, minutas de transferencia definitiva y compromisos de pago transaccionales.',
    'Elaboración de cláusulas de evicción y saneamiento, pacto comisorio y reconocimiento judicial y notarial de firmas y rúbricas conforme al Código Civil.',
    'Asesoramiento a clientes del bufete sobre los requisitos de visado colegial y protocolización ante notarías de fe pública.'
  ],
  // Jornada 16
  [
    'Diligencias en Derechos Reales (DDRR): tramitación, seguimiento y retiro de certificaciones decenales y treintañales para saneamiento de títulos.',
    'Ingreso de formularios de registro de propiedad, cancelación de gravámenes, hipotecas voluntarias y subinscripciones de datos de identidad en DDRR.',
    'Verificación de antecedentes dominiales y tradición hereditaria en oficinas de Derechos Reales de La Paz y El Alto.'
  ],
  // Jornada 17
  [
    'Tramitación de certificados de estado civil, partidas de nacimiento, matrimonio y defunción ante el Servicio de Registro Cívico (SERECI).',
    'Gestión de certificaciones de filiación, duplicados de cédula de identidad y saneamiento de datos biométricos ante las oficinas del SEGIP.',
    'Acompañamiento a clientes en trámites administrativos de rectificación de partidas registrales por errores u omisiones en nombres y apellidos.'
  ],
  // Jornada 18
  [
    'Gestiones administrativas ante dependencias del Gobierno Autónomo Municipal de El Alto (GAMEA) para catastro, visado de planos y tributación.',
    'Tramitación de certificaciones catastrales, pago de impuestos a la transferencia inmobiliaria (IMT) y liquidación de patentes municipales.',
    'Verificación de resoluciones administrativas de regularización técnica de lotes y construcciones en oficinas de Ordenamiento Territorial.'
  ],
  // Jornada 19
  [
    'Consolidación final de cuadernos de seguimiento, digitalización de actuaciones forenses y entrega formal de carteras de procesos a la dirección jurídica.',
    'Organización de carpetas de pruebas documentales para audiencias orales señaladas para las próximas semanas.',
    'Revisión final del inventario de causas patrocinadas por el despacho, constatando que no existan plazos vencidos ni peticiones sin respuesta.'
  ],
  // Jornada 20
  [
    'Cierre de pasantía, consolidación y firma de la Hoja de Control de Asistencia y Permanencia con detalle de horas y fechas hábiles cumplidas.',
    'Recopilación y foliado del muestrario de actuaciones forenses, memoriales redactados y providencias judiciales obtenidas durante la práctica.',
    'Redacción final, revisión institucional y presentación formal del Informe Único de Pasantía dirigido al Docente Guía de la Carrera de Derecho UMSA.'
  ]
];

export function calcularJornadasPasantia(fechaInicioStr, fechaFinStr, modalidadStr, feriadosExtraStr, customTareas) {
  const modLower = (modalidadStr || '').toLowerCase();
  const numJornadas = (modLower.includes('2 semanas') || modLower.includes('tiempo completo')) ? 10 : 20;

  const resolverActividades = (custom, idx) => {
    const defaultActs = ACTIVIDADES_BOLIVIA_POR_DIA[idx % ACTIVIDADES_BOLIVIA_POR_DIA.length];
    if (!custom) return defaultActs;
    if (Array.isArray(custom.actividades) && custom.actividades.length >= 3) {
      return custom.actividades.map(a => String(a || '').trim()).filter(Boolean);
    }
    const arr = [];
    if (Array.isArray(custom.actividades) && custom.actividades.length > 0) {
      arr.push(...custom.actividades.map(a => String(a || '').trim()).filter(Boolean));
    } else if (custom.detalle) {
      arr.push(custom.detalle.trim());
    }
    // Completar hasta 3 con tareas institucionales únicas del día correspondiente
    for (const actDef of defaultActs) {
      if (arr.length >= 3) break;
      if (!arr.includes(actDef)) arr.push(actDef);
    }
    return arr;
  };

  if (!fechaInicioStr) {
    return Array.from({ length: numJornadas }, (_, i) => {
      const base = PASANTIA_CRONOGRAMA_BASE[i % PASANTIA_CRONOGRAMA_BASE.length];
      const custom = customTareas && customTareas[i];
      return {
        numero: i + 1,
        num: i + 1,
        fecha: '',
        fechaRaw: '',
        diaSemana: '',
        semanaIdx: Math.floor(i / 5) + 1,
        tarea: {
          resumen: (custom && custom.resumen) || base.resumen,
          actividades: resolverActividades(custom, i)
        }
      };
    });
  }

  const calc = calcularJornadasHabilesBolivia(fechaInicioStr, numJornadas, feriadosExtraStr);
  return calc.jornadas.map((jh, i) => {
    const base = PASANTIA_CRONOGRAMA_BASE[i % PASANTIA_CRONOGRAMA_BASE.length];
    const custom = customTareas && customTareas[i];
    return {
      numero: jh.num,
      num: jh.num,
      fecha: jh.fechaCorta,
      fechaRaw: jh.iso,
      diaSemana: jh.diaSemana,
      semanaIdx: jh.semanaIdx,
      tarea: {
        resumen: (custom && custom.resumen) || base.resumen,
        actividades: resolverActividades(custom, i)
      }
    };
  });
}

export function generarConclusionesTexto(genero, nombrePasante = '') {
  const t = obtenerTratamiento(genero);
  return `1) En el aspecto técnico-jurídico, ${t.pasanteArticulo} demostró sólida solvencia en la compulsa de expedientes, interpretación de doctrina y aplicación práctica del Código Procesal Civil (Ley 439), Código de las Familias (Ley 603) y normativa conexa, elaborando memoriales con fundamentación idónea.\n\n` +
    `2) En el ámbito ético y deontológico, su desempeño se caracterizó por la puntualidad, confidencialidad, lealtad procesal y probidad en la atención a patrocinados y custodia del archivo forense, consolidando las competencias prácticas exigidas por la Carrera de Derecho.\n\n` +
    `3) Por lo expuesto, se otorga plena CONFORMIDAD Y VISTO BUENO institucional al período de prácticas pre-profesionales, recomendando la acreditación de la materia de Pasantía al haber cumplido satisfactoriamente con la totalidad de horas y objetivos formativos previstos.`;
}

// ----------------------------------------------------------------------
// 1. RENDERIZADO DE HOJA CARTA MEMBRETADA (ARIAL 12 · INTERLINEADO 1.5)
// ----------------------------------------------------------------------
export function renderPaginaHoja({ model, logoSrc, numPag, totalPags, contentHTML, wmOp, modoPresentacion }) {
  const isAcademico = modoPresentacion === 'umsa';
  let headHTML = '';
  let footHTML = '';

  if (isAcademico) {
    headHTML = `
      <div style="border-bottom:2px solid #0e1b2c;padding:10px 2.1cm 6px;text-align:center;font-family:Arial,Helvetica,sans-serif;background:transparent !important;">
        <div style="font-size:12pt !important;font-weight:bold;color:#0e1b2c;letter-spacing:0.5px;text-transform:uppercase;">UNIVERSIDAD MAYOR DE SAN ANDRÉS · FACULTAD DE DERECHO Y CIENCIAS POLÍTICAS</div>
        <div style="font-size:9.5pt !important;color:#a8853c;font-weight:bold;letter-spacing:1px;text-transform:uppercase;margin-top:2px;">INSTITUTO DE INVESTIGACIONES, SEMINARIOS Y TESIS (IIST) · PLAN DE ESTUDIOS 2017</div>
      </div>
    `;
    footHTML = `
      <div style="border-top:1px solid #d9dce1;padding:8px 2.1cm 10px;display:flex;justify-content:space-between;align-items:center;font-size:9pt !important;color:#5c6675;font-family:Arial,Helvetica,sans-serif;background:transparent !important;">
        <span>LexFive Bufete de Abogados · Sede Central El Alto - La Paz</span>
        <span style="font-weight:bold;color:#0e1b2c;">Página ${numPag} de ${totalPags}</span>
      </div>
    `;
  } else {
    headHTML = membreteHeader(model, logoSrc);
    footHTML = membreteFooter(model).replace('</div>', `
      <span style="position:relative;z-index:2;font-weight:bold;color:#c2a25a;margin-left:14px;white-space:nowrap;font-size:9pt !important;">Página ${numPag} de ${totalPags}</span>
    </div>`);
  }

  const effectiveWmOp = (wmOp !== undefined && wmOp !== null && wmOp > 0) ? Number(wmOp) : 0.08;
  const wmHTML = logoSrc ? `
    <img src="${logoSrc}" alt="" style="position:absolute;top:50%;left:50%;width:12.5cm;height:12.5cm;object-fit:contain;transform:translate(-50%,-50%);opacity:${effectiveWmOp.toFixed(2)};pointer-events:none;z-index:0 !important;">
  ` : '';

  return `
  <div class="hoja-carta" style="display:flex;flex-direction:column;width:21.59cm;height:27.94cm;min-height:27.94cm;max-height:27.94cm;margin:0 auto 24px;background:#fff;color:#101820;font-family:Arial,Helvetica,sans-serif !important;font-size:12pt !important;line-height:1.45 !important;text-align:justify;box-sizing:border-box;overflow:hidden;box-shadow:0 3px 12px rgba(0,0,0,0.12);page-break-after:always;break-after:page;position:relative;">
    ${headHTML}
    <div style="position:relative;flex:1 1 auto;display:flex;flex-direction:column;padding:10px 2.1cm 26px;overflow:hidden;box-sizing:border-box;background:transparent !important;">
      ${wmHTML}
      <div style="position:relative;z-index:2;display:flex;flex-direction:column;flex:1 1 auto;justify-content:flex-start;overflow:hidden;background:transparent !important;font-family:Arial,Helvetica,sans-serif !important;font-size:12pt !important;line-height:1.45 !important;">
        ${contentHTML}
      </div>
    </div>
    ${footHTML}
  </div>`;
}

// ----------------------------------------------------------------------
// 2. INFORME ÚNICO DE PASANTÍA (PAGINACIÓN BALANCEADA DE 3 JORNADAS POR HOJA)
// ----------------------------------------------------------------------
export function buildPaginasInforme(d, logoSrc, model, wmOp) {
  const nombre = esc(d.nombre || '___________________');
  const ci = esc(d.ci || '—');
  const ru = esc(d.ru || d.registro_universitario || '—');
  const uni = esc(d.universidad || 'Universidad Mayor de San Andrés (UMSA)');
  const carrera = esc(d.carrera_plan || 'Carrera de Derecho – Plan de Estudios 2017');
  const asignatura = esc(d.asignatura || 'CJR-410 Pasantía I');
  const notaDesig = esc(normalizarNotaDesig(d.nota_designacion || 'IIST-001/2026'));
  const fechaNota = esc(d.fecha_nota_designacion || fechaLarga(d.fecha || d.fecha_emision));
  const horario = esc(d.horario || '14:00 a 18:00');
  const modalidadCompleta = esc(formatearModalidadYHorario(d.modalidad, horario));
  const fechaDoc = fechaLarga(d.fecha || d.fecha_emision || hoyISO());

  // Docente Guía
  const docenteNombreRaw = (d.docente_guia || '').trim();
  const docente = docenteNombreRaw ? esc(docenteNombreRaw) : 'Docente Guía de la Materia de Pasantía – Carrera de Derecho UMSA';
  const docenteCargo = docenteNombreRaw ? (d.docente_cargo ? esc(d.docente_cargo) : 'Docente Guía de la Materia de Pasantía · Carrera de Derecho UMSA') : 'Carrera de Derecho · Universidad Mayor de San Andrés';

  // Tutor / Supervisión Forense
  const sup = formatearSupervision(d.tutor_nombre, d.tutor_rpa);

  const antecedentes = esc(d.antecedentes || `1) Guía de Procedimiento para Pasantías en la Carrera de Derecho, aprobada mediante Resolución del Honorable Consejo Universitario N.º 104/2016.\n2) Nota de Designación de Pasantía: ${notaDesig} de fecha ${fechaNota}.`);
  const conclusiones = esc(d.conclusiones || generarConclusionesTexto(d.genero, nombre));
  const fotos = Array.isArray(d.fotos) ? d.fotos : [];
  const modo = d.modo_presentacion || 'lexfive';

  // --- HOJA 1: PORTADA INSTITUCIONAL, CARACTERÍSTICAS Y ANTECEDENTES ---
  const pag1HTML = `
    <div style="text-align:center;margin-bottom:10px;background:transparent !important;">
      <h1 style="font-size:13pt !important;font-weight:bold;letter-spacing:1px;color:#0e1b2c;margin:0 0 3px;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif !important;">INFORME ÚNICO DE PASANTÍA</h1>
      <div style="font-size:11pt !important;font-weight:bold;color:#a8853c;letter-spacing:0.5px;text-transform:uppercase;">${uni} · ${carrera}</div>
      <div style="font-size:10pt !important;color:#555;margin-top:2px;">ASIGNATURA: ${asignatura}</div>
    </div>

    <div style="border-top:1.5px solid #0e1b2c;border-bottom:1.5px solid #0e1b2c;padding:6px 0;margin-bottom:10px;font-size:11pt !important;line-height:1.4;background:transparent !important;">
      <div style="display:grid;grid-template-columns:85px 1fr;gap:4px;margin-bottom:2px;">
        <strong>A:</strong>
        <div><strong>${docente}</strong><br><span style="font-size:9.5pt !important;color:#444;">${docenteCargo}</span></div>
      </div>
      <div style="display:grid;grid-template-columns:85px 1fr;gap:4px;margin-bottom:2px;">
        <strong>DE:</strong>
        <div><strong>Univ. ${nombre}</strong> &nbsp;|&nbsp; R.U.: ${ru} &nbsp;|&nbsp; C.I.: ${ci}</div>
      </div>
      <div style="display:grid;grid-template-columns:85px 1fr;gap:4px;margin-bottom:2px;">
        <strong>REF.:</strong>
        <div><strong>INFORME ÚNICO DE PASANTÍA PRE-PROFESIONAL (${asignatura})</strong></div>
      </div>
      <div style="display:grid;grid-template-columns:85px 1fr;gap:4px;">
        <strong>FECHA:</strong>
        <div>${fechaDoc}</div>
      </div>
    </div>

    <p style="margin:0 0 6px;font-weight:bold;font-size:12pt !important;">Señor Docente Guía:</p>
    <p style="margin:0 0 8px;text-align:justify;text-indent:18px;font-size:12pt !important;line-height:1.45 !important;">
      A tiempo de hacerle llegar un cordial y distinguido saludo, en cumplimiento a las normativas vigentes de la Carrera de Derecho de la Universidad Mayor de San Andrés, pongo a su consideración el presente <strong>Informe Único de Pasantía</strong>, el cual documenta pormenorizadamente las actividades, diligencias y labores técnico-jurídicas desarrolladas durante mi permanencia en calidad de Pasante en el Bufete de Abogados LexFive, bajo las siguientes especificaciones:
    </p>

    <div style="border-left:3px solid #b89446;border-bottom:1px solid rgba(184,148,70,0.45);border-top:1px solid rgba(184,148,70,0.45);border-right:1px solid rgba(184,148,70,0.45);border-radius:4px;padding:6px 12px;margin-bottom:10px;font-size:11pt !important;line-height:1.4;background:transparent !important;">
      <div style="margin-bottom:3px;"><strong>• Institución Receptora:</strong> Bufete de Abogados LexFive (Área de Litigio, Asesoría Jurídica y Diligenciamiento Procesal).</div>
      <div style="margin-bottom:3px;"><strong>• Duración y Modalidad:</strong> ${modalidadCompleta}.</div>
      <div style="margin-bottom:3px;"><strong>• Supervisión Forense:</strong> ${sup.html}.</div>
      <div><strong>• Ubicación del Despacho:</strong> Av. Alfredo Franco Valle N.º 708-51, Edif. Real, Planta Baja Of. A-6, Ciudad de El Alto - Bolivia.</div>
    </div>

    <div style="font-weight:bold;font-size:12pt !important;color:#0e1b2c;margin-bottom:4px;border-bottom:1.5px solid #0e1b2c;padding-bottom:2px;">I. ANTECEDENTES Y MARCO NORMATIVO</div>
    <div style="white-space:pre-line;text-align:justify;font-size:12pt !important;line-height:1.45 !important;">${antecedentes}</div>
  `;

  // --- CRONOGRAMA DE ACTIVIDADES EN ARIAL 12 CON PAGINACIÓN SECUENCIAL SIN HUECOS ---
  const jornadas = calcularJornadasPasantia(d.fecha_inicio, d.fecha_fin, d.modalidad, d.feriados_extra, d.customTareas);
  const paginasActividades = [];

  const nombresSemanas = ['PRIMERA SEMANA', 'SEGUNDA SEMANA', 'TERCERA SEMANA', 'CUARTA SEMANA', 'QUINTA SEMANA'];
  const numerosRomanos = ['I', 'II', 'III', 'IV', 'V'];

  if (jornadas.length) {
    // Agrupar jornadas por semana natural
    const semMap = new Map();
    jornadas.forEach(j => {
      const sIdx = j.semanaIdx || Math.floor((j.numero - 1) / 5) + 1;
      if (!semMap.has(sIdx)) semMap.set(sIdx, []);
      semMap.get(sIdx).push(j);
    });

    let currentPagContent = '';
    let currentPagHeight = 0; // Presupuesto de altura útil aproximada en puntos (~680pt útil por hoja Carta Arial 12)
    const MAX_PAGE_HEIGHT = 650;
    let esPrimeraPaginaAct = true;

    const renderJornadaBlock = (dj) => `
      <div style="padding-left:4px;background:transparent !important;margin-bottom:8px;">
        <div style="font-size:12pt !important;font-weight:bold;color:#101820;line-height:1.35 !important;margin-bottom:2px;">
          • Jornada ${dj.numero} (${dj.diaSemana} ${dj.fecha || '—'}): <span style="font-weight:normal;color:#222;">${esc(dj.tarea.resumen)}</span>
        </div>
        <ul style="margin:2px 0 2px 20px;padding:0;font-size:12pt !important;line-height:1.45 !important;color:#222;">
          ${dj.tarea.actividades.map(act => `<li style="margin-bottom:3px;text-align:justify;">${esc(act)}</li>`).join('')}
        </ul>
      </div>
    `;

    // Recorrer cada semana en orden estricto
    Array.from(semMap.entries()).forEach(([sNum, jList]) => {
      const semActualIndex = sNum - 1;
      const nombreSemana = nombresSemanas[semActualIndex] || `SEMANA ${sNum}`;
      const romano = numerosRomanos[semActualIndex] || `${sNum}`;
      const fechaIniSem = jList[0]?.fecha || '';
      const fechaFinSem = jList[jList.length - 1]?.fecha || '';
      const rangoSemTxt = (fechaIniSem && fechaFinSem) ? ` (del ${fechaIniSem} al ${fechaFinSem})` : '';

      let semanaIniciada = false;

      jList.forEach((dj, jIdx) => {
        // Estimar peso visual de la jornada (en puntos aprox): ~110pt por jornada con 3 actividades
        const pesoJornada = 100 + (dj.tarea.actividades.length * 15);
        const pesoBanner = 40;
        const pesoHeaderII = esPrimeraPaginaAct ? 45 : 0;

        // Si la jornada no entra en la página actual y ya tenemos contenido, cerramos página
        if (currentPagContent && (currentPagHeight + pesoJornada + (semanaIniciada ? 0 : pesoBanner) > MAX_PAGE_HEIGHT)) {
          paginasActividades.push(currentPagContent);
          currentPagContent = '';
          currentPagHeight = 0;
          semanaIniciada = false; // Requiere banner de continuación en la nueva hoja
        }

        if (!currentPagContent) {
          // Nueva página
          if (esPrimeraPaginaAct) {
            currentPagContent += `
              <div style="font-weight:bold;font-size:12pt !important;color:#0e1b2c;margin-bottom:6px;border-bottom:1.5px solid #0e1b2c;padding-bottom:2px;background:transparent !important;">
                II. DETALLE CRONOLÓGICO DE FUNCIONES Y ACTIVIDADES REALIZADAS
              </div>
            `;
            currentPagHeight += pesoHeaderII;
            esPrimeraPaginaAct = false;
          }

          if (semanaIniciada) {
            currentPagContent += `
              <div style="border-left:3px solid #b89446;border-bottom:1px solid rgba(184,148,70,0.35);padding:3px 10px;margin-bottom:10px;font-size:11.5pt !important;font-weight:bold;color:#0e1b2c;background:transparent !important;">
                ${romano}. ${nombreSemana} (Continuación)
              </div>
            `;
          } else {
            currentPagContent += `
              <div style="border-left:3px solid #b89446;border-bottom:1px solid rgba(184,148,70,0.35);padding:3px 10px;margin-bottom:10px;font-size:12pt !important;font-weight:bold;color:#0e1b2c;background:transparent !important;">
                ${romano}. ${nombreSemana}${rangoSemTxt}
              </div>
            `;
            semanaIniciada = true;
          }
          currentPagHeight += pesoBanner;
        } else if (!semanaIniciada) {
          // Si entra en la página pero inicia nueva semana
          currentPagContent += `
            <div style="border-left:3px solid #b89446;border-bottom:1px solid rgba(184,148,70,0.35);padding:3px 10px;margin-top:8px;margin-bottom:10px;font-size:12pt !important;font-weight:bold;color:#0e1b2c;background:transparent !important;">
              ${romano}. ${nombreSemana}${rangoSemTxt}
            </div>
          `;
          currentPagHeight += pesoBanner;
          semanaIniciada = true;
        }

        currentPagContent += renderJornadaBlock(dj);
        currentPagHeight += pesoJornada;
      });
    });

    if (currentPagContent) {
      paginasActividades.push(currentPagContent);
    }
  } else {
    paginasActividades.push(`
      <div style="font-weight:bold;font-size:12pt !important;color:#0e1b2c;margin-bottom:8px;border-bottom:1.5px solid #0e1b2c;padding-bottom:3px;background:transparent !important;">II. DETALLE DE FUNCIONES REALIZADAS</div>
      <p style="margin:0 0 10px;text-align:justify;font-size:12pt !important;line-height:1.5 !important;">A continuación se describen las funciones asignadas y ejecutadas en el despacho:</p>
      <div style="white-space:pre-line;font-size:12pt !important;line-height:1.5 !important;text-align:justify;">${esc(d.actividades || 'Práctica forense en estrados judiciales y despacho.')}</div>
    `);
  }

  // --- CONCLUSIONES Y VISTO BUENO INSTITUCIONAL ---
  const pagConclusionesHTML = `
    <div style="font-weight:bold;font-size:12pt !important;color:#0e1b2c;margin-bottom:8px;border-bottom:1.5px solid #0e1b2c;padding-bottom:3px;background:transparent !important;">III. CONCLUSIONES Y VISTO BUENO INSTITUCIONAL</div>
    <p style="margin:0 0 10px;text-align:justify;text-indent:18px;font-size:12pt !important;line-height:1.45 !important;">
      Habiendo concluido satisfactoriamente el ciclo programado de prácticas pre-profesionales, se establecen las siguientes conclusiones institucionales y valorativas:
    </p>

    <div style="white-space:pre-line;font-size:12pt !important;line-height:1.45 !important;text-align:justify;margin-bottom:16px;">${conclusiones}</div>

    <p style="margin:0 0 20px;text-align:justify;font-size:12pt !important;line-height:1.45 !important;">
      Es cuanto tengo a bien informar a su autoridad en honor a la verdad, para los fines académicos consiguientes.
    </p>

    <div style="margin-top:auto;border:1px solid #d9dce1;border-radius:6px;padding:12px 18px;background:transparent !important;">
      <div style="text-align:center;font-size:9.5pt !important;font-weight:bold;letter-spacing:1px;color:#0e1b2c;margin-bottom:8px;">VALIDACIÓN Y CONFORMIDAD INSTITUCIONAL</div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:20px;">
        <div style="text-align:center;flex:1;">
          <div style="min-height:55px;"></div>
          <div style="border-top:1.2px solid #0e1b2c;padding-top:4px;font-size:11pt !important;font-weight:bold;color:#0e1b2c;">Univ. ${nombre}</div>
          <div style="font-size:9pt !important;color:#5c6675;">Estudiante Pasante<br>R.U. ${ru} · C.I. ${ci}</div>
        </div>
        <div style="text-align:center;flex:1;">
          <div style="min-height:55px;"></div>
          <div style="border-top:1.2px solid #0e1b2c;padding-top:4px;font-size:11pt !important;font-weight:bold;color:#0e1b2c;">${sup.firmaTitulo}</div>
          <div style="font-size:9pt !important;color:#5c6675;">${sup.firmaSub}</div>
        </div>
      </div>
    </div>
  `;

  // --- ÍNDICE DE ANEXOS ---
  const pagAnexosHTML = `
    <div style="font-weight:bold;font-size:12pt !important;color:#0e1b2c;margin-bottom:8px;border-bottom:1.5px solid #0e1b2c;padding-bottom:3px;background:transparent !important;">IV. ÍNDICE DE ANEXOS Y CONSTANCIAS DE RESPALDO</div>
    <p style="margin:0 0 10px;text-align:justify;text-indent:18px;font-size:12pt !important;line-height:1.45 !important;">
      En cumplimiento a los requerimientos normativos del Instituto de Investigaciones, Seminarios y Tesis (IIST) de la Carrera de Derecho, se adjunta al presente informe la documentación de respaldo que acredita fehacientemente la realización efectiva de la pasantía:
    </p>

    <table style="width:100%;border-collapse:collapse;font-size:11.5pt !important;line-height:1.45 !important;margin-bottom:14px;background:transparent !important;table-layout:fixed;">
      <colgroup>
        <col style="width:7%;">
        <col style="width:68%;">
        <col style="width:25%;">
      </colgroup>
      <thead>
        <tr style="background:transparent !important;border-bottom:2px solid #0e1b2c;border-top:1.5px solid #0e1b2c;color:#0e1b2c;">
          <th style="padding:8px 6px;text-align:center;border-bottom:2px solid #0e1b2c;">N.º</th>
          <th style="padding:8px 10px;text-align:left;border-bottom:2px solid #0e1b2c;">Instrumento o Constancia de Respaldo</th>
          <th style="padding:8px 8px;text-align:center;border-bottom:2px solid #0e1b2c;">Verificación</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:8px 6px;text-align:center;border-bottom:1px solid #d9dce1;font-weight:bold;">1</td>
          <td style="padding:8px 10px;border-bottom:1px solid #d9dce1;text-align:justify;"><strong>Nota Oficial de Designación de Pasantía</strong> emitida por la Dirección de Carrera / IIST</td>
          <td style="padding:8px 8px;text-align:center;border-bottom:1px solid #d9dce1;">${notaDesig}</td>
        </tr>
        <tr>
          <td style="padding:8px 6px;text-align:center;border-bottom:1px solid #d9dce1;font-weight:bold;">2</td>
          <td style="padding:8px 10px;border-bottom:1px solid #d9dce1;text-align:justify;"><strong>Carta de Aceptación Institucional</strong> emitida por el Bufete de Abogados LexFive</td>
          <td style="padding:8px 8px;text-align:center;border-bottom:1px solid #d9dce1;">Original adjunto</td>
        </tr>
        <tr>
          <td style="padding:8px 6px;text-align:center;border-bottom:1px solid #d9dce1;font-weight:bold;">3</td>
          <td style="padding:8px 10px;border-bottom:1px solid #d9dce1;text-align:justify;"><strong>Certificado Oficial de Conclusión de Pasantía</strong> con código QR de verificación digital</td>
          <td style="padding:8px 8px;text-align:center;border-bottom:1px solid #d9dce1;">Ref. ${esc(d.ref || 'Verificable')}</td>
        </tr>
        <tr>
          <td style="padding:8px 6px;text-align:center;border-bottom:1px solid #d9dce1;font-weight:bold;">4</td>
          <td style="padding:8px 10px;border-bottom:1px solid #d9dce1;text-align:justify;"><strong>Hoja de Control de Asistencia y Permanencia</strong> (jornadas hábiles con sellos institucionales)</td>
          <td style="padding:8px 8px;text-align:center;border-bottom:1px solid #d9dce1;">Formulario sellado</td>
        </tr>
        <tr>
          <td style="padding:8px 6px;text-align:center;border-bottom:1px solid #d9dce1;font-weight:bold;">5</td>
          <td style="padding:8px 10px;border-bottom:1px solid #d9dce1;text-align:justify;"><strong>Muestrario de Actuaciones Forenses</strong> (copias simples de memoriales redactados y diligenciados)</td>
          <td style="padding:8px 8px;text-align:center;border-bottom:1px solid #d9dce1;">Compulsa adjunta</td>
        </tr>
        <tr>
          <td style="padding:8px 6px;text-align:center;border-bottom:1px solid #d9dce1;font-weight:bold;">6</td>
          <td style="padding:8px 10px;border-bottom:1px solid #d9dce1;text-align:justify;"><strong>Registro Fotográfico de Prácticas Forenses</strong> (acompañamiento en estrados e instalaciones)</td>
          <td style="padding:8px 8px;text-align:center;border-bottom:1px solid #d9dce1;">${fotos.length ? `${fotos.length} fotografías anexas` : 'Fotografías anexas'}</td>
        </tr>
      </tbody>
    </table>

    <div style="border-left:3px solid #b89446;border-bottom:1px solid rgba(184,148,70,0.45);padding:8px 12px;font-size:10.5pt !important;color:#555;line-height:1.4;background:transparent !important;">
      <strong>Nota aclaratoria:</strong> Todos los respaldos adjuntos cuentan con la firma, sello y conformidad de los abogados directores y tutores del Despacho Jurídico LexFive, gozando de plena validez para la evaluación académica.
    </div>
  `;

  // --- PÁGINAS FOTOGRÁFICAS (ANEXO FOTOGRÁFICO) ---
  const layout = String(d.fotos_layout || '4');
  const perPage = layout === '2' ? 2 : 4;
  const paginasFotos = [];

  if (fotos.length) {
    for (let fIdx = 0; fIdx < fotos.length; fIdx += perPage) {
      const sliceFotos = fotos.slice(fIdx, fIdx + perPage);
      const isFirstPhotoPage = (fIdx === 0);

      const headerTitle = isFirstPhotoPage
        ? `<div style="font-weight:bold;font-size:12pt !important;color:#0e1b2c;margin-bottom:6px;border-bottom:1.5px solid #0e1b2c;padding-bottom:3px;background:transparent !important;text-transform:uppercase;letter-spacing:0.5px;">ANEXO FOTOGRÁFICO — REGISTRO DE PRÁCTICA FORENSE</div>
           <p style="margin:0 0 8px;font-size:10pt !important;color:#555;font-family:Arial,sans-serif;">Evidencia gráfica del desarrollo de labores forenses, diligencias y gestión jurídica:</p>`
        : `<div style="font-weight:bold;font-size:11.5pt !important;color:#0e1b2c;margin-bottom:8px;border-bottom:1.5px solid #0e1b2c;padding-bottom:3px;background:transparent !important;text-transform:uppercase;letter-spacing:0.5px;">ANEXO FOTOGRÁFICO — REGISTRO DE PRÁCTICA FORENSE (Continuación)</div>`;

      let photosGridHTML = '';

      if (perPage === 4) {
        // Modo 4 fotos por hoja (2x2)
        photosGridHTML = `
          <div style="display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(2, minmax(0, 1fr));gap:10px;flex:1 1 auto;width:100%;height:100%;max-height:19cm;background:transparent !important;box-sizing:border-box;">
            ${sliceFotos.map((foto, idx) => {
              const globalIdx = fIdx + idx + 1;
              const pieTxt = foto.pie && foto.pie.trim() ? `: ${esc(foto.pie.trim())}` : '';
              return `
              <div style="border:1px solid rgba(184,148,70,0.45);border-radius:6px;padding:6px;background:transparent !important;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;max-height:9.2cm;box-sizing:border-box;overflow:hidden;">
                <div style="flex:1 1 auto;width:100%;height:100%;min-height:0;display:flex;align-items:center;justify-content:center;overflow:hidden;background:transparent !important;">
                  <img src="${foto.src}" style="max-height:100%;max-width:100%;object-fit:contain;display:block;" alt="">
                </div>
                <div style="font-size:9.5pt !important;color:#101820;margin-top:4px;text-align:center;font-family:Arial,sans-serif !important;line-height:1.25;flex-shrink:0;">
                  <strong>Fotografía N.º ${globalIdx}</strong>${pieTxt}
                </div>
              </div>`;
            }).join('')}
          </div>
        `;
      } else {
        // Modo 2 fotos por hoja (vertical grande)
        photosGridHTML = `
          <div style="display:flex;flex-direction:column;gap:12px;flex:1 1 auto;width:100%;height:100%;max-height:19cm;background:transparent !important;box-sizing:border-box;">
            ${sliceFotos.map((foto, idx) => {
              const globalIdx = fIdx + idx + 1;
              const pieTxt = foto.pie && foto.pie.trim() ? `: ${esc(foto.pie.trim())}` : '';
              return `
              <div style="border:1px solid rgba(184,148,70,0.45);border-radius:6px;padding:8px;background:transparent !important;flex:1 1 0;display:flex;flex-direction:column;align-items:center;justify-content:center;box-sizing:border-box;min-height:0;overflow:hidden;">
                <div style="flex:1 1 auto;width:100%;height:100%;min-height:0;display:flex;align-items:center;justify-content:center;overflow:hidden;background:transparent !important;">
                  <img src="${foto.src}" style="max-height:100%;max-width:100%;object-fit:contain;display:block;" alt="">
                </div>
                <div style="font-size:10pt !important;color:#101820;margin-top:6px;text-align:center;font-family:Arial,sans-serif !important;line-height:1.3;flex-shrink:0;">
                  <strong>Fotografía N.º ${globalIdx}</strong>${pieTxt}
                </div>
              </div>`;
            }).join('')}
          </div>
        `;
      }

      paginasFotos.push(`
        ${headerTitle}
        ${photosGridHTML}
      `);
    }
  }

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
// 3. HOJA DE ASISTENCIA MULTIPÁGINA (ARIAL 11.5 · FONDOS TRANSPARENTES)
// ----------------------------------------------------------------------
export function buildHojaAsistenciaHTML(d, logoSrc, model, wmOp) {
  const nombre = esc(d.nombre || '___________________');
  const ci = esc(d.ci || '—');
  const ru = esc(d.registro_universitario || d.ru || '—');
  const uni = esc(d.universidad || 'Universidad Mayor de San Andrés (UMSA)');
  const carrera = esc(d.carrera_plan || 'Carrera de Derecho – Plan de Estudios 2017');
  const asignatura = esc(d.asignatura || 'CJR-410 Pasantía I');
  const horario = esc(d.horario || '14:00 a 18:00');
  const modalidad = esc(d.modalidad || '4 semanas a medio tiempo');
  const prellenar = d.prellenar_asistencia !== false;
  const ref = esc(d.ref || '');

  // Fuente única: calcular jornadas de acuerdo a fechas reales
  const jornadas = calcularJornadasPasantia(d.fecha_inicio, d.fecha_fin, d.modalidad, d.feriados_extra, d.customTareas);
  const infoHoras = extraerHoras(d.horario, d.modalidad);

  const totalJornadas = jornadas.length;
  const totalHoras = totalJornadas * infoHoras.horas;

  // Paginación equilibrada que llena el 85%-92% de cada hoja Carta sin huecos
  let pageSlices = [];
  if (totalJornadas <= 10) {
    pageSlices = [jornadas];
  } else if (totalJornadas <= 22) {
    const corteP1 = Math.min(11, Math.ceil(totalJornadas * 0.55));
    pageSlices = [
      jornadas.slice(0, corteP1),
      jornadas.slice(corteP1)
    ];
  } else {
    const p1 = 11;
    pageSlices.push(jornadas.slice(0, p1));
    let rem = jornadas.slice(p1);
    while (rem.length > 10) {
      pageSlices.push(rem.slice(0, 11));
      rem = rem.slice(11);
    }
    if (rem.length) pageSlices.push(rem);
  }

  const totalPags = pageSlices.length;
  const paginasHtml = [];
  const effectiveWmOp = (wmOp !== undefined && wmOp !== null && wmOp > 0) ? Number(wmOp) : 0.08;

  pageSlices.forEach((slice, p) => {
    const esUltima = (p === totalPags - 1);

    let rowsHtml = '';
    slice.forEach(j => {
      const fecha = prellenar ? (j.fecha || '') : '';
      const ing = prellenar ? infoHoras.ingreso : '';
      const sal = prellenar ? infoHoras.salida : '';
      const act = prellenar ? esc(j.tarea.resumen) : '';
      const hrs = prellenar ? infoHoras.horas : '';

      rowsHtml += `
        <tr style="background:transparent !important;">
          <td style="text-align:center;font-weight:bold;color:#444;font-size:11pt !important;padding:6px 4px;border:1px solid #d9dce1;vertical-align:middle;">${j.numero}</td>
          <td style="padding:6px 4px;font-size:10.5pt !important;text-align:center;border:1px solid #d9dce1;white-space:nowrap;vertical-align:middle;">${fecha}</td>
          <td style="padding:6px 4px;font-size:10.5pt !important;text-align:center;border:1px solid #d9dce1;vertical-align:middle;">${ing}</td>
          <td style="padding:6px 4px;font-size:10.5pt !important;text-align:center;border:1px solid #d9dce1;vertical-align:middle;">${sal}</td>
          <td style="padding:6px 8px;font-size:11pt !important;color:#101820;border:1px solid #d9dce1;line-height:1.4 !important;background:transparent !important;vertical-align:middle;text-align:left;">${act}</td>
          <td style="padding:6px 4px;font-size:11pt !important;text-align:center;border:1px solid #d9dce1;font-weight:bold;vertical-align:middle;">${hrs}</td>
        </tr>
      `;
    });

    const footerTotalesYFirma = esUltima ? `
      <table style="width:100%;border-collapse:collapse;margin-top:8px;margin-bottom:6px;font-size:10.5pt !important;background:transparent !important;table-layout:fixed;">
        <tr style="background:transparent !important;font-weight:bold;border-top:2px solid #0e1b2c;border-bottom:1.5px solid #0e1b2c;">
          <td style="padding:6px 8px;border:1px solid #d9dce1;text-align:center;">TOTAL JORNADAS: ${totalJornadas}</td>
          <td style="padding:6px 8px;border:1px solid #d9dce1;text-align:center;">CARGA HORARIA: ${totalHoras} hrs</td>
          <td style="padding:6px 8px;border:1px solid #d9dce1;text-align:center;color:#16a34a;">ASISTENCIA: 100 %</td>
        </tr>
      </table>

      <div style="border:1px solid #d9dce1;border-radius:6px;padding:8px 14px;background:transparent !important;margin-top:auto;">
        <div style="text-align:center;font-size:9.5pt !important;font-weight:bold;color:#0e1b2c;letter-spacing:1px;margin-bottom:4px;">VALIDACIÓN Y CONFORMIDAD INSTITUCIONAL</div>
        <div style="display:flex;justify-content:center;align-items:flex-end;">
          <div style="text-align:center;width:280px;">
            <div style="min-height:48px;"></div>
            <div style="border-top:1.2px solid #0e1b2c;padding-top:4px;font-size:10.5pt !important;font-weight:bold;color:#0e1b2c;">Sello y Firma · Abogado(a) Patrocinante</div>
            <div style="font-size:8.5pt !important;color:#5c6675;">LexFive · Bufete de Abogados</div>
          </div>
        </div>
      </div>
    ` : '';

    let contentPagina = '';

    if (p === 0) {
      // PÁGINA 1: Encabezado institucional + Título + Subtítulo limpio + Recuadro 2 columnas + Tabla
      const infoBoxHtml = `
        <table style="width:100%;border-collapse:collapse;background:transparent !important;border:1px solid rgba(184,148,70,0.45);border-left:3.5px solid #b89446;border-radius:4px;margin-bottom:8px;font-family:Arial,Helvetica,sans-serif !important;font-size:9.5pt !important;line-height:1.3 !important;table-layout:fixed;">
          <colgroup>
            <col style="width:54%;">
            <col style="width:46%;">
          </colgroup>
          <tbody>
            <tr style="border-bottom:1px solid rgba(184,148,70,0.22);">
              <td style="padding:4px 8px;vertical-align:middle;color:#101820;"><strong>Estudiante / Pasante:</strong> ${nombre}</td>
              <td style="padding:4px 8px;vertical-align:middle;color:#101820;"><strong>C.I.:</strong> ${ci} &nbsp;·&nbsp; <strong>R.U.:</strong> ${ru}</td>
            </tr>
            <tr style="border-bottom:1px solid rgba(184,148,70,0.22);">
              <td style="padding:4px 8px;vertical-align:middle;color:#101820;"><strong>Universidad:</strong> ${uni}</td>
              <td style="padding:4px 8px;vertical-align:middle;color:#101820;"><strong>Carrera:</strong> ${carrera}</td>
            </tr>
            <tr>
              <td style="padding:4px 8px;vertical-align:middle;color:#101820;"><strong>Asignatura:</strong> ${asignatura}</td>
              <td style="padding:4px 8px;vertical-align:middle;color:#101820;"><strong>Modalidad:</strong> ${modalidad} &nbsp;·&nbsp; <strong>Horario:</strong> ${horario}</td>
            </tr>
          </tbody>
        </table>
      `;

      contentPagina = `
        <div style="text-align:right;font-size:9.5pt !important;color:#5c6675;margin-bottom:2px;">Ref. N.º ${ref} · Hoja de Asistencia</div>
        <h1 style="text-align:center;font-size:13pt !important;letter-spacing:1px;color:#0e1b2c;margin:1px 0 1px;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif !important;">HOJA DE CONTROL DE ASISTENCIA Y PERMANENCIA</h1>
        <div style="text-align:center;font-size:10pt !important;color:#a8853c;letter-spacing:1px;margin-bottom:6px;font-weight:bold;">PRÁCTICA PRE-PROFESIONAL / PASANTÍA JURÍDICA</div>

        ${infoBoxHtml}

        <table style="width:100%;border-collapse:collapse;font-size:11pt !important;margin-bottom:4px;background:transparent !important;table-layout:fixed;">
          <colgroup>
            <col style="width:6%;">
            <col style="width:13%;">
            <col style="width:9%;">
            <col style="width:9%;">
            <col style="width:56%;">
            <col style="width:7%;">
          </colgroup>
          <thead>
            <tr style="background:transparent !important;border-bottom:2px solid #0e1b2c;border-top:1.5px solid #0e1b2c;color:#0e1b2c;">
              <th style="padding:5px 3px;border:1px solid #d9dce1;text-align:center;">N.º</th>
              <th style="padding:5px 4px;border:1px solid #d9dce1;text-align:center;">Fecha</th>
              <th style="padding:5px 4px;border:1px solid #d9dce1;text-align:center;">Ingreso</th>
              <th style="padding:5px 4px;border:1px solid #d9dce1;text-align:center;">Salida</th>
              <th style="padding:5px 8px;border:1px solid #d9dce1;text-align:left;">Actividades y Tareas Jurídicas Desarrolladas</th>
              <th style="padding:5px 3px;border:1px solid #d9dce1;text-align:center;">Hrs.</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        ${footerTotalesYFirma}
      `;
    } else {
      // PÁGINA 2 Y SIGUIENTES: Entra directamente a la tabla con respiro limpio (margin-top: 12px)
      contentPagina = `
        <div style="margin-top:12px;"></div>
        <table style="width:100%;border-collapse:collapse;font-size:11pt !important;margin-bottom:4px;background:transparent !important;table-layout:fixed;">
          <colgroup>
            <col style="width:6%;">
            <col style="width:13%;">
            <col style="width:9%;">
            <col style="width:9%;">
            <col style="width:56%;">
            <col style="width:7%;">
          </colgroup>
          <thead>
            <tr style="background:transparent !important;border-bottom:2px solid #0e1b2c;border-top:1.5px solid #0e1b2c;color:#0e1b2c;">
              <th style="padding:5px 3px;border:1px solid #d9dce1;text-align:center;">N.º</th>
              <th style="padding:5px 4px;border:1px solid #d9dce1;text-align:center;">Fecha</th>
              <th style="padding:5px 4px;border:1px solid #d9dce1;text-align:center;">Ingreso</th>
              <th style="padding:5px 4px;border:1px solid #d9dce1;text-align:center;">Salida</th>
              <th style="padding:5px 8px;border:1px solid #d9dce1;text-align:left;">Actividades y Tareas Jurídicas Desarrolladas</th>
              <th style="padding:5px 3px;border:1px solid #d9dce1;text-align:center;">Hrs.</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        ${footerTotalesYFirma}
      `;
    }

    const footHTML = membreteFooter(model).replace('</div>', `
      <span style="position:relative;z-index:2;font-weight:bold;color:#c2a25a;margin-left:14px;white-space:nowrap;font-size:9pt !important;">Página ${p + 1} de ${totalPags}</span>
    </div>`);

    const wmHTML = logoSrc ? `
      <img src="${logoSrc}" alt="" style="position:absolute;top:50%;left:50%;width:12.5cm;height:12.5cm;object-fit:contain;transform:translate(-50%,-50%);opacity:${effectiveWmOp.toFixed(2)};pointer-events:none;z-index:0 !important;">
    ` : '';

    paginasHtml.push(`
      <div class="hoja-carta" style="display:flex;flex-direction:column;width:21.59cm;height:27.94cm;min-height:27.94cm;max-height:27.94cm;margin:0 auto 24px;background:#fff;color:#101820;font-family:Arial,Helvetica,sans-serif !important;box-sizing:border-box;overflow:visible;box-shadow:0 3px 12px rgba(0,0,0,0.12);page-break-after:always;break-after:page;position:relative;">
        <div style="flex-shrink:0;overflow:visible;">${membreteHeader(model, logoSrc)}</div>
        <div style="position:relative;flex:1 1 auto;display:flex;flex-direction:column;padding:6px 2.1cm 20px;overflow:visible;box-sizing:border-box;background:transparent !important;">
          ${wmHTML}
          <div style="position:relative;z-index:2;display:flex;flex-direction:column;flex:1 1 auto;justify-content:flex-start;overflow:visible;background:transparent !important;font-family:Arial,Helvetica,sans-serif !important;font-size:11pt !important;line-height:1.4 !important;">
            ${contentPagina}
          </div>
        </div>
        ${footHTML}
      </div>
    `);
  });

  return paginasHtml.join('');
}

// ----------------------------------------------------------------------
// 4. DOCUMENTO WORD (.DOC) EN ARIAL 12 · INTERLINEADO 150% · JUSTIFICADO
// ----------------------------------------------------------------------
export function buildInformeWordDocument(d, logoSrc) {
  const nombre = esc(d.nombre || '___________________');
  const ci = esc(d.ci || '—');
  const ru = esc(d.ru || d.registro_universitario || '—');
  const uni = esc(d.universidad || 'Universidad Mayor de San Andrés (UMSA)');
  const carrera = esc(d.carrera_plan || 'Carrera de Derecho – Plan de Estudios 2017');
  const asignatura = esc(d.asignatura || 'CJR-410 Pasantía I');
  const notaDesig = esc(normalizarNotaDesig(d.nota_designacion || 'IIST-001/2026'));
  const fechaNota = esc(d.fecha_nota_designacion || fechaLarga(d.fecha || d.fecha_emision));
  const horario = esc(d.horario || '14:00 a 18:00');
  const modalidadCompleta = esc(formatearModalidadYHorario(d.modalidad, horario));
  const fechaDoc = fechaLarga(d.fecha || d.fecha_emision || hoyISO());
  const ref = esc(d.ref || 'LF-2026-00000');

  // Docente Guía
  const docenteNombreRaw = (d.docente_guia || '').trim();
  const docente = docenteNombreRaw ? esc(docenteNombreRaw) : 'Docente Guía de la Materia de Pasantía – Carrera de Derecho UMSA';
  const docenteCargo = docenteNombreRaw ? (d.docente_cargo ? esc(d.docente_cargo) : 'Docente Guía de la Materia de Pasantía · Carrera de Derecho UMSA') : 'Carrera de Derecho · Universidad Mayor de San Andrés';

  // Tutor / Supervisión
  const sup = formatearSupervision(d.tutor_nombre, d.tutor_rpa);

  const antecedentes = esc(d.antecedentes || `1) Guía de Procedimiento para Pasantías en la Carrera de Derecho, aprobada mediante Resolución del Honorable Consejo Universitario N.º 104/2016.\n2) Nota de Designación de Pasantía: ${notaDesig} de fecha ${fechaNota}.`);
  const conclusiones = esc(d.conclusiones || generarConclusionesTexto(d.genero, nombre));
  const fotos = Array.isArray(d.fotos) ? d.fotos : [];

  // Agrupar jornadas por semanas para Word (3 jornadas por página)
  const jornadas = calcularJornadasPasantia(d.fecha_inicio, d.fecha_fin, d.modalidad, d.feriados_extra, d.customTareas);
  const nombresSemanas = ['PRIMERA SEMANA', 'SEGUNDA SEMANA', 'TERCERA SEMANA', 'CUARTA SEMANA', 'QUINTA SEMANA'];
  const numerosRomanos = ['I', 'II', 'III', 'IV', 'V'];

  let cronogramaWordHtml = '';
  let semanaAnterior = null;

  for (let i = 0; i < jornadas.length; i += 3) {
    const slice = jornadas.slice(i, i + 3);
    const semNum = slice[0].semanaIdx || Math.floor((slice[0].numero - 1) / 5) + 1;
    const semIndex = semNum - 1;
    const nombreSemana = nombresSemanas[semIndex] || `SEMANA ${semNum}`;
    const romano = numerosRomanos[semIndex] || `${semNum}`;

    const jornadasEstaSemana = jornadas.filter(j => (j.semanaIdx || Math.floor((j.numero - 1) / 5) + 1) === semNum);
    const fechaIniSem = jornadasEstaSemana[0]?.fecha || '';
    const fechaFinSem = jornadasEstaSemana[jornadasEstaSemana.length - 1]?.fecha || '';
    const rangoSemTxt = (fechaIniSem && fechaFinSem) ? ` (del ${fechaIniSem} al ${fechaFinSem})` : '';

    if (i > 0) {
      cronogramaWordHtml += `<div class="page-break"></div>`;
    }

    const esContinuacion = (semanaAnterior === semNum);
    semanaAnterior = semNum;

    cronogramaWordHtml += `
      <h3 style="font-size:12pt;font-weight:bold;color:#8a6d2b;border-bottom:1pt solid #ccc;padding-bottom:3pt;margin-top:14pt;page-break-after:avoid;">
        ${romano}. ${nombreSemana}${esContinuacion ? ' (Continuación)' : rangoSemTxt}
      </h3>
    `;

    slice.forEach(dj => {
      cronogramaWordHtml += `
        <div style="margin-bottom:8pt;page-break-inside:avoid;">
          <p style="margin:0 0 2pt;font-weight:bold;font-size:12pt;text-indent:0;">
            • Día ${dj.numero} (${dj.diaSemana} ${dj.fecha}): <span style="font-weight:normal;color:#222;">${esc(dj.tarea.resumen)}</span>
          </p>
          <ul style="margin:2pt 0 4pt 24pt;font-size:11pt;line-height:150%;">
            ${dj.tarea.actividades.map(act => `<li>${esc(act)}</li>`).join('')}
          </ul>
        </div>
      `;
    });
  }

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
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12pt;
    line-height: 150%;
    color: #000;
  }
  h1, h2, h3, h4 {
    font-family: Arial, Helvetica, sans-serif;
    page-break-after: avoid;
    break-after: avoid;
    color: #0e1b2c;
  }
  h1 {
    font-size: 14pt;
    text-align: center;
    text-transform: uppercase;
    margin: 0 0 4pt;
    font-weight: bold;
  }
  h2 {
    font-size: 12.5pt;
    font-weight: bold;
    border-bottom: 1.5pt solid #b89446;
    padding-bottom: 3pt;
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
    padding: 5pt 6pt;
    font-size: 11pt;
    text-align: left;
    line-height: 140%;
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
        <div style="font-family:Arial,sans-serif;font-size:16pt;font-weight:bold;color:#0e1b2c;">Lex<span style="color:#b89446;">Five</span></div>
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
<div style="text-align:center;font-size:11pt;color:#8a6d2b;font-weight:bold;margin-bottom:12pt;">${uni} · ${carrera}</div>

<table width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;border-top:1.5pt solid #0e1b2c;border-bottom:1.5pt solid #0e1b2c;margin-bottom:12pt;font-size:11pt;line-height:140%;">
  <tr><td width="70" style="width:70pt;font-weight:bold;padding:3pt 0;">A:</td><td style="padding:3pt 0;"><strong>${docente}</strong><br><span style="font-size:9.5pt;color:#444;">${docenteCargo}</span></td></tr>
  <tr><td style="font-weight:bold;padding:3pt 0;">DE:</td><td style="padding:3pt 0;"><strong>Univ. ${nombre}</strong> &nbsp;|&nbsp; R.U.: ${ru} &nbsp;|&nbsp; C.I.: ${ci}</td></tr>
  <tr><td style="font-weight:bold;padding:3pt 0;">REF.:</td><td style="padding:3pt 0;"><strong>INFORME ÚNICO DE PASANTÍA PRE-PROFESIONAL (${asignatura})</strong></td></tr>
  <tr><td style="font-weight:bold;padding:3pt 0;">FECHA:</td><td style="padding:3pt 0;">${fechaDoc}</td></tr>
</table>

<p class="p-noint"><strong>Distinguido Docente Guía:</strong></p>
<p>A tiempo de hacerle llegar un cordial y distinguido saludo, en cumplimiento a las normativas de la Carrera de Derecho de la Universidad Mayor de San Andrés, pongo a su conocimiento el presente <strong>Informe Único de Pasantía</strong> bajo las siguientes características institucionales:</p>

<table class="data-table">
  <tr><th width="30%">Institución Receptora:</th><td>Bufete de Abogados "LexFive" (Área de Litigio, Asesoría Jurídica y Diligenciamiento Procesal)</td></tr>
  <tr><th>Duración y Modalidad:</th><td>${modalidadCompleta}</td></tr>
  <tr><th>Supervisión Forense:</th><td>${sup.html}</td></tr>
  <tr><th>Ubicación del Despacho:</th><td>Av. Alfredo Franco Valle 708-51, Edif. Real Of. A-6, La Ceja, El Alto - Bolivia</td></tr>
</table>

<h2>I. ANTECEDENTES Y MARCO NORMATIVO</h2>
<div style="white-space:pre-line;font-size:12pt;line-height:150%;margin-bottom:10pt;text-align:justify;">${antecedentes}</div>

<div class="page-break"></div>

<h2>II. DETALLE CRONOLÓGICO DE FUNCIONES Y ACTIVIDADES REALIZADAS</h2>
<p class="p-noint">Las funciones forenses se ejecutaron de lunes a viernes bajo el cronograma oficial coordinado con el despacho:</p>
${cronogramaWordHtml}

<div class="page-break"></div>

<h2>III. CONCLUSIONES Y VISTO BUENO INSTITUCIONAL</h2>
<p class="p-noint">Habiendo completado satisfactoriamente el ciclo de pasantía, se formulan las siguientes conclusiones:</p>
<div style="white-space:pre-line;font-size:12pt;line-height:150%;margin-bottom:16pt;text-align:justify;">${conclusiones}</div>

<p style="margin-top:14pt;" class="p-noint">Es cuanto se informa en honor a la verdad y para los fines académicos consiguientes.</p>

<table width="100%" cellspacing="0" cellpadding="0" style="width:100%;margin-top:36pt;border-collapse:collapse;">
  <tr>
    <td width="50%" align="center" style="width:50%;text-align:center;padding:0 15pt;vertical-align:bottom;">
      <div style="border-top:1.5pt solid #000;padding-top:4pt;font-weight:bold;font-size:11pt;">Univ. ${nombre}</div>
      <div style="font-size:9pt;color:#555;">Estudiante Pasante<br>R.U. ${ru} · C.I. ${ci}</div>
    </td>
    <td width="50%" align="center" style="width:50%;text-align:center;padding:0 15pt;vertical-align:bottom;">
      <div style="border-top:1.5pt solid #000;padding-top:4pt;font-weight:bold;font-size:11pt;">${sup.firmaTitulo}</div>
      <div style="font-size:9pt;color:#555;">${sup.firmaSub}</div>
    </td>
  </tr>
</table>

<div class="page-break"></div>

<h2>IV. ÍNDICE DE ANEXOS Y CONSTANCIAS DE RESPALDO</h2>
<p class="p-noint">Se adjuntan al presente informe los instrumentos de respaldo correspondientes:</p>

<table class="data-table">
  <tr><th width="35">N.º</th><th>Documento</th><th width="160">Verificación</th></tr>
  <tr><td align="center">1</td><td>Nota Oficial de Designación de Pasantía</td><td>${notaDesig}</td></tr>
  <tr><td align="center">2</td><td>Carta de Aceptación de Pasantía de LexFive</td><td>Original adjunto</td></tr>
  <tr><td align="center">3</td><td>Certificado Oficial de Pasantía Jurídica LexFive</td><td>Ref. ${ref}</td></tr>
  <tr><td align="center">4</td><td>Hoja de Control de Asistencia y Permanencia</td><td>Validada por LexFive (jornadas hábiles)</td></tr>
  <tr><td align="center">5</td><td>Muestrario de Actuaciones Forenses</td><td>Compulsa adjunta</td></tr>
  <tr><td align="center">6</td><td>Registro Fotográfico de Prácticas Forenses</td><td>${fotos.length ? `${fotos.length} fotografías adjuntas` : 'Anexo fotográfico'}</td></tr>
</table>

${fotos.length ? `
  <div class="page-break"></div>
  <h2 style="font-size:13pt;font-weight:bold;color:#0e1b2c;border-bottom:1.5pt solid #b89446;padding-bottom:3pt;margin:16pt 0 10pt;text-align:center;">ANEXO FOTOGRÁFICO — REGISTRO DE PRÁCTICA FORENSE</h2>
  <table width="100%" cellspacing="0" cellpadding="6" style="width:100%;border-collapse:collapse;margin-top:8pt;">
    ${(() => {
      let rows = '';
      for (let i = 0; i < fotos.length; i += 2) {
        const f1 = fotos[i];
        const f2 = fotos[i + 1];
        rows += `<tr>
          <td width="50%" align="center" style="width:50%;text-align:center;padding:8pt;vertical-align:top;border:1pt solid #d9dce1;">
            <img src="${f1.src}" style="max-width:7.5cm;max-height:6cm;object-fit:contain;" alt=""><br>
            <div style="font-size:9pt;font-family:Arial,sans-serif;margin-top:4pt;"><strong>Fotografía N.º ${i + 1}</strong>${f1.pie ? `: ${esc(f1.pie)}` : ''}</div>
          </td>
          ${f2 ? `
          <td width="50%" align="center" style="width:50%;text-align:center;padding:8pt;vertical-align:top;border:1pt solid #d9dce1;">
            <img src="${f2.src}" style="max-width:7.5cm;max-height:6cm;object-fit:contain;" alt=""><br>
            <div style="font-size:9pt;font-family:Arial,sans-serif;margin-top:4pt;"><strong>Fotografía N.º ${i + 2}</strong>${f2.pie ? `: ${esc(f2.pie)}` : ''}</div>
          </td>
          ` : `<td width="50%" style="width:50%;border:none;"></td>`}
        </tr>`;
      }
      return rows;
    })()}
  </table>
` : ''}

</div>
</body>
</html>`;
}

// ----------------------------------------------------------------------
// 5. MOTOR ROBUSTO DE EXPORTACIÓN PDF HOJA POR HOJA (FIX DEFINITIVO DE CANVAS EN BLANCO)
// ----------------------------------------------------------------------
export async function exportarHojasCartaAPdf(hojasList, nombreArchivo, progressCallback) {
  if (!hojasList || !hojasList.length) {
    throw new Error('No se encontraron hojas para exportar a PDF.');
  }

  const totalHojas = hojasList.length;
  const opt = {
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 816,
      height: 1056,
      windowWidth: 816,
      windowHeight: 1056,
      scrollX: 0,
      scrollY: 0
    },
    jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
  };

  // Asegurar que las fuentes y recursos visuales estén listos
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch (_) {}
  }

  // Crear contenedor temporal invisible normalizado a 816x1056px exactos
  const stage = document.createElement('div');
  stage.style.position = 'fixed';
  stage.style.top = '0';
  stage.style.left = '0';
  stage.style.width = '816px';
  stage.style.height = '1056px';
  stage.style.overflow = 'hidden';
  stage.style.zIndex = '-9999';
  stage.style.background = '#ffffff';
  stage.style.margin = '0';
  stage.style.padding = '0';
  stage.style.transform = 'none';
  document.body.appendChild(stage);

  try {
    const renderHojaToDataURL = async (hojaEl) => {
      stage.innerHTML = '';
      const clone = hojaEl.cloneNode(true);
      clone.style.margin = '0';
      clone.style.width = '816px';
      clone.style.height = '1056px';
      clone.style.minHeight = '1056px';
      clone.style.maxHeight = '1056px';
      clone.style.boxShadow = 'none';
      clone.style.transform = 'none';
      stage.appendChild(clone);

      const imgs = Array.from(stage.querySelectorAll('img'));
      if (imgs.length) {
        await Promise.all(imgs.map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(res => { img.onload = res; img.onerror = res; });
        }));
      }

      const canvas = await window.html2pdf().set(opt).from(stage).toCanvas().get('canvas');
      return canvas.toDataURL('image/jpeg', 0.98);
    };

    // 1. Primera hoja
    if (progressCallback) progressCallback(1, totalHojas);
    const firstImg = await renderHojaToDataURL(hojasList[0]);

    // Obtener instancia base de jsPDF
    const pdf = await window.html2pdf().set(opt).from(hojasList[0]).toPdf().get('pdf');

    // Limpiar páginas iniciales generadas por html2pdf
    const totalBefore = pdf.internal.getNumberOfPages();
    for (let p = totalBefore; p > 1; p--) {
      pdf.deletePage(p);
    }

    pdf.setPage(1);
    pdf.addImage(firstImg, 'JPEG', 0, 0, 215.9, 279.4);

    // 2. Iterar secuencialmente por las siguientes páginas sin colapsar memoria
    for (let i = 1; i < totalHojas; i++) {
      if (progressCallback) progressCallback(i + 1, totalHojas);
      pdf.addPage('letter', 'portrait');
      pdf.setPage(i + 1);

      const imgData = await renderHojaToDataURL(hojasList[i]);
      pdf.addImage(imgData, 'JPEG', 0, 0, 215.9, 279.4);
    }

    pdf.save(nombreArchivo);
    return totalHojas;
  } finally {
    if (stage) stage.remove();
  }
}

// Función auxiliar que monta temporalmente las hojas si no están visibles en pantalla
export async function renderizarYExportarPDF(htmlContent, nombreArchivo, labelDoc) {
  let tempDiv = null;
  try {
    toast(`Iniciando generación de ${labelDoc}...`, 'info');

    // Montar en un contenedor visible fuera de la vista del usuario (nunca display:none ni left:-9999px)
    tempDiv = document.createElement('div');
    tempDiv.style.position = 'fixed';
    tempDiv.style.top = '0';
    tempDiv.style.left = '0';
    tempDiv.style.zIndex = '-1';
    tempDiv.style.opacity = '1';
    tempDiv.style.width = '21.59cm';
    tempDiv.style.pointerEvents = 'none';
    tempDiv.innerHTML = htmlContent;
    document.body.appendChild(tempDiv);

    // Esperar carga de imágenes
    const imgs = Array.from(tempDiv.querySelectorAll('img'));
    if (imgs.length) {
      await Promise.all(imgs.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(res => { img.onload = res; img.onerror = res; });
      }));
    }

    const hojas = Array.from(tempDiv.querySelectorAll('.hoja-carta'));
    if (!hojas.length) {
      throw new Error('No se generaron hojas válidas en el documento.');
    }

    const totalPags = await exportarHojasCartaAPdf(hojas, nombreArchivo, (act, tot) => {
      toast(`Generando PDF (página ${act} de ${tot})...`, 'info');
    });

    toast(`PDF de ${labelDoc} generado correctamente (${totalPags} páginas).`, 'success');
  } catch (err) {
    console.error(`Error al exportar ${labelDoc} a PDF:`, err);
    toast(`Error al exportar PDF: ${err.message || err}`, 'error');
  } finally {
    if (tempDiv) tempDiv.remove();
  }
}

export function descargarHojaAsistenciaPDF(d, logoSrc, model, wmOp) {
  const nombreArch = `asistencia-${(d.nombre || 'pasante').toLowerCase().replace(/[^\w]+/g, '-')}.pdf`;
  const html = buildHojaAsistenciaHTML(d, logoSrc, model, wmOp);

  const ejecutar = () => {
    renderizarYExportarPDF(html, nombreArch, 'Hoja de Asistencia');
  };

  if (typeof window.html2pdf === 'undefined') {
    const script = document.createElement('script');
    script.src = 'js/html2pdf.bundle.min.js';
    script.onload = ejecutar;
    script.onerror = () => toast('Error al cargar html2pdf.bundle.min.js.', 'error');
    document.head.appendChild(script);
  } else {
    ejecutar();
  }
}

export function descargarInformePDF(d, logoSrc, model, wmOp) {
  const nombreArch = `informe-pasantia-${(d.nombre || 'umsa').toLowerCase().replace(/[^\w]+/g, '-')}.pdf`;
  const html = buildPaginasInforme(d, logoSrc, model, wmOp);

  const ejecutar = () => {
    renderizarYExportarPDF(html, nombreArch, 'Informe Único');
  };

  if (typeof window.html2pdf === 'undefined') {
    const script = document.createElement('script');
    script.src = 'js/html2pdf.bundle.min.js';
    script.onload = ejecutar;
    script.onerror = () => toast('Error al cargar html2pdf.bundle.min.js.', 'error');
    document.head.appendChild(script);
  } else {
    ejecutar();
  }
}

export function imprimirInformeDocumento(d, logoSrc, model, wmOp) {
  const docHTML = buildPaginasInforme(d, logoSrc, model, wmOp);
  const nombreLimpio = (d.nombre || 'pasante').trim();
  const tituloDoc = `Informe_Unico_Pasantia_${nombreLimpio.replace(/[^\w]+/g, '_')}`;
  const w = window.open('', '_blank');
  if (!w) { toast('Permita las ventanas emergentes para imprimir.', 'error'); return; }
  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${esc(tituloDoc)}</title>
    <style>
      @page { size: letter portrait; margin: 0; }
      html, body { margin: 0; padding: 0; background: #fff; width: 100%; }
      .hoja-carta { box-shadow: none !important; margin: 0 auto !important; width: 21.59cm !important; height: 27.94cm !important; page-break-after: always; break-after: page; }
      ${PRINT_COLOR_CSS}
    </style></head><body>${docHTML}
    <script>
      window.addEventListener('load', function(){
        var imgs = Array.from(document.images);
        var pending = imgs.filter(function(img) { return !img.complete; });
        function disparar() {
          setTimeout(function(){ window.focus(); window.print(); }, 350);
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

export async function descargarInformeWordDoc(d, logoSrc) {
  toast('Preparando documento Word membretado...', 'info');
  const base64Logo = await getLogoBase64(logoSrc);
  const html = buildInformeWordDocument(d, base64Logo);
  const nombre = 'informe-pasantia-' + ((d.nombre || 'umsa').toLowerCase().replace(/[^\w]+/g, '-').slice(0, 35)) + '.doc';
  descargarArchivo(nombre, '\ufeff' + html, 'application/msword');
  toast('Informe descargado en Word.', 'success');
}


// ----------------------------------------------------------------------
// 6. CERTIFICADO DE EXPERIENCIA PRE-PROFESIONAL (1 HOJA CARTA)
// ----------------------------------------------------------------------
export function buildExperienciaHTML(d, logoSrc, model, wmOp) {
  const nombre = esc(d.nombre || '___________________');
  const ci = esc(d.ci || '—');
  const ru = esc(d.ru || d.registro_universitario || '');
  const uni = esc(d.universidad || 'Universidad Mayor de San Andrés (UMSA)');
  const carrera = esc(d.carrera_plan || 'Carrera de Derecho – Plan de Estudios 2017');
  const gen = obtenerTratamiento(d.genero);
  const ref = esc(d.ref || 'LF-2026-00000');
  const fechaDoc = fechaLarga(d.fecha || d.fecha_emision || hoyISO());
  
  let lapso = '';
  if (d.fecha_inicio_larga && d.fecha_fin_larga) {
    lapso = `del <strong>${esc(d.fecha_inicio_larga)}</strong> al <strong>${esc(d.fecha_fin_larga)}</strong>`;
  } else if (d.periodo && d.periodo !== 'correspondiente') {
    lapso = `durante el período <strong>${esc(d.periodo)}</strong>`;
  } else {
    lapso = 'durante el período académico correspondiente';
  }
  
  const horas = extraerHoras(d.horario, d.modalidad) || (d.horas ? parseInt(d.horas, 10) : 80);
  const modHor = esc(formatearModalidadYHorario(d.modalidad, d.horario));
  
  const qrLink = `${SITIO_URL}verificar-certificado.html?ref=${encodeURIComponent(d.ref || '')}&n=${encodeURIComponent(d.nombre || '')}&ci=${encodeURIComponent(d.ci || '')}&t=experiencia`;
  const qrImgSrc = qrURL(qrLink);
  
  const headHTML = membreteHeader(model, logoSrc);
  const footHTML = membreteFooter(model);
  const effectiveWmOp = (wmOp !== undefined && wmOp !== null && wmOp > 0) ? Number(wmOp) : 0.08;
  const wmHTML = logoSrc ? `
    <img src="${logoSrc}" alt="" style="position:absolute;top:50%;left:50%;width:13cm;height:13cm;object-fit:contain;transform:translate(-50%,-50%);opacity:${effectiveWmOp.toFixed(2)};pointer-events:none;z-index:0 !important;">
  ` : '';

  const contentHTML = `
    <div style="display:flex;justify-content:flex-end;margin-bottom:2px;">
      <span style="font-size:9pt;color:#5c6675;font-family:Arial,sans-serif;font-weight:600;">Ref. N.º ${ref} &middot; Experiencia Pre-Profesional</span>
    </div>
    
    <div style="text-align:center;margin:4px 0 10px;">
      <h1 style="font-size:15.5pt !important;font-weight:bold;color:#0e1b2c;letter-spacing:1px;text-transform:uppercase;margin:0 0 3px;font-family:Georgia,serif;">CERTIFICADO DE EXPERIENCIA PRE-PROFESIONAL</h1>
      <div style="font-size:9.5pt !important;font-weight:bold;color:#a8853c;letter-spacing:2px;text-transform:uppercase;font-family:Arial,sans-serif;">PRÁCTICA FORENSE Y GESTIÓN JURÍDICA</div>
    </div>

    <div style="font-size:10.5pt;line-height:1.52;color:#101820;text-align:justify;font-family:Arial,sans-serif;">
      <p style="margin:0 0 8px;">
        El <strong>BUFETE DE ABOGADOS LEXFIVE</strong>, mediante su Dirección Jurídica y cuerpo colegiado de abogados patrocinantes, en mérito a las facultades que le confiere el ordenamiento jurídico vigente:
      </p>
      
      <div style="text-align:center;font-weight:bold;font-size:11pt;color:#0e1b2c;letter-spacing:2px;margin:6px 0 8px;">
        CERTIFICA:
      </div>

      <p style="margin:0 0 8px;">
        Que, ${gen.artUniv} <strong>${nombre}</strong>, con Cédula de Identidad N.º <strong>${ci}</strong>${ru ? `, con Registro Universitario N.º <strong>${ru}</strong>` : ''}, estudiante de la <strong>${carrera}</strong> de la <strong>${uni}</strong>, completó satisfactoriamente su práctica pre-profesional jurídica y pasantía forense en nuestra institución, ${lapso}, acumulando un total efectivo de <strong>${horas} horas académicas</strong> bajo la modalidad de <strong>${modHor}</strong>.
      </p>

      <p style="margin:0 0 6px;">
        Durante el desarrollo de su práctica, ${gen.artPasante} demostró solvencia teórica, rigurosidad metodológica y probada ética profesional, habiendo adquirido y consolidado destrezas prácticas en las siguientes áreas y procedimientos:
      </p>

      <ul style="margin:4px 0 8px 18px;padding:0;font-size:9.8pt;line-height:1.42;">
        <li style="margin-bottom:3px;"><strong>Derecho Civil, Familiar y Notarial:</strong> Elaboración de memoriales en demandas ordinarias, procesos extraordinarios de asistencia familiar, divorcios, minutas y diligenciamiento registral ante Derechos Reales (DDRR).</li>
        <li style="margin-bottom:3px;"><strong>Derecho Penal y Procesal Penal:</strong> Seguimiento de causas en etapa preparatoria, redacción de apersonamientos y control de plazos procesales ante el Ministerio Público y juzgados cautelares.</li>
        <li style="margin-bottom:3px;"><strong>Derecho Laboral y Administrativo:</strong> Preparación de trámites de reincorporación y liquidación de beneficios sociales ante la Jefatura Departamental de Trabajo y el Gobierno Autónomo Municipal de El Alto (GAMEA).</li>
        <li style="margin-bottom:3px;"><strong>Herramientas de Justicia Digital (LegalTech):</strong> Manejo operativo y seguimiento de causas a través del Buzón Judicial (Hermes / Thor), sistema Justicia Libre 2.0 (FGE), Plataforma Ciudadana del TDJ y el sistema informático de control de expedientes de LexFive.</li>
      </ul>

      <p style="margin:0 0 8px;font-size:9.2pt;color:#374151;font-style:italic;border-left:3px solid #c2a25a;padding-left:8px;line-height:1.35;">
        La presente certificación acredita formación académica y práctica forense pre-profesional sin que constituya relación laboral de dependencia, en estricto cumplimiento de la normativa académica universitaria y la legislación laboral boliviana.
      </p>

      <p style="margin:0 0 8px;">
        Es cuanto se certifica en la ciudad de El Alto a los ${fechaDoc}, para fines curriculares y acreditación de méritos ${gen.delInteresado}.
      </p>
    </div>

    <div style="flex:1 1 auto;min-height:6px;"></div>

    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-top:auto;">
      <div style="display:flex;align-items:center;gap:10px;max-width:55%;">
        <img src="${qrImgSrc}" alt="QR de verificación" style="width:2.2cm;height:2.2cm;flex-shrink:0;border:1px solid #d9dce1;padding:2px;background:#fff;">
        <div style="font-size:8pt;color:#5c6675;line-height:1.35;font-family:Arial,sans-serif;">
          <strong style="color:#0e1b2c;">Verificación Oficial:</strong> Escanee este código QR para validar la autenticidad y emisión institucional de este documento en el portal de LexFive Bufete de Abogados.
        </div>
      </div>

      <div style="text-align:center;min-width:230px;max-width:270px;">
        <div style="min-height:45px;"></div>
        <div style="border-top:1.5px solid #0e1b2c;padding-top:4px;font-size:10pt;font-weight:bold;color:#0e1b2c;font-family:Arial,sans-serif;">
          ${d.tutor_nombre ? esc(d.tutor_nombre) : 'DIRECCIÓN / ABOGADO(A) PATROCINANTE'}
        </div>
        <div style="font-size:8.5pt;color:#5c6675;font-family:Arial,sans-serif;margin-top:2px;line-height:1.25;">
          ${d.tutor_nombre ? (d.tutor_rpa ? `R.P.A. ${esc(d.tutor_rpa)}<br>` : '') + 'TUTOR(A) INSTITUCIONAL' : 'LexFive Bufete de Abogados'}
        </div>
      </div>
    </div>
  `;

  return `
  <div class="hoja-carta" style="display:flex;flex-direction:column;width:21.59cm;height:27.94cm;min-height:27.94cm;max-height:27.94cm;margin:0 auto 24px;background:#fff;color:#101820;box-sizing:border-box;overflow:hidden;box-shadow:0 3px 12px rgba(0,0,0,0.12);page-break-after:always;break-after:page;position:relative;">
    ${headHTML}
    <div style="position:relative;flex:1 1 auto;display:flex;flex-direction:column;padding:12px 2.1cm 16px;overflow:hidden;box-sizing:border-box;background:transparent !important;">
      ${wmHTML}
      <div style="position:relative;z-index:2;display:flex;flex-direction:column;flex:1 1 auto;justify-content:flex-start;overflow:hidden;background:transparent !important;">
        ${contentHTML}
      </div>
    </div>
    ${footHTML}
  </div>`;
}

// ----------------------------------------------------------------------
// 7. CARTA DE RECOMENDACIÓN PROFESIONAL (1 HOJA CARTA)
// ----------------------------------------------------------------------
export function buildRecomendacionHTML(d, logoSrc, model, wmOp) {
  const nombre = esc(d.nombre || '___________________');
  const ci = esc(d.ci || '—');
  const gen = obtenerTratamiento(d.genero);
  const ref = esc(d.ref || 'LF-2026-00000');
  const fechaDoc = fechaLarga(d.fecha || d.fecha_emision || hoyISO());
  
  let lapso = '';
  if (d.fecha_inicio_larga && d.fecha_fin_larga) {
    lapso = `del <strong>${esc(d.fecha_inicio_larga)}</strong> al <strong>${esc(d.fecha_fin_larga)}</strong>`;
  } else if (d.periodo && d.periodo !== 'correspondiente') {
    lapso = `durante el período <strong>${esc(d.periodo)}</strong>`;
  } else {
    lapso = 'durante el período correspondiente';
  }

  const qrLink = `${SITIO_URL}verificar-certificado.html?ref=${encodeURIComponent(d.ref || '')}&n=${encodeURIComponent(d.nombre || '')}&ci=${encodeURIComponent(d.ci || '')}&t=recomendacion`;
  const qrImgSrc = qrURL(qrLink);
  
  const headHTML = membreteHeader(model, logoSrc);
  const footHTML = membreteFooter(model);
  const effectiveWmOp = (wmOp !== undefined && wmOp !== null && wmOp > 0) ? Number(wmOp) : 0.08;
  const wmHTML = logoSrc ? `
    <img src="${logoSrc}" alt="" style="position:absolute;top:50%;left:50%;width:13cm;height:13cm;object-fit:contain;transform:translate(-50%,-50%);opacity:${effectiveWmOp.toFixed(2)};pointer-events:none;z-index:0 !important;">
  ` : '';

  const observacionExtra = (d.observacion_rec && d.observacion_rec.trim()) 
    ? `Asimismo, cabe destacar de manera especial su ${esc(d.observacion_rec.trim().replace(/^su\s+/i, ''))}.`
    : `Asimismo, evidenció una notable capacidad de trabajo en equipo bajo presión, iniciativa constante y un trato ético y respetuoso tanto con el personal jurisdiccional como con nuestros clientes y patrocinados.`;

  const contentHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
      <span style="font-size:9pt;color:#5c6675;font-family:Arial,sans-serif;font-weight:600;">Ref. N.º ${ref} &middot; Carta de Recomendación</span>
      <span style="font-size:9.5pt;color:#0e1b2c;font-family:Arial,sans-serif;">El Alto / La Paz, ${fechaDoc}</span>
    </div>
    
    <div style="text-align:center;margin:6px 0 14px;">
      <h1 style="font-size:15.5pt !important;font-weight:bold;color:#0e1b2c;letter-spacing:1px;text-transform:uppercase;margin:0 0 3px;font-family:Georgia,serif;">CARTA DE RECOMENDACIÓN PROFESIONAL</h1>
      <div style="font-size:9.5pt !important;font-weight:bold;color:#a8853c;letter-spacing:2px;text-transform:uppercase;font-family:Arial,sans-serif;">BUFETE DE ABOGADOS LEXFIVE</div>
    </div>

    <div style="font-size:10.5pt;line-height:1.58;color:#101820;text-align:justify;font-family:Arial,sans-serif;">
      <div style="font-weight:bold;color:#0e1b2c;font-size:11pt;margin-bottom:12px;letter-spacing:1px;">
        A QUIEN CORRESPONDA:
      </div>

      <p style="margin:0 0 10px;">
        Por medio de la presente, el Bufete de Abogados <strong>LEXFIVE</strong> tiene a bien expresar su más amplia, sincera y fundada recomendación profesional en favor de ${gen.artUniv} <strong>${nombre}</strong>, titular de la Cédula de Identidad N.º <strong>${ci}</strong>, quien desempeñó funciones de práctica jurídica pre-profesional y procuración legal en nuestra firma ${lapso}.
      </p>

      <p style="margin:0 0 10px;">
        Durante el período de su práctica, ${gen.artPasante} demostró un intachable sentido de responsabilidad, disciplina, probidad y puntualidad en cada una de las diligencias y comisiones asignadas. Destacó de forma sobresaliente por su solvencia doctrinal, criterio jurídico analítico en el estudio de expedientes y un alto rigor técnico en la redacción de memoriales y trámites judiciales y administrativos.
      </p>

      <p style="margin:0 0 10px;">
        ${observacionExtra}
      </p>

      <p style="margin:0 0 10px;">
        Por las sólidas cualidades éticas, académicas y humanas demostradas a lo largo de su desempeño, nos complace <strong>RECOMENDAR AMPLIA Y PLENAMENTE</strong> a ${gen.artUniv} <strong>${nombre}</strong> para asumir funciones jurídicas o corporativas en instituciones públicas, estudios jurídicos o empresas privadas, con la certeza de que constituirá un valioso aporte técnico y humano para cualquier equipo de trabajo.
      </p>

      <p style="margin:0 0 12px;">
        Facilitamos nuestros canales y líneas de contacto institucionales para brindar cualquier referencia o certificación complementaria que sea requerida.
      </p>

      <p style="margin:0 0 4px;">
        Atentamente,
      </p>
    </div>

    <div style="flex:1 1 auto;min-height:8px;"></div>

    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-top:auto;">
      <div style="display:flex;align-items:center;gap:10px;max-width:55%;">
        <img src="${qrImgSrc}" alt="QR de verificación" style="width:2.2cm;height:2.2cm;flex-shrink:0;border:1px solid #d9dce1;padding:2px;background:#fff;">
        <div style="font-size:8pt;color:#5c6675;line-height:1.35;font-family:Arial,sans-serif;">
          <strong style="color:#0e1b2c;">Validación Oficial:</strong> Escanee este código QR para comprobar la autenticidad y registro institucional de esta carta de recomendación en el sistema de LexFive.
        </div>
      </div>

      <div style="text-align:center;min-width:230px;max-width:270px;">
        <div style="min-height:48px;"></div>
        <div style="border-top:1.5px solid #0e1b2c;padding-top:4px;font-size:10pt;font-weight:bold;color:#0e1b2c;font-family:Arial,sans-serif;">
          ${d.tutor_nombre ? esc(d.tutor_nombre) : 'DIRECCIÓN / ABOGADO(A) PATROCINANTE'}
        </div>
        <div style="font-size:8.5pt;color:#5c6675;font-family:Arial,sans-serif;margin-top:2px;line-height:1.25;">
          ${d.tutor_nombre ? (d.tutor_rpa ? `R.P.A. ${esc(d.tutor_rpa)}<br>` : '') + 'TUTOR(A) INSTITUCIONAL' : 'LexFive Bufete de Abogados'}
        </div>
      </div>
    </div>
  `;

  return `
  <div class="hoja-carta" style="display:flex;flex-direction:column;width:21.59cm;height:27.94cm;min-height:27.94cm;max-height:27.94cm;margin:0 auto 24px;background:#fff;color:#101820;box-sizing:border-box;overflow:hidden;box-shadow:0 3px 12px rgba(0,0,0,0.12);page-break-after:always;break-after:page;position:relative;">
    ${headHTML}
    <div style="position:relative;flex:1 1 auto;display:flex;flex-direction:column;padding:12px 2.1cm 16px;overflow:hidden;box-sizing:border-box;background:transparent !important;">
      ${wmHTML}
      <div style="position:relative;z-index:2;display:flex;flex-direction:column;flex:1 1 auto;justify-content:flex-start;overflow:hidden;background:transparent !important;">
        ${contentHTML}
      </div>
    </div>
    ${footHTML}
  </div>`;
}

// ----------------------------------------------------------------------
// 8. EXPORTACIONES A WORD (.DOC) DE EXPERIENCIA Y RECOMENDACIÓN
// ----------------------------------------------------------------------
export function buildExperienciaWordDoc(d, logoSrc) {
  const htmlContent = buildExperienciaHTML(d, logoSrc, 'banda', 0.08);
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8">
<style>
@page { size: 8.5in 11in; margin: 1in; }
body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; text-align: justify; }
</style>
</head>
<body>${htmlContent}</body>
</html>`;
}

export function buildRecomendacionWordDoc(d, logoSrc) {
  const htmlContent = buildRecomendacionHTML(d, logoSrc, 'banda', 0.08);
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8">
<style>
@page { size: 8.5in 11in; margin: 1in; }
body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; text-align: justify; }
</style>
</head>
<body>${htmlContent}</body>
</html>`;
}

export async function descargarExperienciaWordDoc(d, logoSrc) {
  toast('Preparando Certificado de Experiencia en Word...', 'info');
  const base64Logo = await getLogoBase64(logoSrc);
  const html = buildExperienciaWordDoc(d, base64Logo);
  const nombre = 'certificado-experiencia-' + ((d.nombre || 'pasante').toLowerCase().replace(/[^\w]+/g, '-').slice(0, 35)) + '.doc';
  descargarArchivo(nombre, '\ufeff' + html, 'application/msword');
  toast('Certificado de Experiencia descargado en Word.', 'success');
}

export async function descargarRecomendacionWordDoc(d, logoSrc) {
  toast('Preparando Carta de Recomendación en Word...', 'info');
  const base64Logo = await getLogoBase64(logoSrc);
  const html = buildRecomendacionWordDoc(d, base64Logo);
  const nombre = 'carta-recomendacion-' + ((d.nombre || 'pasante').toLowerCase().replace(/[^\w]+/g, '-').slice(0, 35)) + '.doc';
  descargarArchivo(nombre, '\ufeff' + html, 'application/msword');
  toast('Carta de Recomendación descargada en Word.', 'success');
}

// ----------------------------------------------------------------------
// 9. EXTRACTOR NATIVO DE IMÁGENES DESDE DOCX Y OPTIMIZADOR CANVAS
// ----------------------------------------------------------------------
export function optimizarImagenBlob(blob, maxDim = 1200, quality = 0.85) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;

      if (w <= maxDim && h <= maxDim && blob.size < 500 * 1024) {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
        return;
      }

      if (w > maxDim || h > maxDim) {
        if (w >= h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    };
    img.src = url;
  });
}

export async function extraerImagenesDeDocx(file) {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  const n = buffer.byteLength;

  let eocdOffset = -1;
  const maxSearch = Math.min(n, 65557 + 22);
  for (let i = n - 22; i >= n - maxSearch; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  const entries = [];

  if (eocdOffset !== -1) {
    const cdSize = view.getUint32(eocdOffset + 12, true);
    const cdOffset = view.getUint32(eocdOffset + 16, true);

    let pos = cdOffset;
    while (pos < cdOffset + cdSize && pos + 46 <= n) {
      if (view.getUint32(pos, true) !== 0x02014b50) break;
      const method = view.getUint16(pos + 10, true);
      const compSize = view.getUint32(pos + 20, true);
      const uncompSize = view.getUint32(pos + 24, true);
      const nameLen = view.getUint16(pos + 28, true);
      const extraLen = view.getUint16(pos + 30, true);
      const commentLen = view.getUint16(pos + 32, true);
      const localHeaderOffset = view.getUint32(pos + 42, true);

      const nameBytes = new Uint8Array(buffer, pos + 46, nameLen);
      const name = new TextDecoder('utf-8').decode(nameBytes);

      const lower = name.toLowerCase();
      if (lower.startsWith('word/media/') && /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(lower)) {
        entries.push({ name, method, compSize, uncompSize, localHeaderOffset });
      }

      pos += 46 + nameLen + extraLen + commentLen;
    }
  } else {
    // Fallback: búsqueda de Local File Headers
    let pos = 0;
    while (pos + 30 <= n) {
      if (view.getUint32(pos, true) !== 0x04034b50) {
        pos++;
        continue;
      }
      const method = view.getUint16(pos + 8, true);
      const compSize = view.getUint32(pos + 18, true);
      const uncompSize = view.getUint32(pos + 22, true);
      const nameLen = view.getUint16(pos + 26, true);
      const extraLen = view.getUint16(pos + 28, true);

      if (pos + 30 + nameLen > n) break;
      const nameBytes = new Uint8Array(buffer, pos + 30, nameLen);
      const name = new TextDecoder('utf-8').decode(nameBytes);

      const lower = name.toLowerCase();
      if (lower.startsWith('word/media/') && /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(lower)) {
        entries.push({ name, method, compSize, uncompSize, localHeaderOffset: pos });
      }

      pos += 30 + nameLen + extraLen + compSize;
    }
  }

  // Orden natural: image1, image2, ..., image10
  entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

  const fotos = [];

  for (const entry of entries) {
    try {
      const lh = entry.localHeaderOffset;
      if (lh + 30 > n || view.getUint32(lh, true) !== 0x04034b50) continue;
      const lhNameLen = view.getUint16(lh + 26, true);
      const lhExtraLen = view.getUint16(lh + 28, true);
      const dataOffset = lh + 30 + lhNameLen + lhExtraLen;
      const compData = new Uint8Array(buffer, dataOffset, entry.compSize);

      let rawBytes;
      if (entry.method === 0) {
        rawBytes = compData;
      } else if (entry.method === 8) {
        const ds = new DecompressionStream('deflate-raw');
        const writer = ds.writable.getWriter();
        writer.write(compData);
        writer.close();
        const reader = ds.readable.getReader();
        const chunks = [];
        let total = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          total += value.length;
        }
        rawBytes = new Uint8Array(total);
        let cur = 0;
        for (const ch of chunks) {
          rawBytes.set(ch, cur);
          cur += ch.length;
        }
      } else {
        continue;
      }

      const ext = entry.name.slice(entry.name.lastIndexOf('.')).toLowerCase();
      let mime = 'image/jpeg';
      if (ext === '.png') mime = 'image/png';
      else if (ext === '.webp') mime = 'image/webp';
      else if (ext === '.gif') mime = 'image/gif';
      else if (ext === '.bmp') mime = 'image/bmp';

      const blob = new Blob([rawBytes], { type: mime });
      const optimizedDataUrl = await optimizarImagenBlob(blob, 1200, 0.85);

      fotos.push({
        src: optimizedDataUrl,
        pie: ''
      });
    } catch (err) {
      console.warn('Error al descomprimir entrada ' + entry.name, err);
    }
  }

  return fotos;
}
