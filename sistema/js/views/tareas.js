// ============================================================
//  LexFive — Vista TAREAS / PENDIENTES (tablero del equipo)
//  Tablero por estado (pendiente / en progreso / hecha) con
//  filtros, crear/editar/eliminar. Extraído de app.js (paso 12).
// ============================================================
import { supabase } from '@/api/supabase.js';
import { logAccion } from '@/api/auth.js';
import { state } from '@/utils/state.js';
import { esc, fmtDate, hoyISO } from '@/utils/util.js';
import { ICON } from '@/utils/icons.js';
import { $, content } from '@/utils/dom.js';
import { loading, toast, hint, openModal, closeModal } from '@/utils/ui.js';
import { profName, optionsProfiles } from '@/shared/comunes.js';

const TAREA_ESTADOS = { pendiente: 'Pendiente', en_progreso: 'En progreso', hecha: 'Hecha' };
export const TAREA_PRIOR = { alta: 'Alta', media: 'Media', baja: 'Baja' };

export async function renderTareas() {
  loading();
  const [{ data: tareas }, { data: procs }] = await Promise.all([
    supabase.from('tareas').select('*').order('vence', { ascending: true, nullsFirst: false }),
    supabase.from('procesos').select('id,caratula').eq('eliminado', false)
  ]);
  const T = tareas || [];
  const procMap = {}; (procs || []).forEach(p => { procMap[p.id] = p.caratula; });

  content().innerHTML = `
    <div class="toolbar">
      <input type="search" id="qTarea" placeholder="Buscar tarea...">
      <select id="fVence" ${hint('Filtre las tareas por su fecha de vencimiento.')}>
        <option value="">Todas las fechas</option>
        <option value="hoy">Vencen hoy</option>
        <option value="semana">Esta semana (7 días)</option>
        <option value="vencidas">Vencidas</option>
      </select>
      <select id="fProc" ${hint('Muestre solo las tareas de un proceso.')}>
        <option value="">Todos los procesos</option>
        ${(procs || []).map(p => `<option value="${p.id}">${esc(p.caratula)}</option>`).join('')}
      </select>
      <label class="chk-inline"><input type="checkbox" id="fMias"> Solo mías</label>
      <div class="spacer"></div>
      <button class="btn btn--primary" id="btnNuevaTarea">${ICON.plus} Nueva tarea</button>
    </div>
    <div class="tareas-board" id="tareasBoard"></div>`;

  const hoyStr = hoyISO();
  const en7Str = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); })();
  const tarjeta = (t) => {
    const vencida = t.vence && t.vence < hoyStr && t.estado !== 'hecha';
    const acciones = [];
    if (t.estado === 'pendiente') acciones.push(`<button class="btn btn--ghost btn--sm js-mv" data-id="${t.id}" data-to="en_progreso">Iniciar</button>`);
    if (t.estado !== 'hecha') acciones.push(`<button class="btn btn--navy btn--sm js-mv" data-id="${t.id}" data-to="hecha">Completar</button>`);
    if (t.estado === 'hecha') acciones.push(`<button class="btn btn--ghost btn--sm js-mv" data-id="${t.id}" data-to="pendiente">Reabrir</button>`);
    return `<div class="tarea-card prio-${t.prioridad}">
      <div class="tarea-card__top">
        <span class="badge-prio badge-prio--${t.prioridad}">${TAREA_PRIOR[t.prioridad] || t.prioridad}</span>
        ${t.vence ? `<span class="tarea-venc ${vencida ? 'is-vencida' : ''}">${vencida ? 'Venció ' : 'Vence '}${fmtDate(t.vence)}</span>` : ''}
      </div>
      <div class="tarea-card__title">${esc(t.titulo)}</div>
      ${t.descripcion ? `<div class="cell-sub">${esc(t.descripcion)}</div>` : ''}
      <div class="cell-sub">${t.proceso_id && procMap[t.proceso_id] ? 'Proceso: ' + esc(procMap[t.proceso_id]) + ' · ' : ''}Asignado: ${esc(profName(t.asignado_a) || 'Sin asignar')}</div>
      <div class="tarea-card__actions">
        ${acciones.join('')}
        <button class="btn btn--ghost btn--sm js-edit" data-id="${t.id}">Editar</button>
        ${(t.created_by === state.profile.id || state.profile.rol === 'admin') ? `<button class="btn btn--danger btn--sm js-del" data-id="${t.id}">Eliminar</button>` : ''}
      </div>
    </div>`;
  };

  const paint = () => {
    const q = ($('#qTarea').value || '').toLowerCase();
    const mias = $('#fMias').checked;
    const fv = $('#fVence').value;
    const fp = $('#fProc').value;
    const venceOk = (t) => {
      if (fv === 'hoy') return t.vence === hoyStr;
      if (fv === 'semana') return t.vence && t.vence >= hoyStr && t.vence <= en7Str;
      if (fv === 'vencidas') return t.vence && t.vence < hoyStr && t.estado !== 'hecha';
      return true;
    };
    const visibles = T.filter(t =>
      (!mias || t.asignado_a === state.profile.id) &&
      (!fp || t.proceso_id === fp) &&
      venceOk(t) &&
      (!q || [t.titulo, t.descripcion, procMap[t.proceso_id]].some(v => (v || '').toLowerCase().includes(q))));
    const board = $('#tareasBoard');
    board.innerHTML = Object.entries(TAREA_ESTADOS).map(([k, label]) => {
      const col = visibles.filter(t => t.estado === k);
      return `<div class="tareas-col">
        <div class="tareas-col__head">${label} <span class="tareas-col__count">${col.length}</span></div>
        <div class="tareas-col__body">${col.length ? col.map(tarjeta).join('') : '<p class="cell-sub" style="padding:8px">Sin tareas.</p>'}</div>
      </div>`;
    }).join('');
    board.querySelectorAll('.js-mv').forEach(b => b.onclick = () => toggleTareaEstado(b.dataset.id, b.dataset.to));
    board.querySelectorAll('.js-edit').forEach(b => b.onclick = () => { const t = T.find(x => x.id === b.dataset.id); if (t) tareaForm(t); });
    board.querySelectorAll('.js-del').forEach(b => b.onclick = () => { const t = T.find(x => x.id === b.dataset.id); if (t) deleteTarea(t); });
  };
  paint();
  $('#qTarea').oninput = paint;
  $('#fMias').onchange = paint;
  $('#fVence').onchange = paint;
  $('#fProc').onchange = paint;
  $('#btnNuevaTarea').onclick = () => tareaForm();
}

