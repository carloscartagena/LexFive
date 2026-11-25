// ============================================================
//  LexFive — Vista ESCRITOS Y PLANTILLAS (Redactor Inteligente)
//  Conexión en vivo con Clientes y Causas de Supabase,
//  Autocompletado de variables, Biblioteca base boliviana,
//  Pulido de redacción con IA, y Exportación a Word/PDF.
// ============================================================
import { supabase } from './supabase.js';
import { logAccion } from './auth.js';
import { state } from './state.js';
import { esc, fmtDate, hoyISO } from './util.js';
import { ICON } from './icons.js';
import { $, content } from './dom.js';
import { loading, toast, openModal, closeModal } from './ui.js';
import { profName, clienteName } from './comunes.js';
import { loadClientes } from './datos.js';
import { descargarArchivo } from './exportar.js';
import { generateContent } from './ai.js';
import { membreteHeader, membreteFooter, modeloMembrete, abrirImpresionVectorial } from './membrete-base.js';

// Lista oficial de variables soportadas con sus etiquetas descriptivas
export const VARIABLES_ESCRITO = [
  { tag: '{{CLIENTE_NOMBRE}}', label: 'Nombre del Cliente', icon: '👤' },
  { tag: '{{CLIENTE_CI}}', label: 'Cédula / Documento', icon: '🪪' },
  { tag: '{{CLIENTE_DOMICILIO}}', label: 'Domicilio Real', icon: '🏠' },
  { tag: '{{CLIENTE_TELEFONO}}', label: 'Teléfono / WhatsApp', icon: '📱' },
  { tag: '{{CLIENTE_EMAIL}}', label: 'Correo Electrónico', icon: '✉️' },
  { tag: '{{PROCESO}}', label: 'Carátula / Causa', icon: '⚖️' },
  { tag: '{{JUZGADO}}', label: 'Juzgado / Autoridad', icon: '🏛️' },
  { tag: '{{NUREJ}}', label: 'NUREJ / N.º Expediente', icon: '🔢' },
  { tag: '{{FECHA_ACTUAL}}', label: 'Fecha de Hoy (Texto)', icon: '📅' },
  { tag: '{{CIUDAD}}', label: 'Ciudad (El Alto / La Paz)', icon: '📍' },
  { tag: '{{ABOGADO}}', label: 'Abogado Patrocinante', icon: '✒️' },
  { tag: '{{RPA}}', label: 'R.P.A. del Abogado', icon: '📜' }
];

