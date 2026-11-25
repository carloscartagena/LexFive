// ============================================================
//  LexFive — Vista ÁREAS DE PRÁCTICA
//  CRUD de las áreas que se muestran como carrusel en la web
//  pública (título, descripción, imagen, orden, visible) con
//  asistente IA integral: redacción de fichas completas, generación
//  de imágenes corporativas y portadas vectoriales temáticas.
// ============================================================
import { supabase } from './supabase.js';
import { esc } from './util.js';
import { ICON } from './icons.js';
import { $, content } from './dom.js';
import { loading, toast, openModal, closeModal } from './ui.js';
import { subirImagenBranding } from './storage.js';
import { optimizarFotoSitio } from './imagenes.js';
import { generateContent, generarImagenIa, generarFichaAreaIa } from './ai.js';
import { withTimeout } from './auth.js';

let _areasCache = [];
let _areaImgTmp = '';
let _areaDetalleTmp = null;
let _areaSlugTmp = '';

export function slugify(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/**
 * Helper reutilizable de portadas SVG temáticas en paleta LexFive (Azul Marino + Dorado)
 * Asigna iconos vectoriales limpios según palabras clave en el título.
 */
export function getAreaThemedSvg(titulo, width = 64, height = 64) {
  const t = (titulo || '').toLowerCase();
  let iconSvg = '';

  if (t.includes('laboral') || t.includes('trabaj') || t.includes('emple') || t.includes('despid') || t.includes('finiquit')) {
    iconSvg = '<rect x="18" y="24" width="28" height="22" rx="3" fill="none" stroke="#d4af37" stroke-width="2"/>' +
              '<path d="M25 24v-4a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4" fill="none" stroke="#d4af37" stroke-width="2"/>' +
              '<path d="M18 34h28" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="2 2"/>' +
              '<circle cx="32" cy="34" r="2.5" fill="#d4af37"/>';
  } else if (t.includes('civil') || t.includes('contrat') || t.includes('dañ') || t.includes('deud') || t.includes('arrend')) {
    iconSvg = '<path d="M20 18h18l8 8v22a3 3 0 0 1-3 3H20a3 3 0 0 1-3-3V21a3 3 0 0 1 3-3z" fill="none" stroke="#d4af37" stroke-width="2"/>' +
              '<polyline points="38 18 38 26 46 26" fill="none" stroke="#d4af37" stroke-width="1.8"/>' +
              '<line x1="23" y1="32" x2="35" y2="32" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>' +
              '<line x1="23" y1="38" x2="39" y2="38" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>' +
              '<line x1="23" y1="44" x2="31" y2="44" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>';
  } else if (t.includes('penal') || t.includes('delit') || t.includes('defens') || t.includes('libert') || t.includes('fiscal')) {
    iconSvg = '<path d="M32 15l14 5v12c0 10-6.5 16.5-14 19-7.5-2.5-14-9-14-19V20l14-5z" fill="rgba(212,175,55,0.08)" stroke="#d4af37" stroke-width="2"/>' +
              '<path d="M26 27l12 12" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>' +
              '<path d="M34 23l5 5-3 3-5-5z" fill="#d4af37"/>' +
              '<circle cx="32" cy="32" r="1.5" fill="#38bdf8"/>';
  } else if (t.includes('familia') || t.includes('divorc') || t.includes('asistenc') || t.includes('menor') || t.includes('herenc') || t.includes('sucesor')) {
    iconSvg = '<circle cx="25" cy="24" r="4" fill="none" stroke="#d4af37" stroke-width="1.8"/>' +
              '<path d="M18 38v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2" fill="none" stroke="#d4af37" stroke-width="1.8"/>' +
              '<circle cx="39" cy="26" r="3.2" fill="none" stroke="#38bdf8" stroke-width="1.8"/>' +
              '<path d="M34 38v-1.5a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v1.5" fill="none" stroke="#38bdf8" stroke-width="1.8"/>' +
              '<path d="M32 42s2 1.5 4 0" stroke="#d4af37" stroke-width="1.5"/>';
  } else if (t.includes('informatic') || t.includes('tecnolog') || t.includes('softwar') || t.includes('digital') || t.includes('ciber') || t.includes('sistem')) {
    iconSvg = '<rect x="20" y="26" width="24" height="20" rx="3" fill="none" stroke="#38bdf8" stroke-width="2"/>' +
              '<path d="M25 26v-6a7 7 0 0 1 14 0v6" fill="none" stroke="#d4af37" stroke-width="2"/>' +
              '<circle cx="32" cy="35" r="2.5" fill="#d4af37"/>' +
              '<path d="M32 37.5v4.5" stroke="#d4af37" stroke-width="2"/>' +
              '<path d="M15 36h5M44 36h5M32 14v6" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round"/>';
  } else if (t.includes('administrativ') || t.includes('tributar') || t.includes('impuest') || t.includes('fiscal') || t.includes('aduan') || t.includes('constitucion')) {
    iconSvg = '<path d="M16 48h32M19 44h26M19 23l13-7 13 7" fill="none" stroke="#d4af37" stroke-width="2"/>' +
              '<path d="M23 23v21M32 23v21M41 23v21" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"/>';
  } else if (t.includes('notarial') || t.includes('inmobiliar') || t.includes('propiedad') || t.includes('terren') || t.includes('inmueble') || t.includes('usucapion')) {
    iconSvg = '<path d="M18 46V28l14-11 14 11v18z" fill="none" stroke="#d4af37" stroke-width="2"/>' +
              '<path d="M28 46V35h8v11" fill="none" stroke="#38bdf8" stroke-width="2"/>' +
              '<circle cx="32" cy="27" r="2" fill="#d4af37"/>';
  } else {
    iconSvg = '<path d="M32 16v28M21 23h22M21 23l-4 8a4 4 0 0 0 8 0l-4-8zM43 23l-4 8a4 4 0 0 0 8 0l-4-8zM26 44h12" fill="none" stroke="#d4af37" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
              '<circle cx="32" cy="16" r="2" fill="#d4af37"/>';
  }

  const w = (width === '100%') ? '100%' : `${width}px`;
  const h = (height === '100%') ? '100%' : `${height}px`;

  return `<svg viewBox="0 0 64 64" width="${w}" height="${h}" style="display:block;width:100%;height:100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(titulo || 'Área legal')}">
    <defs>
      <linearGradient id="areaBgGrad_${Math.abs(hashStr(titulo))}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f2546"/>
        <stop offset="60%" stop-color="#07152b"/>
        <stop offset="100%" stop-color="#020813"/>
      </linearGradient>
      <linearGradient id="areaGoldGrad_${Math.abs(hashStr(titulo))}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#d4af37"/>
        <stop offset="100%" stop-color="#c8a24a"/>
      </linearGradient>
    </defs>
    <rect width="64" height="64" rx="10" fill="url(#areaBgGrad_${Math.abs(hashStr(titulo))})"/>
    <rect x="2" y="2" width="60" height="60" rx="8" fill="none" stroke="url(#areaGoldGrad_${Math.abs(hashStr(titulo))})" stroke-width="1" stroke-opacity="0.3"/>
    <circle cx="32" cy="32" r="24" fill="none" stroke="#38bdf8" stroke-width="0.5" stroke-dasharray="2 3" opacity="0.25"/>
    ${iconSvg}
  </svg>`;
}

function hashStr(str) {
  let hash = 0;
  for (let i = 0; i < (str || '').length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export async function renderAreas() {
  loading();
  const { data, error } = await supabase.from('areas_practica').select('*').order('orden', { ascending: true });
  if (error) {
    content().innerHTML = `<div class="card"><div class="card__body"><p class="cell-sub">No se pudieron cargar las áreas. ¿Ya ejecutó <code>db/27_areas_practica.sql</code> en Supabase?<br>Detalle: ${esc(error.message)}</p></div></div>`;
    return;
  }
  _areasCache = data || [];

  content().innerHTML = `
    <div class="toolbar" style="flex-wrap:wrap;gap:8px">
      <button class="btn btn--ghost" id="btnMejorarVacias">
        ✨ Completar áreas con IA (texto e imagen faltante)
      </button>
      <div class="spacer"></div>
      <button class="btn btn--primary" id="btnNuevaArea">${ICON.plus} Nueva área</button>
    </div>
    <div class="card"><div class="card__body" style="padding-bottom:6px">
      <p class="cell-sub">Estas áreas se muestran en el <strong>carrusel interactivo</strong> de la portada y cuentan con su propia <strong>página de especialidad (area.html)</strong> con servicios detallados, pasos del proceso y preguntas frecuentes. Con el <strong>Asistente IA</strong> puede redactar y generar portadas fotográficas corporativas con un solo clic.</p>
    </div></div>
    <div id="areasList"></div>`;

  $('#btnNuevaArea').onclick = () => formArea(null);
  $('#btnMejorarVacias').onclick = mejorarAreasConIa;
  paintAreas();
}

function paintAreas() {
  const cont = $('#areasList');
  if (!cont) return;
  if (!_areasCache.length) {
    cont.innerHTML = `<div class="empty">${ICON.categorias}<p>No hay áreas todavía. Cree la primera con «Nueva área».</p></div>`;
    return;
  }
  cont.innerHTML = _areasCache.map((a, i) => {
    const thumbHtml = a.imagen_url
      ? `<div style="width:64px;height:64px;border-radius:10px;flex-shrink:0;background-size:cover;background-position:center;background-repeat:no-repeat;background-image:url('${esc(a.imagen_url)}');border:1px solid rgba(212,175,55,0.2)"></div>`
      : `<div style="width:64px;height:64px;border-radius:10px;flex-shrink:0;overflow:hidden;border:1px solid rgba(212,175,55,0.25)">${getAreaThemedSvg(a.titulo, 64, 64)}</div>`;

    const slugStr = a.slug || slugify(a.titulo);
    const verUrl = `../area.html?id=${encodeURIComponent(a.id || slugStr)}`;

    return `
    <div class="card" style="margin-bottom:12px"><div class="card__body" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
      ${thumbHtml}
      <div style="flex:1;min-width:200px">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <strong style="font-size:1.05rem">${esc(a.titulo)}</strong>
          <button class="btn btn--ghost btn--sm js-toggle-vis" data-id="${esc(a.id)}" style="padding:2px 8px;font-size:0.75rem;border-radius:12px;${a.activo ? 'color:#22c55e;border-color:rgba(34,197,94,0.3)' : 'color:#94a3b8;border-color:rgba(148,163,184,0.3)'}" title="Haz clic para alternar visibilidad">
            ${a.activo ? '● Visible en web' : '○ Oculta en web'}
          </button>
          <a href="${verUrl}" target="_blank" rel="noopener" class="btn btn--ghost btn--sm" style="padding:2px 8px;font-size:0.75rem;border-radius:12px;color:var(--gold,#d4af37)" title="Ver ficha pública en vivo">
            Ver página ↗
          </a>
        </div>
        <p class="cell-sub" style="margin-top:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.4">
          ${esc(a.descripcion || 'Sin descripción comercial aún (haga clic en Editar o Completar con IA).')}
        </p>
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
    </div></div>`;
  }).join('');

  cont.querySelectorAll('.js-edit').forEach(b => b.onclick = () => formArea(_areasCache.find(x => x.id === b.dataset.id)));
  cont.querySelectorAll('.js-del').forEach(b => b.onclick = () => eliminarArea(b.dataset.id));
  cont.querySelectorAll('.js-up').forEach(b => b.onclick = () => moverArea(Number(b.dataset.i), -1));
  cont.querySelectorAll('.js-down').forEach(b => b.onclick = () => moverArea(Number(b.dataset.i), 1));
  cont.querySelectorAll('.js-toggle-vis').forEach(b => b.onclick = () => toggleVisibilidadArea(b.dataset.id));
}

async function toggleVisibilidadArea(id) {
  const area = _areasCache.find(x => x.id === id);
  if (!area) return;
  const nuevoEstado = !area.activo;
  area.activo = nuevoEstado;
  paintAreas();
  const { error } = await supabase.from('areas_practica').update({ activo: nuevoEstado }).eq('id', id);
  if (error) {
    toast('Error al actualizar estado: ' + error.message, 'error');
    area.activo = !nuevoEstado;
    paintAreas();
  } else {
    toast(`Área «${area.titulo}» ahora está ${nuevoEstado ? 'visible' : 'oculta'} en la web.`, 'success');
  }
}

async function mejorarAreasConIa() {
  const incompletas = _areasCache.filter(a => !a.descripcion || a.descripcion.trim().length < 30 || !a.imagen_url || !a.detalle_json);
  if (!incompletas.length) {
    toast('Todas las áreas cuentan con ficha completa e imagen de portada.', 'success');
    return;
  }

  const btn = $('#btnMejorarVacias');
  if (btn) { btn.disabled = true; btn.textContent = `✨ Procesando ${incompletas.length} áreas con IA...`; }

  let count = 0;
  for (const area of incompletas) {
    try {
      let descripcion = area.descripcion;
      let detalleJson = area.detalle_json;
      let imagenUrl = area.imagen_url;
      const slug = area.slug || slugify(area.titulo);

      // Si falta descripción o detalle, generar con IA
      if (!descripcion || descripcion.trim().length < 30 || !detalleJson) {
        try {
          const ficha = await withTimeout(generarFichaAreaIa(area.titulo), 45000, 'Ficha IA');
          if (ficha) {
            detalleJson = ficha;
            if (!descripcion || descripcion.trim().length < 30) {
              descripcion = ficha.descripcion_corta || descripcion;
            }
          }
        } catch (eFicha) {
          console.warn('Error generando ficha para', area.titulo, eFicha);
        }
      }

      // Si falta imagen, generar con IA y subir
      if (!imagenUrl) {
        try {
          const base64 = await withTimeout(generarImagenIa({ titulo: area.titulo, descripcion: descripcion || '' }), 40000, 'Imagen IA');
          if (base64) {
            const urlSubida = await subirImagenBranding(base64, 'areas');
            imagenUrl = urlSubida || base64;
          }
        } catch (eImg) {
          console.warn('Error generando imagen para', area.titulo, eImg);
        }
      }

      // Guardar en Supabase con tolerancia a columnas inexistentes
      let upd = { descripcion, imagen_url: imagenUrl, detalle_json: detalleJson, slug };
      let { error } = await supabase.from('areas_practica').update(upd).eq('id', area.id);
      if (error && (error.code === '42703' || (error.message || '').includes('column'))) {
        ({ error } = await supabase.from('areas_practica').update({ descripcion, imagen_url: imagenUrl }).eq('id', area.id));
      }

      if (!error) {
        area.descripcion = descripcion;
        area.imagen_url = imagenUrl;
        area.detalle_json = detalleJson;
        area.slug = slug;
        try { localStorage.setItem(`lexfive_area_detalle_${area.id}`, JSON.stringify(detalleJson)); } catch (e) {}
        count++;
        paintAreas();
      }
    } catch (e) {
      console.warn('Error completando area con IA', area.titulo, e);
    }
  }

  if (btn) { btn.disabled = false; btn.textContent = '✨ Completar áreas con IA (texto e imagen faltante)'; }
  toast(`Se completaron ${count} áreas con IA exitosamente.`, 'success');
  paintAreas();
}

function formArea(area) {
  const esNueva = !area;
  const imgActual = area ? (area.imagen_url || '') : '';
  _areaImgTmp = imgActual;
  _areaDetalleTmp = area ? (area.detalle_json || null) : null;
  _areaSlugTmp = area ? (area.slug || '') : '';

  const prevThemedSvg = getAreaThemedSvg(area ? area.titulo : 'General', 140, 90);

  const body = `
    <!-- Asistente TODO con IA -->
    <div style="background:var(--bg-soft,rgba(0,0,0,0.04));padding:12px;border-radius:10px;margin-bottom:14px;border:1px solid rgba(212,175,55,0.3);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
      <div>
        <strong style="color:var(--gold,#d4af37);font-size:0.95rem">Asistente Integral LexFive IA</strong>
        <p class="cell-sub" style="margin:2px 0 0;font-size:0.8rem">Escriba el título y genere resumen, ficha procesal e imagen con un solo clic.</p>
      </div>
      <button type="button" class="btn btn--primary btn--sm" id="btnIaGenerarTodo" style="background:linear-gradient(135deg,#c8a24a,#d4af37);color:#0b192c;font-weight:700">
        ✨ Generar TODO con IA (texto + ficha + imagen)
      </button>
    </div>

    <div class="field">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <label style="margin:0;font-weight:600">Título del Área</label>
        <button type="button" class="btn btn--ghost btn--sm" id="btnIaRedactarArea" style="font-size:0.8rem;padding:3px 8px;color:var(--gold,#d4af37);border-color:rgba(212,175,55,0.3)">
          ✨ Redactar / Mejorar con IA
        </button>
      </div>
      <input type="text" id="areaTitulo" value="${esc(area ? area.titulo : '')}" placeholder="Ej: Derecho Laboral o Derecho e Ingeniería de Sistemas">
    </div>

    <div class="field">
      <label style="font-weight:600">Descripción Comercial (tarjeta de inicio)</label>
      <textarea id="areaDesc" rows="3" placeholder="Resumen claro de la especialidad y casos frecuentes que resuelven...">${esc(area ? area.descripcion : '')}</textarea>
    </div>

    <div class="field">
      <label style="font-weight:600">Imagen de Portada (fotografía corporativa)</label>
      <div id="areaImgPrev" style="margin-bottom:8px">
        ${imgActual ? `<img src="${esc(imgActual)}" alt="" style="max-width:100%;max-height:160px;border-radius:10px;display:block">` : `<div style="max-width:240px;border-radius:10px;overflow:hidden">${prevThemedSvg}</div><p class="cell-sub" style="margin-top:6px">Sin imagen subida (se usará este arte vectorial en dorado y azul marino o genere una con IA).</p>`}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button type="button" class="btn btn--ghost btn--sm" id="areaIaImg" style="color:var(--gold,#d4af37);border-color:rgba(212,175,55,0.3)">
          ✨ Generar / Cambiar imagen con IA
        </button>
        <button type="button" class="btn btn--ghost btn--sm" id="areaSubir">Subir manual</button>
        <button type="button" class="btn btn--ghost btn--sm" id="areaQuitar" ${imgActual ? '' : 'hidden'}>Quitar imagen</button>
        <input type="file" id="areaFile" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" hidden>
      </div>
    </div>

    <!-- Ficha Completa Detallada (Servicios y FAQs) -->
    <details id="areaFichaDetalles" style="margin-top:14px;background:var(--bg-soft,rgba(0,0,0,0.02));border:1px solid var(--line,rgba(212,175,55,0.2));border-radius:10px;padding:10px 14px" ${_areaDetalleTmp ? 'open' : ''}>
      <summary style="font-weight:600;cursor:pointer;color:var(--gold,#d4af37)">
        📄 Ficha Procesal Completa para la web (area.html)
      </summary>
      <div id="areaFichaContenido" style="margin-top:10px">
        ${renderFichaPreviewHtml(_areaDetalleTmp)}
      </div>
    </details>

    <label class="chk" style="margin-top:12px;font-weight:600;display:inline-flex;align-items:center;cursor:pointer">
      <input type="checkbox" id="areaActivo" ${(!area || area.activo) ? 'checked' : ''}> Mostrar en el carrusel de la web
    </label>`;

  openModal(esNueva ? 'Nueva área de práctica' : 'Editar área de práctica', body, [
    { label: 'Cancelar', class: 'btn--ghost', onClick: closeModal },
    { label: 'Guardar', class: 'btn--primary', id: 'areaGuardar', onClick: () => guardarArea(area) }
  ]);

  // Botón 1: Generar TODO con IA
  const btnTodo = $('#btnIaGenerarTodo');
  if (btnTodo) {
    btnTodo.onclick = async () => {
      const titulo = ($('#areaTitulo')?.value || '').trim();
      if (!titulo) {
        toast('Escriba primero el título del área (ej. Derecho Laboral).', 'error');
        $('#areaTitulo')?.focus();
        return;
      }
      btnTodo.disabled = true;
      const prevText = btnTodo.textContent;
      btnTodo.textContent = '✨ Generando ficha e imagen...';

      try {
        toast('Generando ficha legal completa con IA...', 'info');
        const ficha = await withTimeout(generarFichaAreaIa(titulo), 45000, 'Ficha IA');
        if (ficha) {
          _areaDetalleTmp = ficha;
          _areaSlugTmp = ficha.slug || slugify(titulo);
          if (ficha.descripcion_corta) {
            $('#areaDesc').value = ficha.descripcion_corta;
          }
          const contFicha = $('#areaFichaContenido');
          if (contFicha) contFicha.innerHTML = renderFichaPreviewHtml(ficha);
          const det = $('#areaFichaDetalles');
          if (det) det.open = true;
        }

        toast('Generando portada fotográfica editorial con IA...', 'info');
        const base64 = await withTimeout(generarImagenIa({ titulo, descripcion: $('#areaDesc')?.value || '' }), 40000, 'Imagen IA');
        if (base64) {
          toast('Subiendo imagen a Supabase Storage...', 'info');
          let src = null;
          try { src = await subirImagenBranding(base64, 'areas'); } catch (e) {}
          if (!src) src = base64;
          _areaImgTmp = src;
          const prev = $('#areaImgPrev');
          if (prev) prev.innerHTML = `<img src="${esc(src)}" alt="" style="max-width:100%;max-height:160px;border-radius:10px;display:block">`;
          const q = $('#areaQuitar'); if (q) q.hidden = false;
        }

        toast('¡Área completada con IA! Revise y pulse Guardar.', 'success');
      } catch (err) {
        toast('Error al generar todo con IA: ' + (err.message || 'Intente nuevamente'), 'error');
      } finally {
        btnTodo.disabled = false;
        btnTodo.textContent = prevText;
      }
    };
  }

  // Botón 2: Generar / Cambiar imagen con IA
  const btnImgIa = $('#areaIaImg');
  if (btnImgIa) {
    btnImgIa.onclick = async () => {
      const titulo = ($('#areaTitulo')?.value || '').trim();
      if (!titulo) {
        toast('Escriba un título para guiar a la IA en la imagen.', 'error');
        $('#areaTitulo')?.focus();
        return;
      }
      btnImgIa.disabled = true;
      const prevText = btnImgIa.textContent;
      btnImgIa.textContent = '✨ Generando imagen...';
      try {
        toast('Generando imagen editorial con IA...', 'info');
        const base64 = await withTimeout(generarImagenIa({ titulo, descripcion: $('#areaDesc')?.value || '' }), 40000, 'Imagen IA');
        if (base64) {
          toast('Subiendo imagen...', 'info');
          let src = null;
          try { src = await subirImagenBranding(base64, 'areas'); } catch (e) {}
          if (!src) src = base64;
          _areaImgTmp = src;
          const prev = $('#areaImgPrev');
          if (prev) prev.innerHTML = `<img src="${esc(src)}" alt="" style="max-width:100%;max-height:160px;border-radius:10px;display:block">`;
          const q = $('#areaQuitar'); if (q) q.hidden = false;
          toast('Imagen generada y subida con éxito.', 'success');
        }
      } catch (err) {
        toast('Error generando imagen: ' + (err.message || 'Intente nuevamente'), 'error');
      } finally {
        btnImgIa.disabled = false;
        btnImgIa.textContent = prevText;
      }
    };
  }

  // Botón 3: Redactar / Mejorar descripción con IA
  const btnIa = $('#btnIaRedactarArea');
  if (btnIa) {
    btnIa.onclick = async () => {
      const titulo = ($('#areaTitulo')?.value || '').trim();
      if (!titulo) {
        toast('Escriba primero el título del área.', 'error');
        $('#areaTitulo')?.focus();
        return;
      }
      btnIa.disabled = true;
      const prevText = btnIa.textContent;
      btnIa.textContent = '✨ Redactando con IA...';
      try {
        const prompt = `Redacta una descripción comercial profesional, clara y persuasiva para el área de "${titulo}" en el bufete LexFive (Bolivia). Incluye un párrafo conciso de 2 líneas sobre la tranquilidad del cliente y menciona 3 o 4 casos o trámites frecuentes atendidos en esa especialidad en Bolivia. Máx 35 palabras. Redacta directamente sin saludos.`;
        const res = await withTimeout(generateContent(prompt, 'Eres un redactor jurídico experto de Bolivia para LexFive.'), 35000, 'IA');
        if (res && res.trim()) {
          $('#areaDesc').value = res.trim();
          toast('Descripción generada con IA.', 'success');
        }
      } catch (err) {
        toast('Error al generar con IA: ' + (err.message || 'Intente nuevamente'), 'error');
      } finally {
        btnIa.disabled = false;
        btnIa.textContent = prevText;
      }
    };
  }

  // Previsualización dinámica de SVG al cambiar el título si no hay imagen propia
  const titInput = $('#areaTitulo');
  if (titInput) {
    titInput.oninput = () => {
      if (!_areaImgTmp) {
        const prev = $('#areaImgPrev');
        if (prev) {
          prev.innerHTML = `<div style="max-width:240px;border-radius:10px;overflow:hidden">${getAreaThemedSvg(titInput.value || 'General', 140, 90)}</div><p class="cell-sub" style="margin-top:6px">Arte temático en dorado y azul marino.</p>`;
        }
      }
    };
  }

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
      if (prev) prev.innerHTML = `<img src="${esc(src)}" alt="" style="max-width:100%;max-height:160px;border-radius:10px;display:block">`;
      const q = $('#areaQuitar'); if (q) q.hidden = false;
      toast('Imagen lista. No olvide Guardar.', 'success');
    });
    reader.onerror = () => toast('No se pudo leer el archivo.', 'error');
    reader.readAsDataURL(f);
  };

  const quitar = $('#areaQuitar');
  if (quitar) quitar.onclick = () => {
    _areaImgTmp = '';
    const prev = $('#areaImgPrev');
    if (prev) {
      const curTit = $('#areaTitulo')?.value || 'General';
      prev.innerHTML = `<div style="max-width:240px;border-radius:10px;overflow:hidden">${getAreaThemedSvg(curTit, 140, 90)}</div><p class="cell-sub" style="margin-top:6px">Sin imagen (se usará el arte vectorial temático).</p>`;
    }
    quitar.hidden = true;
  };
}

