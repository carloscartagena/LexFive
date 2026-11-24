// ============================================================
//  LexFive — Vista PLANTILLAS DE MEMORIALES
//  Plantillas de texto con campos {{campo}} que se rellenan con
//  los datos de un proceso. Incluye el motor de campos y la
//  generación (imprimir / Word). Extraído de app.js (paso 10).
// ============================================================
import { supabase } from './supabase.js';
import { logAccion } from './auth.js';
import { state } from './state.js';
import { esc, fmtDate, fmtDateTime } from './util.js';
import { ICON } from './icons.js';
import { $, content } from './dom.js';
import { loading, toast, openModal, closeModal } from './ui.js';
import { profName, namesFromIds } from './comunes.js';
import { descargarArchivo } from './exportar.js';
import { generateContent, generateContentStream } from './ai.js';
import { VARIABLES_ESCRITO, ESTRUCTURAS_BASE_BOLIVIA } from './escritos.js';
import { membreteHeader, membreteFooter, modeloMembrete, abrirImpresionVectorial } from './membrete-base.js';

// Campos disponibles para usar en las plantillas con la forma {{campo}}.
function placeholdersDisponibles() {
  return [
    ['CLIENTE_NOMBRE', 'Nombre del cliente'],
    ['CLIENTE_CI', 'C.I. / Documento'],
    ['CLIENTE_DOMICILIO', 'Domicilio real'],
    ['CLIENTE_TELEFONO', 'Teléfono / WhatsApp'],
    ['CLIENTE_EMAIL', 'Correo electrónico'],
    ['PROCESO', 'Carátula de la causa'],
    ['JUZGADO', 'Juzgado / Autoridad'],
    ['NUREJ', 'NUREJ / Expediente'],
    ['FECHA_ACTUAL', 'Fecha actual en texto'],
    ['CIUDAD', 'Ciudad'],
    ['ABOGADO', 'Abogado patrocinante'],
    ['RPA', 'R.P.A. del abogado'],
    // Alias clásicos
    ['caratula', 'Carátula'], ['numero', 'N.º expediente'], ['nurej', 'NUREJ'],
    ['materia', 'Materia'], ['juzgado', 'Juzgado / entidad'],
    ['cliente', 'Cliente'], ['cliente_documento', 'Documento del cliente'],
    ['cliente_telefono', 'Tel. cliente'], ['cliente_email', 'Correo cliente'],
    ['cliente_direccion', 'Dirección cliente'], ['abogado', 'Abogado(s)'],
    ['fecha', 'Fecha de hoy'], ['fecha_larga', 'Fecha de hoy (en letras)']
  ];
}

// Construye los valores reales a partir del proceso y su cliente.
function buildMapaCampos(p, cli) {
  const hoy = new Date();
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const fechaTexto = `${hoy.getDate()} de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()}`;
  const abg = namesFromIds(p.abogados_ids) || profName(p.abogado_id) || (state.profile && state.profile.nombre) || 'Abg. Carlos Cartagena';
  const rpa = localStorage.getItem('lexfive_tutor_rpa') || (state.profile && state.profile.rpa) || '8492018-CC';

  return {
    CLIENTE_NOMBRE: cli ? (cli.nombre || '') : '',
    CLIENTE_CI: cli ? (cli.documento || '') : '',
    CLIENTE_DOMICILIO: cli ? (cli.direccion || '') : '',
    CLIENTE_TELEFONO: cli ? (cli.telefono || '') : '',
    CLIENTE_EMAIL: cli ? (cli.email || '') : '',
    PROCESO: p.caratula || '',
    JUZGADO: p.juzgado || 'Juzgado de Turno en lo Civil y Comercial',
    NUREJ: p.nurej || p.numero || '',
    FECHA_ACTUAL: fechaTexto,
    CIUDAD: 'El Alto',
    ABOGADO: abg,
    RPA: rpa,
    // Compatibilidad minúsculas
    caratula: p.caratula || '', numero: p.numero || '', nurej: p.nurej || '',
    materia: p.materia || '', tipo: p.tipo === 'administrativo' ? 'administrativo' : 'judicial',
    juzgado: p.juzgado || '', parte_contraria: p.parte_contraria || '',
    cliente: cli ? (cli.nombre || '') : '', cliente_documento: cli ? (cli.documento || '') : '',
    cliente_telefono: cli ? (cli.telefono || '') : '', cliente_email: cli ? (cli.email || '') : '',
    cliente_direccion: cli ? (cli.direccion || '') : '',
    abogado: abg,
    procurador: namesFromIds(p.procuradores_ids) || profName(p.procurador_id) || '',
    proxima_audiencia: p.proxima_audiencia ? fmtDateTime(p.proxima_audiencia) : '',
    fecha: fmtDate(hoy),
    fecha_larga: fechaTexto
  };
}

