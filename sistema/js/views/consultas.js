// ============================================================
//  LexFive — Vista CONSULTAS (bandeja del formulario de contacto)
//  Lista, detalle y cambio de estado de las consultas recibidas
//  desde la web pública. Extraído de app.js (paso 7 del split).
// ============================================================
import { supabase } from '@/api/supabase.js';
import { logAccion } from '@/api/auth.js';
import { state } from '@/utils/state.js';
import { esc, fmtDateTime } from '@/utils/util.js';
import { ICON } from '@/utils/icons.js';
import { $, content } from '@/utils/dom.js';
import { loading, toast, openModal, closeModal, hint, paginar, pagerHTML, wirePager } from '@/utils/ui.js';

// Nombre completo de quien envió la consulta (o "—").
export function consultaNombre(c) {
  return [c.nombre, c.apellido].filter(Boolean).join(' ') || '—';
}

function consultaEstadoBadge(estado) {
  const map = {
    nueva: '<span class="badge badge-borrador">Nueva</span>',
    atendida: '<span class="badge badge-publicado">Atendida</span>',
    archivada: '<span class="badge badge-off">Archivada</span>'
  };
  return map[estado] || `<span class="badge">${esc(estado || '—')}</span>`;
}

// Construye un enlace de WhatsApp a partir de un teléfono (añade 591 si hace falta)
function waLinkTel(tel, texto) {
  const digits = (tel || '').replace(/\D/g, '');
  if (!digits) return null;
  const full = digits.length <= 8 ? '591' + digits : digits;
  return `https://wa.me/${full}${texto ? '?text=' + encodeURIComponent(texto) : ''}`;
}

export async function renderConsultas() {
  loading();
  const { data, error } = await supabase.from('consultas').select('*').order('created_at', { ascending: false });
  if (error) {
    content().innerHTML = `<div class="card"><div class="card__body"><div class="empty">${ICON.consultas}
      <p>No se pudo cargar la bandeja de consultas.<br>Verifique que ejecutó el script <strong>db/06_consultas.sql</strong> en Supabase.</p></div></div></div>`;
    return;
  }
  const list = data || [];
  const nuevas = list.filter(c => c.estado === 'nueva').length;
  content().innerHTML = `
    <div class="toolbar">
      <input type="search" id="qCons" placeholder="Buscar por nombre, correo, mensaje..." ${hint('Busque una consulta por el nombre de la persona, su correo o el contenido del mensaje.')}>
      <select id="fEstadoCons" ${hint('Filtre por estado: Nuevas (sin atender), Atendidas (ya respondidas) o Archivadas.')}>
        <option value="">Todos los estados</option>
        <option value="nueva">Nuevas (${nuevas})</option>
        <option value="atendida">Atendidas</option>
        <option value="archivada">Archivadas</option>
      </select>
      <div class="spacer"></div>
    </div>
    <div class="card"><div class="card__body--flush"><div id="consTable"></div></div></div>`;

  let page = 1;
  function paint() {
    const q = ($('#qCons').value || '').toLowerCase();
    const fe = $('#fEstadoCons').value;
    const rows = list.filter(c =>
      (!fe || c.estado === fe) &&
      (!q || [c.nombre, c.apellido, c.email, c.telefono, c.area, c.mensaje].some(v => (v || '').toLowerCase().includes(q))));
    const info = paginar(rows, page);
    $('#consTable').innerHTML = rows.length ? `<div class="table-wrap"><table class="data">
      <thead><tr><th>Fecha</th><th>Nombre</th><th>Contacto</th><th>Área</th><th>Estado</th></tr></thead>
      <tbody>${info.slice.map(c => `
        <tr data-id="${c.id}">
          <td>${fmtDateTime(c.created_at)}</td>
          <td class="cell-strong">${esc(consultaNombre(c))}<div class="cell-sub">${esc((c.mensaje || '').slice(0, 60))}${(c.mensaje || '').length > 60 ? '…' : ''}</div></td>
          <td>${esc(c.email || c.telefono || '—')}</td>
          <td>${c.area ? `<span class="badge badge-mat">${esc(c.area)}</span>` : '—'}</td>
          <td>${consultaEstadoBadge(c.estado)}</td>
        </tr>`).join('')}</tbody></table></div>${pagerHTML(info)}`
      : `<div class="empty">${ICON.consultas}<p>No hay consultas que coincidan.<br>Las consultas enviadas desde el formulario de contacto de la web aparecerán aquí.</p></div>`;
    $('#consTable').querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => {
      const c = list.find(x => x.id === tr.dataset.id); openConsultaDetail(c);
    });
    wirePager($('#consTable'), info, (n) => { page = n; paint(); });
  }
  paint();
  const rePaintCons = () => { page = 1; paint(); };
  $('#qCons').oninput = rePaintCons;
  $('#fEstadoCons').onchange = rePaintCons;
}

