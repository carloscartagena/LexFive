// ============================================================
//  LexFive — Vista ÁREAS DE PRÁCTICA
//  CRUD de las áreas que se muestran como carrusel en la web
//  pública (título, descripción, imagen, orden, visible).
//  Extraído de app.js (paso 16 del split).
// ============================================================
import { supabase } from '@/api/supabase.js';
import { esc } from '@/utils/util.js';
import { ICON } from '@/utils/icons.js';
import { $, content } from '@/utils/dom.js';
import { loading, toast, openModal, closeModal } from '@/utils/ui.js';
import { subirImagenBranding } from '@/utils/storage.js';
import { optimizarFotoSitio } from '@/views/imagenes.js';

let _areasCache = [];
let _areaImgTmp = '';

export async function renderAreas() {
  loading();
  const { data, error } = await supabase.from('areas_practica').select('*').order('orden', { ascending: true });
  if (error) {
    content().innerHTML = `<div class="card"><div class="card__body"><p class="cell-sub">No se pudieron cargar las áreas. ¿Ya ejecutó <code>db/27_areas_practica.sql</code> en Supabase?<br>Detalle: ${esc(error.message)}</p></div></div>`;
    return;
  }
  _areasCache = data || [];

  content().innerHTML = `
    <div class="toolbar">
      <div class="spacer"></div>
      <button class="btn btn--primary" id="btnNuevaArea">${ICON.plus} Nueva área</button>
    </div>
    <div class="card"><div class="card__body" style="padding-bottom:6px">
      <p class="cell-sub">Estas áreas se muestran como <strong>carrusel</strong> en la página de inicio (lexfive.netlify.app). Puede crear, editar, ordenar (▲▼) y mostrar/ocultar cada una, con su <strong>título, descripción e imagen</strong>. Los cambios se ven en la web en unos segundos.</p>
    </div></div>
    <div id="areasList"></div>`;

  $('#btnNuevaArea').onclick = () => formArea(null);
  paintAreas();
}

function paintAreas() {
  const cont = $('#areasList');
  if (!cont) return;
  if (!_areasCache.length) {
    cont.innerHTML = `<div class="empty">${ICON.categorias}<p>No hay áreas todavía. Cree la primera con «Nueva área».</p></div>`;
    return;
  }
  cont.innerHTML = _areasCache.map((a, i) => `
    <div class="card" style="margin-bottom:12px"><div class="card__body" style="display:flex;gap:14px;align-items:center">
      <div style="width:64px;height:64px;border-radius:10px;flex-shrink:0;background:#eef1f5;background-size:cover;background-position:center;background-repeat:no-repeat;${a.imagen_url ? `background-image:url('${esc(a.imagen_url)}');` : ''}display:grid;place-items:center;color:#9aa4b2">${a.imagen_url ? '' : ICON.categorias}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <strong>${esc(a.titulo)}</strong>
          ${a.activo ? '' : '<span class="badge" style="background:#eee;color:#888">Oculta</span>'}
        </div>
        <p class="cell-sub" style="margin-top:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(a.descripcion || '')}</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;gap:4px;justify-content:flex-end">
          <button class="btn btn--ghost btn--sm js-up" data-i="${i}" ${i === 0 ? 'disabled' : ''} title="Subir">▲</button>
          <button class="btn btn--ghost btn--sm js-down" data-i="${i}" ${i === _areasCache.length - 1 ? 'disabled' : ''} title="Bajar">▼</button>
        </div>
        <div style="display:flex;gap:4px;justify-content:flex-end">
          <button class="btn btn--ghost btn--sm js-edit" data-id="${esc(a.id)}">Editar</button>
          <button class="btn btn--danger btn--sm js-del" data-id="${esc(a.id)}">Eliminar</button>
        </div>
      </div>
    </div></div>`).join('');

  cont.querySelectorAll('.js-edit').forEach(b => b.onclick = () => formArea(_areasCache.find(x => x.id === b.dataset.id)));
  cont.querySelectorAll('.js-del').forEach(b => b.onclick = () => eliminarArea(b.dataset.id));
  cont.querySelectorAll('.js-up').forEach(b => b.onclick = () => moverArea(Number(b.dataset.i), -1));
  cont.querySelectorAll('.js-down').forEach(b => b.onclick = () => moverArea(Number(b.dataset.i), 1));
}

