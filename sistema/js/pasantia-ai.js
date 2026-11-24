// ============================================================
//  LexFive — Generador de Actividades de Pasantía con IA & Fallback
//  Produce cronogramas únicos sincronizados entre Asistencia (resumen)
//  e Informe Único (3 actividades detalladas por día hábil).
// ============================================================
import { generateContent } from './ai.js';

// Banco amplio y categorizado de tareas forenses para fallback determinista sin IA
export const BANCO_TAREAS_AREAS = {
  civil: [
    {
      resumen: 'Revisión y compulsa de expedientes en materia civil y comercial.',
      actividades: [
        'Revisión y foliado de cuadernos procesales en juzgados públicos en materia civil y comercial del Tribunal Departamental de Justicia.',
        'Digitalización de autos interlocutorios y sentencias en procesos ordinarios de usucapión y reivindicación.',
        'Compulsa de plazos procesales para contestación de excepciones previas conforme al Código Procesal Civil (Ley 439).'
      ]
    },
    {
      resumen: 'Borradores de memoriales en procesos ejecutivos y coactivos.',
      actividades: [
        'Elaboración de borradores de memoriales de liquidación de capital e intereses en procesos ejecutivos de cobro de dinero.',
        'Redacción preliminar de solicitudes de mandamientos de embargo y anotación preventiva de bienes sujetos a registro.',
        'Revisión de títulos ejecutivos (pagarés, reconocimientos de deuda) y verificación de plazos de prescripción liberatoria.'
      ]
    },
    {
      resumen: 'Diligenciamiento de notificaciones y citaciones judiciales civiles.',
      actividades: [
        'Acompañamiento a oficiales de diligencias para citación personal y por cédula a partes codemandadas.',
        'Búsqueda de expedientes archivados y solicitud formal de desarchivo de causas ante estrados judiciales.',
        'Actualización del cuaderno de control de plazos perentorios en el sistema de gestión del despacho.'
      ]
    }
  ],
  familiar: [
    {
      resumen: 'Tramitación de procesos de asistencia familiar y divorcio.',
      actividades: [
        'Apoyo técnico en la redacción de demandas de asistencia familiar y liquidación de pensiones devengadas.',
        'Revisión de acuerdos reguladores de divorcio notarial y judicial en juzgados públicos de familia.',
        'Verificación de partidas de nacimiento y matrimonio ante dependencias de SERECI para acreditación de parentesco.'
      ]
    },
    {
      resumen: 'Liquidación de asistencia familiar y seguimiento a apremios.',
      actividades: [
        'Elaboración de planillas de liquidación de devengados conforme a incrementos salariales nacionales.',
        'Redacción de solicitudes de conminatoria de pago y mandamientos de apremio corporal en juzgados de familia.',
        'Orientación preliminar a patrocinados sobre régimen de visitas y guarda compartida de menores.'
      ]
    }
  ],
  laboral: [
    {
      resumen: 'Cálculo de finiquitos y demandas de beneficios sociales.',
      actividades: [
        'Cálculo de beneficios sociales, desahucio, indemnización por tiempo de servicios y aguinaldos devengados.',
        'Elaboración de borradores de demanda de reincorporación laboral y cobro de sueldos devengados ante juzgados del trabajo.',
        'Compulsa de la Ley General del Trabajo, decretos reglamentarios y jurisprudencia laboral del Tribunal Supremo.'
      ]
    },
    {
      resumen: 'Audiencias de conciliación en el Ministerio de Trabajo.',
      actividades: [
        'Acompañamiento en audiencias de conciliación administrativa ante las jefaturas departamentales de trabajo.',
        'Redacción de actas de entendimiento transaccional laboral con observancia de derechos irrenunciables.',
        'Archivo y clasificación de comprobantes de aportes al sistema de seguridad social a corto y largo plazo.'
      ]
    }
  ],
  penal: [
    {
      resumen: 'Seguimiento a investigaciones y control jurisdiccional penal.',
      actividades: [
        'Revisión de cuadernos de investigaciones en fiscalías corporativas y juzgados de instrucción cautelar penal.',
        'Elaboración de memoriales de apersonamiento, proposición de diligencias periciales y solicitud de fotocopias simples.',
        'Verificación de medidas cautelares de carácter real y personal en causas penales activas.'
      ]
    },
    {
      resumen: 'Diligencias ante FELCC y recepción de declaraciones.',
      actividades: [
        'Acompañamiento técnico a declaraciones informativas de testigos y patrocinados ante investigadores asignados al caso.',
        'Redacción de memoriales de oposición, incidentes de actividad procesal defectuosa y excepciones procesales.',
        'Control riguroso de plazos de la etapa preparatoria conforme al Código de Procedimiento Penal.'
      ]
    }
  ],
  administrativo: [
    {
      resumen: 'Trámites municipales ante GAMEA y saneamiento tributario.',
      actividades: [
        'Gestiones administrativas ante el Gobierno Autónomo Municipal de El Alto (GAMEA) sobre catastro e impuestos.',
        'Tramitación de certificaciones decenales / treintañales ante Derechos Reales, certificaciones catastrales, visado de planos y levantamiento de gravámenes municipales.',
        'Redacción de recursos de revocatoria y jerárquicos ante administraciones tributarias y reguladoras.'
      ]
    }
  ],
  notarial: [
    {
      resumen: 'Trámites en Derechos Reales y testimonios notariales.',
      actividades: [
        'Diligencias de ingreso, verificación y retiro de trámites de registro de folios reales e hipotecas en DDRR.',
        'Revisión de minutas de transferencia, contratos privados con reconocimiento de firmas y protocolizaciones.',
        'Cotejo de escrituras públicas, cancelación de gravámenes y saneamiento de títulos de propiedad inmobiliaria.'
      ]
    },
    {
      resumen: 'Saneamiento registral ante SERECI y SEGIP.',
      actividades: [
        'Tramitación de saneamiento de partidas de nacimiento, rectificación de datos y certificados de estado civil en SERECI.',
        'Gestiones ante el Servicio General de Identificación Personal (SEGIP) para emisión de certificados de filiación.',
        'Organización del archivo documental notarial y custodia de carpetas de clientes del bufete.'
      ]
    }
  ],
  legaltech: [
    {
      resumen: 'Gestión en buzón Hermes/Thor y archivo digital del bufete.',
      actividades: [
        'Revisión y compulsa de notificaciones electrónicas en el buzón judicial Hermes y plataforma digital Thor del TSJ.',
        'Digitalización, indexación y catalogación de causas en el sistema informático interno del bufete LexFive.',
        'Elaboración de fichas síntesis de estado de causas con alertas automáticas de vencimiento de términos perentorios.'
      ]
    }
  ]
};