export async function tareaForm(t = null) {
  const { data: procs } = await supabase.from('procesos').select('id,caratula').eq('eliminado', false).order('created_at', { ascending: false });
  const tarea = t || {};
  const opcionesProc = `<option value="">— Sin proceso —</option>` +
    (procs || []).map(p => `<option value="${p.id}" ${tarea.proceso_id === p.id ? 'selected' : ''}>${esc(p.caratula)}</option>`).join('');
  const body = `
    <div class="field"><label>Título de la tarea *</label><input id="tf_titulo" value="${esc(tarea.titulo || '')}" placeholder="Ej: Presentar memorial de respuesta"></div>
    <div class="field"><label>Detalle (opcional)</label><textarea id="tf_desc">${esc(tarea.descripcion || '')}</textarea></div>
    <div class="field-row">
      <div class="field"><label>Proceso relacionado</label><select id="tf_proceso">${opcionesProc}</select></div>
      <div class="field"><label>Asignar a</label><select id="tf_asignado">${optionsProfiles(tarea.asignado_a)}</select></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Prioridad</label><select id="tf_prioridad">${Object.entries(TAREA_PRIOR).map(([k, v]) => `<option value="${k}" ${(tarea.prioridad || 'media') === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      <div class="field"><label>Vence</label><input type="date" id="tf_vence" value="${tarea.vence || ''}"></div>
    </div>
    ${t ? `<div class="field"><label>Estado</label><select id="tf_estado">${Object.entries(TAREA_ESTADOS).map(([k, v]) => `<option value="${k}" ${tarea.estado === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>` : ''}`;
  openModal(t ? 'Editar tarea' : 'Nueva tarea', body, [
    { label: 'Cancelar', class: 'btn--ghost', onClick: closeModal },
    { label: 'Guardar', class: 'btn--primary', id: 'tf_save', onClick: () => saveTarea(t) }
  ]);
}

async function saveTarea(t) {
  const titulo = $('#tf_titulo').value.trim();
  if (!titulo) { toast('Escriba el título de la tarea.', 'error'); return; }
  $('#tf_save').disabled = true;
  const payload = {
    titulo,
    descripcion: $('#tf_desc').value.trim() || null,
    proceso_id: $('#tf_proceso').value || null,
    asignado_a: $('#tf_asignado').value || null,
    prioridad: $('#tf_prioridad').value,
    vence: $('#tf_vence').value || null
  };
  let error;
  if (t) {
    payload.estado = $('#tf_estado').value;
    payload.updated_at = new Date().toISOString();
    ({ error } = await supabase.from('tareas').update(payload).eq('id', t.id));
  } else {
    payload.created_by = state.profile.id;
    ({ error } = await supabase.from('tareas').insert(payload));
  }
  if (error) { toast('Error al guardar: ' + error.message, 'error'); $('#tf_save').disabled = false; return; }
  await logAccion(t ? 'editar' : 'crear', 'tarea', t ? t.id : titulo, titulo);
  closeModal(); toast(t ? 'Tarea actualizada.' : 'Tarea creada.', 'success');
  renderTareas();
}

async function toggleTareaEstado(id, nuevo) {
  const { error } = await supabase.from('tareas').update({ estado: nuevo, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) { toast('No se pudo actualizar: ' + error.message, 'error'); return; }
  renderTareas();
}

async function deleteTarea(t) {
  if (!confirm('¿Eliminar esta tarea?')) return;
  const { error } = await supabase.from('tareas').delete().eq('id', t.id);
  if (error) { toast('No se pudo eliminar: ' + error.message, 'error'); return; }
  await logAccion('eliminar', 'tarea', t.id, t.titulo);
  toast('Tarea eliminada.', 'success');
  renderTareas();
}
