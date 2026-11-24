// ============================================================
//  LexFive — Vista BLOG (artículos del sitio público)
//  Listar, crear, editar y eliminar artículos. Extraído de
//  app.js (paso 9 del split).
// ============================================================
import { supabase } from './supabase.js';
import { logAccion } from './auth.js';
import { state } from './state.js';
import { esc, fmtDate } from './util.js';
import { ICON } from './icons.js';
import { $, content } from './dom.js';
import { loading, toast, tip, openModal, closeModal } from './ui.js';
import { profName } from './comunes.js';
import { generateContent } from './ai.js';
import { Draft, wireDraft, maybeOfferDraft } from './draft.js';

export async function renderBlog() {
  loading();
  const { data } = await supabase.from('articulos').select('*').order('updated_at', { ascending: false });
  const arts = data || [];
  content().innerHTML = `
<!-- ASISTENTE IA DE REDACCIÓN JURÍDICA -->
    <div class="card" style="margin-bottom:18px;background:var(--bg-soft2);border:1px solid var(--primary-alpha, rgba(184,146,63,0.3));">
      <div class="card__body" style="padding:14px 18px;">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <span style="font-weight:700;color:var(--primary);display:flex;align-items:center;gap:6px;font-size:0.95rem;">
            ✨ Asistente IA de Redacción Jurídica
          </span>
          <div style="flex-grow:1;min-width:280px;">
            <input type="text" id="aiTemaArticulo" placeholder="Ej. Proceso de asistencia familiar en Bolivia según la Ley 603" style="width:100%;margin:0;padding:8px 12px;border:1px solid var(--line);border-radius:6px;background:var(--white);">
          </div>
          <button class="btn btn--primary" id="btnRedactarAI" type="button" style="white-space:nowrap;padding:8px 16px;">
            ✨ Redactar borrador con IA
          </button>
        </div>
      </div>
    </div>
    <div class="toolbar">
      <div class="spacer"></div>
      <button class="btn btn--primary" id="btnNuevoArt">${ICON.plus} Nuevo artículo</button>
    </div>
    <div class="card"><div class="card__body--flush">
      ${arts.length ? `<div class="table-wrap"><table class="data">
        <thead><tr><th>Título</th><th>Categoría</th><th>Autor</th><th>Estado</th><th>Fecha</th></tr></thead>
        <tbody>${arts.map(a => `<tr data-id="${a.id}">
          <td class="cell-strong">${esc(a.titulo)}</td>
          <td>${esc(a.categoria || '—')}</td>
          <td>${esc(profName(a.autor_id))}</td>
          <td><span class="badge badge-${a.estado}">${a.estado === 'publicado' ? 'Publicado' : 'Borrador'}</span></td>
          <td>${fmtDate(a.fecha)}</td></tr>`).join('')}</tbody></table></div>`
      : `<div class="empty">${ICON.blog}<p>Aún no hay artículos. Cree el primero.</p></div>`}
    </div></div>`;
  content().querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => {
    const a = arts.find(x => x.id === tr.dataset.id); articuloForm(a);
  });
  $('#btnNuevoArt').onclick = () => articuloForm();

  // Lógica del Asistente IA de Redacción Jurídica
  const btnRedactar = $('#btnRedactarAI');
  const inputTema = $('#aiTemaArticulo');
  if (btnRedactar && inputTema) {
    btnRedactar.onclick = async () => {
      const tema = inputTema.value.trim();
      if (!tema) {
        toast('Por favor ingrese un tema o consulta jurídica para redactar el artículo.', 'error');
        inputTema.focus();
        return;
      }

      btnRedactar.disabled = true;
      const originalText = btnRedactar.innerHTML;
      btnRedactar.innerHTML = '⏳ Redactando con IA...';

      const promptText = `Actúa como redactor jurídico experto del bufete de abogados LexFive en El Alto / La Paz, Bolivia.
Redacta un artículo jurídico informativo completo, claro y atractivo sobre el tema: "${tema}".
El artículo debe estar dirigido a personas y empresas interesadas en entender sus derechos y pasos legales en Bolivia.

Devuelve EXCLUSIVAMENTE un objeto JSON válido con esta estructura exacta (sin markdown extra, sin comillas adicionales):
{
  "titulo": "Título atractivo, claro y profesional orientado a clientes en Bolivia",
  "categoria": "Una sola palabra o materia legal corta (ej: Laboral, Familia, Civil, Penal, Informático, Constitucional, Minero, Agrario)",
  "resumen": "Resumen claro y directo de máximo 2 líneas para las tarjetas del sitio web y blog",
  "contenido": "Texto completo del artículo redactado con subtítulos claros (1., 2., 3.), base legal boliviana aplicable (mencionando leyes y artículos reales vigentes), explicación de pasos prácticos que debe seguir el ciudadano y párrafo final de cierre formal invitando a acudir o consultar con LexFive Bufete de Abogados en El Alto / La Paz."
}`;

      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Tiempo de espera agotado (60 segundos). Verifique su conexión e intente nuevamente.')), 60000)
        );

        const aiPromise = generateContent(promptText, 'Eres un redactor jurídico senior boliviano. Respondes exclusivamente con un objeto JSON estructurado.');
        const rawResponse = await Promise.race([aiPromise, timeoutPromise]);

        if (!rawResponse) throw new Error('No se recibió respuesta del asistente de IA.');

        // Limpiar posible bloque markdown ```json ... ```
        let cleaned = rawResponse.trim();
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        }

        let parsed;
        try {
          parsed = JSON.parse(cleaned);
        } catch (jsonErr) {
          // Si el JSON viene con texto extra, extraer entre llaves
          const match = cleaned.match(/\{[\s\S]*\}/);
          if (match) parsed = JSON.parse(match[0]);
          else throw new Error('El formato devuelto no pudo ser interpretado como JSON: ' + jsonErr.message);
        }

        toast('Artículo redactado con IA listo para revisión.', 'success');
        inputTema.value = '';
        articuloForm(null, {
          titulo: parsed.titulo || tema,
          categoria: parsed.categoria || 'General',
          resumen: parsed.resumen || '',
          contenido: parsed.contenido || '',
          estado: 'borrador'
        });
      } catch (err) {
        console.error('Error redactando con IA:', err);
        toast('No se pudo generar el artículo con IA: ' + err.message, 'error');
      } finally {
        btnRedactar.disabled = false;
        btnRedactar.innerHTML = originalText;
      }
    };
  }

}