// Reemplaza {{campo}} por su valor.
function aplicarCampos(texto, mapa) {
  return (texto || '').replace(/{{\s*([\w_]+)\s*}}/g, (m, campo) => {
    if (Object.prototype.hasOwnProperty.call(mapa, campo)) return mapa[campo] !== '' ? mapa[campo] : '__________';
    return m;
  });
}

function imprimirTextoForense(titulo, texto, conMembrete = false) {
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
          <div style="padding: 28px 44px 10px;">${parrafos}</div>
        </div>
        <div>${footerHtml}</div>
      </div>`;
  } else {
    docHTML = `
      <div class="hoja-carta" style="box-sizing:border-box;font-family:Arial,sans-serif;color:#111;position:relative;background:#fff;padding:2.5cm 2cm 2.5cm 3cm;">
        <div style="font-size:12pt;line-height:1.5;text-align:justify;">${parrafos}</div>
      </div>`;
  }
  abrirImpresionVectorial(titulo, docHTML);
}

function descargarWordForense(titulo, texto, conMembrete = false) {
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

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>${esc(titulo)}</title>
      <style>
        @page { size: 8.5in 11in; margin: 2.5cm 2cm 2.5cm 3cm; }
        body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.5; text-align: justify; color: #111; }
        p { margin: 0 0 12pt 0; text-align: justify; line-height: 1.5; }
      </style>
    </head>
    <body>
      ${encabezadoMembrete}
      <div>${parrafos}</div>
      ${pieMembrete}
    </body>
    </html>
  `;
  const nombre = (titulo || 'memorial').toLowerCase().replace(/[^\w]+/g, '-').slice(0, 40) + '.doc';
  descargarArchivo(nombre, '\ufeff' + html, 'application/msword');
  toast('Documento descargado en Word (.doc forense).', 'success');
}

