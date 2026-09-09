// ============================================================
//  LexFive — Registro de HORAS de un proceso (time tracking)
//  Modal para registrar y listar horas trabajadas en un proceso.
//  Extraído de app.js (paso 18 del split).
// ============================================================
import { supabase } from './supabase.js';
import { logAccion } from './auth.js';
import { state } from './state.js';
import { esc, fmtDate, hoyISO } from './util.js';
import { ICON } from './icons.js';
import { $ } from './dom.js';
import { toast, openModal, closeModal } from './ui.js';
import { profName } from './comunes.js';

function fmtDuracion(min) {
  const m = Math.max(0, Number(min || 0));
  const h = Math.floor(m / 60), r = m % 60;
  if (!m) return '0 min';
  return (h ? h + ' h ' : '') + (r ? r + ' min' : '').trim();
}

export async function openHoras(proc) {
  const pintar = async () => {
    const { data, error } = await supabase.from('registro_horas').select('*').eq('proceso_id', proc.id).order('fecha', { ascending: false });
    // Si la tabla aún no existe (no se ejecutó db/21_registro_horas.sql), avisar con claridad.
    if (error && /registro_horas/.test(error.message) && /exist|relation/i.test(error.message)) {
      openModal('Registro de horas', `<p class="cell-sub">Esta función necesita una tabla que aún no está creada en la base de datos.</p><p class="cell-sub" style="margin-top:8px">Ejecute el script <strong>db/21_registro_horas.sql</strong> en el SQL Editor de Supabase y vuelva a intentarlo.</p>`, [{ label: 'Cerrar', class: 'btn--primary', onClick: closeModal }]);
      return;
    }
    const regs = data || [];
    const totalMin = regs.reduce((a, b) => a + Number(b.minutos || 0), 0);
    const fila = r => `<div class="fin-row" data-id="${r.id}"><div><div class="cell-strong">${fmtDuracion(r.minutos)}${r.descripcion ? ' · ' + esc(r.descripcion) : ''}</div><div class="cell-sub">${fmtDate(r.fecha)} · ${esc(profName(r.created_by))}</div></div><div class="fin-row__right"><button class="btn btn--danger btn--sm js-delhora" data-id="${r.id}">✕</button></div></div>`;
    const body = `
      <div class="fin-summary">
        <div><span>Total de horas</span><strong>${fmtDuracion(totalMin)}</strong></div>
        <div><span>Registros</span><strong>${regs.length}</strong></div>
      </div>
      <h4 class="section-title">Horas registradas</h4>
      <div class="fin-list">${regs.length ? regs.map(fila).join('') : '<p class="cell-sub">Aún no hay horas registradas en este proceso.</p>'}</div>
      <div class="card" style="margin-top:10px"><div class="card__body"><div class="field-row">
        <div class="field"><label>Horas *</label><input id="hr_horas" type="number" min="0" step="0.25" placeholder="Ej: 1.5"></div>
        <div class="field"><label>Fecha</label><input id="hr_fecha" type="date" value="${hoyISO()}"></div>
      </div>
      <div class="field"><label>Descripción (opcional)</label><input id="hr_desc" placeholder="Ej: Redacción de memorial, audiencia, reunión..."></div>
      <button class="btn btn--navy" id="hr_add">${ICON.plus} Registrar horas</button></div></div>`;
    openModal('Registro de horas · ' + proc.caratula, body, [{ label: 'Cerrar', class: 'btn--primary', onClick: closeModal }], true);

    $('#hr_add').onclick = async () => {
      const horas = parseFloat($('#hr_horas').value);
      if (isNaN(horas) || horas <= 0) { toast('Indique las horas trabajadas (ej: 1.5).', 'error'); return; }
      const minutos = Math.round(horas * 60);
      $('#hr_add').disabled = true;
      const { error: insErr } = await supabase.from('registro_horas').insert({ proceso_id: proc.id, minutos, descripcion: $('#hr_desc').value.trim() || null, fecha: $('#hr_fecha').value || hoyISO(), created_by: state.profile.id });
      if (insErr) { toast('Error: ' + insErr.message, 'error'); $('#hr_add').disabled = false; return; }
      await logAccion('crear', 'registro_horas', proc.id, minutos + ' min');
      toast('Horas registradas.', 'success'); pintar();
    };
    document.querySelectorAll('.js-delhora').forEach(b => b.onclick = async () => {
      if (!confirm('¿Eliminar este registro de horas?')) return;
      await supabase.from('registro_horas').delete().eq('id', b.dataset.id); toast('Eliminado.', 'success'); pintar();
    });
  };
  await pintar();
}