function articuloForm(art = null, prefill = null) {
  const p = prefill || {};
  const a = art || { titulo: p.titulo || "", categoria: p.categoria || "", resumen: p.resumen || "", contenido: p.contenido || "", estado: p.estado || "borrador" };
  const editable = !art || art.autor_id === state.profile.id || state.profile.rol === 'admin';
  const body = `
    <div class="field"><label>Título *${tip('Título del artículo tal como aparecerá en el blog público.')}</label><input id="af_titulo" value="${esc(a.titulo || '')}" ${editable ? '' : 'disabled'}></div>
    <div class="field-row">
      <div class="field"><label>Categoría${tip('Tema del artículo (Laboral, Familia, etc.). Ayuda a los lectores a encontrarlo.')}</label><input id="af_cat" value="${esc(a.categoria || '')}" placeholder="Laboral, Familia..." ${editable ? '' : 'disabled'}></div>
      <div class="field"><label>Estado${tip('"Borrador" lo mantiene oculto mientras lo redacta. "Publicado" lo muestra de inmediato en la web pública.')}</label><select id="af_estado" ${editable ? '' : 'disabled'}><option value="borrador" ${a.estado !== 'publicado' ? 'selected' : ''}>Borrador</option><option value="publicado" ${a.estado === 'publicado' ? 'selected' : ''}>Publicado</option></select></div>
    </div>
    <div class="field"><label>Resumen (extracto)${tip('Frase corta que resume el artículo. Es lo que se ve en la lista del blog antes de abrirlo.')}</label><textarea id="af_resumen" ${editable ? '' : 'disabled'}>${esc(a.resumen || '')}</textarea></div>
    <div class="field"><label>Contenido${tip('El texto completo del artículo. Se autoguarda mientras escribe.')}</label><textarea id="af_contenido" style="min-height:160px" ${editable ? '' : 'disabled'}>${esc(a.contenido || '')}</textarea></div>
    ${editable ? '' : '<p class="cell-sub">Solo el autor o un administrador pueden editar este artículo.</p>'}`;
  const buttons = [{ label: 'Cerrar', class: 'btn--ghost', onClick: closeModal }];
  if (art && editable) buttons.push({ label: 'Eliminar', class: 'btn--danger', onClick: () => deleteArticulo(art) });
  if (editable) buttons.push({ label: 'Guardar', class: 'btn--primary', id: 'af_save', onClick: () => saveArticulo(art) });
  openModal(art ? 'Editar artículo' : 'Nuevo artículo', body, buttons, true);

  // Autoguardado de borrador (solo si el formulario es editable)
  if (editable) {
    const draftName = 'articulo_' + (art ? art.id : 'nuevo');
    const draft = wireDraft(draftName, ['af_titulo', 'af_cat', 'af_estado', 'af_resumen', 'af_contenido']);
    maybeOfferDraft(draftName, draft);
  }
}

async function saveArticulo(art) {
  const titulo = $('#af_titulo').value.trim();
  if (!titulo) { toast('El título es obligatorio.', 'error'); return; }
  const payload = {
    titulo, categoria: $('#af_cat').value.trim() || null, estado: $('#af_estado').value,
    resumen: $('#af_resumen').value.trim() || null, contenido: $('#af_contenido').value.trim() || null
  };
  $('#af_save').disabled = true;
  let error;
  if (art) { payload.updated_at = new Date().toISOString(); ({ error } = await supabase.from('articulos').update(payload).eq('id', art.id)); }
  else { payload.autor_id = state.profile.id; ({ error } = await supabase.from('articulos').insert(payload)); }
  if (error) { toast('Error: ' + error.message, 'error'); $('#af_save').disabled = false; return; }
  Draft.clear('articulo_' + (art ? art.id : 'nuevo'));
  await logAccion(art ? 'editar' : 'crear', 'articulo', art ? art.id : titulo, titulo);
  closeModal(); toast('Artículo guardado.', 'success'); renderBlog();
}

async function deleteArticulo(art) {
  if (!confirm(`¿Eliminar el artículo "${art.titulo}"?`)) return;
  const { error } = await supabase.from('articulos').delete().eq('id', art.id);
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  await logAccion('eliminar', 'articulo', art.id, art.titulo);
  closeModal(); toast('Artículo eliminado.', 'success'); renderBlog();
}