/**
 * Genera un cronograma completo de actividades únicas para las jornadas dadas
 * @param {Array} jornadas [{ num, iso, fechaCorta, diaSemana, semanaIdx }]
 * @param {Array} areasSeleccionadas ['civil', 'familiar', ...]
 * @param {string} notasEnfoque Texto libre de casos o enfoque
 * @param {string} nombrePasante Nombre para personalizar
 * @returns {Promise<Array<{ num, fecha, diaSemana, semanaIdx, resumen, actividades: string[] }>>}
 */
export async function generarCronogramaPasantia({
  jornadas,
  areas = ['civil', 'familiar', 'notarial', 'legaltech'],
  enfoque = '',
  nombrePasante = '',
  usarIA = true
}) {
  if (!jornadas || !jornadas.length) return [];

  let lastError = null;

  // Intento con IA si está habilitada
  if (usarIA) {
    try {
      const prompt = `Actúa como Abogado Director del bufete boliviano LexFive.
Necesito un cronograma oficial de pasantía jurídica para el pasante "${nombrePasante || 'Universitario(a)'}".
Total de jornadas a planificar: ${jornadas.length} días hábiles.
Áreas jurídicas involucradas: ${areas.join(', ')}.
${enfoque ? `Enfoque o casos específicos del pasante: ${enfoque}.` : ''}

IMPORTANTE: Devuelve EXCLUSIVAMENTE un arreglo JSON válido (sin código markdown adicional ni texto previo/posterior), donde cada elemento corresponda a una jornada:
[
  {
    "num": 1,
    "resumen": "Resumen concreto de la jornada de máx 100 caracteres para hoja de asistencia",
    "actividades": [
      "Primera actividad jurídica forense detallada (1 a 2 líneas).",
      "Segunda actividad de redacción, digitalización o compulsa (1 a 2 líneas).",
      "Tercera actividad de diligenciamiento, estudio normativo o plazos (1 a 2 líneas)."
    ]
  }
]
Asegura variedad, rigor técnico boliviano (mencionar leyes bolivianas reales como Ley 439, Ley 603, Ley 348, DDRR, GAMEA, Hermes/Thor) y que no se repitan textos idénticos entre días.`;

      const resp = await generateContent(prompt, "Eres un director jurídico de un bufete de abogados de élite en Bolivia. Devuelve únicamente JSON estructurado.");
      if (resp) {
        const cleanJSON = resp.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJSON);
        if (Array.isArray(parsed) && parsed.length >= jornadas.length) {
          const list = jornadas.map((j, i) => {
            const aiItem = parsed[i] || parsed[parsed.length - 1];
            return {
              num: j.num,
              fecha: j.fechaCorta,
              diaSemana: j.diaSemana,
              semanaIdx: j.semanaIdx,
              resumen: (aiItem.resumen || 'Práctica jurídica forense').slice(0, 110),
              actividades: Array.isArray(aiItem.actividades) && aiItem.actividades.length
                ? aiItem.actividades.slice(0, 3)
                : ['Práctica forense en despacho.', 'Registro en sistema LexFive.', 'Compulsa de plazos procesales.']
            };
          });
          list.origen = 'ia';
          list.motivo = null;
          return list;
        }
      }
    } catch (err) {
      lastError = err;
      console.warn('Fallo generación con IA, usando fallback determinista:', err);
    }
  }

  // Fallback determinista rico sin IA
  const pool = [];
  const areasTarget = (areas && areas.length) ? areas : ['civil', 'familiar', 'notarial', 'legaltech'];
  areasTarget.forEach(areaKey => {
    if (BANCO_TAREAS_AREAS[areaKey]) {
      pool.push(...BANCO_TAREAS_AREAS[areaKey]);
    }
  });
  if (!pool.length) {
    Object.values(BANCO_TAREAS_AREAS).forEach(list => pool.push(...list));
  }

  const list = jornadas.map((j, i) => {
    const item = pool[i % pool.length];
    return {
      num: j.num,
      fecha: j.fechaCorta,
      diaSemana: j.diaSemana,
      semanaIdx: j.semanaIdx,
      resumen: item.resumen,
      actividades: [...item.actividades]
    };
  });
  list.origen = 'fallback';
  list.motivo = lastError ? (lastError.message || String(lastError)) : 'Generación local por áreas de práctica';
  return list;
}