// 5 Estructuras base del foro boliviano
export const ESTRUCTURAS_BASE_BOLIVIA = [
  {
    id: 'apersonamiento_439',
    nombre: '1. Apersonamiento y Señalamiento de Domicilio Procesal (Ley 439)',
    categoria: 'Civil y Comercial',
    conMembrete: false,
    titulo: 'Memorial de Apersonamiento y Domicilio Procesal',
    cuerpo: `SEÑOR(A) JUEZ(A) PÚBLICO EN LO CIVIL Y COMERCIAL DE LA CIUDAD DE {{CIUDAD}}
NUREJ: {{NUREJ}}
PROCESO: {{PROCESO}}

APERSONAMIENTO, SEÑALA DOMICILIO PROCESAL Y OTROSÍES.-

{{CLIENTE_NOMBRE}}, mayor de edad, hábil por derecho, con Cédula de Identidad N.º {{CLIENTE_CI}}, domiciliado(a) en {{CLIENTE_DOMICILIO}}, con teléfono de contacto {{CLIENTE_TELEFONO}} y correo electrónico {{CLIENTE_EMAIL}}, dentro del proceso ordinario caratulado "{{PROCESO}}", tramitado ante su digno Juzgado; ante su autoridad con el debido respeto me presento, expongo y pido:

I. APERSONAMIENTO.-
Habiendo tomado conocimiento fehaciente de la tramitación de la presente causa ante su digno despacho, al amparo de lo dispuesto por el artículo 84 del Código Procesal Civil (Ley N.º 439), me apersono formalmente a su conocimiento en calidad de parte legítima interesada, impetrando a su probidad se sirva admitir mi personería disponiendo se me hagan conocer ulteriores providencias y resoluciones que correspondan a ley.

II. DOMICILIO PROCESAL.-
En cumplimiento estricto del artículo 72 del Código Procesal Civil, señalo como domicilio procesal las oficinas del bufete profesional LexFive Abogados, así como el buzón digital/correo electrónico {{CLIENTE_EMAIL}} y número de WhatsApp {{CLIENTE_TELEFONO}} a los efectos de futuras notificaciones electrónicas.

OTROSI 1.º.- (PATROCINIO PROFESIONAL) El presente memorial es redactado y patrocinado por el profesional Abog. {{ABOGADO}}, con Registro Público de la Abogacía R.P.A. N.º {{RPA}}, quien se encuentra plenamente habilitado para el ejercicio forense.

OTROSI 2.º.- (HONORARIOS) En cuanto a honorarios profesionales, se estará a lo acordado en iguala profesional y arancel del Colegio Departamental de Abogados.

Justicia.
{{CIUDAD}}, {{FECHA_ACTUAL}}`
  },
  {
    id: 'asistencia_familiar_603',
    nombre: '2. Demanda de Asistencia Familiar (Ley 603)',
    categoria: 'Familia',
    conMembrete: false,
    titulo: 'Demanda de Asistencia Familiar',
    cuerpo: `SEÑOR(A) JUEZ(A) PÚBLICO EN MATERIA DE FAMILIA DE LA CIUDAD DE {{CIUDAD}}
DEMANDA DE ASISTENCIA FAMILIAR Y FIJACIÓN DE ASISTENCIA PROVISIONAL.-
OTROSÍES.-

{{CLIENTE_NOMBRE}}, mayor de edad, hábil por derecho, con C.I. N.º {{CLIENTE_CI}}, domiciliada en {{CLIENTE_DOMICILIO}}, teléfono/WhatsApp {{CLIENTE_TELEFONO}}, ante su probidad con el debido respeto expongo y demando:

I. ANTECEDENTES Y LEGITIMACIÓN ACTIVA.-
De la prueba documental acompañada se acredita la filiación respecto al obligado y la concurrencia de la necesidad alimentaria de mis hijos menores de edad, de conformidad con los artículos 109, 112 y 116 del Código de las Familias y del Proceso Familiar (Ley N.º 603).

II. FUNDAMENTOS DE DERECHO Y PETITORIO.-
El derecho a la asistencia familiar comprende los recursos indispensables para la subsistencia, alimentación, vivienda, vestimenta, educación, salud y recreación de los beneficiarios.
Por lo expuesto, al amparo de los artículos 116, 415 y siguientes de la Ley 603, interpongo formal demanda de ASISTENCIA FAMILIAR, impetrando que, previos los trámites de rigor procesal, se declare probada la demanda y se fije una cuota mensual digna y proporcional, disponiéndose la fijación inmediata de la ASISTENCIA FAMILIAR PROVISIONAL conforme al artículo 421 de la Ley 603.

OTROSI 1.º.- (PRUEBA) En calidad de prueba preconstituida adjunto certificado de nacimiento original de los menores y cédula de identidad de la parte actora.
OTROSI 2.º.- (PATROCINIO Y DOMICILIO) Patrocina el profesional Abog. {{ABOGADO}}, con R.P.A. N.º {{RPA}}. Domicilio procesal: Bufete LexFive y WhatsApp {{CLIENTE_TELEFONO}}.

Será Justicia.
{{CIUDAD}}, {{FECHA_ACTUAL}}`
  },
  {
    id: 'fotocopias_legalizadas',
    nombre: '3. Memorial de Mero Trámite / Solicitud de Fotocopias Legalizadas',
    categoria: 'Mero Trámite',
    conMembrete: false,
    titulo: 'Solicitud de Fotocopias Legalizadas',
    cuerpo: `SEÑOR(A) JUEZ(A) DEL JUZGADO {{JUZGADO}} DE LA CIUDAD DE {{CIUDAD}}
NUREJ: {{NUREJ}}
PROCESO: {{PROCESO}}

SOLICITA FOTOCOPIAS LEGALIZADAS Y FRANQUEO DE COMISIONES.-
OTROSÍ.-

{{CLIENTE_NOMBRE}}, dentro del proceso que sigue {{PROCESO}}, tramitado ante su despacho judicial; presentándome respetuosamente expongo y pido:

Al estado actual de la causa y teniendo la necesidad de hacer valer mis legítimos derechos ante instancias pertinentes, al amparo del artículo 24 de la Constitución Política del Estado y disposiciones procesales aplicables, solicito a su autoridad se sirva ordenar por Secretaría de su digno Juzgado el franqueo de fotocopias legalizadas de las piezas principales del expediente, autorizándose a la suscrita y/o al personal habilitado de mi defensa técnica la obtención de las mismas.

OTROSI.- (DOMICILIO Y PATROCINIO) Reitero domicilio procesal y patrocinio del Abog. {{ABOGADO}}, con R.P.A. N.º {{RPA}}.

Justicia.
{{CIUDAD}}, {{FECHA_ACTUAL}}`
  },
  {
    id: 'minuta_compraventa',
    nombre: '4. Minuta de Compraventa de Bien Inmueble (Código Civil)',
    categoria: 'Civil / Contratos',
    conMembrete: true,
    titulo: 'Minuta de Compraventa de Bien Inmueble',
    cuerpo: `MINUTA DE TRANSFERENCIA DE BIEN INMUEBLE A TÍTULO DE COMPRAVENTA DEFINITIVA

Señor Notario de Fe Pública: En los registros de escrituras públicas a su cargo, sírvase insertar una de transferencia de bien inmueble a título de compraventa definitiva, suscrita al tenor de las siguientes cláusulas:

PRIMERA: (DE LAS PARTES).-
1.1. EL VENDEDOR: Con C.I. N.º __________, mayor de edad, hábil por derecho, domiciliado en __________.
1.2. EL COMPRADOR: {{CLIENTE_NOMBRE}}, con C.I. N.º {{CLIENTE_CI}}, mayor de edad, hábil por derecho, domiciliado(a) en {{CLIENTE_DOMICILIO}}, teléfono {{CLIENTE_TELEFONO}}.

SEGUNDA: (DEL DERECHO PROPIETARIO Y OBJETO).-
El Vendedor declara ser legítimo y exclusivo propietario del bien inmueble ubicado en la ciudad de {{CIUDAD}}, con una superficie de __________ m2, debidamente registrado en Derechos Reales bajo el Folio Real con Matrícula N.º __________. Al presente, transfiere en favor del COMPRADOR la totalidad del inmueble libre de todo gravamen, hipoteca o anotación preventiva.

TERCERA: (DEL PRECIO Y FORMA DE PAGO).-
El precio convenido de mutuo acuerdo asciende a la suma de __________ Bolivianos (o su equivalente en Dólares Americanos), monto que el Vendedor declara recibir a su entera conformidad y satisfacción en moneda de curso legal.

CUARTA: (EVICCIÓN Y SANEAMIENTO).-
El Vendedor se compromete a la evicción y saneamiento de ley de conformidad al artículo 614 y siguientes del Código Civil Boliviano, garantizando la quieta y pacífica posesión del bien transferido.

QUINTA: (CONFORMIDAD).-
Las partes expresan su absoluta y formal conformidad con todas y cada una de las cláusulas precedentes, firmando al pie en constancia. Usted señor Notario se servirá agregar las cláusulas de estilo y seguridad.

{{CIUDAD}}, {{FECHA_ACTUAL}}`
  },
  {
    id: 'contrato_lexfive',
    nombre: '5. Contrato Privado de Prestación de Servicios Profesionales Jurídicos (LexFive)',
    categoria: 'LexFive Bufete',
    conMembrete: true,
    titulo: 'Contrato de Servicios Jurídicos LexFive',
    cuerpo: `CONTRATO PRIVADO DE PRESTACIÓN DE SERVICIOS PROFESIONALES JURÍDICOS

Conste por el presente documento privado de prestación de servicios jurídicos profesionales, que surtirá efectos de instrumento público mediante el reconocimiento voluntario de firmas y rúbricas, celebrado al tenor de las siguientes cláusulas:

PRIMERA: (DE LAS PARTES).-
1.1. EL CLIENTE: {{CLIENTE_NOMBRE}}, mayor de edad, hábil por derecho, titular de la C.I. N.º {{CLIENTE_CI}}, con domicilio real en {{CLIENTE_DOMICILIO}}, teléfono/WhatsApp {{CLIENTE_TELEFONO}}, correo electrónico {{CLIENTE_EMAIL}}.
1.2. EL BUFETE PROFESIONAL: LEXFIVE ABOGADOS, representado por el profesional Abog. {{ABOGADO}}, con Registro Público de la Abogacía R.P.A. N.º {{RPA}}, con oficinas profesionales ubicadas en Av. Alfredo Franco Valle 708-51, Edif. Real, Planta Baja Of. A-6, ciudad de El Alto, Bolivia.

SEGUNDA: (OBJETO DEL PATROCINIO).-
El Bufete se compromete a brindar asesoramiento técnico, redacción forense, patrocinio jurídico y representación profesional en favor del Cliente en la causa relativa a: {{PROCESO}}, tramitada o a tramitarse ante {{JUZGADO}}.

TERCERA: (HONORARIOS PROFESIONALES Y FORMA DE PAGO).-
Por los servicios profesionales acordados, se conviene un honorario total de mutuo acuerdo, regulado de conformidad a la iguala profesional suscrita, facultando al Bufete el cobro en cuotas según el avance de las etapas procesales.

CUARTA: (OBLIGACIONES DE LAS PARTES).-
El Bufete empleará sus mejores conocimientos técnicos, diligencia profesional y ética forense en la tramitación del caso. Por su parte, el Cliente se compromete a proporcionar información fidedigna, facilitar la documentación oportuna y concurrir puntualmente a las citaciones judiciales.

QUINTA: (CONFORMIDAD).-
Ambas partes declaran su libre, plena y espontánea conformidad con el tenor íntegro del presente contrato, obligándose a su fiel y estricto cumplimiento.

En la ciudad de {{CIUDAD}}, a {{FECHA_ACTUAL}}.`
  }
];

