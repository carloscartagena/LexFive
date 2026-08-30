// ============================================================
//  VISTA: PROCESOS (núcleo del sistema)
//  Lista de procesos con filtros y exportación, formulario de alta/edición,
//  detalle del proceso (documentos, actuaciones, plazos, honorarios, horas y
//  opinión del cliente), y baja a Papelera.
//  Extraído de app.js (split por módulos). openProcesoDetail se exporta porque
//  lo usan Dashboard, Agenda, Novedades, Mis procesos y la búsqueda global.
// ============================================================
import { logAccion, can } from '@/api/auth.js';
import { ESTADOS } from '@/utils/config.js';
import { ICON } from '@/utils/icons.js';
import { esc, hoyISO, fmtDate, fmtDateTime } from '@/utils/util.js';
import { descargarArchivo } from '@/views/exportar.js';
import { $, content } from '@/utils/dom.js';
import { paginar, pagerHTML, wirePager, toast, tip, hint, loading, openModal, closeModal } from '@/utils/ui.js';
import { state } from '@/utils/state.js';
const CATEGORIAS = ['Civil', 'Penal', 'Familiar', 'Laboral', 'Comercial', 'Administrativo', 'General'];
const categoriaOptions = (sel) => CATEGORIAS.map(c => `<option ${c===sel?'selected':''}>${esc(c)}</option>`).join('') + '<option value="__new__">+ Crear nueva materia...</option>';
import { profName, clienteName, badgeEstado, checkboxesProfiles, namesFromIds, optionsClientes } from '@/shared/comunes.js';
import { loadClientes } from '@/shared/datos.js';
import { Draft, wireDraft, maybeOfferDraft } from '@/views/draft.js';
import { subirDocumento, enlaceDocumento } from '@/utils/storage.js';
import { openHoras } from '@/views/horas.js';
import { openHonorarios } from '@/views/finanzas.js';
// Opiniones removed
import { supabase } from '@/api/supabase.js';
import { openPlazos } from '@/views/agenda.js';

// Construye el CSV de la lista de procesos (usa datos del panel, por eso vive
// junto a la vista de Procesos en vez de en ./exportar.js).
function procesosToCSV(rows) {
  const cab = ['Carátula', 'Número', 'NUREJ', 'Materia', 'Tipo', 'Estado', 'Juzgado', 'Cliente', 'Parte contraria', 'Abogados', 'Procuradores', 'Fecha inicio', 'Próxima audiencia'];
  const celda = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const lineas = [cab.map(celda).join(';')];
  rows.forEach(p => {
    lineas.push([
      p.caratula, p.numero, p.nurej, p.materia,
      p.tipo === 'administrativo' ? 'Administrativo' : 'Judicial',
      ESTADOS[p.estado] || p.estado, p.juzgado,
      clienteName(p.cliente_id), p.parte_contraria,
      namesFromIds(p.abogados_ids) || profName(p.abogado_id),
      namesFromIds(p.procuradores_ids) || profName(p.procurador_id),
      p.fecha_inicio ? fmtDate(p.fecha_inicio) : '',
      p.proxima_audiencia ? fmtDateTime(p.proxima_audiencia) : ''
    ].map(celda).join(';'));
  });
  return '\ufeff' + lineas.join('\r\n');
}

