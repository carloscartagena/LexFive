// ============================================================
//  LexFive — Vistas de administración del sistema
//  Usuarios (roles y estado) y Auditoría (bitácora). Solo admin.
//  Extraído de app.js (paso 8 del split).
// ============================================================
import { supabase } from '@/api/supabase.js';
import { logAccion } from '@/api/auth.js';
import { ROLES } from '@/utils/config.js';
import { state } from '@/utils/state.js';
import { esc, fmtDateTime } from '@/utils/util.js';
import { ICON } from '@/utils/icons.js';
import { $, content } from '@/utils/dom.js';
import { loading, toast, tip, paginar, pagerHTML, wirePager } from '@/utils/ui.js';
import { profName } from '@/shared/comunes.js';
import { loadProfiles } from '@/shared/datos.js';

// ============================================================
//  VISTA: USUARIOS (solo admin)
// ============================================================
export async function renderUsuarios() {
  loading();
  await loadProfiles();
  content().innerHTML = `
    <div class="card">
      <div class="card__head"><h3>Usuarios del sistema${tip('Personal y clientes con acceso. Cambie el rol de cada uno o active/desactive su cuenta. El rol define qué puede ver y hacer.')}</h3></div>
      <div class="card__body--flush"><div class="table-wrap"><table class="data">
        <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>${state.profiles.map(u => `<tr class="no-hover" data-id="${u.id}">
          <td class="cell-strong">${esc(u.nombre)}</td>
          <td>${esc(u.email || '—')}</td>
          <td><select class="js-rol" data-id="${u.id}" style="padding:7px 10px;border:1.5px solid var(--line);border-radius:7px;">
            ${Object.entries(ROLES).map(([k, v]) => `<option value="${k}" ${u.rol === k ? 'selected' : ''}>${v}</option>`).join('')}
          </select></td>
          <td><span class="badge ${u.activo ? 'badge-on' : 'badge-off'}">${u.activo ? 'Activo' : 'Inactivo'}</span></td>
          <td><button class="btn btn--ghost btn--sm js-toggle" data-id="${u.id}">${u.activo ? 'Desactivar' : 'Activar'}</button></td>
        </tr>`).join('')}</tbody></table></div></div>
    </div>
    <div class="card"><div class="card__body">
      <h3 class="intro-title" style="margin-bottom:8px;">Sobre los accesos</h3>
      <p class="cell-sub" style="margin-bottom:8px;"><strong>Clientes:</strong> cuando alguien se registra desde la pantalla de acceso, entra como <strong>Cliente</strong> y solo ve sus propios procesos (se vinculan por su correo). No ve nada del bufete ni de otros clientes.</p>
      <p class="cell-sub"><strong>Abogados / Procuradores:</strong> para habilitar a un colega, créele la cuenta en Supabase (<strong>Authentication → Users → Add user</strong>) o pídale que se registre, y aquí cámbiele el rol a Abogado o Procurador.</p>
    </div></div>`;

  content().querySelectorAll('.js-rol').forEach(sel => sel.onchange = async () => {
    const id = sel.dataset.id;
    const { error } = await supabase.from('profiles').update({ rol: sel.value }).eq('id', id);
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    await logAccion('cambiar_rol', 'usuario', id, sel.value);
    toast('Rol actualizado.', 'success');
  });
  content().querySelectorAll('.js-toggle').forEach(btn => btn.onclick = async () => {
    const id = btn.dataset.id;
    const u = state.profiles.find(x => x.id === id);
    if (id === state.profile.id) { toast('No puede desactivar su propia cuenta.', 'error'); return; }
    const { error } = await supabase.from('profiles').update({ activo: !u.activo }).eq('id', id);
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    await logAccion('estado_usuario', 'usuario', id, (!u.activo) ? 'activado' : 'desactivado');
    renderUsuarios();
  });
}

// ============================================================
//  VISTA: AUDITORÍA (solo admin)
// ============================================================
export async function renderAuditoria() {
  loading();
  await loadProfiles();
  const { data } = await supabase.from('auditoria').select('*').order('created_at', { ascending: false }).limit(500);
  const logs = data || [];
  content().innerHTML = `
    <div class="card"><div class="card__head"><h3>Bitácora de auditoría</h3></div>
    <div class="card__body--flush"><div id="audTable"></div></div></div>`;
  let page = 1;
  function paint() {
    const info = paginar(logs, page);
    $('#audTable').innerHTML = logs.length ? `<div class="table-wrap"><table class="data">
      <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>Detalle</th></tr></thead>
      <tbody>${info.slice.map(l => `<tr class="no-hover"><td>${fmtDateTime(l.created_at)}</td><td>${esc(profName(l.usuario_id))}</td><td><span class="badge badge-mat">${esc(l.accion || '—')}</span></td><td>${esc(l.entidad || '—')}</td><td class="cell-sub">${esc(l.detalle || '')}</td></tr>`).join('')}</tbody></table></div>${pagerHTML(info)}`
      : `<div class="empty">${ICON.auditoria}<p>Sin registros todavía.</p></div>`;
    wirePager($('#audTable'), info, (n) => { page = n; paint(); });
  }
  paint();
}