function renderFichaPreviewHtml(ficha) {
  if (!ficha) {
    return '<p class="cell-sub" style="margin:0">Aún no se ha generado la ficha procesal detallada. Al pulsar «Generar TODO con IA», se redactarán automáticamente los servicios, pasos procesales y preguntas frecuentes de Bolivia.</p>';
  }
  const servicios = (ficha.servicios || []).map(s => `<li><strong>${esc(s.titulo)}:</strong> ${esc(s.descripcion)}</li>`).join('');
  const faqs = (ficha.faqs || []).map(f => `<li><strong>${esc(f.pregunta)}</strong><br><span class="cell-sub">${esc(f.respuesta)}</span></li>`).join('');

  return `
    <div style="font-size:0.85rem;line-height:1.5">
      <p style="margin:0 0 6px"><strong>Subtítulo:</strong> ${esc(ficha.subtitulo || 'Asesoramiento y defensa integral.')}</p>
      <p style="margin:0 0 4px"><strong>Servicios y trámites (${(ficha.servicios || []).length}):</strong></p>
      <ul style="margin:0 0 8px;padding-left:18px">${servicios || '<li>General</li>'}</ul>
      <p style="margin:0 0 4px"><strong>Preguntas frecuentes (${(ficha.faqs || []).length}):</strong></p>
      <ul style="margin:0;padding-left:18px">${faqs || '<li>General</li>'}</ul>
    </div>`;
}

