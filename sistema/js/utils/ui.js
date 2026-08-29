// ============================================================
//  LexFive — Helpers de interfaz reutilizables
//  Paginación, gráfico de barras, avisos (toast), autoguardado,
//  ayuda en pantalla (tooltips), pantalla de carga y modal.
//  Se separan de app.js para aligerarlo.
// ============================================================
import { $, content } from '@/utils/dom.js';
import { esc } from '@/utils/util.js';

// ---- Paginación reutilizable para listas largas (cliente) ----
export const PAGE_SIZE = 25;

// Calcula la "rebanada" visible y los datos de la página actual.
export function paginar(rows, page, perPage = PAGE_SIZE) {
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const p = Math.min(Math.max(1, page || 1), pages);
  const from = (p - 1) * perPage;
  return { slice: rows.slice(from, from + perPage), page: p, pages, total, from };
}

// HTML de la barra de paginación (no se muestra si todo cabe en una página).
export function pagerHTML(info) {
  if (info.total === 0) return '';
  if (info.pages <= 1) return `<div class="pager"><span class="pager__info">${info.total} registro${info.total === 1 ? '' : 's'}</span></div>`;
  const desde = info.from + 1, hasta = info.from + info.slice.length;
  return `<div class="pager">
    <span class="pager__info">${desde}–${hasta} de ${info.total}</span>
    <div class="pager__btns">
      <button class="btn btn--ghost btn--sm" data-pg="prev" ${info.page <= 1 ? 'disabled' : ''}>&larr; Anterior</button>
      <span class="pager__page">Pág. ${info.page} / ${info.pages}</span>
      <button class="btn btn--ghost btn--sm" data-pg="next" ${info.page >= info.pages ? 'disabled' : ''}>Siguiente &rarr;</button>
    </div>
  </div>`;
}

// Conecta los botones de la paginación dentro de un contenedor.
export function wirePager(container, info, onGo) {
  if (!container) return;
  container.querySelectorAll('[data-pg]').forEach(b => b.onclick = () => {
    if (b.disabled) return;
    onGo(b.dataset.pg === 'next' ? info.page + 1 : info.page - 1);
  });
}

// Gráfico de barras horizontal simple (sin librerías).
export function barChart(items) {
  const datos = (items || []).filter(i => i.value > 0);
  if (!datos.length) return '<p class="cell-sub" style="padding:6px 0">Sin datos para mostrar.</p>';
  const max = Math.max.apply(null, datos.map(i => i.value));
  return '<div class="bars">' + datos.map(i => `
    <div class="bar-row">
      <div class="bar-row__label" title="${esc(i.label)}">${esc(i.label)}</div>
      <div class="bar-row__track"><div class="bar-row__fill ${i.cls || ''}" style="width:${Math.max(6, Math.round(i.value / max * 100))}%"></div></div>
      <div class="bar-row__val">${i.value}</div>
    </div>`).join('') + '</div>';
}

// Aviso flotante breve (abajo). type: '', 'success', 'error'.
export function toast(msg, type = '') {
  const t = $('#toast');
  t.textContent = msg; t.className = type; void t.offsetWidth; t.classList.add('show', type);
  setTimeout(() => t.classList.remove('show'), 3200);
}

// Indicador discreto de "borrador guardado" para los formularios con
// autoguardado, para tranquilidad del usuario en textos largos.
let _autosaveTimer = null;
export function flashAutosave() {
  let el = document.getElementById('autosaveTip');
  if (!el) {
    el = document.createElement('div');
    el.id = 'autosaveTip';
    el.className = 'autosave-tip';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.textContent = '\u2713 Borrador guardado';
    document.body.appendChild(el);
  }
  el.classList.add('show');
  clearTimeout(_autosaveTimer);
  _autosaveTimer = setTimeout(() => el.classList.remove('show'), 1500);
}

// ============================================================
//  AYUDA EN PANTALLA (tooltips)
//  - tip('texto'): genera un ícono "?" con ayuda al pasar el mouse.
//  - hint('texto'): añade la ayuda a un elemento existente (atributo).
//  Un único motor global muestra el globo flotante para cualquier
//  elemento con [data-tip], incluso los generados dinámicamente.
// ============================================================
export function tip(text) {
  return ` <span class="help-tip" data-tip="${esc(text)}" tabindex="0" aria-label="Ayuda: ${esc(text)}">?</span>`;
}
export function hint(text) {
  return ` data-tip="${esc(text)}" `;
}

export function initTooltipEngine() {
  if (document.getElementById('tipBubble')) return;
  const bubble = document.createElement('div');
  bubble.id = 'tipBubble';
  bubble.className = 'tip-bubble';
  document.body.appendChild(bubble);

  let current = null;
  function show(el) {
    const text = el.getAttribute('data-tip');
    if (!text) return;
    current = el;
    bubble.textContent = text;
    bubble.classList.add('show');
    position(el);
  }
  function position(el) {
    const r = el.getBoundingClientRect();
    bubble.style.maxWidth = Math.min(300, window.innerWidth - 24) + 'px';
    bubble.style.left = '0px'; bubble.style.top = '0px';
    const bw = bubble.offsetWidth, bh = bubble.offsetHeight;
    let left = r.left + r.width / 2 - bw / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - bw - 12));
    let top = r.top - bh - 10;            // arriba por defecto
    if (top < 8) top = r.bottom + 10;      // si no cabe, abajo
    bubble.style.left = left + 'px';
    bubble.style.top = top + 'px';
  }
  function hide() { current = null; bubble.classList.remove('show'); }

  // Delegación: funciona con elementos creados dinámicamente
  document.addEventListener('mouseover', (e) => {
    const el = e.target.closest('[data-tip]');
    if (el && el !== current) show(el);
  });
  document.addEventListener('mouseout', (e) => {
    const el = e.target.closest('[data-tip]');
    if (el && el === current && !el.contains(e.relatedTarget)) hide();
  });
  // Accesibilidad: teclado y toque
  document.addEventListener('focusin', (e) => { const el = e.target.closest('[data-tip]'); if (el) show(el); });
  document.addEventListener('focusout', hide);
  document.addEventListener('click', (e) => {
    const el = e.target.closest('.help-tip');
    if (el) { e.stopPropagation(); (current === el) ? hide() : show(el); }
    else if (!e.target.closest('#tipBubble')) hide();
  });
  window.addEventListener('scroll', () => { if (current) position(current); }, true);
}

// Pantalla de carga en el contenedor principal.
export function loading() { content().innerHTML = '<div class="loading"><div class="spinner"></div>Cargando...</div>'; }

// ---- Modal reutilizable ----
export function openModal(title, bodyHTML, buttons = [], wide = false) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = bodyHTML;
  $('#modal').classList.toggle('wide', !!wide);
  const foot = $('#modalFoot');
  foot.innerHTML = '';
  buttons.forEach(b => {
    const btn = document.createElement('button');
    btn.className = 'btn ' + (b.class || 'btn--ghost');
    btn.textContent = b.label;
    btn.onclick = b.onClick;
    if (b.id) btn.id = b.id;
    foot.appendChild(btn);
  });
  $('#modalOverlay').classList.add('open');
  // Accesibilidad: llevar el foco al modal para teclado y lectores de pantalla.
  try {
    const m = $('#modal');
    const focusable = m.querySelector('input, select, textarea, button:not(.modal__close)') || $('#modalClose');
    if (focusable) setTimeout(() => focusable.focus(), 50);
  } catch (e) {}
}
export function closeModal() { $('#modalOverlay').classList.remove('open'); }