export async function renderPlantillas() {
  loading();
  const { data } = await supabase.from('plantillas').select('*').order('titulo', { ascending: true });
  const L = data || [];
  content().innerHTML = `
    <div class="toolbar">
      <input type="search" id="qPlant" placeholder="Buscar plantilla...">
      <button class="btn btn--ghost" id="btnIAPlant" style="color:var(--primary); font-weight: 600;">✨ Redactar con IA</button>
      <button class="btn btn--primary" id="btnNuevaPlant">${ICON.plus} Nueva plantilla</button>
    </div>
    <p class="cell-sub" style="margin:-4px 2px 12px">Cree memoriales modelo con campos como <code>{{cliente}}</code>, <code>{{nurej}}</code>, <code>{{caratula}}</code>… Al usarlos, el sistema los rellena con los datos del proceso elegido.</p>
    <div id="plantList"></div>`;

  const paint = () => {
    const q = ($('#qPlant').value || '').toLowerCase();
    const rows = L.filter(p => !q || [p.titulo, p.categoria, p.cuerpo].some(v => (v || '').toLowerCase().includes(q)));
    $('#plantList').innerHTML = rows.length ? `<div class="plant-grid">${rows.map(p => `
      <div class="plant-card">
        <div class="plant-card__title">${esc(p.titulo)}</div>
        ${p.categoria ? `<span class="badge badge-mat">${esc(p.categoria)}</span>` : ''}
        <p class="cell-sub plant-card__preview">${esc((p.cuerpo || '').slice(0, 140))}${(p.cuerpo || '').length > 140 ? '…' : ''}</p>
        <div class="plant-card__actions">
          <button class="btn btn--primary btn--sm js-usar" data-id="${p.id}">Usar</button>
          <button class="btn btn--ghost btn--sm js-edit" data-id="${p.id}">Editar</button>
          ${(p.created_by === state.profile.id || state.profile.rol === 'admin') ? `<button class="btn btn--danger btn--sm js-del" data-id="${p.id}">Eliminar</button>` : ''}
        </div>
      </div>`).join('')}</div>`
      : `<div class="empty">${ICON.plantilla}<p>Aún no hay plantillas. Cree la primera con “Nueva plantilla”.</p></div>`;
    $('#plantList').querySelectorAll('.js-usar').forEach(b => b.onclick = () => { const p = L.find(x => x.id === b.dataset.id); if (p) usarPlantilla(p); });
    $('#plantList').querySelectorAll('.js-edit').forEach(b => b.onclick = () => { const p = L.find(x => x.id === b.dataset.id); if (p) plantillaForm(p); });
    $('#plantList').querySelectorAll('.js-del').forEach(b => b.onclick = () => { const p = L.find(x => x.id === b.dataset.id); if (p) deletePlantilla(p); });
  };
  paint();
  $('#qPlant').oninput = paint;
  $('#btnNuevaPlant').onclick = () => plantillaForm();
  $('#btnIAPlant').onclick = async () => {
    const p = prompt('¿Qué tipo de plantilla legal deseas que la IA redacte? (Ej: Memorial de apersonamiento, Contrato de alquiler)');
    if (!p) return;
    
    // Abrimos el form vacío
    plantillaForm({ titulo: p, cuerpo: '', categoria: 'Generado por IA' });
    const ta = $('#pl_cuerpo');
    const saveBtn = $('#pl_save');
    ta.disabled = true;
    saveBtn.disabled = true;
    ta.placeholder = "La Inteligencia Artificial está redactando...";
    toast('Iniciando redacción con IA, por favor espere...', 'info');

    try {
      await generateContentStream(
        `Redacta un documento legal modelo para el siguiente caso: ${p}. Usa formato formal boliviano. Puedes usar variables entre llaves dobles como {{cliente}}, {{juzgado}}, {{nurej}}, {{caratula}} donde sea apropiado.`,
        (chunk) => {
          ta.value += chunk;
          ta.scrollTop = ta.scrollHeight;
        }
      );
      toast('Plantilla generada con éxito.', 'success');
    } catch (e) {
      // El error ya se muestra en generateContentStream
    } finally {
      ta.disabled = false;
      saveBtn.disabled = false;
      ta.placeholder = "";
    }
  };
}