export async function renderProcesos() {
  loading();
  await loadClientes();
  state.categorias = CATEGORIAS;
  const { data: procesos } = await supabase.from('procesos').select('*').eq('eliminado', false).order('created_at', { ascending: false });
  const procesosList = procesos || [];

  content().innerHTML = `
    <div class="toolbar">
      <input type="search" id="qProc" placeholder="Buscar por carátula, número, juzgado..." ${hint('Escriba para filtrar la lista por carátula, número, juzgado o parte contraria.')}>
      <select id="fMateria" ${hint('Filtra los procesos por área del derecho.')}><option value="">Todas las materias</option>${state.categorias.map(m => `<option>${esc(m)}</option>`).join('')}</select>
      <select id="fEstado" ${hint('Filtra los procesos por su etapa actual.')}><option value="">Todos los estados</option>${Object.entries(ESTADOS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
      <select id="fAbogado" ${hint('Filtra los procesos por abogado responsable.')}><option value="">Todos los abogados</option>${state.profiles.filter(p => p.rol === 'abogado' || p.rol === 'admin').map(p => `<option value="${p.id}">${esc(p.nombre)}</option>`).join('')}</select>
      <div class="field-row" style="gap:6px;margin:0">
        <input type="date" id="fDesde" ${hint('Filtra audiencias desde esta fecha.')} title="Desde" style="padding:8px 10px;border:1.5px solid var(--line);border-radius:8px;font:inherit;font-size:.85rem">
        <input type="date" id="fHasta" ${hint('Filtra audiencias hasta esta fecha.')} title="Hasta" style="padding:8px 10px;border:1.5px solid var(--line);border-radius:8px;font:inherit;font-size:.85rem">
      </div>
      <div class="spacer"></div>
      <button class="btn btn--ghost" id="btnExportCSV" ${hint('Descarga la lista filtrada en un archivo de Excel (CSV).')}>${ICON.descargar} Excel</button>
      <button class="btn btn--ghost" id="btnExportPDF" ${hint('Abre una vista para imprimir o guardar la lista filtrada como PDF.')}>${ICON.doc} PDF</button>
      <button class="btn btn--primary" id="btnNuevoProc" ${hint('Crea un nuevo caso. Solo la carátula es obligatoria; el resto puede completarlo después.')}>${ICON.plus} Nuevo proceso</button>
    </div>
    <div class="card"><div class="card__body--flush"><div id="procTable"></div></div></div>`;

  let filtradas = procesosList;
  let page = 1;
  function paint() {
    const q = ($('#qProc').value || '').toLowerCase();
    const fm = $('#fMateria').value, fe = $('#fEstado').value;
    const fa = $('#fAbogado').value;
    const desde = $('#fDesde').value, hasta = $('#fHasta').value;
    const rows = procesosList.filter(p =>
      (!fm || p.materia === fm) && (!fe || p.estado === fe) &&
      (!fa || (p.abogados_ids || []).includes(fa) || p.abogado_id === fa) &&
      (!desde || (p.proxima_audiencia && p.proxima_audiencia >= desde)) &&
      (!hasta || (p.proxima_audiencia && p.proxima_audiencia.slice(0, 10) <= hasta)) &&
      (!q || [p.caratula, p.numero, p.juzgado, p.parte_contraria].some(v => (v || '').toLowerCase().includes(q))));
    filtradas = rows;
    const info = paginar(rows, page);
    $('#procTable').innerHTML = rows.length ? `<div class="table-wrap"><table class="data">
      <thead><tr><th>Carátula</th><th>Materia</th><th>Tipo</th><th>Abogado</th><th>Estado</th><th>Próx. audiencia</th></tr></thead>
      <tbody>${info.slice.map(p => `
        <tr data-id="${p.id}">
          <td class="cell-strong">${esc(p.caratula)}<div class="cell-sub">${esc(p.numero || 'Sin número')}</div></td>
          <td><span class="badge badge-mat">${esc(p.materia || '—')}</span></td>
          <td>${p.tipo === 'administrativo' ? 'Administrativo' : 'Judicial'}</td>
          <td>${esc(namesFromIds(p.abogados_ids) || profName(p.abogado_id))}</td>
          <td>${badgeEstado(p.estado)}</td>
          <td>${p.proxima_audiencia ? fmtDateTime(p.proxima_audiencia) : '—'}</td>
        </tr>`).join('')}</tbody></table></div>${pagerHTML(info)}`
      : `<div class="empty">${ICON.procesos}<p>No se encontraron procesos.</p></div>`;
    $('#procTable').querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => openProcesoDetail(tr.dataset.id));
    wirePager($('#procTable'), info, (n) => { page = n; paint(); });
  }
  paint();
  const rePaint = () => { page = 1; paint(); };
  $('#qProc').oninput = rePaint; $('#fMateria').onchange = rePaint; $('#fEstado').onchange = rePaint;
  $('#fAbogado').onchange = rePaint; $('#fDesde').onchange = rePaint; $('#fHasta').onchange = rePaint;
  $('#btnNuevoProc').onclick = () => procesoForm();
  $('#btnExportCSV').onclick = () => {
    if (!filtradas.length) { toast('No hay procesos para exportar.', 'error'); return; }
    descargarArchivo('procesos-lexfive-' + hoyISO() + '.csv', procesosToCSV(filtradas), 'text/csv;charset=utf-8');
    toast('Lista exportada a Excel (CSV).', 'success');
  };
  $('#btnExportPDF').onclick = () => {
    if (!filtradas.length) { toast('No hay procesos para exportar.', 'error'); return; }
    imprimirListaProcesos(filtradas);
  };
}

