// ============================================================
//  LexFive — Vista MODELOS DE MEMORIALES
//  Biblioteca reutilizable: subir (archivos o carpeta), listar por
//  área, descargar y eliminar. Extraído de app.js (paso 11).
// ============================================================
import { supabase } from '@/api/supabase.js';
import { logAccion } from '@/api/auth.js';
import { state } from '@/utils/state.js';
import { esc, fmtDate } from '@/utils/util.js';
import { ICON } from '@/utils/icons.js';
import { $, content } from '@/utils/dom.js';
import { loading, toast, tip } from '@/utils/ui.js';
import { profName } from '@/shared/comunes.js';
import { loadCategorias, categoriaOptions, wireCategoriaSelect } from '@/views/categorias.js';
import { subirDocumento, enlaceDocumento } from '@/utils/storage.js';

export async function renderModelos() {
  loading();
  await loadCategorias();
  const { data } = await supabase.from('modelos').select('*').order('created_at', { ascending: false });
  const list = data || [];

  // Áreas disponibles para clasificar los modelos (categorías dinámicas)
  const areaOptions = state.categorias.map(m => `<option>${esc(m)}</option>`).join('');

  content().innerHTML = `
    <div class="card">
      <div class="card__head"><h3>Subir modelos de memoriales${tip('Plantillas reutilizables (demandas, memoriales, etc.) que el equipo puede descargar cuando las necesite.')}</h3></div>
      <div class="card__body">
        <div class="field-row">
          <div class="field"><label>Área del derecho *${tip('Clasifica el modelo. Si falta un área, elija "Crear nueva categoría" y se agregará a todo el sistema.')}</label>
            <select id="md_area" class="js-categoria" data-include-blank="1" data-blank-label="Seleccione un área"><option value="">Seleccione un área</option>${categoriaOptions('')}</select>
          </div>
          <div class="field"><label>Nombre (opcional)${tip('Si sube un solo archivo puede darle un nombre claro. Si sube varios o una carpeta, se usa el nombre de cada archivo.')}</label>
            <input id="md_nombre" placeholder="Si sube un solo archivo. Si deja vacío, se usa el nombre del archivo.">
          </div>
        </div>
        <div class="field-row">
          <div class="field">
            <label>Archivos (puede elegir varios)${tip('Puede seleccionar varios archivos a la vez manteniendo Ctrl (o Cmd en Mac) al elegirlos.')}</label>
            <input type="file" id="md_file" multiple>
            <span class="cell-sub" style="display:block;margin-top:4px;">Word, PDF, imágenes, etc. Mantenga Ctrl/Cmd para elegir varios.</span>
          </div>
          <div class="field">
            <label>...o una carpeta completa${tip('Sube todos los archivos de una carpeta de su computadora al área elegida. Funciona en navegadores de escritorio.')}</label>
            <input type="file" id="md_folder" webkitdirectory directory multiple>
            <span class="cell-sub" style="display:block;margin-top:4px;">Se subirán todos los archivos de la carpeta al área elegida.</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <button class="btn btn--primary" id="md_subir">Subir al área seleccionada</button>
          <span class="cell-sub" id="md_progreso"></span>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card__head"><h3>Biblioteca de modelos (${list.length})</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <select id="md_farea" style="padding:9px 12px;border:1.5px solid var(--line);border-radius:8px;">
            <option value="">Todas las áreas</option>${areaOptions}
          </select>
          <input type="search" id="md_q" placeholder="Buscar modelo..." style="padding:9px 12px;border:1.5px solid var(--line);border-radius:8px;">
        </div>
      </div>
      <div class="card__body--flush"><div id="md_list"></div></div>
    </div>`;

  const SIN_AREA = 'Sin área';

  function paint() {
    const q = ($('#md_q').value || '').toLowerCase();
    const fa = $('#md_farea').value;
    const rows = list.filter(m =>
      (!fa || (m.categoria || '') === fa) &&
      (!q || [m.nombre, m.categoria].some(v => (v || '').toLowerCase().includes(q))));

    if (!rows.length) {
      $('#md_list').innerHTML = `<div class="empty">${ICON.doc}<p>No hay modelos que coincidan. Suba el primero arriba.</p></div>`;
      return;
    }

    // Agrupar por área
    const grupos = {};
    rows.forEach(m => { const a = m.categoria || SIN_AREA; (grupos[a] = grupos[a] || []).push(m); });
    const ordenadas = Object.keys(grupos).sort((a, b) => a.localeCompare(b, 'es'));

    $('#md_list').innerHTML = ordenadas.map(area => `
      <div class="md-group">
        <div class="md-group__head">${esc(area)} <span class="md-group__count">${grupos[area].length}</span></div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Nombre</th><th>Fecha</th><th>Subido por</th><th>Acciones</th></tr></thead>
          <tbody>${grupos[area].map(m => `<tr class="no-hover">
            <td class="cell-strong">${esc(m.nombre)}</td>
            <td>${fmtDate(m.created_at)}</td>
            <td>${esc(profName(m.subido_por))}</td>
            <td style="white-space:nowrap">
              <button class="btn btn--ghost btn--sm js-dl" data-path="${esc(m.storage_path)}">Descargar</button>
              <button class="btn btn--danger btn--sm js-del" data-id="${m.id}" data-path="${esc(m.storage_path)}">Eliminar</button>
            </td></tr>`).join('')}</tbody></table></div>
      </div>`).join('');

    $('#md_list').querySelectorAll('.js-dl').forEach(b => b.onclick = async () => {
      const { data: d, error } = await enlaceDocumento(b.dataset.path);
      if (error) { toast('No se pudo generar el enlace.', 'error'); return; }
      window.open(d.signedUrl, '_blank');
    });
    $('#md_list').querySelectorAll('.js-del').forEach(b => b.onclick = async () => {
      if (!confirm('¿Eliminar este modelo?')) return;
      await supabase.storage.from('documentos').remove([b.dataset.path]);
      await supabase.from('modelos').delete().eq('id', b.dataset.id);
      await logAccion('eliminar', 'modelo', b.dataset.id, '');
      renderModelos();
    });
  }
  paint();
  $('#md_q').oninput = paint;
  $('#md_farea').onchange = paint;
  wireCategoriaSelect($('#md_area'));

  $('#md_subir').onclick = async () => {
    const area = $('#md_area').value;
    if (!area) { toast('Seleccione el área del derecho.', 'error'); return; }

    // Reunir los archivos: de la carpeta y/o de la selección de archivos sueltos
    const archivos = [...($('#md_folder').files || []), ...($('#md_file').files || [])];
    if (!archivos.length) { toast('Seleccione archivos o una carpeta.', 'error'); return; }

    const nombreManual = $('#md_nombre').value.trim();
    const btn = $('#md_subir'); const prog = $('#md_progreso');
    btn.disabled = true; btn.textContent = 'Subiendo...';

    let ok = 0, fallos = 0;
    for (let i = 0; i < archivos.length; i++) {
      const file = archivos[i];
      prog.textContent = `Subiendo ${i + 1} de ${archivos.length}...`;
      // El nombre manual solo se usa si se sube un único archivo; si no, el del archivo.
      const baseName = (archivos.length === 1 && nombreManual)
        ? nombreManual
        : file.name.replace(/\.[^.]+$/, '');
      const safe = file.name.replace(/[^\w.\-]/g, '_');
      const path = `modelos/${area.toLowerCase()}/${Date.now()}_${i}_${safe}`;
      const { error: upErr } = await subirDocumento(path, file);
      if (upErr) { fallos++; continue; }
      const { error: insErr } = await supabase.from('modelos').insert({
        nombre: baseName, categoria: area, storage_path: path, subido_por: state.profile.id
      });
      if (insErr) { fallos++; await supabase.storage.from('documentos').remove([path]); continue; }
      ok++;
    }
    await logAccion('subir', 'modelo', area, `${ok} modelo(s) en ${area}`);
    prog.textContent = '';
    if (ok) toast(`${ok} modelo(s) subido(s) a ${area}.${fallos ? ' ' + fallos + ' con error.' : ''}`, fallos ? 'error' : 'success');
    else toast('No se pudo subir ningún archivo.', 'error');
    renderModelos();
  };
}
