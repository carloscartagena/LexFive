// ============================================================
//  LexFive — Vista y lógica de CATEGORÍAS / ÁREAS DEL DERECHO
//  Se usan para clasificar procesos y modelos de memoriales.
//  Extraído de app.js (paso 5 del split).
// ============================================================
import { supabase } from '@/api/supabase.js';
import { logAccion } from '@/api/auth.js';
import { MATERIAS } from '@/utils/config.js';
import { state } from '@/utils/state.js';
import { esc } from '@/utils/util.js';
import { ICON } from '@/utils/icons.js';
import { $, content } from '@/utils/dom.js';
import { toast, loading } from '@/utils/ui.js';

// Carga las categorías desde la base de datos al estado compartido.
// Si falla (o no hay tabla), usa la lista fija MATERIAS como respaldo.
export async function loadCategorias() {
  const { data, error } = await supabase.from('categorias').select('nombre').order('nombre');
  if (error || !data) {
    state.categorias = [...MATERIAS];
  } else {
    state.categorias = data.map(c => c.nombre);
  }
}

// Devuelve las <option> de áreas, marcando la seleccionada y agregando
// siempre la opción especial para crear una nueva categoría.
export function categoriaOptions(selected, { includeNueva = true } = {}) {
  const sel = selected || '';
  // Si el valor guardado ya no está en la lista, lo incluimos igual para no perderlo
  const lista = state.categorias.includes(sel) || !sel ? state.categorias : [sel, ...state.categorias];
  let html = lista.map(c => `<option value="${esc(c)}" ${c === sel ? 'selected' : ''}>${esc(c)}</option>`).join('');
  if (includeNueva) html += '<option value="__nueva__">➕ Crear nueva categoría...</option>';
  return html;
}

// Crea una categoría nueva en la base de datos (evita duplicados) y la deja
// disponible en el estado para que aparezca en todas las listas.
async function crearCategoria(nombre) {
  const limpio = (nombre || '').trim();
  if (!limpio) return null;
  const yaExiste = state.categorias.find(c => c.toLowerCase() === limpio.toLowerCase());
  if (yaExiste) return yaExiste;
  const { error } = await supabase.from('categorias').insert({ nombre: limpio });
  if (error && !String(error.message || '').toLowerCase().includes('duplicate')) {
    toast('No se pudo crear la categoría: ' + error.message, 'error');
    return null;
  }
  await logAccion('crear', 'categoria', limpio, limpio);
  await loadCategorias();
  return limpio;
}

// Conecta un <select> de áreas para que, al elegir "Crear nueva categoría",
// pida el nombre, la guarde y la deje seleccionada (y refresque otros selects).
export function wireCategoriaSelect(sel) {
  if (!sel) return;
  sel.dataset.prev = sel.value;
  sel.addEventListener('change', async () => {
    if (sel.value !== '__nueva__') { sel.dataset.prev = sel.value; return; }
    const nombre = prompt('Nombre de la nueva área del derecho:');
    const creada = await crearCategoria(nombre);
    // Reconstruye TODOS los selects de categoría abiertos para incluir la nueva
    document.querySelectorAll('select.js-categoria').forEach(s => {
      const val = s === sel ? (creada || s.dataset.prev || '') : s.value;
      const blank = s.dataset.includeBlank === '1'
        ? `<option value="">${esc(s.dataset.blankLabel || '—')}</option>`
        : '';
      s.innerHTML = blank + categoriaOptions(val);
      s.value = val;
      s.dataset.prev = val;
    });
    if (creada) toast(`Categoría "${creada}" creada.`, 'success');
  });
}

// Renombra una categoría: actualiza la tabla y, en cascada, los procesos y
// modelos que usaban el nombre anterior, para no perder la clasificación.
async function renombrarCategoria(nombreActual, nombreNuevo) {
  const limpio = (nombreNuevo || '').trim();
  if (!limpio || limpio === nombreActual) return false;
  if (state.categorias.find(c => c.toLowerCase() === limpio.toLowerCase())) {
    toast('Ya existe una categoría con ese nombre.', 'error'); return false;
  }
  const { error } = await supabase.from('categorias').update({ nombre: limpio }).eq('nombre', nombreActual);
  if (error) { toast('No se pudo renombrar: ' + error.message, 'error'); return false; }
  // Reclasificar registros existentes
  await supabase.from('procesos').update({ materia: limpio }).eq('materia', nombreActual);
  await supabase.from('modelos').update({ categoria: limpio }).eq('categoria', nombreActual);
  await logAccion('renombrar', 'categoria', nombreActual, `${nombreActual} → ${limpio}`);
  await loadCategorias();
  return true;
}