// Abre una ventana de impresión con la lista de procesos (para guardar como PDF).
function imprimirListaProcesos(rows) {
  const filas = rows.map(p => `<tr>
    <td>${esc(p.caratula)}${p.numero ? '<br><small>' + esc(p.numero) + '</small>' : ''}</td>
    <td>${esc(p.materia || '—')}</td>
    <td>${p.tipo === 'administrativo' ? 'Administrativo' : 'Judicial'}</td>
    <td>${esc(ESTADOS[p.estado] || p.estado)}</td>
    <td>${esc(p.juzgado || '—')}</td>
    <td>${esc(clienteName(p.cliente_id))}</td>
    <td>${esc(namesFromIds(p.abogados_ids) || profName(p.abogado_id))}</td>
    <td>${p.proxima_audiencia ? fmtDateTime(p.proxima_audiencia) : '—'}</td>
  </tr>`).join('');
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <title>Procesos · LexFive</title>
    <style>
      body{font-family:Arial,Helvetica,sans-serif;color:#1a2330;margin:24px;}
      h1{font-family:Georgia,serif;color:#0e1b2c;font-size:20px;margin:0 0 2px;}
      .sub{color:#5c6675;font-size:12px;margin:0 0 16px;}
      table{width:100%;border-collapse:collapse;font-size:11px;}
      th,td{border:1px solid #d9dce1;padding:6px 8px;text-align:left;vertical-align:top;}
      th{background:#0e1b2c;color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:.5px;}
      tr:nth-child(even) td{background:#f6f7f9;}
      small{color:#5c6675;}
      @media print{@page{size:landscape;margin:10mm;}}
    </style></head><body>
    <h1>LexFive — Listado de procesos</h1>
    <p class="sub">${rows.length} proceso(s) · Generado el ${fmtDate(new Date())}</p>
    <table><thead><tr>
      <th>Carátula</th><th>Materia</th><th>Tipo</th><th>Estado</th><th>Juzgado</th><th>Cliente</th><th>Abogados</th><th>Próx. audiencia</th>
    </tr></thead><tbody>${filas}</tbody></table>
    <script>window.onload=function(){window.print();}<\/script>
    </body></html>`;
  const w = window.open('', '_blank');
  if (!w) { toast('Permita las ventanas emergentes para generar el PDF.', 'error'); return; }
  w.document.write(html); w.document.close();
}

function procesoForm(proc = null) {
  const p = proc || {};
  const body = `
    <div class="field"><label>Carátula / Nombre del proceso *${tip('Es el título del caso. Ej: "García c/ Empresa X por beneficios sociales". Sirve para identificar el proceso rápidamente.')}</label><input id="pf_caratula" value="${esc(p.caratula || '')}"></div>
    <div class="field-row">
      <div class="field"><label>N.º de proceso / expediente${tip('Número que asigna el juzgado al expediente. Si aún no lo tiene, puede dejarlo vacío y completarlo después.')}</label><input id="pf_numero" value="${esc(p.numero || '')}"></div>
      <div class="field"><label>NUREJ${tip('Número Único de Registro Judicial. Es el código que identifica la causa en el sistema judicial.')}</label><input id="pf_nurej" value="${esc(p.nurej || '')}" placeholder="Número Único de Registro Judicial"></div>
    </div>
    <div class="field"><label>Tipo${tip('Judicial: el caso se tramita ante un juzgado. Administrativo: ante una entidad pública (alcaldía, ministerio, etc.).')}</label><select id="pf_tipo"><option value="judicial" ${p.tipo !== 'administrativo' ? 'selected' : ''}>Judicial</option><option value="administrativo" ${p.tipo === 'administrativo' ? 'selected' : ''}>Administrativo</option></select></div>
    <div class="field-row">
      <div class="field"><label>Materia${tip('Área del derecho del caso (Laboral, Civil, Penal...). Si falta una, elija "Crear nueva categoría" y se agregará a todo el sistema.')}</label><select id="pf_materia" class="js-categoria" data-include-blank="1"><option value="">—</option>${categoriaOptions(p.materia)}</select></div>
      <div class="field"><label>Estado${tip('Etapa actual del caso. Manténgalo al día para que el equipo y el cliente sepan cómo avanza.')}</label><select id="pf_estado">${Object.entries(ESTADOS).map(([k, v]) => `<option value="${k}" ${p.estado === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
    </div>
    <div class="field"><label>Juzgado / Entidad${tip('Nombre del juzgado o de la entidad donde se tramita el caso. Ej: "Juzgado 2º de Trabajo de El Alto".')}</label><input id="pf_juzgado" value="${esc(p.juzgado || '')}"></div>
    <div class="field-row">
      <div class="field"><label>Cliente${tip('Persona o empresa que representamos. Elíjala de la lista; si es nueva, use el campo de abajo para registrarla.')}</label><select id="pf_cliente">${optionsClientes(p.cliente_id)}</select></div>
      <div class="field"><label>Parte contraria${tip('La otra parte del proceso (demandado o demandante según el caso).')}</label><input id="pf_contraria" value="${esc(p.parte_contraria || '')}"></div>
    </div>
    <div class="field"><label>...o registrar un cliente nuevo (nombre completo)${tip('Si el cliente aún no existe, escriba aquí su nombre: se creará automáticamente y aparecerá en la pestaña Clientes.')}</label><input id="pf_cliente_nuevo" placeholder="Se creará y aparecerá en la pestaña Clientes"></div>
    <div class="field-row">
      <div class="field"><label>Abogados a cargo (puede elegir varios)${tip('Marque a los abogados responsables del caso. Pueden ser varios; aparecerá en su panel como "Mis procesos".')}</label><div class="chk-grid">${checkboxesProfiles(p.abogados_ids, 'pf-abo')}</div></div>
      <div class="field"><label>Procuradores asignados (puede elegir varios)${tip('Marque a los procuradores que apoyarán en el seguimiento y trámites del caso.')}</label><div class="chk-grid">${checkboxesProfiles(p.procuradores_ids, 'pf-proc')}</div></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Fecha de inicio${tip('Fecha en que se inició o ingresó el caso al bufete.')}</label><input type="date" id="pf_inicio" value="${p.fecha_inicio || (proc ? '' : new Date().toISOString().slice(0,10))}"></div>
      <div class="field"><label>Próxima audiencia / plazo${tip('Fecha y hora del próximo evento importante. El sistema avisará en el panel cuando se acerque o venza.')}</label><input type="datetime-local" id="pf_audiencia" value="${p.proxima_audiencia ? new Date(p.proxima_audiencia).toISOString().slice(0,16) : ''}"></div>
    </div>
    <div class="field"><label>Descripción${tip('Resumen del caso y notas importantes. Lo que escriba se autoguarda: si se cierra la sesión, podrá recuperarlo.')}</label><textarea id="pf_desc">${esc(p.descripcion || '')}</textarea></div>
    ${proc ? '' : `<div class="field"><label>Primer memorial (opcional)${tip('Puede adjuntar el primer documento del caso. También podrá subir más archivos después, desde el detalle del proceso.')}</label><input type="file" id="pf_memorial"><span class="cell-sub" style="display:block;margin-top:4px;">Se adjuntará al proceso al guardarlo.</span></div>`}`;

  openModal(proc ? 'Editar proceso' : 'Nuevo proceso', body, [
    { label: 'Cancelar', class: 'btn--ghost', onClick: closeModal },
    { label: 'Guardar', class: 'btn--primary', id: 'pf_save', onClick: () => saveProceso(proc) }
  ], true);
  // local select handle
  const selCat = $('#pf_materia');
  if (selCat) {
    selCat.onchange = () => {
      if (selCat.value === '__new__') {
        const val = prompt('Nueva materia:');
        if (val) {
          CATEGORIAS.push(val);
          selCat.innerHTML = categoriaOptions(val);
        } else { selCat.value = p.materia || ''; }
      }
    };
  }
  // Autoguardado de borrador (no perder lo escrito si se cierra la sesión)
  const draftName = 'proceso_' + (proc ? proc.id : 'nuevo');
  const fields = ['pf_caratula', 'pf_numero', 'pf_nurej', 'pf_tipo', 'pf_materia', 'pf_estado',
    'pf_juzgado', 'pf_cliente', 'pf_contraria', 'pf_cliente_nuevo', 'pf_inicio', 'pf_audiencia', 'pf_desc'];
  const draft = wireDraft(draftName, fields, ['pf-abo', 'pf-proc']);
  maybeOfferDraft(draftName, draft);
}

async function saveProceso(proc) {
  const caratula = $('#pf_caratula').value.trim();
  if (!caratula) { toast('La carátula es obligatoria.', 'error'); return; }
  const aud = $('#pf_audiencia').value;
  const abogados_ids = Array.from(document.querySelectorAll('.pf-abo:checked')).map(c => c.value);
  const procuradores_ids = Array.from(document.querySelectorAll('.pf-proc:checked')).map(c => c.value);
  $('#pf_save').disabled = true;
  let clienteId = $('#pf_cliente').value || null;
  const nuevoCliente = $('#pf_cliente_nuevo').value.trim();
  if (nuevoCliente) {
    const { data: cliNuevo, error: cErr } = await supabase.from('clientes').insert({ nombre: nuevoCliente, created_by: state.profile.id }).select('id').single();
    if (cErr) { toast('Error al crear el cliente: ' + cErr.message, 'error'); $('#pf_save').disabled = false; return; }
    clienteId = cliNuevo.id;
  }
  const payload = {
    caratula,
    numero: $('#pf_numero').value.trim() || null,
    nurej: $('#pf_nurej').value.trim() || null,
    tipo: $('#pf_tipo').value,
    materia: $('#pf_materia').value || null,
    estado: $('#pf_estado').value,
    juzgado: $('#pf_juzgado').value.trim() || null,
    cliente_id: clienteId,
    parte_contraria: $('#pf_contraria').value.trim() || null,
    abogados_ids: abogados_ids,
    procuradores_ids: procuradores_ids,
    abogado_id: abogados_ids[0] || null,
    procurador_id: procuradores_ids[0] || null,
    fecha_inicio: $('#pf_inicio').value || null,
    proxima_audiencia: aud ? new Date(aud).toISOString() : null,
    descripcion: $('#pf_desc').value.trim() || null
  };
  $('#pf_save').disabled = true;
  let error;
  if (proc) {
    payload.updated_at = new Date().toISOString();
    ({ error } = await supabase.from('procesos').update(payload).eq('id', proc.id));
  } else {
    payload.created_by = state.profile.id;
    const { data: nuevo, error: insErr } = await supabase.from('procesos').insert(payload).select('id').single();
    error = insErr;
    if (!error && nuevo) {
      const fileInput = document.getElementById('pf_memorial');
      const file = fileInput && fileInput.files[0];
      if (file) {
        const path = `${nuevo.id}/${Date.now()}_${file.name.replace(/[^\w.\-]/g, '_')}`;
        const { error: upErr } = await subirDocumento(path, file);
        if (!upErr) {
          await supabase.from('documentos').insert({ proceso_id: nuevo.id, nombre: file.name, tipo: 'memorial', storage_path: path, subido_por: state.profile.id });
        }
      }
    }
  }
  if (error) { toast('Error al guardar: ' + error.message, 'error'); $('#pf_save').disabled = false; return; }
  Draft.clear('proceso_' + (proc ? proc.id : 'nuevo'));
  await logAccion(proc ? 'editar' : 'crear', 'proceso', proc ? proc.id : caratula, caratula);
  closeModal(); toast(proc ? 'Proceso actualizado.' : 'Proceso creado.', 'success');
  renderProcesos();
}

// ---------- Detalle de proceso ----------
export async function openProcesoDetail(id, readonly = false) {
  openModal('Detalle del proceso', '<div class="loading"><div class="spinner"></div>Cargando...</div>', [], true);
  const { data: p } = await supabase.from('procesos').select('*').eq('id', id).single();
  if (!p) { toast('No se encontró el proceso.', 'error'); closeModal(); return; }
  const [{ data: acts }, { data: docs }] = await Promise.all([
    supabase.from('actuaciones').select('*').eq('proceso_id', id).order('fecha', { ascending: false }),
    supabase.from('documentos').select('*').eq('proceso_id', id).order('created_at', { ascending: false })
  ]);

  const detail = `
    <div id="aiSummaryBox" style="display:none; margin-bottom:15px; padding:15px; background:var(--color-bg); border:1px solid var(--color-primary); border-radius:8px;"></div>
    <div class="detail-grid">
      <div class="detail-item"><label>N.º de proceso</label><span>${esc(p.numero || '—')}</span></div>
      <div class="detail-item"><label>NUREJ</label><span>${esc(p.nurej || '—')}</span></div>
      <div class="detail-item"><label>Materia</label><span>${esc(p.materia || '—')} · ${p.tipo === 'administrativo' ? 'Administrativo' : 'Judicial'}</span></div>
      <div class="detail-item"><label>Juzgado / Entidad</label><span>${esc(p.juzgado || '—')}</span></div>
      <div class="detail-item"><label>Estado</label><span>${badgeEstado(p.estado)}</span></div>
      <div class="detail-item"><label>Cliente</label><span>${esc(clienteName(p.cliente_id))}</span></div>
      <div class="detail-item"><label>Parte contraria</label><span>${esc(p.parte_contraria || '—')}</span></div>
      <div class="detail-item"><label>Abogados a cargo</label><span>${esc(namesFromIds(p.abogados_ids) || profName(p.abogado_id))}</span></div>
      <div class="detail-item"><label>Procuradores</label><span>${esc(namesFromIds(p.procuradores_ids) || profName(p.procurador_id))}</span></div>
      <div class="detail-item"><label>Fecha de inicio</label><span>${fmtDate(p.fecha_inicio)}</span></div>
      <div class="detail-item"><label>Próxima audiencia / plazo</label><span>${fmtDateTime(p.proxima_audiencia)}</span></div>
    </div>
    ${p.descripcion ? `<div class="detail-item" style="margin-top:14px"><label>Descripción</label><span>${esc(p.descripcion)}</span></div>` : ''}

    <h4 class="section-title">Memoriales y documentos${tip('Documentos generales del caso (poder, carátula, anexos). Para la respuesta del juzgado y el nuevo memorial, mejor adjúntelos en el paso correspondiente del historial de abajo.')}</h4>
    ${readonly ? '' : `<div class="field" style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;">
      <div style="flex-grow:1;min-width:180px;"><label style="font-size:.8rem;">Subir archivo (PDF, Word, imagen... máx. 10 MB)</label><input type="file" id="docFile" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.txt,.png,.jpg,.jpeg,.webp,.gif,.svg"></div>
      <input id="docNombre" placeholder="Descripción (ej: Memorial de respuesta)" style="flex-grow:1;min-width:180px;padding:10px 12px;border:1.5px solid var(--line);border-radius:8px;">
      <button class="btn btn--navy" id="btnUpload">Subir</button>
      <span class="cell-sub" id="docPreview"></span>
    </div>`}
    <div id="docList">${renderDocs((docs || []).filter(d => !d.actuacion_id), readonly)}</div>

    <h4 class="section-title">Historial de actuaciones${tip('Cada paso del caso en orden. Registre el avance (ej: "Respuesta del juzgado") y adjunte los archivos: la respuesta recibida y el nuevo memorial a presentar. El cliente verá esto y podrá descargarlo.')}</h4>
    ${readonly ? '' : `<div class="act-form">
      <div class="field-row" style="margin-bottom:8px">
        <input type="date" id="actFecha" value="${new Date().toISOString().slice(0,10)}" style="padding:10px 12px;border:1.5px solid var(--line);border-radius:8px;">
        <div style="display:flex; flex:1; gap:6px;">
          <input id="actDesc" placeholder="Describa el paso (ej: Respuesta del juzgado, Nuevo memorial...)" style="flex:1; padding:10px 12px;border:1.5px solid var(--line);border-radius:8px;">
          <button type="button" class="btn btn--ghost" id="btnIAPlazos" title="Analizar plazo con IA" style="padding:10px;">✨ Analizar plazo</button>
        </div>
      </div>
      <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;">
        <div style="flex-grow:1;min-width:200px;"><label style="font-size:.8rem;color:var(--muted)">Adjuntar archivos (opcional, máx. 10 MB c/u): respuesta del juzgado, nuevo memorial, etc.</label><input type="file" id="actFiles" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.txt,.png,.jpg,.jpeg,.webp,.gif,.svg" multiple><span class="cell-sub" id="actFilesPreview" style="display:block;margin-top:4px"></span></div>
        <button class="btn btn--navy" id="btnActuacion">Agregar al historial</button>
      </div>
      <span class="cell-sub" id="actProgreso"></span>
    </div>`}
    <ul class="timeline" id="actList">${renderActs(acts || [], docs || [])}</ul>
    ${state.profile.rol === 'cliente' ? `<div class="card" id="opinionProc" style="margin-top:18px"></div>` : ''}`;

  const buttons = [];
  buttons.push({ label: '✨ Resumen IA', class: 'btn--navy', onClick: async () => {
    const box = $('#aiSummaryBox');
    box.style.display = 'block';
    box.innerHTML = '<div class="loading"><div class="spinner"></div>Resumiendo...</div>';
    try {
      const { data, error } = await supabase.functions.invoke('ai-summarize', {
        body: {
          caratula: p.caratula,
          actuaciones: acts.map(a => ({ fecha: a.fecha, titulo: 'Actuación', detalle: a.descripcion }))
        }
      });
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      box.innerHTML = '<strong>Resumen Inteligente:</strong><br><div style="margin-top:8px;line-height:1.5;">' + esc(data.summary).replace(/\\n/g, '<br>') + '</div>';
    } catch(e) {
      box.innerHTML = '<span style="color:var(--red)">Error al conectar con la IA: ' + e.message + '</span>';
    }
  }});

  if (!readonly) {
    buttons.push({ label: 'Editar', class: 'btn--ghost', onClick: () => procesoForm(p) });
    buttons.push({ label: 'Plazos', class: 'btn--ghost', onClick: () => openPlazos(p) });
    if (['admin', 'abogado'].includes(state.profile.rol)) {
      buttons.push({ label: 'Honorarios', class: 'btn--ghost', onClick: () => openHonorarios(p) });
      buttons.push({ label: 'Horas', class: 'btn--ghost', onClick: () => openHoras(p) });
    }
    if (can(state.profile, 'delete_proceso')) {
      buttons.push({ label: 'Eliminar', class: 'btn--danger', onClick: () => deleteProceso(p) });
    }
  }
  buttons.push({ label: 'Cerrar', class: 'btn--primary', onClick: closeModal });

  $('#modalTitle').textContent = p.caratula;
  $('#modalBody').innerHTML = detail;
  const foot = $('#modalFoot'); foot.innerHTML = '';
  buttons.forEach(b => { const x = document.createElement('button'); x.className = 'btn ' + b.class; x.textContent = b.label; x.onclick = b.onClick; foot.appendChild(x); });

  // Subir documento (solo personal)
  if ($('#btnUpload')) {
    // Vista previa al seleccionar archivo + validación de tamaño.
    const docFileEl = $('#docFile');
    if (docFileEl) docFileEl.onchange = () => {
      const pv = $('#docPreview');
      const f = docFileEl.files && docFileEl.files[0];
      if (!f) { if (pv) pv.textContent = ''; return; }
      if (f.size > 10 * 1024 * 1024) { toast('El archivo pesa más de 10 MB. Elija uno más liviano.', 'error'); docFileEl.value = ''; if (pv) pv.textContent = ''; return; }
      const ext = f.name.split('.').pop().toLowerCase();
      const tipoIcono = { pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊', png: '🖼️', jpg: '🖼️', jpeg: '🖼️', webp: '🖼️', gif: '🖼️' };
      if (pv) pv.innerHTML = `${tipoIcono[ext] || '📎'} <strong>${esc(f.name)}</strong> (${(f.size / 1024).toFixed(0)} KB)`;
    };
    $('#btnUpload').onclick = async () => {
    const file = $('#docFile').files[0];
    if (!file) { toast('Seleccione un archivo.', 'error'); return; }
    if (file.size > 10 * 1024 * 1024) { toast('El archivo pesa más de 10 MB. Elija uno más liviano.', 'error'); return; }
    $('#btnUpload').disabled = true; $('#btnUpload').textContent = 'Subiendo...';
    const path = `${id}/${Date.now()}_${file.name.replace(/[^\w.\-]/g, '_')}`;
    const { error: upErr } = await subirDocumento(path, file);
    if (upErr) { toast('Error al subir: ' + upErr.message, 'error'); $('#btnUpload').disabled = false; $('#btnUpload').textContent = 'Subir'; return; }
    const { error: insErr } = await supabase.from('documentos').insert({
      proceso_id: id, nombre: $('#docNombre').value.trim() || file.name, tipo: 'memorial', storage_path: path, subido_por: state.profile.id
    });
    if (insErr) { toast('Error al registrar: ' + insErr.message, 'error'); }
    else {
      await logAccion('subir_documento', 'proceso', id, file.name);
      const { data: nd } = await supabase.from('documentos').select('*').eq('proceso_id', id).order('created_at', { ascending: false });
      $('#docList').innerHTML = renderDocs((nd || []).filter(d => !d.actuacion_id)); wireDocs(id);
      toast('Documento cargado.', 'success');
    }
    $('#btnUpload').disabled = false; $('#btnUpload').textContent = 'Subir'; $('#docNombre').value = ''; $('#docFile').value = '';
    const pv2 = $('#docPreview'); if (pv2) pv2.textContent = '';
  };
  }
  wireDocs(id);

  // Helper: recarga el historial (actuaciones + sus documentos) y reconecta botones
  async function reloadTimeline() {
    const [{ data: na }, { data: nd }] = await Promise.all([
      supabase.from('actuaciones').select('*').eq('proceso_id', id).order('fecha', { ascending: false }),
      supabase.from('documentos').select('*').eq('proceso_id', id).order('created_at', { ascending: false })
    ]);
    $('#actList').innerHTML = renderActs(na || [], nd || []);
    wireTimelineDocs(id, readonly, reloadTimeline);
    // Refresca también la lista general de documentos
    if ($('#docList')) { $('#docList').innerHTML = renderDocs((nd || []).filter(d => !d.actuacion_id), readonly); wireDocs(id); }
  }
  wireTimelineDocs(id, readonly, reloadTimeline);

  const actFilesEl = $('#actFiles');
  if (actFilesEl) actFilesEl.onchange = () => {
    const pv = $('#actFilesPreview');
    const files = [...actFilesEl.files];
    if (!files.length) { if (pv) pv.textContent = ''; return; }
    const pesados = files.filter(f => f.size > 10 * 1024 * 1024);
    if (pesados.length && pv) pv.innerHTML = `<span style="color:var(--red)">${pesados.length} archivo(s) superan 10 MB y se omitirán.</span>`;
    else if (pv) pv.innerHTML = `${files.length} archivo(s) listo(s): ${esc(files.map(f => f.name).join(', '))}`;
  };

  // Analizar plazos con IA
  if ($('#btnIAPlazos')) $('#btnIAPlazos').onclick = async () => {
    const texto = $('#actDesc').value.trim();
    if (!texto) { toast('Escriba la descripción primero.', 'error'); return; }
    const btn = $('#btnIAPlazos'); btn.disabled = true; btn.textContent = '...';
    try {
      const { data, error } = await supabase.functions.invoke('ai-extract-deadlines', {
        body: { texto }
      });
      if (error) throw new Error(error.message);
      if (data.hay_plazo) {
        toast(`Plazo detectado: ${data.dias_estimados} días. ${data.justificacion}`, 'success');
        openPlazos(p);
      } else {
        toast('No se detectó un plazo.', 'info');
      }
    } catch (e) {
      toast('Error al analizar plazo', 'error');
    }
    btn.disabled = false; btn.textContent = '✨ Analizar plazo';
  };

  // Agregar actuación + adjuntos (solo personal)
  if ($('#btnActuacion')) $('#btnActuacion').onclick = async () => {
    const desc = $('#actDesc').value.trim();
    if (!desc) { toast('Describa el paso del proceso.', 'error'); return; }
    const btn = $('#btnActuacion'); const prog = $('#actProgreso');
    btn.disabled = true; btn.textContent = 'Guardando...';

    // 1) Crear la actuación
    const { data: actData, error } = await supabase.from('actuaciones').insert({
      proceso_id: id, fecha: $('#actFecha').value || new Date().toISOString().slice(0, 10),
      descripcion: desc, created_by: state.profile.id
    }).select().single();
    if (error) { toast('Error: ' + error.message, 'error'); btn.disabled = false; btn.textContent = 'Agregar al historial'; return; }
    await logAccion('actuacion', 'proceso', id, desc.slice(0, 60));

    // Aviso automático al cliente del proceso (correo + push). No bloquea ni
    // interrumpe el guardado: si la Edge Function no está desplegada o falla,
    // simplemente no se envía el aviso. Ver supabase/functions/avisar-actuacion.
    try {
      supabase.functions.invoke('avisar-actuacion', { body: { proceso_id: id, descripcion: desc } }).catch(() => {});
    } catch (e) { /* ignorado a propósito */ }

    // 2) Subir los archivos adjuntos vinculados a esa actuación
    const archivos = [...($('#actFiles') ? $('#actFiles').files : [])];
    let ok = 0, fallos = 0;
    for (let i = 0; i < archivos.length; i++) {
      const file = archivos[i];
      if (file.size > 10 * 1024 * 1024) { fallos++; continue; }
      prog.textContent = `Subiendo adjunto ${i + 1} de ${archivos.length}...`;
      const path = `${id}/${Date.now()}_${i}_${file.name.replace(/[^\w.\-]/g, '_')}`;
      const { error: upErr } = await subirDocumento(path, file);
      if (upErr) { fallos++; continue; }
      const { error: insErr } = await supabase.from('documentos').insert({
        proceso_id: id, actuacion_id: actData.id, nombre: file.name, tipo: 'actuacion',
        storage_path: path, subido_por: state.profile.id
      });
      if (insErr) { fallos++; await supabase.storage.from('documentos').remove([path]); continue; }
      ok++;
    }
    prog.textContent = '';
    btn.disabled = false; btn.textContent = 'Agregar al historial';
    $('#actDesc').value = ''; if ($('#actFiles')) $('#actFiles').value = '';
    if (window.__clearActDraft) window.__clearActDraft();
    await reloadTimeline();
    toast(`Paso agregado al historial${ok ? ` con ${ok} archivo(s)` : ''}.${fallos ? ' ' + fallos + ' fallaron.' : ''}`, fallos ? 'error' : 'success');
  };

  // Para el cliente: widget de "Mi opinión" dentro del propio proceso
  // Opinion mount removed

  // Autoguardado de la actuación que se está escribiendo (no se pierde el texto)
  if (!readonly && $('#actDesc')) {
    const actDraft = 'actuacion_' + id;
    const adraft = wireDraft(actDraft, ['actFecha', 'actDesc']);
    const sv = Draft.load(actDraft);
    if (sv && sv.data && sv.data.actDesc) { adraft.apply(sv.data); toast('Recuperamos la actuación que estaba escribiendo.', 'success'); }
    // Nota: los archivos adjuntos no se pueden recuperar (el navegador no
    // permite "recordar" archivos); sí se conserva la descripción y la fecha.
    window.__clearActDraft = () => Draft.clear(actDraft);
  }
}

function renderDocs(docs, readonly = false) {
  if (!docs.length) return '<p class="cell-sub" style="padding:6px 0">Aún no hay documentos cargados.</p>';
  return docs.map(d => `
    <div class="doc-row" data-path="${esc(d.storage_path)}" data-id="${d.id}">
      <div class="doc-row__info"><div class="doc-row__icon">${ICON.doc}</div>
        <div><div class="cell-strong">${esc(d.nombre)}</div><div class="cell-sub">${fmtDate(d.created_at)} · ${esc(profName(d.subido_por))}</div></div>
      </div>
      <div style="display:flex;gap:6px;">
        <button class="btn btn--ghost btn--sm js-dl">Descargar</button>
        ${(!readonly && (d.subido_por === state.profile.id || state.profile.rol === 'admin')) ? '<button class="btn btn--danger btn--sm js-del">Eliminar</button>' : ''}
      </div>
    </div>`).join('');
}
function wireDocs(procId) {
  content(); // no-op safety
  document.querySelectorAll('#docList .doc-row').forEach(row => {
    const path = row.dataset.path, docId = row.dataset.id;
    const dl = row.querySelector('.js-dl');
    if (dl) dl.onclick = async () => {
      const { data, error } = await enlaceDocumento(path);
      if (error) { toast('No se pudo generar el enlace.', 'error'); return; }
      window.open(data.signedUrl, '_blank');
    };
    const del = row.querySelector('.js-del');
    if (del) del.onclick = async () => {
      if (!confirm('¿Eliminar este documento?')) return;
      await supabase.storage.from('documentos').remove([path]);
      await supabase.from('documentos').delete().eq('id', docId);
      await logAccion('eliminar_documento', 'proceso', procId, path);
      const { data: nd } = await supabase.from('documentos').select('*').eq('proceso_id', procId).order('created_at', { ascending: false });
      $('#docList').innerHTML = renderDocs((nd || []).filter(d => !d.actuacion_id)); wireDocs(procId);
      toast('Documento eliminado.', 'success');
    };
  });
}
function renderActs(acts, docs = []) {
  if (!acts.length) return '<li class="cell-sub" style="border:none">Sin actuaciones registradas.</li>';
  return acts.map(a => {
    const adjuntos = docs.filter(d => d.actuacion_id === a.id);
    const filesHtml = adjuntos.length ? `<div class="act-files">${adjuntos.map(d => `
      <div class="act-file" data-path="${esc(d.storage_path)}" data-id="${d.id}">
        <span class="act-file__icon">${ICON.doc}</span>
        <span class="act-file__name">${esc(d.nombre)}</span>
        <button class="btn btn--ghost btn--sm js-tl-dl">Descargar</button>
        ${(state.profile.rol !== 'cliente' && (d.subido_por === state.profile.id || state.profile.rol === 'admin')) ? '<button class="btn btn--danger btn--sm js-tl-del">Eliminar</button>' : ''}
      </div>`).join('')}</div>` : '';
    return `<li><div class="t-date">${fmtDate(a.fecha)} · ${esc(profName(a.created_by))}</div><div>${esc(a.descripcion)}</div>${filesHtml}</li>`;
  }).join('');
}

// Conecta los botones de descargar/eliminar de los adjuntos del historial
function wireTimelineDocs(procId, readonly, reload) {
  document.querySelectorAll('#actList .act-file').forEach(row => {
    const path = row.dataset.path, docId = row.dataset.id;
    const dl = row.querySelector('.js-tl-dl');
    if (dl) dl.onclick = async () => {
      const { data, error } = await enlaceDocumento(path);
      if (error) { toast('No se pudo generar el enlace.', 'error'); return; }
      window.open(data.signedUrl, '_blank');
    };
    const del = row.querySelector('.js-tl-del');
    if (del) del.onclick = async () => {
      if (!confirm('¿Eliminar este archivo?')) return;
      await supabase.storage.from('documentos').remove([path]);
      await supabase.from('documentos').delete().eq('id', docId);
      await logAccion('eliminar_documento', 'proceso', procId, path);
      if (reload) await reload();
      toast('Archivo eliminado.', 'success');
    };
  });
}

async function deleteProceso(p) {
  if (!confirm(`¿Enviar el proceso "${p.caratula}" a la papelera?\n\nNo se borra definitivamente: el administrador podrá restaurarlo o eliminarlo desde la Papelera.`)) return;
  const { error } = await supabase.from('procesos').update({
    eliminado: true, eliminado_at: new Date().toISOString(), eliminado_por: state.profile.id
  }).eq('id', p.id);
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  await logAccion('papelera', 'proceso', p.id, p.caratula);
  closeModal(); toast('Proceso enviado a la papelera.', 'success'); renderProcesos();
}

