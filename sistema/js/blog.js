// ============================================================
//  LexFive — Vista BLOG (artículos del sitio público)
//  Listar, crear, editar y eliminar artículos con Asistente IA integral
//  (redacción completa y generación de portadas fotográficas editoriales).
// ============================================================
import { supabase } from './supabase.js';
import { logAccion } from './auth.js';
import { state } from './state.js';
import { esc, fmtDate } from './util.js';
import { ICON } from './icons.js';
import { $, content } from './dom.js';
import { loading, toast, tip, openModal, closeModal } from './ui.js';
import { profName } from './comunes.js';
import { generateContent, generarImagenIa } from './ai.js';
import { Draft, wireDraft, maybeOfferDraft } from './draft.js';
import { subirImagenBranding } from './storage.js';
import { optimizarFotoSitio } from './imagenes.js';
import { getAreaThemedSvg } from './areas.js';
import { withTimeout } from './auth.js';

let _portadaImgTmp = '';

export function getArticuloPortada(art) {
  if (art && art.imagen_url) return art.imagen_url;
  const c = (art && art.contenido) || '';
  const match = c.match(/<!--cover:(https?:\/\/[^\s>]+)-->/) || c.match(/!\[(?:portada|cover)\]\((https?:\/\/[^\s)]+)\)/i);
  return match ? match[1] : null;
}

export function stripPortadaTag(contenido) {
  return (contenido || '')
    .replace(/^<!--cover:https?:\/\/[^\s>]+-->\s*/i, '')
    .replace(/^!\[(?:portada|cover)\]\(https?:\/\/[^\s)]+\)\s*/i, '')
    .trim();
}

export function injectPortadaTag(contenido, url) {
  const clean = stripPortadaTag(contenido);
  if (!url) return clean;
  return `<!--cover:${url}-->\n${clean}`;
}

