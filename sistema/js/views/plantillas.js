// ============================================================
//  LexFive — Vista PLANTILLAS DE MEMORIALES
//  Plantillas de texto con campos {{campo}} que se rellenan con
//  los datos de un proceso. Incluye el motor de campos y la
//  generación (imprimir / Word). Extraído de app.js (paso 10).
// ============================================================
import { supabase } from '@/api/supabase.js';
import { logAccion } from '@/api/auth.js';
import { state } from '@/utils/state.js';
import { esc, fmtDate, fmtDateTime } from '@/utils/util.js';
import { ICON } from '@/utils/icons.js';
import { $, content } from '@/utils/dom.js';
import { loading, toast, openModal, closeModal } from '@/utils/ui.js';
import { profName, namesFromIds } from '@/shared/comunes.js';
import { descargarArchivo } from '@/views/exportar.js';

// Campos disponibles para usar en las plantillas con la forma {{campo}}.
function placeholdersDisponibles() {
  return [
    ['caratula', 'Carátula'], ['numero', 'N.º expediente'], ['nurej', 'NUREJ'],
    ['materia', 'Materia'], ['tipo', 'Tipo'], ['juzgado', 'Juzgado / entidad'],
    ['parte_contraria', 'Parte contraria'], ['cliente', 'Cliente'],
    ['cliente_documento', 'Documento del cliente'], ['cliente_telefono', 'Tel. cliente'],
    ['cliente_email', 'Correo cliente'], ['cliente_direccion', 'Dirección cliente'],
    ['abogado', 'Abogado(s)'], ['procurador', 'Procurador(es)'],
    ['proxima_audiencia', 'Próxima audiencia'], ['fecha', 'Fecha de hoy'],
    ['fecha_larga', 'Fecha de hoy (en letras)']
  ];
}

// Construye los valores reales a partir del proceso y su cliente.
function buildMapaCampos(p, cli) {
  const hoy = new Date();
  return {
    caratula: p.caratula || '', numero: p.numero || '', nurej: p.nurej || '',
    materia: p.materia || '', tipo: p.tipo === 'administrativo' ? 'administrativo' : 'judicial',
    juzgado: p.juzgado || '', parte_contraria: p.parte_contraria || '',
    cliente: cli ? (cli.nombre || '') : '', cliente_documento: cli ? (cli.documento || '') : '',
    cliente_telefono: cli ? (cli.telefono || '') : '', cliente_email: cli ? (cli.email || '') : '',
    cliente_direccion: cli ? (cli.direccion || '') : '',
    abogado: namesFromIds(p.abogados_ids) || profName(p.abogado_id) || '',
    procurador: namesFromIds(p.procuradores_ids) || profName(p.procurador_id) || '',
    proxima_audiencia: p.proxima_audiencia ? fmtDateTime(p.proxima_audiencia) : '',
    fecha: fmtDate(hoy),
    fecha_larga: hoy.toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' })
  };
}

// Reemplaza {{campo}} por su valor. Campo conocido sin dato -> línea en blanco;
// campo desconocido -> se deja tal cual para que el usuario lo note.
function aplicarCampos(texto, mapa) {
  return (texto || '').replace(/{{\s*(\w+)\s*}}/g, (m, campo) => {
    if (Object.prototype.hasOwnProperty.call(mapa, campo)) return mapa[campo] !== '' ? mapa[campo] : '__________';
    return m;
  });
}

function memorialHTML(titulo, texto) {
  const cuerpo = esc(texto).replace(/\n/g, '<br>');
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${esc(titulo)}</title></head>
    <body style="font-family:Georgia,'Times New Roman',serif;font-size:12pt;line-height:1.7;color:#111;margin:2.5cm;text-align:justify;">
    <div>${cuerpo}</div></body></html>`;
}
function imprimirTexto(titulo, texto) {
  const w = window.open('', '_blank');
  if (!w) { toast('Permita las ventanas emergentes para imprimir.', 'error'); return; }
  w.document.write(memorialHTML(titulo, texto) + '<script>window.onload=function(){window.print();}<\/script>');
  w.document.close();
}
function descargarWord(titulo, texto) {
  const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head>' +
    memorialHTML(titulo, texto).replace(/^[\s\S]*<body/, '<body').replace(/<\/html>$/, '') + '</html>';
  const nombre = (titulo || 'memorial').toLowerCase().replace(/[^\w]+/g, '-').slice(0, 40) + '.doc';
  descargarArchivo(nombre, '\ufeff' + html, 'application/msword');
  toast('Documento descargado en Word.', 'success');
}

export async function renderPlantillas() {
  loading();
  const { data } = await supabase.from('plantillas').select('*').order('titulo', { ascending: true });
  const L = data || [];
  content().innerHTML = `
    <div class="toolbar">
      <input type="search" id="qPlant" placeholder="Buscar plantilla...">
      <div class="spacer"></div>
      <button class="btn btn--navy" id="btnIARedactar">✨ Redactar con IA</button>
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
  $('#btnIARedactar').onclick = () => abrirIARedactar();
}