export function openConsultaDetail(c) {
  const wa = waLinkTel(c.telefono, `Hola ${c.nombre || ''}, le escribimos de LexFive en respuesta a su consulta.`);
  const mailHref = c.email ? `mailto:${esc(c.email)}?subject=${encodeURIComponent('Su consulta a LexFive')}` : null;
  const body = `
    <div class="detail-grid">
      <div class="detail-item"><label>Nombre</label><span>${esc(consultaNombre(c))}</span></div>
      <div class="detail-item"><label>Estado</label><span>${consultaEstadoBadge(c.estado)}</span></div>
      <div class="detail-item"><label>Correo</label><span>${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '—'}</span></div>
      <div class="detail-item"><label>Teléfono</label><span>${esc(c.telefono || '—')}</span></div>
      <div class="detail-item"><label>Área de interés</label><span>${esc(c.area || '—')}</span></div>
      <div class="detail-item"><label>Recibida</label><span>${fmtDateTime(c.created_at)}</span></div>
    </div>
    <div class="detail-item" style="margin-top:14px"><label>Mensaje</label><span style="white-space:pre-wrap">${esc(c.mensaje || '')}</span></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:18px">
      ${wa ? `<a class="btn btn--sm" style="background:#25d366;color:#fff;border-color:#25d366" target="_blank" rel="noopener" href="${wa}">${ICON.whatsapp} Responder por WhatsApp</a>` : ''}
      ${mailHref ? `<a class="btn btn--ghost btn--sm" href="${mailHref}">Responder por correo</a>` : ''}
    </div>`;

  const buttons = [];
  if (c.estado !== 'atendida') buttons.push({ label: 'Marcar atendida', class: 'btn--navy', onClick: () => setConsultaEstado(c, 'atendida') });
  
  // NEW: Convert to Client button
  buttons.push({ 
    label: 'Convertir a Cliente', 
    class: 'btn--ghost', 
    onClick: () => {
      import('@/views/clientes.js').then(module => {
        closeModal();
        module.clienteForm({
          nombre: c.nombre + ' ' + (c.apellido || ''),
          email: c.email || '',
          telefono: c.telefono || '',
          notas: \`[Viene de consulta web - \${fmtDateTime(c.created_at)}]\\n\\nÁrea: \${c.area || '—'}\\n\\nMensaje: \${c.mensaje || ''}\`
        });
        // Optionally mark it as attended
        if (c.estado !== 'atendida') setConsultaEstado(c, 'atendida');
      });
    }
  });

  if (c.estado !== 'archivada') buttons.push({ label: 'Archivar', class: 'btn--ghost', onClick: () => setConsultaEstado(c, 'archivada') });
  if (c.estado !== 'nueva') buttons.push({ label: 'Marcar nueva', class: 'btn--ghost', onClick: () => setConsultaEstado(c, 'nueva') });
  if (state.profile.rol === 'admin') buttons.push({ label: 'Eliminar', class: 'btn--danger', onClick: () => deleteConsulta(c) });
  buttons.push({ label: 'Cerrar', class: 'btn--primary', onClick: closeModal });

  openModal('Consulta de ' + consultaNombre(c), body, buttons, true);
}

async function setConsultaEstado(c, estado) {
  const { error } = await supabase.from('consultas').update({ estado }).eq('id', c.id);
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  await logAccion('consulta_' + estado, 'consulta', c.id, consultaNombre(c));
  closeModal(); toast('Consulta actualizada.', 'success'); renderConsultas();
}

async function deleteConsulta(c) {
  if (!confirm('¿Eliminar definitivamente esta consulta?')) return;
  const { error } = await supabase.from('consultas').delete().eq('id', c.id);
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  await logAccion('eliminar', 'consulta', c.id, consultaNombre(c));
  closeModal(); toast('Consulta eliminada.', 'success'); renderConsultas();
}