async function guardarArea(area) {
  const titulo = ($('#areaTitulo').value || '').trim();
  if (!titulo) { toast('Escriba un título.', 'error'); return; }
  const descripcion = ($('#areaDesc').value || '').trim();
  const activo = $('#areaActivo').checked;
  const slug = _areaSlugTmp || (area && area.slug) || slugify(titulo);
  const detalleJson = _areaDetalleTmp || (area ? area.detalle_json : null);

  const btn = $('#areaGuardar'); if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }

  let error = null;
  // Intento 1: Guardar con detalle_json y slug
  const fullPayload = {
    titulo,
    descripcion,
    imagen_url: _areaImgTmp || null,
    activo,
    detalle_json: detalleJson,
    slug: slug
  };

  if (area) {
    ({ error } = await supabase.from('areas_practica').update(fullPayload).eq('id', area.id));
  } else {
    const orden = _areasCache.length ? Math.max(..._areasCache.map(a => a.orden || 0)) + 1 : 1;
    fullPayload.orden = orden;
    ({ error } = await supabase.from('areas_practica').insert(fullPayload));
  }

  // Tolerancia total a columna inexistente (42703) si aún no se corre db/33_areas_detalle_completo.sql
  if (error && (error.code === '42703' || (error.message || '').includes('column') || (error.message || '').includes('detalle_json') || (error.message || '').includes('slug'))) {
    console.warn('Columna detalle_json o slug no existe en Supabase aún. Guardando fallback compatible:', error.message);
    const fallbackPayload = {
      titulo,
      descripcion,
      imagen_url: _areaImgTmp || null,
      activo
    };
    if (area) {
      ({ error } = await supabase.from('areas_practica').update(fallbackPayload).eq('id', area.id));
    } else {
      fallbackPayload.orden = _areasCache.length ? Math.max(..._areasCache.map(a => a.orden || 0)) + 1 : 1;
      ({ error } = await supabase.from('areas_practica').insert(fallbackPayload));
    }
  }

  if (error) {
    toast('Error: ' + error.message, 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Guardar'; }
    return;
  }

  // Guardar copia local de detalleJson como respaldo
  if (detalleJson) {
    try {
      const idKey = (area && area.id) || slug;
      localStorage.setItem(`lexfive_area_detalle_${idKey}`, JSON.stringify(detalleJson));
    } catch (e) {}
  }

  closeModal();
  toast(area ? 'Área actualizada con éxito.' : 'Área creada con éxito.', 'success');
  renderAreas();
}

