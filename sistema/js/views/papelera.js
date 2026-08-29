// ============================================================
//  LexFive — Vista PAPELERA (procesos y clientes eliminados)
//  Restaurar o eliminar definitivamente. Extraído de app.js
//  (paso 15 del split).
// ============================================================
import { supabase } from '@/api/supabase.js';
import { logAccion } from '@/api/auth.js';
import { esc, fmtDate } from '@/utils/util.js';
import { ICON } from '@/utils/icons.js';
import { $, content } from '@/utils/dom.js';
import { toast, paginar, pagerHTML, wirePager } from '@/utils/ui.js';
import { profName } from '@/shared/comunes.js';

export async function renderPapelera() {
  content().innerHTML = `
    <div class="tabs-bar" role="tablist">
      <button class="btn btn--sm btn--navy" id="papTabProc" role="tab">Procesos</button>
      <button class="btn btn--sm btn--ghost" id="papTabCli" role="tab">Clientes</button>
    </div>
    <div id="papContainer"></div>`;
  const sel = (tab) => {
    $('#papTabProc').className = 'btn btn--sm ' + (tab === 'proc' ? 'btn--navy' : 'btn--ghost');
    $('#papTabCli').className = 'btn btn--sm ' + (tab === 'cli' ? 'btn--navy' : 'btn--ghost');
    if (tab === 'proc') papeleraProcesos(); else papeleraClientes();
  };
  $('#papTabProc').onclick = () => sel('proc');
  $('#papTabCli').onclick = () => sel('cli');
  sel('proc');
}

async function papeleraProcesos() {
  const cont = $('#papContainer');
  cont.innerHTML = '<div class="loading"><div class="spinner"></div>Cargando...</div>';
  const { data, error } = await supabase.from('procesos').select('*').eq('eliminado', true).order('eliminado_at', { ascending: false });
  if (error) {
    cont.innerHTML = `<div class="card"><div class="card__body"><div class="empty">${ICON.papelera}
      <p>No se pudo cargar la papelera.<br>Verifique que ejecutó el script <strong>db/14_papelera_procesos.sql</strong> en Supabase.</p></div></div></div>`;
    return;
  }
  const list = data || [];
  cont.innerHTML = `
    <div class="card"><div class="card__body">
      <p class="cell-sub">Los procesos enviados a la papelera no aparecen en el sistema, pero <strong>no se borran</strong>. Puede <strong>restaurarlos</strong> o eliminarlos <strong>definitivamente</strong> (esto último no se puede deshacer).</p>
    </div></div>
    <div class="card"><div class="card__body--flush"><div id="papTable"></div></div></div>`;

  let page = 1;
  function paint() {
    const info = paginar(list, page);
    $('#papTable').innerHTML = list.length ? `<div class="table-wrap"><table class="data">
      <thead><tr><th>Carátula</th><th>Materia</th><th>Eliminado</th><th>Por</th><th></th></tr></thead>
      <tbody>${info.slice.map(p => `
        <tr>
          <td class="cell-strong">${esc(p.caratula)}<div class="cell-sub">${esc(p.numero || 'Sin número')}</div></td>
          <td><span class="badge badge-mat">${esc(p.materia || '—')}</span></td>
          <td>${p.eliminado_at ? fmtDate(p.eliminado_at) : '—'}</td>
          <td>${esc(profName(p.eliminado_por))}</td>
          <td style="white-space:nowrap;text-align:right">
            <button class="btn btn--navy btn--sm js-rest" data-id="${p.id}">Restaurar</button>
            <button class="btn btn--danger btn--sm js-purge" data-id="${p.id}" data-cara="${esc(p.caratula)}">Eliminar definitivamente</button>
          </td>
        </tr>`).join('')}</tbody></table></div>${pagerHTML(info)}`
      : `<div class="empty">${ICON.papelera}<p>La papelera de procesos está vacía.</p></div>`;
    $('#papTable').querySelectorAll('.js-rest').forEach(b => b.onclick = () => restaurarProceso(b.dataset.id));
    $('#papTable').querySelectorAll('.js-purge').forEach(b => b.onclick = () => eliminarProcesoDefinitivo(b.dataset.id, b.dataset.cara));
    wirePager($('#papTable'), info, (n) => { page = n; paint(); });
  }
  paint();
}

