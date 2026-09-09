// ============================================================
//  LexFive — Autoguardado de borradores de formularios
//  Guarda en el navegador (por usuario) lo que se está escribiendo
//  para no perderlo si se cierra la sesión o el navegador.
//  Extraído de app.js (paso 9 del split).
// ============================================================
import { state } from './state.js';
import { $ } from './dom.js';
import { ICON } from './icons.js';
import { flashAutosave, toast } from './ui.js';

export const Draft = {
  key(name) { return `lexfive_draft_${state.profile ? state.profile.id : 'anon'}_${name}`; },
  save(name, data) { try { localStorage.setItem(this.key(name), JSON.stringify({ data, ts: Date.now() })); } catch (e) {} },
  load(name) { try { const r = localStorage.getItem(this.key(name)); return r ? JSON.parse(r) : null; } catch (e) { return null; } },
  clear(name) { try { localStorage.removeItem(this.key(name)); } catch (e) {} }
};

// Texto amistoso de "hace cuánto" se guardó el borrador
function draftAgo(ts) {
  if (!ts) return 'hace un momento';
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return 'hace menos de un minuto';
  if (min < 60) return `hace ${min} minuto${min === 1 ? '' : 's'}`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} hora${h === 1 ? '' : 's'}`;
  const d = Math.floor(h / 24);
  return `hace ${d} día${d === 1 ? '' : 's'}`;
}

// Conecta el autoguardado de un formulario: serializa los campos indicados
// (y grupos de checkboxes) y los guarda en cada cambio.
export function wireDraft(draftName, fieldIds, checkboxClasses = []) {
  const collect = () => {
    const o = {};
    fieldIds.forEach(id => { const el = document.getElementById(id); if (el) o[id] = el.value; });
    checkboxClasses.forEach(cls => {
      o['__chk_' + cls] = Array.from(document.querySelectorAll('.' + cls + ':checked')).map(c => c.value);
    });
    return o;
  };
  const apply = (o) => {
    fieldIds.forEach(id => { const el = document.getElementById(id); if (el && o[id] != null) el.value = o[id]; });
    checkboxClasses.forEach(cls => {
      const vals = o['__chk_' + cls] || [];
      document.querySelectorAll('.' + cls).forEach(c => { c.checked = vals.includes(c.value); });
    });
  };
  const onChange = () => { Draft.save(draftName, collect()); flashAutosave(); };
  fieldIds.forEach(id => { const el = document.getElementById(id); if (el) { el.addEventListener('input', onChange); el.addEventListener('change', onChange); } });
  checkboxClasses.forEach(cls => document.querySelectorAll('.' + cls).forEach(c => c.addEventListener('change', onChange)));
  return { collect, apply };
}

// Si hay un borrador distinto a lo que ya muestra el formulario, ofrece
// recuperarlo con un aviso en la parte superior del modal.
export function maybeOfferDraft(draftName, draft) {
  const saved = Draft.load(draftName);
  if (!saved || !saved.data) return;
  if (JSON.stringify(saved.data) === JSON.stringify(draft.collect())) { Draft.clear(draftName); return; }
  const body = $('#modalBody');
  const banner = document.createElement('div');
  banner.className = 'draft-banner';
  banner.innerHTML = `<span>${ICON.alerta || ''} Se guardó automáticamente lo que estaba escribiendo (${draftAgo(saved.ts)}). ¿Desea recuperarlo?</span>
    <span class="draft-banner__actions">
      <button class="btn btn--navy btn--sm" id="draftRestore">Recuperar</button>
      <button class="btn btn--ghost btn--sm" id="draftDiscard">Descartar</button>
    </span>`;
  body.insertBefore(banner, body.firstChild);
  $('#draftRestore').onclick = () => { draft.apply(saved.data); banner.remove(); Draft.save(draftName, draft.collect()); toast('Recuperamos lo que estaba escribiendo.', 'success'); };
  $('#draftDiscard').onclick = () => { Draft.clear(draftName); banner.remove(); };
}