function plantillaForm(pl = null) {
  const p = pl || {};
  const chips = placeholdersDisponibles().map(([k, label]) =>
    `<button type="button" class="chip-campo" data-campo="${k}" title="Insertar ${esc(label)}">{{${k}}}</button>`).join('');
  const estOpts = ESTRUCTURAS_BASE_BOLIVIA.map(e => `<option value="${e.id}">${esc(e.nombre)}</option>`).join('');

  const body = `
    <div style="margin-bottom:12px;background:#f8fafc;padding:10px 12px;border-radius:8px;border:1px solid #e2e8f0;">
      <label style="font-size:.82rem;font-weight:600;display:block;margin-bottom:4px;">Cargar estructura base boliviana (opcional)</label>
      <select id="pl_base_sel" class="input" style="font-size:.84rem;">
        <option value="">— Seleccionar estructura legal boliviana —</option>
        ${estOpts}
      </select>
    </div>
    <div class="field-row">
      <div class="field"><label>Título *</label><input id="pl_titulo" value="${esc(p.titulo || '')}" placeholder="Ej: Memorial de apersonamiento"></div>
      <div class="field"><label>Categoría</label><input id="pl_categoria" value="${esc(p.categoria || '')}" placeholder="Ej: Civil, Familia, Laboral"></div>
    </div>
    <div class="field">
      <label>Texto de la plantilla *</label>
      <p class="cell-sub" style="margin:0 0 6px">Haga clic en un campo para insertarlo donde está el cursor:</p>
      <div class="campos-chips" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">${chips}</div>
      <textarea id="pl_cuerpo" style="min-height:280px;font-family:Arial,sans-serif;font-size:11pt;line-height:1.5;">${esc(p.cuerpo || '')}</textarea>
    </div>`;

  openModal(pl ? 'Editar plantilla' : 'Nueva plantilla', body, [
    { label: 'Cancelar', class: 'btn--ghost', onClick: closeModal },
    { label: 'Guardar', class: 'btn--primary', id: 'pl_save', onClick: () => savePlantilla(pl) }
  ], true);

  const selBase = $('#pl_base_sel');
  if (selBase) {
    selBase.onchange = () => {
      const eid = selBase.value;
      if (!eid) return;
      const est = ESTRUCTURAS_BASE_BOLIVIA.find(e => e.id === eid);
      if (!est) return;
      $('#pl_titulo').value = est.titulo;
      $('#pl_categoria').value = est.categoria;
      $('#pl_cuerpo').value = est.cuerpo;
      toast('Estructura base cargada en la plantilla.', 'info');
    };
  }

  // Insertar campo en la posición del cursor del textarea
  document.querySelectorAll('.chip-campo').forEach(c => c.onclick = () => {
    const ta = $('#pl_cuerpo'); const ins = '{{' + c.dataset.campo + '}}';
    const s = ta.selectionStart || 0, e = ta.selectionEnd || 0;
    ta.value = ta.value.slice(0, s) + ins + ta.value.slice(e);
    ta.focus(); ta.selectionStart = ta.selectionEnd = s + ins.length;
  });
}

async function savePlantilla(pl) {
  const titulo = $('#pl_titulo').value.trim();
  const cuerpo = $('#pl_cuerpo').value;
  if (!titulo || !cuerpo.trim()) { toast('Indique título y texto de la plantilla.', 'error'); return; }
  $('#pl_save').disabled = true;
  const payload = { titulo, categoria: $('#pl_categoria').value.trim() || null, cuerpo };
  let error;
  const isUpdate = pl && pl.id;
  if (isUpdate) {
    payload.updated_at = new Date().toISOString();
    ({ error } = await supabase.from('plantillas').update(payload).eq('id', pl.id));
  } else {
    payload.created_by = state.profile.id;
    ({ error } = await supabase.from('plantillas').insert(payload));
  }
  if (error) { toast('Error al guardar: ' + error.message, 'error'); $('#pl_save').disabled = false; return; }
  await logAccion(isUpdate ? 'editar' : 'crear', 'plantilla', isUpdate ? pl.id : titulo, titulo);
  closeModal(); toast(isUpdate ? 'Plantilla actualizada.' : 'Plantilla creada.', 'success');
  renderPlantillas();
}

async function deletePlantilla(pl) {
  if (!confirm('¿Eliminar esta plantilla?')) return;
  const { error } = await supabase.from('plantillas').delete().eq('id', pl.id);
  if (error) { toast('No se pudo eliminar: ' + error.message, 'error'); return; }
  await logAccion('eliminar', 'plantilla', pl.id, pl.titulo);
  toast('Plantilla eliminada.', 'success');
  renderPlantillas();
}