// Elimina una categoría (solo si nadie la está usando, para no dejar
// procesos/modelos huérfanos sin área).
async function eliminarCategoria(nombre) {
  const [{ count: cProc }, { count: cMod }] = await Promise.all([
    supabase.from('procesos').select('id', { count: 'exact', head: true }).eq('materia', nombre).eq('eliminado', false),
    supabase.from('modelos').select('id', { count: 'exact', head: true }).eq('categoria', nombre)
  ]);
  const usos = (cProc || 0) + (cMod || 0);
  if (usos > 0) {
    toast(`No se puede eliminar: "${nombre}" se usa en ${cProc || 0} proceso(s) y ${cMod || 0} modelo(s).`, 'error');
    return false;
  }
  if (!confirm(`¿Eliminar la categoría "${nombre}"?`)) return false;
  const { error } = await supabase.from('categorias').delete().eq('nombre', nombre);
  if (error) { toast('No se pudo eliminar: ' + error.message, 'error'); return false; }
  await logAccion('eliminar', 'categoria', nombre, nombre);
  await loadCategorias();
  return true;
}

// ============================================================
//  VISTA: CATEGORÍAS / ÁREAS DEL DERECHO (solo admin)
// ============================================================
export async function renderCategorias() {
  loading();
  await loadCategorias();
  // Conteo de uso por categoría (procesos + modelos)
  const [{ data: procs }, { data: mods }] = await Promise.all([
    supabase.from('procesos').select('materia'),
    supabase.from('modelos').select('categoria')
  ]);
  const usoProc = {}, usoMod = {};
  (procs || []).forEach(p => { if (p.materia) usoProc[p.materia] = (usoProc[p.materia] || 0) + 1; });
  (mods || []).forEach(m => { if (m.categoria) usoMod[m.categoria] = (usoMod[m.categoria] || 0) + 1; });

  content().innerHTML = `
    <div class="toolbar">
      <input type="search" id="qCat" placeholder="Buscar categoría...">
      <div class="spacer"></div>
      <button class="btn btn--primary" id="btnNuevaCat">${ICON.plus} Nueva categoría</button>
    </div>
    <div class="card">
      <div class="card__body" style="padding-bottom:6px">
        <p class="cell-sub">Las áreas del derecho se usan para clasificar <strong>procesos</strong> y <strong>modelos de memoriales</strong>. Al crear una, aparece automáticamente en todas las listas. Solo se pueden eliminar las que no estén en uso.</p>
      </div>
      <div class="card__body--flush"><div id="catTable"></div></div>
    </div>`;

  function paint() {
    const q = ($('#qCat').value || '').toLowerCase();
    const rows = state.categorias.filter(c => !q || c.toLowerCase().includes(q));
    $('#catTable').innerHTML = rows.length ? `<div class="table-wrap"><table class="data">
      <thead><tr><th>Categoría</th><th>Procesos</th><th>Modelos</th><th>Acciones</th></tr></thead>
      <tbody>${rows.map(c => {
        const enUso = (usoProc[c] || 0) + (usoMod[c] || 0) > 0;
        return `<tr class="no-hover">
          <td class="cell-strong">${esc(c)}</td>
          <td>${usoProc[c] || 0}</td>
          <td>${usoMod[c] || 0}</td>
          <td style="white-space:nowrap">
            <button class="btn btn--ghost btn--sm js-ren" data-cat="${esc(c)}">Renombrar</button>
            <button class="btn btn--danger btn--sm js-del" data-cat="${esc(c)}" ${enUso ? 'disabled title="En uso, no se puede eliminar"' : ''}>Eliminar</button>
          </td></tr>`;
      }).join('')}</tbody></table></div>`
      : `<div class="empty">${ICON.categorias}<p>No hay categorías que coincidan.</p></div>`;

    $('#catTable').querySelectorAll('.js-ren').forEach(b => b.onclick = async () => {
      const actual = b.dataset.cat;
      const nuevo = prompt(`Nuevo nombre para "${actual}":`, actual);
      if (nuevo === null) return;
      if (await renombrarCategoria(actual, nuevo)) { toast('Categoría renombrada.', 'success'); renderCategorias(); }
    });
    $('#catTable').querySelectorAll('.js-del').forEach(b => b.onclick = async () => {
      if (await eliminarCategoria(b.dataset.cat)) { toast('Categoría eliminada.', 'success'); renderCategorias(); }
    });
  }
  paint();
  $('#qCat').oninput = paint;
  $('#btnNuevaCat').onclick = async () => {
    const nombre = prompt('Nombre de la nueva área del derecho:');
    if (nombre === null) return;
    const creada = await crearCategoria(nombre);
    if (creada) { toast(`Categoría "${creada}" creada.`, 'success'); renderCategorias(); }
  };
}