function eliminarArea(id) {
  const area = _areasCache.find(x => x.id === id);
  if (!area) return;
  openModal('Eliminar área', `<p>¿Eliminar «${esc(area.titulo)}»? Esta acción no se puede deshacer.</p>`, [
    { label: 'Cancelar', class: 'btn--ghost', onClick: closeModal },
    {
      label: 'Eliminar', class: 'btn--danger', onClick: async () => {
        const { error } = await supabase.from('areas_practica').delete().eq('id', id);
        if (error) { toast('Error: ' + error.message, 'error'); return; }
        closeModal(); toast('Área eliminada.', 'success'); renderAreas();
      }
    }
  ]);
}

async function moverArea(indiceActual, direccion) {
  const indiceDestino = indiceActual + direccion;
  if (indiceDestino < 0 || indiceDestino >= _areasCache.length) return;
  const a1 = _areasCache[indiceActual];
  const a2 = _areasCache[indiceDestino];
  const orden1 = a1.orden || (indiceActual + 1);
  const orden2 = a2.orden || (indiceDestino + 1);
  const nuevoOrden1 = orden1 === orden2 ? orden2 + direccion : orden2;
  const nuevoOrden2 = orden1;
  a1.orden = nuevoOrden1;
  a2.orden = nuevoOrden2;
  _areasCache.sort((x, y) => (x.orden || 0) - (y.orden || 0));
  paintAreas();
  await Promise.all([
    supabase.from('areas_practica').update({ orden: nuevoOrden1 }).eq('id', a1.id),
    supabase.from('areas_practica').update({ orden: nuevoOrden2 }).eq('id', a2.id)
  ]);
  renderAreas();
}