// Usar la plantilla: elegir un proceso y generar el memorial relleno.
async function usarPlantilla(pl) {
  const { data: procs } = await supabase.from('procesos').select('*').eq('eliminado', false).order('created_at', { ascending: false });
  const opts = (procs || []).map(p => `<option value="${p.id}">${esc(p.caratula)}</option>`).join('');
  const body = `
    <div class="field"><label>Elija el proceso / causa judicial *</label><select id="gen_proc" class="input"><option value="">— Seleccione la causa —</option>${opts}</select></div>
    <button class="btn btn--navy" id="gen_btn">⚡ Rellenar variables con este proceso</button>
    <div id="gen_out" style="margin-top:14px"></div>`;
  openModal('Usar plantilla · ' + pl.titulo, body, [{ label: 'Cerrar', class: 'btn--primary', onClick: closeModal }], true);
  $('#gen_btn').onclick = async () => {
    const pid = $('#gen_proc').value;
    if (!pid) { toast('Elija un proceso.', 'error'); return; }
    const p = (procs || []).find(x => x.id === pid);
    let cli = null;
    if (p.cliente_id) { const { data } = await supabase.from('clientes').select('*').eq('id', p.cliente_id).maybeSingle(); cli = data; }
    const texto = aplicarCampos(pl.cuerpo, buildMapaCampos(p, cli));
    $('#gen_out').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:8px;">
        <label class="cell-sub" style="font-weight:600;color:var(--ink,#1e293b);">Documento generado (formato forense boliviano):</label>
        <button type="button" class="btn btn--ghost btn--sm" id="btn_gen_ia" style="border:1px solid #8b5cf6;color:#8b5cf6;font-weight:600;">✨ Pulir redacción (IA)</button>
      </div>
      <textarea id="gen_texto" style="min-height:340px;font-family:Arial,sans-serif;font-size:11pt;line-height:1.5;text-align:justify;padding:12px;width:100%;box-sizing:border-box;">${esc(texto)}</textarea>
      <div style="margin:10px 0 6px;">
        <label style="display:inline-flex;align-items:center;gap:8px;font-size:.85rem;cursor:pointer;">
          <input type="checkbox" id="gen_chk_membrete" style="width:16px;height:16px;">
          <span>Incluir papel membretado institucional de LexFive (para contratos/cartas; desmarcar para tribunales)</span>
        </label>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
        <button class="btn btn--primary" id="gen_print">${ICON.doc} Guardar PDF / Imprimir</button>
        <button class="btn btn--ghost" id="gen_word" style="background:#2b579a;border-color:#2b579a;color:#fff;">${ICON.descargar} Descargar Word (.doc)</button>
      </div>
      <p class="cell-sub" style="margin-top:8px">Los campos sin dato aparecen como <code>__________</code> para completarlos o editarlos directamente en el texto.</p>`;

    $('#gen_print').onclick = () => {
      const conMembrete = $('#gen_chk_membrete').checked;
      imprimirTextoForense(pl.titulo, $('#gen_texto').value, conMembrete);
    };
    $('#gen_word').onclick = () => {
      const conMembrete = $('#gen_chk_membrete').checked;
      descargarWordForense(pl.titulo, $('#gen_texto').value, conMembrete);
    };

    $('#btn_gen_ia').onclick = async () => {
      const txt = $('#gen_texto').value.trim();
      if (!txt) return;
      const b = $('#btn_gen_ia');
      b.disabled = true;
      const orig = b.innerHTML;
      b.innerHTML = '⏳ Pulimentando...';
      toast('Puliendo redacción forense con IA (hasta 60s)...', 'info');
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Tiempo de espera agotado (60s)')), 60000)
        );
        const aiPromise = generateContent(
          `Pule la redacción jurídica del siguiente escrito legal boliviano conservando intactos todos los nombres, CI, juzgados, fechas y montos:\n\n${txt}\n\nDevuelve únicamente el texto legal pulido sin notas ni explicaciones.`,
          "Eres un jurista boliviano experto y redactor forense sénior."
        );
        const res = await Promise.race([aiPromise, timeoutPromise]);
        if (res && res.trim()) {
          $('#gen_texto').value = res.trim();
          toast('Redacción pulida con éxito.', 'success');
        }
      } catch (e) {
        toast('Error al pulir con IA: ' + e.message, 'error');
      } finally {
        b.disabled = false;
        b.innerHTML = orig;
      }
    };
  };
}