async function papeleraClientes() {
  const cont = $('#papContainer');
  cont.innerHTML = '<div class="loading"><div class="spinner"></div>Cargando...</div>';
  const { data, error } = await supabase.from('clientes').select('*').eq('eliminado', true).order('eliminado_at', { ascending: false });
  if (error) {
    cont.innerHTML = `<div class="card"><div class="card__body"><div class="empty">${ICON.papelera}
      <p>No se pudo cargar la papelera de clientes.<br>Verifique que ejecutó el script <strong>db/16_papelera_clientes.sql</strong> en Supabase.</p></div></div></div>`;
    return;
  }
  const list = data || [];
  cont.innerHTML = `
    <div class="card"><div class="card__body">
      <p class="cell-sub">Los clientes enviados a la papelera no aparecen en el sistema, pero <strong>no se borran</strong>. Puede <strong>restaurarlos</strong> o eliminarlos <strong>definitivamente</strong> (esto último no se puede deshacer).</p>
    </div></div>
    <div class="card"><div class="card__body--flush"><div id="papCliTable"></div></div></div>`;

  let page = 1;
  function paint() {
    const info = paginar(list, page);
    $('#papCliTable').innerHTML = list.length ? `<div class="table-wrap"><table class="data">
      <thead><tr><th>Nombre</th><th>Documento</th><th>Eliminado</th><th>Por</th><th></th></tr></thead>
      <tbody>${info.slice.map(c => `
        <tr>
          <td class="cell-strong">${esc(c.nombre)}<div class="cell-sub">${esc(c.email || c.telefono || '')}</div></td>
          <td>${esc(c.documento || '—')}</td>
          <td>${c.eliminado_at ? fmtDate(c.eliminado_at) : '—'}</td>
          <td>${esc(profName(c.eliminado_por))}</td>
          <td style="white-space:nowrap;text-align:right">
            <button class="btn btn--navy btn--sm js-crest" data-id="${c.id}">Restaurar</button>
            <button class="btn btn--danger btn--sm js-cpurge" data-id="${c.id}" data-nom="${esc(c.nombre)}">Eliminar definitivamente</button>
          </td>
        </tr>`).join('')}</tbody></table></div>${pagerHTML(info)}`
      : `<div class="empty">${ICON.papelera}<p>La papelera de clientes está vacía.</p></div>`;
    $('#papCliTable').querySelectorAll('.js-crest').forEach(b => b.onclick = () => restaurarCliente(b.dataset.id));
    $('#papCliTable').querySelectorAll('.js-cpurge').forEach(b => b.onclick = () => eliminarClienteDefinitivo(b.dataset.id, b.dataset.nom));
    wirePager($('#papCliTable'), info, (n) => { page = n; paint(); });
  }
  paint();
}

async function restaurarProceso(id) {
  const { error } = await supabase.from('procesos').update({ eliminado: false, eliminado_at: null, eliminado_por: null }).eq('id', id);
  if (error) { toast('No se pudo restaurar: ' + error.message, 'error'); return; }
  await logAccion('restaurar', 'proceso', id, '');
  toast('Proceso restaurado.', 'success');
  renderPapelera();
}

async function eliminarProcesoDefinitivo(id, caratula) {
  if (!confirm(`¿Eliminar DEFINITIVAMENTE el proceso "${caratula}"?\n\nSe borrarán también sus actuaciones y documentos. Esta acción NO se puede deshacer.`)) return;
  const { error } = await supabase.from('procesos').delete().eq('id', id);
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  await logAccion('eliminar_definitivo', 'proceso', id, caratula);
  toast('Proceso eliminado definitivamente.', 'success');
  renderPapelera();
}

async function restaurarCliente(id) {
  const { error } = await supabase.from('clientes').update({ eliminado: false, eliminado_at: null, eliminado_por: null }).eq('id', id);
  if (error) { toast('No se pudo restaurar: ' + error.message, 'error'); return; }
  await logAccion('restaurar', 'cliente', id, '');
  toast('Cliente restaurado.', 'success');
  papeleraClientes();
}

async function eliminarClienteDefinitivo(id, nombre) {
  if (!confirm(`¿Eliminar DEFINITIVAMENTE al cliente "${nombre}"?\n\nEsta acción NO se puede deshacer. Los procesos vinculados quedarán sin cliente asignado.`)) return;
  const { error } = await supabase.from('clientes').delete().eq('id', id);
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  await logAccion('eliminar_definitivo', 'cliente', id, nombre);
  toast('Cliente eliminado definitivamente.', 'success');
  papeleraClientes();
}