// Helper: Fecha actual en formato largo en español
function fechaActualTexto() {
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const hoy = new Date();
  return `${hoy.getDate()} de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()}`;
}

// Genera documento HTML para exportar a Word con formato forense boliviano
function generarHTMLForenseWord(titulo, texto, conMembrete) {
  const parrafos = (texto || '')
    .split(/\n+/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p style="margin:0 0 12pt 0;text-align:justify;line-height:1.5;font-size:12pt;font-family:Arial,sans-serif;">${esc(p)}</p>`)
    .join('');

  const encabezadoMembrete = conMembrete ? `
    <div style="border-bottom:2px solid #c2a25a;padding-bottom:12px;margin-bottom:24px;text-align:center;">
      <div style="font-size:24pt;font-weight:bold;color:#0e1b2c;font-family:Georgia,serif;">Lex<span style="color:#c2a25a;">Five</span></div>
      <div style="font-size:9pt;letter-spacing:3px;text-transform:uppercase;color:#a8853c;font-family:Arial,sans-serif;margin-top:2px;">Bufete de Abogados · Asesoramiento & Litigio Estratégico</div>
      <div style="font-size:8.5pt;color:#5c6675;font-family:Arial,sans-serif;margin-top:4px;">Av. Alfredo Franco Valle 708-51, Edif. Real, PB Of. A-6 · El Alto, Bolivia · Tel/WA: +591 78360469</div>
    </div>` : '';

  const pieMembrete = conMembrete ? `
    <div style="margin-top:40px;border-top:1px solid #c2a25a;padding-top:10px;text-align:center;font-size:8pt;color:#64748b;font-family:Arial,sans-serif;">
      Documento profesional elaborado por LexFive Abogados · lexfive.netlify.app
    </div>` : '';

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>${esc(titulo)}</title>
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
        @page {
          size: 8.5in 11in;
          margin: 2.5cm 2cm 2.5cm 3cm;
          mso-header-margin: 1.5cm;
          mso-footer-margin: 1.5cm;
        }
        body {
          font-family: Arial, sans-serif;
          font-size: 12pt;
          line-height: 1.5;
          text-align: justify;
          color: #111;
        }
        p {
          margin: 0 0 12pt 0;
          text-align: justify;
          line-height: 1.5;
        }
      </style>
    </head>
    <body>
      ${encabezadoMembrete}
      <div>${parrafos}</div>
      ${pieMembrete}
    </body>
    </html>
  `;
}

// Vista principal del Redactor de Escritos y Plantillas
export async function renderEscritos() {
  loading();
  await loadClientes();

  const clientesList = state.clientes || [];
  const clientesOptions = clientesList.map(c => `<option value="${c.id}">${esc(c.nombre)} ${c.documento ? `(CI: ${esc(c.documento)})` : ''}</option>`).join('');

  // Estructuras base opciones
  const estructurasOptions = ESTRUCTURAS_BASE_BOLIVIA.map(e => `<option value="${e.id}">${esc(e.nombre)}</option>`).join('');

  // Chips clicables de variables
  const chipsHTML = VARIABLES_ESCRITO.map(v => `
    <button type="button" class="btn btn--sm js-chip-var" data-tag="${v.tag}" style="font-size:.76rem;padding:4px 9px;border:1px solid #cbd5e1;background:var(--bg,#f8fafc);color:var(--ink,#1e293b);border-radius:20px;font-family:monospace;cursor:pointer;white-space:nowrap;" title="Insertar ${esc(v.label)}">
      ${v.icon} ${esc(v.tag)}
    </button>
  `).join('');

  content().innerHTML = `
    <!-- Barra superior de Autocompletado con Cliente y Causa -->
    <div class="card" style="margin-bottom:14px;border-top:3px solid #c2a25a;">
      <div class="card__head" style="padding:12px 18px;">
        <h3 style="font-size:1.05rem;display:flex;align-items:center;gap:8px;">
          <span>⚡</span> Autocompletar con Cliente / Causa
        </h3>
        <span class="cell-sub" style="font-size:.82rem;">Seleccione un cliente registrado para rellenar variables en el escrito automáticamente</span>
      </div>
      <div class="card__body" style="padding:14px 18px;">
        <div class="field-row" style="margin-bottom:10px;">
          <div class="field" style="margin-bottom:0;flex:2;">
            <label style="font-size:.82rem;font-weight:600;">Cliente registrado en Supabase</label>
            <select id="esc_sel_cliente" class="input">
              <option value="">— Seleccionar cliente para autocompletar —</option>
              ${clientesOptions}
            </select>
          </div>
          <div class="field" style="margin-bottom:0;flex:1.5;">
            <label style="font-size:.82rem;font-weight:600;">Causa / Proceso vinculado</label>
            <select id="esc_sel_proceso" class="input" disabled>
              <option value="">— Sin procesos asignados —</option>
            </select>
          </div>
          <div class="field" style="margin-bottom:0;flex:1;">
            <label style="font-size:.82rem;font-weight:600;">Ciudad de tramitación</label>
            <select id="esc_sel_ciudad" class="input">
              <option value="El Alto" selected>El Alto</option>
              <option value="La Paz">La Paz</option>
            </select>
          </div>
        </div>

        <!-- Tarjeta de vista rápida de datos del cliente -->
        <div id="esc_cliente_badge" style="display:none;background:var(--card-sub-bg, var(--bg));border:1px solid var(--border-color, var(--line));border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:.84rem;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
            <div id="esc_badge_info" style="color:var(--text-primary, var(--ink));line-height:1.5;"></div>
            <button type="button" class="btn btn--primary btn--sm" id="btn_rellenar_variables" style="font-weight:600;background:var(--primary, #0e1b2c);border:1px solid var(--gold);color:var(--gold-light, #c2a25a);display:inline-flex;align-items:center;gap:6px;">
              <span>⚡</span> Rellenar variables en el escrito
            </button>
          </div>
        </div>

        <!-- Barra de Chips de Variables -->
        <div>
          <div style="font-size:.78rem;color:var(--muted,#64748b);margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;">
            <span>Haz clic en una variable para insertarla donde está el cursor:</span>
            <span style="font-style:italic;">12 variables estandarizadas</span>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:5px;">
            ${chipsHTML}
          </div>
        </div>
      </div>
    </div>

    <!-- Editor de Redacción Jurídica -->
    <div class="card">
      <div class="card__head" style="padding:14px 18px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
        <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:260px;">
          <input type="text" id="esc_titulo" placeholder="Título del escrito (ej. Memorial de Apersonamiento)" style="font-size:1.1rem;font-weight:700;padding:6px 10px;border:1px solid var(--input-border, var(--line));border-radius:6px;width:100%;font-family:Georgia,serif;color:var(--text-primary, var(--navy));background:var(--input-bg, var(--white));">
        </div>
        
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <!-- Selector rápido de estructuras bolivianas -->
          <select id="esc_sel_estructura" class="input" style="font-size:.84rem;padding:6px 10px;font-weight:600;border:1.5px solid var(--gold);max-width:280px;background:var(--input-bg, var(--white));color:var(--input-text, var(--ink));">
            <option value="">📂 Cargar estructura base boliviana...</option>
            ${estructurasOptions}
          </select>

          <!-- Botón de Pulido con IA -->
          <button type="button" class="btn btn--ghost" id="btn_ia_pulir" style="border:1px solid #8b5cf6;color:#8b5cf6;font-weight:600;display:inline-flex;align-items:center;gap:6px;" title="Pule sintaxis, formalidad forense y estilo procesal boliviano con IA conservando nombres y datos">
            <span>✨</span> Pulir redacción (IA)
          </button>
        </div>
      </div>

      <div class="card__body" style="padding:14px 18px;">
        <!-- Textarea con estilo forense -->
        <textarea id="esc_cuerpo" style="width:100%;min-height:480px;font-family:Arial,sans-serif;font-size:12pt;line-height:1.6;text-align:justify;padding:16px;border:1.5px solid var(--input-border, var(--line));border-radius:8px;resize:vertical;color:var(--input-text, #1e293b);background:var(--input-bg, var(--white));box-sizing:border-box;" placeholder="Escriba aquí el memorial, minuta o contrato, o cargue una de las 5 estructuras base bolivianas arriba..."></textarea>

        <!-- Barra inferior de acciones y exportación -->
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-top:14px;padding-top:12px;border-top:1px solid var(--border-color, var(--line));">
          <div style="display:flex;align-items:center;gap:14px;">
            <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;font-size:.88rem;color:var(--text-primary, var(--ink));user-select:none;">
              <input type="checkbox" id="esc_chk_membrete" style="width:17px;height:17px;accent-color:var(--gold, #c2a25a);">
              <span><strong>Incluir papel membretado de LexFive</strong> <span class="cell-sub">(Recomendado para contratos/cartas; desmarcar para memoriales judiciales)</span></span>
            </label>
          </div>

          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <button type="button" class="btn btn--ghost" id="btn_guardar_plantilla" style="font-weight:600;">
              💾 Guardar en Plantillas
            </button>
            <button type="button" class="btn btn--primary" id="btn_export_word" style="background:#2b579a;border-color:#2b579a;font-weight:600;display:inline-flex;align-items:center;gap:6px;">
              <span>📄</span> Descargar Word (.doc)
            </button>
            <button type="button" class="btn btn--primary" id="btn_export_pdf" style="background:var(--primary, #0e1b2c);border:1px solid var(--gold);color:var(--gold-light, #c2a25a);font-weight:700;display:inline-flex;align-items:center;gap:6px;">
              <span>🖨️</span> Guardar PDF / Imprimir
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Estado local para el cliente y proceso seleccionados
  let clienteSeleccionado = null;
  let procesosDelCliente = [];
  let procesoSeleccionado = null;

  // Insertar variable al cursor
  document.querySelectorAll('.js-chip-var').forEach(btn => {
    btn.onclick = () => {
      const tag = btn.dataset.tag;
      const ta = $('#esc_cuerpo');
      const start = ta.selectionStart || 0;
      const end = ta.selectionEnd || 0;
      ta.value = ta.value.slice(0, start) + tag + ta.value.slice(end);
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + tag.length;
    };
  });

  // Cambio de cliente
  $('#esc_sel_cliente').onchange = async () => {
    const cid = $('#esc_sel_cliente').value;
    const badge = $('#esc_cliente_badge');
    const selProc = $('#esc_sel_proceso');

    if (!cid) {
      clienteSeleccionado = null;
      procesosDelCliente = [];
      procesoSeleccionado = null;
      badge.style.display = 'none';
      selProc.innerHTML = '<option value="">— Sin procesos asignados —</option>';
      selProc.disabled = true;
      return;
    }

    clienteSeleccionado = clientesList.find(c => c.id === cid) || null;

    // Cargar causas vinculadas al cliente desde Supabase
    try {
      const { data: procs } = await supabase
        .from('procesos')
        .select('*')
        .eq('cliente_id', cid)
        .eq('eliminado', false)
        .order('created_at', { ascending: false });

      procesosDelCliente = procs || [];
    } catch (e) {
      procesosDelCliente = [];
    }

    if (procesosDelCliente.length > 0) {
      selProc.disabled = false;
      selProc.innerHTML = procesosDelCliente.map(p =>
        `<option value="${p.id}">${esc(p.caratula)} ${p.juzgado ? `(${esc(p.juzgado)})` : ''}</option>`
      ).join('');
      procesoSeleccionado = procesosDelCliente[0];
    } else {
      selProc.disabled = true;
      selProc.innerHTML = '<option value="">(Sin causas judiciales registradas)</option>';
      procesoSeleccionado = null;
    }

    actualizarBadgeInfo();
  };

  // Cambio de proceso
  $('#esc_sel_proceso').onchange = () => {
    const pid = $('#esc_sel_proceso').value;
    procesoSeleccionado = procesosDelCliente.find(p => p.id === pid) || null;
    actualizarBadgeInfo();
  };

  function actualizarBadgeInfo() {
    const badge = $('#esc_cliente_badge');
    const info = $('#esc_badge_info');
    if (!clienteSeleccionado) {
      badge.style.display = 'none';
      return;
    }
    badge.style.display = 'block';

    const c = clienteSeleccionado;
    const p = procesoSeleccionado;

    info.innerHTML = `
      <div><strong>Cliente:</strong> ${esc(c.nombre)} &nbsp;·&nbsp; <strong>C.I.:</strong> ${esc(c.documento || 'No registrado')} &nbsp;·&nbsp; <strong>Tel:</strong> ${esc(c.telefono || 'No registrado')} &nbsp;·&nbsp; <strong>Domicilio:</strong> ${esc(c.direccion || 'No registrado')}</div>
      ${p ? `<div style="margin-top:3px;color:#0369a1;"><strong>Causa:</strong> ${esc(p.caratula)} &nbsp;·&nbsp; <strong>Juzgado:</strong> ${esc(p.juzgado || '—')} &nbsp;·&nbsp; <strong>NUREJ:</strong> ${esc(p.nurej || p.numero || '—')}</div>` : '<div style="margin-top:3px;color:#64748b;font-style:italic;">No hay causa judicial asociada a este cliente (se usarán valores genéricos para proceso/juzgado/nurej).</div>'}
    `;
  }

  // Rellenar variables en el escrito
  $('#btn_rellenar_variables').onclick = () => {
    if (!clienteSeleccionado) {
      toast('Seleccione un cliente primero.', 'error');
      return;
    }
    const c = clienteSeleccionado;
    const p = procesoSeleccionado || {};
    const ciudad = $('#esc_sel_ciudad').value || 'El Alto';
    const abogado = (state.profile && state.profile.nombre) || 'Abg. Carlos Cartagena';
    const rpa = localStorage.getItem('lexfive_tutor_rpa') || (state.profile && state.profile.rpa) || '8492018-CC';
    const fecha = fechaActualTexto();

    let texto = $('#esc_cuerpo').value;
    if (!texto.trim()) {
      toast('El escrito está vacío. Escriba o cargue una estructura base primero.', 'error');
      return;
    }

    const mapa = {
      // Tags oficiales en mayúsculas
      '{{CLIENTE_NOMBRE}}': c.nombre || '__________',
      '{{CLIENTE_CI}}': c.documento || '__________',
      '{{CLIENTE_DOMICILIO}}': c.direccion || '__________',
      '{{CLIENTE_TELEFONO}}': c.telefono || '__________',
      '{{CLIENTE_EMAIL}}': c.email || '__________',
      '{{PROCESO}}': p.caratula || '__________',
      '{{JUZGADO}}': p.juzgado || 'Juzgado de Turno en lo Civil y Comercial',
      '{{NUREJ}}': p.nurej || p.numero || '__________',
      '{{FECHA_ACTUAL}}': fecha,
      '{{CIUDAD}}': ciudad,
      '{{ABOGADO}}': abogado,
      '{{RPA}}': rpa,

      // Compatibilidad con minúsculas
      '{{cliente}}': c.nombre || '__________',
      '{{cliente_documento}}': c.documento || '__________',
      '{{cliente_direccion}}': c.direccion || '__________',
      '{{cliente_telefono}}': c.telefono || '__________',
      '{{cliente_email}}': c.email || '__________',
      '{{caratula}}': p.caratula || '__________',
      '{{juzgado}}': p.juzgado || 'Juzgado de Turno en lo Civil y Comercial',
      '{{nurej}}': p.nurej || p.numero || '__________',
      '{{fecha}}': fmtDate(hoyISO()),
      '{{fecha_larga}}': fecha,
      '{{abogado}}': abogado,
      '{{rpa}}': rpa
    };

    let replacementsCount = 0;
    for (const [k, v] of Object.entries(mapa)) {
      if (texto.includes(k)) {
        const regex = new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        const matches = texto.match(regex);
        if (matches) replacementsCount += matches.length;
        texto = texto.replace(regex, v);
      }
    }

    $('#esc_cuerpo').value = texto;
    if (replacementsCount > 0) {
      toast(`Se rellenaron ${replacementsCount} variables con los datos de ${c.nombre}.`, 'success');
    } else {
      toast('No se encontraron etiquetas de variables (ej. {{CLIENTE_NOMBRE}}) en el escrito.', 'info');
    }
  };

  // Cargar estructura base boliviana
  $('#esc_sel_estructura').onchange = () => {
    const eid = $('#esc_sel_estructura').value;
    if (!eid) return;

    const est = ESTRUCTURAS_BASE_BOLIVIA.find(e => e.id === eid);
    if (!est) return;

    if ($('#esc_cuerpo').value.trim() && !confirm('¿Desea reemplazar el texto actual del editor con la estructura seleccionada?')) {
      $('#esc_sel_estructura').value = '';
      return;
    }

    $('#esc_titulo').value = est.titulo;
    $('#esc_cuerpo').value = est.cuerpo;
    $('#esc_chk_membrete').checked = est.conMembrete;

    toast(`Estructura cargada: ${est.nombre}`, 'info');

    // Si ya hay un cliente seleccionado, sugerir rellenar
    if (clienteSeleccionado) {
      setTimeout(() => {
        if (confirm(`¿Desea autocompletar inmediatamente las variables de esta estructura con los datos de ${clienteSeleccionado.nombre}?`)) {
          $('#btn_rellenar_variables').click();
        }
      }, 250);
    }
  };

  // Pulir redacción con IA
  $('#btn_ia_pulir').onclick = async () => {
    const texto = $('#esc_cuerpo').value.trim();
    if (!texto) {
      toast('Escriba o cargue un borrador antes de pulirlo con IA.', 'error');
      return;
    }

    const btn = $('#btn_ia_pulir');
    btn.disabled = true;
    const oldText = btn.innerHTML;
    btn.innerHTML = '<span>⏳</span> Pulimentando con IA...';
    toast('Analizando y puliendo redacción procesal con IA (hasta 60s)...', 'info');

    const promptAI = `Pule y perfecciona la redacción jurídica del siguiente escrito legal boliviano:

${texto}

REGLAS ESTRICTAS DE REDACCIÓN:
1. Conserva RIGUROSAMENTE INTACTOS todos los nombres de personas, C.I., números de juzgado, NUREJ, montos, fechas, ciudades y cualquier variable con formato {{...}} o datos entre corchetes.
2. Mejora la claridad, sintaxis forense, precisión procesal conforme a la normativa boliviana (Ley 439, Ley 603 o Código Civil según la materia).
3. Utiliza un tono sobrio, formal, técnico, directo y respetuoso de la judicatura boliviana.
4. Devuelve ÚNICAMENTE el texto legal pulido resultante, sin notas preliminares, saludos, comentarios ni despedidas.`;

    try {
      // Timeout seguro de 60 segundos
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('La IA tardó más de 60 segundos en responder. Por favor intente nuevamente.')), 60000)
      );

      const aiPromise = generateContent(promptAI, "Eres un jurista boliviano experto y redactor forense sénior del bufete LexFive.");
      const res = await Promise.race([aiPromise, timeoutPromise]);

      if (res && res.trim()) {
        $('#esc_cuerpo').value = res.trim();
        toast('Redacción jurídica pulida exitosamente con IA.', 'success');
      } else {
        toast('No se pudo obtener respuesta de la IA. El texto original no fue modificado.', 'error');
      }
    } catch (e) {
      toast('Error al pulir con IA: ' + e.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = oldText;
    }
  };

  // Descargar Word (.doc)
  $('#btn_export_word').onclick = () => {
    const titulo = ($('#esc_titulo').value.trim() || 'Escrito-LexFive');
    const texto = $('#esc_cuerpo').value;
    if (!texto.trim()) {
      toast('No hay texto para descargar.', 'error');
      return;
    }

    const conMembrete = $('#esc_chk_membrete').checked;
    const docHTML = generarHTMLForenseWord(titulo, texto, conMembrete);
    const nombreArchivo = titulo.toLowerCase().replace(/[^\w\d-_]+/g, '_').slice(0, 45) + '.doc';

    descargarArchivo(nombreArchivo, '\ufeff' + docHTML, 'application/msword');
    toast(`Documento "${nombreArchivo}" descargado en Word.`, 'success');
  };

  // Guardar PDF / Imprimir vectorial
  $('#btn_export_pdf').onclick = () => {
    const titulo = ($('#esc_titulo').value.trim() || 'Escrito LexFive');
    const texto = $('#esc_cuerpo').value;
    if (!texto.trim()) {
      toast('No hay texto para imprimir.', 'error');
      return;
    }

    const conMembrete = $('#esc_chk_membrete').checked;
    const parrafos = (texto || '')
      .split(/\n+/)
      .map(p => p.trim())
      .filter(Boolean)
      .map(p => `<p style="margin:0 0 12pt 0;text-align:justify;line-height:1.5;font-size:12pt;font-family:Arial,sans-serif;">${esc(p)}</p>`)
      .join('');

    let docHTML = '';

    if (conMembrete) {
      const model = modeloMembrete();
      const logoSrc = localStorage.getItem('lexfive_logo') || 'assets/logo-emblem.svg';
      const headerHtml = membreteHeader(model, logoSrc);
      const footerHtml = membreteFooter(model);

      docHTML = `
        <div class="hoja-carta" style="display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;font-family:Arial,sans-serif;color:#1e293b;position:relative;background:#fff;padding:0;">
          <div>
            ${headerHtml}
            <div style="padding: 28px 44px 10px;">
              ${parrafos}
            </div>
          </div>
          <div>
            ${footerHtml}
          </div>
        </div>
      `;
    } else {
      // Formato forense judicial sin membrete (márgenes oficiales Carta con 3cm izquierdo para costura de expediente)
      docHTML = `
        <div class="hoja-carta" style="box-sizing:border-box;font-family:Arial,sans-serif;color:#111;position:relative;background:#fff;padding:2.5cm 2cm 2.5cm 3cm;">
          <div style="font-size:12pt;line-height:1.5;text-align:justify;">
            ${parrafos}
          </div>
        </div>
      `;
    }

    abrirImpresionVectorial(titulo, docHTML);
  };

  // Guardar como plantilla en Supabase
  $('#btn_guardar_plantilla').onclick = async () => {
    const titulo = $('#esc_titulo').value.trim();
    const cuerpo = $('#esc_cuerpo').value.trim();
    if (!titulo || !cuerpo) {
      toast('Indique un título y contenido para guardar la plantilla.', 'error');
      return;
    }

    const categoria = prompt('Categoría de la plantilla (ej. Civil, Familia, Laboral, Contratos):', 'General');
    if (categoria === null) return;

    $('#btn_guardar_plantilla').disabled = true;
    const { error } = await supabase.from('plantillas').insert({
      titulo,
      categoria: categoria.trim() || 'General',
      cuerpo,
      created_by: state.profile.id
    });

    $('#btn_guardar_plantilla').disabled = false;
    if (error) {
      toast('Error al guardar: ' + error.message, 'error');
      return;
    }

    await logAccion('crear', 'plantilla', titulo, categoria);
    toast('Plantilla guardada exitosamente en la biblioteca de LexFive.', 'success');
  };
}
