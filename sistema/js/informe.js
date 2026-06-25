// ============================================================
//  VISTA: INFORME ÚNICO DE PASANTÍA
//  Genera un Informe Único de Pasantía con encabezado (A / DE / REF / FECHA),
//  cuerpo editable (antecedentes, detalle de funciones por semana, conclusiones)
//  y dos firmas (pasante y supervisor). Descargable en PDF (impresión) y Word,
//  en tamaño Carta y Oficio. Documento de texto: no lleva sello ni QR.
// ============================================================
import { ICON } from './icons.js';
import { esc } from './util.js';
import { descargarArchivo } from './exportar.js';
import { $, content } from './dom.js';
import { toast, loading } from './ui.js';

const PAGES = {
  carta:  { label: 'Carta',  w: '21.6cm', h: '27.9cm', css: '21.6cm 27.9cm' },
  oficio: { label: 'Oficio', w: '21.6cm', h: '33cm',   css: '21.6cm 33cm' }
};

// Cuerpo de ejemplo (editable). Sirve de plantilla: el usuario lo ajusta a cada pasante.
const CUERPO_EJEMPLO = `I. ANTECEDENTES

1) Guía de Procedimiento para Pasantías en la Carrera de Derecho, aprobado mediante Resolución del Honorable Consejo Universitario No. 104/2016.
2) Nota de Designación de Pasantía No. 3332/2025 de 24 de octubre de 2025.

II. DETALLE DE FUNCIONES REALIZADAS

A continuación, detallo las funciones asignadas y realizadas por mi persona durante el periodo de Duración de Pasantía:

PRIMERA SEMANA (del 24 al 30 de octubre)
Viernes:
• Recepción y Bienvenida al Bufete, presentación formal al equipo legal y administrativo.
• Lectura y comprensión del manual de procedimientos internos y políticas de confidencialidad y ética profesional.
• Organización del espacio de trabajo asignado y configuración del acceso a los sistemas de gestión documental.
Lunes:
• Elaboración de borradores de documentos legales sencillos, como cartas poder y notificaciones extrajudiciales, bajo la supervisión de un abogado asociado.
• Organización y clasificación física y digital de expedientes de casos civiles y laborales en curso, asegurando la correlatividad de la documentación.
• Revisión de la validez y autenticidad de poderes especiales presentados por terceros.
Martes:
• Investigación de jurisprudencia reciente de Tribunales Supremos y Constitucionales relevante para casos de derecho de familia, con énfasis en la tenencia y asistencia familiar.
• Actualización de la base de datos de clientes y el registro de contactos profesionales del Bufete.
• Elaboración de un informe sobre el uso de la firma digital en documentos procesales según la legislación local.
Miércoles:
• Preparación de un resumen de antecedentes procesales (línea de tiempo y partes clave) para dos nuevos casos de desalojo.
• Gestión de la agenda y coordinación de reuniones con clientes y el Abogado Supervisor.
• Mantenimiento del orden y limpieza de la sala de reuniones para asegurar la presentación profesional.
Jueves:
• Acompañamiento al Abogado Supervisor al Juzgado para la presentación de escritos de personamiento y el seguimiento al estado de notificaciones judiciales.
• Digitalización y escaneo de la documentación de respaldo para la creación de un archivo digital de seguridad.
• Preparación de la documentación de viaje del Abogado Supervisor para diligencias judiciales fuera de la ciudad.

SEGUNDA SEMANA (del 31 de octubre al 07 de noviembre)
Viernes:
• Revisión y compilación de la prueba documental presentada en un caso de cobro de deudas, diferenciando la prueba preconstituida de la superviniente.
• Elaboración de un reporte semanal de progreso, listando los expedientes actualizados y las tareas pendientes.
• Elaboración de un índice cronológico de las comunicaciones con la contraparte en un proceso de mediación.
Lunes:
• FERIADO NACIONAL (No hubo actividades laborales el 03 de Noviembre).
Martes:
• Redacción del primer borrador de una Demanda de Divorcio, aplicando el procedimiento especial establecido en la normativa vigente.
• Estudio de la doctrina jurídica sobre la aplicación de la buena fe contractual en el derecho comercial.
• Diseño de un formato estandarizado para la toma de notas durante las entrevistas con los clientes.
Miércoles:
• Investigación exhaustiva sobre la Ley General del Trabajo y su reglamentación, enfocándose en causales de despido justificado e injustificado.
• Preparación de un índice temático y bibliográfico de la biblioteca física del bufete.
• Verificación de la vigencia de los documentos de identidad de los testigos citados para una declaración informativa.
Jueves:
• Actualización del sistema de control de plazos procesales, registrando los términos de presentación de pruebas y recursos para cinco expedientes activos.
• Recepción, registro y distribución de la correspondencia física y electrónica del Bufete.
• Archivo y ordenamiento de las resoluciones judiciales notificadas durante la semana.
Viernes:
• Elaboración de borradores de cartas de respuesta a clientes, resumiendo el estado procesal actual de sus casos y los pasos a seguir.
• Apoyo en la preparación de la documentación contable y legal para la facturación mensual de servicios profesionales.
• Investigación sobre la procedencia de medidas cautelares en un caso de incumplimiento de contrato específico.

TERCERA SEMANA (del 10 al 17 de noviembre)
Lunes:
• Asistencia en la organización de la carpeta de prueba para una audiencia de juicio oral, clasificando los documentos, testimonios y periciales.
• Revisión del Código de Comercio, extrayendo las disposiciones relativas a la constitución y modificación de sociedades mercantiles.
• Colaboración en la organización de la logística para la firma de un contrato complejo entre las partes.
Martes:
• Participación activa en una reunión de toma de información con un nuevo cliente, realizando la transcripción y el resumen de los puntos legales críticos planteados.
• Análisis de los requisitos formales para la presentación de recursos de apelación en materia penal.
• Análisis de la legislación municipal vigente sobre el pago de impuestos a la propiedad inmueble para un caso de saneamiento.
Miércoles:
• Redacción de un borrador de Memorial de Contestación para una demanda laboral por reincorporación, citando la normativa y la línea jurisprudencial aplicable.
• Confección de fichas de seguimiento detalladas para los casos que se encuentran en etapa de ejecución de sentencia.
• Recopilación de artículos de prensa y notas de interés legal para el boletín interno del bufete.
Jueves:
• Búsqueda y verificación de las últimas Gacetas Judiciales y Boletines Oficiales para identificar cualquier modificación legislativa o nuevo Decreto Supremo de interés para la práctica legal.
• Mantenimiento y depuración del archivo de documentos legales con valor histórico y sentencias relevantes.
• Preparación de un esquema de preguntas para la declaración jurada de un perito técnico.
Viernes:
• FERIADO NACIONAL (No hubo actividades laborales el 14 de Noviembre).
Lunes:
• Preparación de un legajo de documentos para ser protocolizados ante Notaría de Fe Pública (poderes especiales, actas de asamblea, etc.).
• Realización de un cuadro comparativo de los costos arancelarios y tasas judiciales para diferentes tipos de procesos.
• Actualización de la biblioteca digital del Bufete con nuevas leyes y reglamentos de 2025.

CUARTA SEMANA (del 18 al 24 de noviembre)
Martes:
• Elaboración de un análisis comparativo entre la figura del proceso ordinario y el proceso monitorio, identificando las ventajas y desventajas de cada uno para el cobro de títulos ejecutivos.
• Revisión de la documentación de un proceso coactivo fiscal, identificando los puntos de defensa.
• Mapeo de riesgo legal de un nuevo cliente que busca expandir su negocio a un nuevo sector regulado.
Miércoles:
• Actualización y mantenimiento del calendario de audiencias y vencimientos, confirmando fechas y horas con los juzgados y los abogados del equipo.
• Preparación de la indumentaria procesal y documentos necesarios para la representación en una audiencia programada.
• Revisión de los términos y condiciones de uso de documentos electrónicos y firmas digitales.
Jueves:
• Revisión final y corrección de estilo y citas legales de todos los escritos presentados por el Bufete durante la semana.
• Asistencia en la preparación de notificaciones mediante edictos, verificando el cumplimiento de los requisitos de ley.
• Creación de una tabla de costos notariales y registrales actualizados para la inscripción de propiedades.
Viernes:
• Elaboración de un memorándum interno para el equipo legal sobre un reciente Auto Supremo que modifica la interpretación de una norma civil.
• Organización de la documentación interna de gestión del Bufete.
• Breve capacitación al personal administrativo sobre el uso de la nueva base de datos de jurisprudencia.
Lunes:
• Consolidación y presentación final de la totalidad de documentos e investigaciones realizadas a lo largo de la pasantía, en un archivo ordenado al Abogado Supervisor.
• Preparación de la presentación final del informe de pasantía.
• Recepción de la retroalimentación del Abogado Supervisor sobre el rendimiento general durante la pasantía.

III. CONCLUSIONES Y VISTO BUENO

Habiendo descrito a detalle cada una de las funciones asignadas a mi persona en calidad de Pasante, se concluye:
Que mi persona ha desarrollado a cabalidad cada una de las funciones asignadas por el Bufete de Abogados, poniendo un especial énfasis en la investigación jurídica, la gestión documental y el apoyo directo a la litigación.
Que mi persona ha desarrollado todas las actividades con transparencia, ética y responsabilidad, manteniendo la confidencialidad absoluta sobre la información de los clientes y los casos del Bufete.
Que se ha logrado poner en práctica y fortalecer los conocimientos teóricos adquiridos en la Universidad, especialmente en materia procesal, civil, familiar y laboral, lo cual ha redundado en un apoyo efectivo y de beneficio para la labor profesional del Bufete.
Es cuanto informo a su consideración, para fines consiguientes.`;