export async function renderBlog() {
  loading();
  const { data } = await supabase.from('articulos').select('*').order('updated_at', { ascending: false });
  const arts = data || [];

  content().innerHTML = `
    <!-- ASISTENTE IA DE REDACCIÓN JURÍDICA -->
    <div class="card" style="margin-bottom:18px;background:var(--card-bg,#0b192c);border:1px solid rgba(212,175,55,0.35);box-shadow:0 4px 16px rgba(0,0,0,0.15)">
      <div class="card__body" style="padding:16px 20px;">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <span style="font-weight:700;color:var(--gold,#d4af37);display:flex;align-items:center;gap:6px;font-size:0.95rem;">
            ✨ Asistente IA de Redacción Jurídica
          </span>
          <div style="flex-grow:1;min-width:260px;">
            <input type="text" id="aiTemaArticulo" placeholder="Ej. Despido injustificado y cobro de beneficios sociales en Bolivia" style="width:100%;margin:0;padding:8px 12px;border:1px solid var(--line, rgba(212,175,55,0.25));border-radius:6px;background:var(--input-bg, rgba(255,255,255,0.05));color:var(--ink, #fff);">
          </div>
          <label class="chk" style="margin:0;display:inline-flex;align-items:center;gap:6px;font-size:0.85rem;cursor:pointer;color:var(--ink,#e2e8f0);white-space:nowrap">
            <input type="checkbox" id="aiIncluirPortada" checked>
            Incluir portada con IA
          </label>
          <button class="btn btn--primary" id="btnRedactarAI" type="button" style="white-space:nowrap;padding:8px 16px;background:linear-gradient(135deg,#c8a24a,#d4af37);color:#0b192c;font-weight:700">
            ✨ Redactar con IA
          </button>
        </div>
      </div>
    </div>

    <div class="toolbar" style="flex-wrap:wrap;gap:8px">
      <button class="btn btn--ghost" id="btnCompletarPortadas">
        ✨ Completar portadas faltantes con IA
      </button>
      <div class="spacer"></div>
      <button class="btn btn--primary" id="btnNuevoArt">${ICON.plus} Nuevo artículo</button>
    </div>

    <div class="card"><div class="card__body--flush">
      ${arts.length ? `<div class="table-wrap"><table class="data">
        <thead><tr><th style="width:68px">Portada</th><th>Título</th><th>Categoría</th><th>Autor</th><th>Estado</th><th>Fecha</th></tr></thead>
        <tbody>${arts.map(a => {
          const cover = getArticuloPortada(a);
          const thumbHtml = cover
            ? `<div style="width:52px;height:34px;border-radius:6px;background-size:cover;background-position:center;background-image:url('${esc(cover)}');border:1px solid rgba(212,175,55,0.25)"></div>`
            : `<div style="width:52px;height:34px;border-radius:6px;overflow:hidden;border:1px solid rgba(212,175,55,0.2)">${getAreaThemedSvg(a.categoria || a.titulo || 'General', '100%', '100%')}</div>`;
          return `<tr data-id="${a.id}">
            <td style="padding:6px 10px">${thumbHtml}</td>
            <td class="cell-strong">${esc(a.titulo)}</td>
            <td>${esc(a.categoria || '—')}</td>
            <td>${esc(profName(a.autor_id))}</td>
            <td><span class="badge badge-${a.estado}">${a.estado === 'publicado' ? 'Publicado' : 'Borrador'}</span></td>
            <td>${fmtDate(a.fecha)}</td>
          </tr>`;
        }).join('')}</tbody></table></div>`
      : `<div class="empty">${ICON.blog}<p>Aún no hay artículos. Cree el primero.</p></div>`}
    </div></div>`;

  content().querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => {
    const a = arts.find(x => x.id === tr.dataset.id); articuloForm(a);
  });
  $('#btnNuevoArt').onclick = () => articuloForm();

  // Completar portadas faltantes en lote
  const btnCompletar = $('#btnCompletarPortadas');
  if (btnCompletar) {
    btnCompletar.onclick = async () => {
      const sinFoto = arts.filter(a => !getArticuloPortada(a));
      if (!sinFoto.length) {
        toast('Todos los artículos ya cuentan con portada.', 'success');
        return;
      }
      btnCompletar.disabled = true;
      btnCompletar.textContent = `🎨 Generando ${sinFoto.length} portadas con IA...`;
      let count = 0;
      for (const a of sinFoto) {
        try {
          const base64 = await withTimeout(generarImagenIa({
            titulo: a.titulo,
            descripcion: a.resumen || '',
            contexto: a.categoria || 'Derecho en Bolivia'
          }), 40000, 'Portada IA');
          if (base64) {
            let uploaded = null;
            try { uploaded = await subirImagenBranding(base64, 'blog'); } catch (e) {}
            const finalUrl = uploaded || base64;
            const nuevoContenido = injectPortadaTag(a.contenido, finalUrl);
            let upd = { contenido: nuevoContenido };
            let { error } = await supabase.from('articulos').update(upd).eq('id', a.id);
            if (!error) {
              a.contenido = nuevoContenido;
              count++;
            }
          }
        } catch (err) {
          console.warn('Error completando portada para', a.titulo, err);
        }
      }
      btnCompletar.disabled = false;
      btnCompletar.textContent = '✨ Completar portadas faltantes con IA';
      toast(`Se generaron ${count} portadas con éxito.`, 'success');
      renderBlog();
    };
  }

  // Lógica del Asistente IA de Redacción Jurídica
  const btnRedactar = $('#btnRedactarAI');
  const inputTema = $('#aiTemaArticulo');
  const chkPortada = $('#aiIncluirPortada');

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
      btnRedactar.innerHTML = '⏳ Redactando artículo...';

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
        const rawResponse = await withTimeout(
          generateContent(promptText, 'Eres un redactor jurídico senior boliviano. Respondes exclusivamente con un objeto JSON estructurado.'),
          60000,
          'Redacción IA'
        );

        if (!rawResponse) throw new Error('No se recibió respuesta del asistente de IA.');

        let cleaned = rawResponse.trim();
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        }

        let parsed;
        try {
          parsed = JSON.parse(cleaned);
        } catch (jsonErr) {
          const match = cleaned.match(/\{[\s\S]*\}/);
          if (match) parsed = JSON.parse(match[0]);
          else throw new Error('El formato devuelto no pudo ser interpretado como JSON: ' + jsonErr.message);
        }

        // Paso 2: Generar portada si el checkbox está activo
        let portadaUrl = '';
        if (chkPortada && chkPortada.checked) {
          btnRedactar.innerHTML = '🎨 Generando portada IA...';
          try {
            toast('Generando portada fotográfica editorial con IA...', 'info');
            const base64 = await withTimeout(generarImagenIa({
              titulo: parsed.titulo || tema,
              descripcion: parsed.resumen || '',
              contexto: parsed.categoria || 'Derecho en Bolivia'
            }), 45000, 'Portada IA');
            if (base64) {
              toast('Optimizando y subiendo portada a Supabase Storage...', 'info');
              let uploaded = null;
              try { uploaded = await subirImagenBranding(base64, 'blog'); } catch (e) {}
              portadaUrl = uploaded || base64;
            }
          } catch (imgErr) {
            console.warn('Fallo opcional en portada IA:', imgErr);
            toast('Artículo redactado con éxito. La portada podrá reintentarse dentro del editor.', 'info');
          }
        }

        toast('Artículo redactado con IA listo para revisión.', 'success');
        inputTema.value = '';
        articuloForm(null, {
          titulo: parsed.titulo || tema,
          categoria: parsed.categoria || 'General',
          resumen: parsed.resumen || '',
          contenido: parsed.contenido || '',
          estado: 'borrador',
          portada: portadaUrl
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
  const a = art || {
    titulo: p.titulo || "",
    categoria: p.categoria || "",
    resumen: p.resumen || "",
    contenido: p.contenido || "",
    estado: p.estado || "borrador"
  };

  const editable = !art || art.autor_id === state.profile.id || state.profile.rol === 'admin';
  _portadaImgTmp = (p && p.portada) || (art ? getArticuloPortada(art) : '') || '';

  const contenidoLimpio = stripPortadaTag(a.contenido);
  const prevThemedSvg = getAreaThemedSvg(a.categoria || a.titulo || 'General', 140, 80);

  const body = `
    <div class="field">
      <label>Título *${tip('Título del artículo tal como aparecerá en el blog público.')}</label>
      <input id="af_titulo" value="${esc(a.titulo || '')}" ${editable ? '' : 'disabled'}>
    </div>
    <div class="field-row">
      <div class="field">
        <label>Categoría${tip('Materia legal (Laboral, Familia, Civil...). Vincula automáticamente el artículo con su Área de Práctica.')}</label>
        <input id="af_cat" value="${esc(a.categoria || '')}" placeholder="Laboral, Familia, Civil..." ${editable ? '' : 'disabled'}>
      </div>
      <div class="field">
        <label>Estado${tip('"Borrador" lo mantiene oculto. "Publicado" lo hace visible de inmediato en la web pública.')}</label>
        <select id="af_estado" ${editable ? '' : 'disabled'}>
          <option value="borrador" ${a.estado !== 'publicado' ? 'selected' : ''}>Borrador</option>
          <option value="publicado" ${a.estado === 'publicado' ? 'selected' : ''}>Publicado</option>
        </select>
      </div>
    </div>

    <!-- Control de Portada Editorial -->
    <div class="field" style="background:var(--bg-soft,rgba(0,0,0,0.03));padding:14px;border-radius:10px;border:1px solid var(--line,rgba(212,175,55,0.2))">
      <label style="font-weight:600;margin-bottom:8px;color:var(--gold,#d4af37)">Portada del Artículo (editorial 16:9)</label>
      <div id="artImgPrev" style="margin-bottom:10px;border-radius:10px;overflow:hidden;border:1px solid var(--line, rgba(212,175,55,0.25));max-width:380px;background:var(--card-bg, #0b192c);">
        ${_portadaImgTmp
          ? `<img src="${esc(_portadaImgTmp)}" alt="Portada" style="width:100%;aspect-ratio:16/9;object-fit:cover;display:block">`
          : `<div style="width:100%;aspect-ratio:16/9;display:flex;align-items:center;justify-content:center">${prevThemedSvg}</div>`}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <button type="button" class="btn btn--ghost btn--sm" id="btnArtIaImg" style="color:var(--gold,#d4af37);border-color:rgba(212,175,55,0.3)" ${editable ? '' : 'disabled'}>
          ✨ Generar / Cambiar portada con IA
        </button>
        <button type="button" class="btn btn--ghost btn--sm" id="btnArtSubirImg" ${editable ? '' : 'disabled'}>Subir imagen</button>
        <button type="button" class="btn btn--ghost btn--sm" id="btnArtQuitarImg" ${_portadaImgTmp ? '' : 'hidden'} ${editable ? '' : 'disabled'}>Quitar portada</button>
        <input type="file" id="artFile" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" hidden>
      </div>
      <div id="artIaIdeaWrap" style="margin-top:10px;display:none">
        <div style="display:flex;gap:8px">
          <input type="text" id="artIaIdea" placeholder="Idea opcional para la imagen (ej: despacho moderno con balanza y libros jurídicos)" style="font-size:0.85rem;padding:6px 10px;flex:1">
          <button type="button" class="btn btn--primary btn--sm" id="btnArtConfirmarIa">Generar</button>
        </div>
      </div>
    </div>

    <div class="field">
      <label>Resumen (extracto)${tip('Frase corta que resume el artículo para las tarjetas del sitio web.')}</label>
      <textarea id="af_resumen" rows="2" ${editable ? '' : 'disabled'}>${esc(a.resumen || '')}</textarea>
    </div>
    <div class="field">
      <label>Contenido del Artículo${tip('El texto completo del artículo redactado con base legal boliviana.')}</label>
      <textarea id="af_contenido" style="min-height:200px" ${editable ? '' : 'disabled'}>${esc(contenidoLimpio)}</textarea>
    </div>
    ${editable ? '' : '<p class="cell-sub">Solo el autor o un administrador pueden editar este artículo.</p>'}`;

  const buttons = [{ label: 'Cerrar', class: 'btn--ghost', onClick: closeModal }];
  if (art && editable) buttons.push({ label: 'Eliminar', class: 'btn--danger', onClick: () => deleteArticulo(art) });
  if (editable) buttons.push({ label: 'Guardar', class: 'btn--primary', id: 'af_save', onClick: () => saveArticulo(art) });
  openModal(art ? 'Editar artículo' : 'Nuevo artículo', body, buttons, true);

  // Conectar acciones de portada en el modal
  const btnIa = $('#btnArtIaImg');
  const ideaWrap = $('#artIaIdeaWrap');
  const ideaInput = $('#artIaIdea');
  const btnConfirmIa = $('#btnArtConfirmarIa');

  if (btnIa && ideaWrap) {
    btnIa.onclick = () => {
      ideaWrap.style.display = ideaWrap.style.display === 'none' ? 'block' : 'none';
      if (ideaWrap.style.display !== 'none') ideaInput?.focus();
    };
  }

  const generarPortadaAction = async (ideaCustom) => {
    const tit = ($('#af_titulo')?.value || '').trim() || 'Artículo Jurídico LexFive';
    const desc = ideaCustom || ($('#af_resumen')?.value || '').trim();
    const cat = ($('#af_cat')?.value || '').trim() || 'Derecho en Bolivia';

    if (btnIa) { btnIa.disabled = true; btnIa.textContent = '🎨 Generando portada...'; }
    if (btnConfirmIa) btnConfirmIa.disabled = true;

    try {
      toast('Generando portada editorial con IA...', 'info');
      const base64 = await withTimeout(generarImagenIa({
        titulo: tit,
        descripcion: desc,
        contexto: cat
      }), 45000, 'Portada IA');

      if (base64) {
        toast('Optimizando y subiendo portada...', 'info');
        let uploaded = null;
        try { uploaded = await subirImagenBranding(base64, 'blog'); } catch (e) {}
        _portadaImgTmp = uploaded || base64;
        const prev = $('#artImgPrev');
        if (prev) {
          prev.innerHTML = `<img src="${esc(_portadaImgTmp)}" alt="Portada" style="width:100%;aspect-ratio:16/9;object-fit:cover;display:block">`;
        }
        const q = $('#btnArtQuitarImg');
        if (q) q.hidden = false;
        if (ideaWrap) ideaWrap.style.display = 'none';
        toast('Fotografía editorial generada y optimizada (pulse de nuevo para ver otra opción)', 'success');
      }
    } catch (err) {
      toast('Error generando portada: ' + (err.message || 'Intente de nuevo'), 'error');
    } finally {
      if (btnIa) { btnIa.disabled = false; btnIa.textContent = '✨ Generar / Cambiar portada con IA'; }
      if (btnConfirmIa) btnConfirmIa.disabled = false;
    }
  };

  if (btnConfirmIa) {
    btnConfirmIa.onclick = () => generarPortadaAction(ideaInput?.value.trim());
  }

  const fileInput = $('#artFile');
  const btnSubir = $('#btnArtSubirImg');
  if (btnSubir && fileInput) {
    btnSubir.onclick = () => fileInput.click();
    fileInput.onchange = () => {
      const f = fileInput.files && fileInput.files[0]; fileInput.value = '';
      if (!f) return;
      if (f.size > 25 * 1024 * 1024) { toast('La imagen pesa demasiado (máx. 25 MB).', 'error'); return; }
      const reader = new FileReader();
      reader.onload = () => optimizarFotoSitio(reader.result, 1200, async (peq) => {
        toast('Subiendo imagen...', 'info');
        let uploaded = null;
        try { uploaded = await subirImagenBranding(peq, 'blog'); } catch (e) {}
        _portadaImgTmp = uploaded || peq;
        const prev = $('#artImgPrev');
        if (prev) prev.innerHTML = `<img src="${esc(_portadaImgTmp)}" alt="Portada" style="width:100%;aspect-ratio:16/9;object-fit:cover;display:block">`;
        const q = $('#btnArtQuitarImg'); if (q) q.hidden = false;
        toast('Portada lista. No olvide Guardar.', 'success');
      });
      reader.onerror = () => toast('No se pudo leer el archivo.', 'error');
      reader.readAsDataURL(f);
    };
  }

  const btnQuitar = $('#btnArtQuitarImg');
  if (btnQuitar) {
    btnQuitar.onclick = () => {
      _portadaImgTmp = '';
      const prev = $('#artImgPrev');
      if (prev) {
        const cat = $('#af_cat')?.value || 'General';
        prev.innerHTML = `<div style="width:100%;aspect-ratio:16/9;display:flex;align-items:center;justify-content:center">${getAreaThemedSvg(cat, '100%', '100%')}</div>`;
      }
      btnQuitar.hidden = true;
    };
  }

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

  const contenidoPuro = stripPortadaTag($('#af_contenido').value.trim());
  const contenidoFinal = injectPortadaTag(contenidoPuro, _portadaImgTmp);

  const payload = {
    titulo,
    categoria: $('#af_cat').value.trim() || null,
    estado: $('#af_estado').value,
    resumen: $('#af_resumen').value.trim() || null,
    contenido: contenidoFinal
  };

  $('#af_save').disabled = true;
  let error;
  if (art) {
    payload.updated_at = new Date().toISOString();
    ({ error } = await supabase.from('articulos').update(payload).eq('id', art.id));
  } else {
    payload.autor_id = state.profile.id;
    ({ error } = await supabase.from('articulos').insert(payload));
  }

  if (error) {
    toast('Error: ' + error.message, 'error');
    $('#af_save').disabled = false;
    return;
  }

  Draft.clear('articulo_' + (art ? art.id : 'nuevo'));
  await logAccion(art ? 'editar' : 'crear', 'articulo', art ? art.id : titulo, titulo);
  closeModal();
  toast('Artículo guardado exitosamente.', 'success');
  renderBlog();
}

async function deleteArticulo(art) {
  if (!confirm(`¿Eliminar el artículo "${art.titulo}"?`)) return;
  const { error } = await supabase.from('articulos').delete().eq('id', art.id);
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  await logAccion('eliminar', 'articulo', art.id, art.titulo);
  closeModal();
  toast('Artículo eliminado.', 'success');
  renderBlog();
}