function formArea(area) {
  const esNueva = !area;
  const imgActual = area ? (area.imagen_url || '') : '';
  _areaImgTmp = imgActual;
  const body = `
    <div class="field"><label>Título</label>
      <input type="text" id="areaTitulo" value="${esc(area ? area.titulo : '')}" placeholder="Ej: Derecho Laboral"></div>
    <div class="field"><label>Descripción</label>
      <textarea id="areaDesc" rows="3" placeholder="Breve descripción del área...">${esc(area ? area.descripcion : '')}</textarea></div>
    <div class="field"><label>Imagen (opcional)</label>
      <div id="areaImgPrev" style="margin-bottom:8px">${imgActual ? `<img src="${esc(imgActual)}" alt="" style="max-width:100%;border-radius:10px;display:block">` : '<p class="cell-sub">Sin imagen (se mostrará un ícono por defecto).</p>'}</div>
      <button type="button" class="btn btn--ghost btn--sm" id="areaSubir">Subir imagen</button>
      <button type="button" class="btn btn--ghost btn--sm" id="areaQuitar" ${imgActual ? '' : 'hidden'}>Quitar imagen</button>
      <input type="file" id="areaFile" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" hidden>
    </div>
    <label class="chk"><input type="checkbox" id="areaActivo" ${(!area || area.activo) ? 'checked' : ''}> Mostrar en la web</label>`;
  openModal(esNueva ? 'Nueva área de práctica' : 'Editar área', body, [
    { label: 'Cancelar', class: 'btn--ghost', onClick: closeModal },
    { label: 'Guardar', class: 'btn--primary', id: 'areaGuardar', onClick: () => guardarArea(area) }
  ]);

  const file = $('#areaFile');
  $('#areaSubir').onclick = () => file.click();
  file.onchange = () => {
    const f = file.files && file.files[0]; file.value = '';
    if (!f) return;
    if (f.size > 25 * 1024 * 1024) { toast('La imagen pesa demasiado (máx. 25 MB).', 'error'); return; }
    const reader = new FileReader();
    reader.onload = () => optimizarFotoSitio(reader.result, 1200, async (peq) => {
      toast('Subiendo imagen...', 'success');
      let src = null;
      try { src = await subirImagenBranding(peq, 'areas'); } catch (e) {}
      if (!src) src = peq;
      _areaImgTmp = src;
      const prev = $('#areaImgPrev');
      if (prev) prev.innerHTML = `<img src="${esc(src)}" alt="" style="max-width:100%;border-radius:10px;display:block">`;
      const q = $('#areaQuitar'); if (q) q.hidden = false;
      toast('Imagen lista. No olvide Guardar.', 'success');
    });
    reader.onerror = () => toast('No se pudo leer el archivo.', 'error');
    reader.readAsDataURL(f);
  };
  const quitar = $('#areaQuitar');
  if (quitar) quitar.onclick = () => {
    _areaImgTmp = '';
    const prev = $('#areaImgPrev'); if (prev) prev.innerHTML = '<p class="cell-sub">Sin imagen (se mostrará un ícono por defecto).</p>';
    quitar.hidden = true;
  };
}

async function guardarArea(area) {
  const titulo = ($('#areaTitulo').value || '').trim();
  if (!titulo) { toast('Escriba un título.', 'error'); return; }
  const descripcion = ($('#areaDesc').value || '').trim();
  const activo = $('#areaActivo').checked;
  const btn = $('#areaGuardar'); if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }
  let error;
  if (area) {
    ({ error } = await supabase.from('areas_practica')
      .update({ titulo, descripcion, imagen_url: _areaImgTmp || null, activo }).eq('id', area.id));
  } else {
    const orden = _areasCache.length ? Math.max(..._areasCache.map(a => a.orden || 0)) + 1 : 1;
    ({ error } = await supabase.from('areas_practica')
      .insert({ titulo, descripcion, imagen_url: _areaImgTmp || null, activo, orden }));
  }
  if (error) { toast('Error: ' + error.message, 'error'); if (btn) { btn.disabled = false; btn.textContent = 'Guardar'; } return; }
  closeModal();
  toast(area ? 'Área actualizada. Se verá en la web en unos segundos.' : 'Área creada. Se verá en la web en unos segundos.', 'success');
  renderAreas();
}

function eliminarArea(id) {
  const area = _areasCache.find(x => x.id === id);
  if (!area) return;
  openModal('Eliminar área', `<p>¿Eliminar «${esc(area.titulo)}»? Esta acción no se puede deshacer.</p>`, [
    { label: 'Cancelar', class: 'btn--ghost', onClick: closeModal },
    { label: 'Eliminar', class: 'btn--danger', onClick: async () => {
      const { error } = await supabase.from('areas_practica').delete().eq('id', id);
      if (error) { toast('Error: ' + error.message, 'error'); return; }
      closeModal(); toast('Área eliminada.', 'success'); renderAreas();
    } }
  ]);
}

async function moverArea(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= _areasCache.length) return;
  const a = _areasCache[i], b = _areasCache[j];
  let oa = a.orden, ob = b.orden;
  if (oa === ob) { oa = i + 1; ob = j + 1; } // por si quedaron empatados
  const [r1, r2] = await Promise.all([
    supabase.from('areas_practica').update({ orden: ob }).eq('id', a.id),
    supabase.from('areas_practica').update({ orden: oa }).eq('id', b.id)
  ]);
  if (r1.error || r2.error) { toast('No se pudo reordenar.', 'error'); return; }
  renderAreas();
}