const DEF = {
  a: 'Dr. Franklin Rubén Pareja Aliaga',
  aCargo: 'DOCENTE DE LA CARRERA DE DERECHO\nGUÍA DE LA MATERIA DE PASANTÍA',
  de: 'Univ. Luis Joel Fernandez Pacosillo',
  deSub: 'Universitario(a) – R.U.: 1846019',
  ref: 'INFORME ÚNICO DE PASANTÍA',
  fecha: 'La Paz, 28 de noviembre de 2025',
  duracion: '4 semanas a medio tiempo.',
  institucion: 'Bufete Paucara & Asociados',
  supervision: 'Dr. Guido Paucara Villca - Abogado Director',
  f1: 'Luis Joel Fernandez Pacosillo',
  f1Sub: 'R.U.: 1846019',
  f2: 'Dr. Guido Paucara Villca',
  f2Sub: 'R.P.A. Nº 6760519 GPV\nCel: 77722054'
};

// Convierte el texto del cuerpo en HTML legible: títulos de sección y de semana
// en negrita, etiquetas de día en negrita, viñetas con sangría y párrafos justificados.
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
  return `
  <div style="font-family:'Times New Roman',Georgia,serif;color:#101820;background:#fff;width:${d.pageW};min-height:${d.pageH};margin:0 auto;padding:2.4cm 2.4cm 2cm;box-sizing:border-box;font-size:12.5px;line-height:1.5;">
    <table style="border-collapse:collapse;font-size:12.5px;margin-bottom:6px;">
      ${fila('A', '<strong>' + esc(d.a) + '</strong>' + (aCargo ? '<br>' + aCargo : ''))}
      ${fila('DE', '<strong>' + esc(d.de) + '</strong>' + (deSub ? '<br>' + deSub : ''))}
      ${fila('REF', '<strong>' + esc(d.ref) + '</strong>')}
      ${fila('FECHA', esc(d.fecha))}
    </table>
    <hr style="border:none;border-top:1px solid #101820;margin:8px 0 16px;">
    <p style="margin:0 0 10px;">Señor docente guía:</p>
    <p style="margin:0 0 10px;text-align:justify;">A continuación, pongo a su consideración el Informe Único de Pasantía, que detalla mis actividades realizadas como Pasante, bajo las siguientes características:</p>
    <div style="margin:0 0 14px;">
      <div><strong>Duración de Pasantía:</strong> ${esc(d.duracion)}</div>
      <div><strong>Institución:</strong> ${esc(d.institucion)}</div>
      <div><strong>Supervisión:</strong> ${esc(d.supervision)}</div>
    </div>
    <div>${bodyHTML(d.cuerpo)}</div>
    <p style="margin:14px 0 0;">Atentamente,</p>
    <table style="width:100%;border-collapse:collapse;margin-top:70px;font-size:12px;">
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
  const campo = (id, label, val, ph) => `<div class="field"><label>${label}</label><input id="${id}" value="${esc(val)}" placeholder="${esc(ph || '')}"></div>`;
  const campoArea = (id, label, val, rows) => `<div class="field"><label>${label}</label><textarea id="${id}" rows="${rows || 2}" style="font-family:inherit">${esc(val)}</textarea></div>`;

  content().innerHTML = `
    <div class="card"><div class="card__body">
      <h3 class="intro-title">Informe Único de Pasantía</h3>
      <p class="cell-sub">Complete los datos del encabezado, las firmas y el cuerpo (ya viene un modelo de ejemplo que puede editar libremente). Luego «Imprimir / Guardar PDF» o «Descargar Word», en tamaño Carta u Oficio.</p>
    </div></div>

    <div class="card">
      <div class="card__head"><h3>Encabezado</h3></div>
      <div class="card__body">
        <div class="cert-form">
          ${campo('in_a', 'A (docente / destinatario)', DEF.a)}
          ${campo('in_de', 'DE (pasante)', DEF.de)}
          ${campo('in_desub', 'Datos del pasante (R.U.)', DEF.deSub)}
          ${campo('in_ref', 'Referencia', DEF.ref)}
          ${campo('in_fecha', 'Lugar y fecha', DEF.fecha)}
          ${campo('in_dur', 'Duración de la pasantía', DEF.duracion)}
          ${campo('in_inst', 'Institución', DEF.institucion)}
          ${campo('in_sup', 'Supervisión', DEF.supervision)}
        </div>
        ${campoArea('in_acargo', 'Cargo del destinatario (debajo del nombre en «A»)', DEF.aCargo, 2)}
      </div>
    </div>

    <div class="card">
      <div class="card__head"><h3>Cuerpo del informe</h3>
        <button class="btn btn--ghost btn--sm" id="in_restaurar" type="button">Restaurar modelo de ejemplo</button>
      </div>
      <div class="card__body">
        ${campoArea('in_cuerpo', 'Antecedentes, detalle de funciones y conclusiones (edite a su gusto)', CUERPO_EJEMPLO, 18)}
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
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn btn--primary" id="in_print">${ICON.doc} Imprimir / Guardar PDF</button>
          <button class="btn btn--ghost" id="in_word">Descargar Word</button>
        </div>
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
      ref: val('in_ref'), fecha: val('in_fecha'), duracion: val('in_dur'),
      institucion: val('in_inst'), supervision: val('in_sup'),
      cuerpo: val('in_cuerpo'), f1: val('in_f1'), f1Sub: val('in_f1sub'),
      f2: val('in_f2'), f2Sub: val('in_f2sub'), pageW: p.w, pageH: p.h
    };
  };
  const pintar = () => { $('#inPreview').innerHTML = buildInforme(datos()); };

  ['in_a', 'in_acargo', 'in_de', 'in_desub', 'in_ref', 'in_fecha', 'in_dur', 'in_inst', 'in_sup', 'in_cuerpo', 'in_f1', 'in_f1sub', 'in_f2', 'in_f2sub'].forEach(id => {
    const el = $('#' + id); if (el) el.oninput = pintar;
  });
  $('#in_tam').onchange = pintar;
  $('#in_restaurar').onclick = () => { $('#in_cuerpo').value = CUERPO_EJEMPLO; pintar(); toast('Cuerpo restaurado al modelo de ejemplo.', 'success'); };

  $('#in_print').onclick = () => { const p = page(); abrirImpresion('Informe Único de Pasantía', buildInforme(datos()), p.css); };
  $('#in_word').onclick = () => {
    const p = page();
    const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>@page{size:' + p.css + ';margin:2.4cm;}</style></head><body>' + buildInforme(datos()) + '</body></html>';
    descargarArchivo('informe-pasantia-' + p.label.toLowerCase() + '.doc', '\ufeff' + html, 'application/msword');
    toast('Informe descargado en Word.', 'success');
  };

  pintar();
}