function abrirIARedactar() {
  const body = `
    <div class="field">
      <label>¿Qué tipo de memorial necesitas?</label>
      <p class="cell-sub" style="margin:0 0 6px">Describe el documento y la IA generará una plantilla base con campos auto-rellenables.</p>
      <textarea id="ia_prompt" style="min-height:100px" placeholder="Ej: Un memorial solicitando la suspensión de audiencia por motivos de salud..."></textarea>
    </div>
    <div id="ia_feedback" style="margin-top:10px; font-weight:bold; color:var(--color-primary);"></div>
  `;
  openModal('✨ Redactar con IA', body, [
    { label: 'Cancelar', class: 'btn--ghost', onClick: closeModal },
    { label: 'Generar', class: 'btn--navy', id: 'ia_generar', onClick: async () => {
      const prompt = $('#ia_prompt').value.trim();
      if (!prompt) return;
      
      const btn = $('#ia_generar');
      const feedback = $('#ia_feedback');
      btn.disabled = true;
      btn.textContent = 'Generando...';
      feedback.textContent = 'La IA está redactando. Esto puede tomar unos segundos...';

      try {
        const res = await fetch('/.netlify/functions/ai-draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt })
        });
        if (!res.ok) throw new Error('Error en la API');
        const data = await res.json();
        
        closeModal();
        plantillaForm({ titulo: 'Borrador IA', cuerpo: data.text });
        toast('Plantilla generada por IA. Por favor revisa y guarda.', 'success');
      } catch (err) {
        feedback.textContent = 'Hubo un error de conexión con la IA.';
        btn.disabled = false;
        btn.textContent = 'Generar';
      }
    }}
  ], true);
}

function plantillaForm(pl = null) {
  const p = pl || {};
  const chips = placeholdersDisponibles().map(([k, label]) =>
    `<button type="button" class="chip-campo" data-campo="${k}" title="Insertar ${esc(label)}">{{${k}}}</button>`).join('');
  const body = `
    <div class="field-row">
      <div class="field"><label>Título *</label><input id="pl_titulo" value="${esc(p.titulo || '')}" placeholder="Ej: Memorial de apersonamiento"></div>
      <div class="field"><label>Categoría</label><input id="pl_categoria" value="${esc(p.categoria || '')}" placeholder="Ej: Laboral"></div>
    </div>
    <div class="field">
      <label>Texto de la plantilla *</label>
      <p class="cell-sub" style="margin:0 0 6px">Haga clic en un campo para insertarlo donde está el cursor:</p>
      <div class="campos-chips">${chips}</div>
      <textarea id="pl_cuerpo" style="min-height:260px;font-family:Georgia,serif">${esc(p.cuerpo || '')}</textarea>
    </div>`;
  openModal(pl ? 'Editar plantilla' : 'Nueva plantilla', body, [
    { label: 'Cancelar', class: 'btn--ghost', onClick: closeModal },
    { label: 'Guardar', class: 'btn--primary', id: 'pl_save', onClick: () => savePlantilla(pl) }
  ], true);
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
  if (pl) {
    payload.updated_at = new Date().toISOString();
    ({ error } = await supabase.from('plantillas').update(payload).eq('id', pl.id));
  } else {
    payload.created_by = state.profile.id;
    ({ error } = await supabase.from('plantillas').insert(payload));
  }
  if (error) { toast('Error al guardar: ' + error.message, 'error'); $('#pl_save').disabled = false; return; }
  await logAccion(pl ? 'editar' : 'crear', 'plantilla', pl ? pl.id : titulo, titulo);
  closeModal(); toast(pl ? 'Plantilla actualizada.' : 'Plantilla creada.', 'success');
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
    <div class="field"><label>Elija el proceso *</label><select id="gen_proc"><option value="">— Seleccione —</option>${opts}</select></div>
    <button class="btn btn--navy" id="gen_btn">Generar memorial</button>
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
      <label class="cell-sub" style="display:block;margin-bottom:4px">Documento generado (puede editarlo antes de imprimir o descargar):</label>
      <textarea id="gen_texto" style="min-height:300px;font-family:Georgia,serif">${esc(texto)}</textarea>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
        <button class="btn btn--primary" id="gen_print">${ICON.doc} Imprimir / PDF</button>
        <button class="btn btn--ghost" id="gen_word">${ICON.descargar} Descargar Word</button>
      </div>
      <p class="cell-sub" style="margin-top:6px">Los campos sin dato aparecen como <code>__________</code> para completarlos a mano.</p>`;
    $('#gen_print').onclick = () => imprimirTexto(pl.titulo, $('#gen_texto').value);
    $('#gen_word').onclick = () => descargarWord(pl.titulo, $('#gen_texto').value);
  };
}
