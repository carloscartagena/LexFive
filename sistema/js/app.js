// ============================================================
//  LexFive — Sistema de Gestión Legal · Lógica principal
// ============================================================
import { supabase } from './supabase.js';
import { requireAuth, getProfile, signOut, logAccion, can } from './auth.js';
import { ROLES, ESTADOS, MATERIAS } from './config.js';

// ---------- Estado global ----------
const state = {
  profile: null,
  profiles: [],   // todos los usuarios (para mapear nombres y selects)
  clientes: [],   // cache de clientes
  view: 'dashboard'
};

// ---------- Iconos ----------
const ICON = {
  dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
  procesos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/></svg>',
  clientes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11"/></svg>',
  blog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  usuarios: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm14 10v-2a4 4 0 0 0-3-3.87M19 4a4 4 0 0 1 0 7.75"/></svg>',
  auditoria: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 11l3 3 8-8M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  audiencia: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>'
};

const NAV = [
  { key: 'dashboard', label: 'Panel', icon: ICON.dashboard },
  { key: 'procesos', label: 'Procesos', icon: ICON.procesos },
  { key: 'clientes', label: 'Clientes', icon: ICON.clientes },
  { key: 'blog', label: 'Blog', icon: ICON.blog },
  { key: 'usuarios', label: 'Usuarios', icon: ICON.usuarios, adminOnly: true },
  { key: 'auditoria', label: 'Auditoría', icon: ICON.auditoria, adminOnly: true }
];

// ============================================================
//  Utilidades de interfaz
// ============================================================
const $ = (sel) => document.querySelector(sel);
const content = () => $('#content');

function esc(s) {
  return (s == null ? '' : String(s)).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
function fmtDate(d) {
  if (!d) return '—';
  const x = new Date(d);
  if (isNaN(x)) return '—';
  return x.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtDateTime(d) {
  if (!d) return '—';
  const x = new Date(d);
  if (isNaN(x)) return '—';
  return x.toLocaleString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function initials(name) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
function toast(msg, type = '') {
  const t = $('#toast');
  t.textContent = msg; t.className = type; void t.offsetWidth; t.classList.add('show', type);
  setTimeout(() => t.classList.remove('show'), 3200);
}
function loading() { content().innerHTML = '<div class="loading"><div class="spinner"></div>Cargando...</div>'; }

// Modal
function openModal(title, bodyHTML, buttons = [], wide = false) {
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
}
function closeModal() { $('#modalOverlay').classList.remove('open'); }

function profName(id) {
  if (!id) return '—';
  const p = state.profiles.find(x => x.id === id);
  return p ? p.nombre : '—';
}
function clienteName(id) {
  if (!id) return '—';
  const c = state.clientes.find(x => x.id === id);
  return c ? c.nombre : '—';
}
function badgeEstado(estado) {
  const label = ESTADOS[estado] || estado || '—';
  return `<span class="badge badge-estado ${esc(estado || '')}">${esc(label)}</span>`;
}
function optionsProfiles(selected) {
  return '<option value="">— Sin asignar —</option>' + state.profiles.filter(p => p.activo)
    .map(p => `<option value="${p.id}" ${p.id === selected ? 'selected' : ''}>${esc(p.nombre)} (${ROLES[p.rol] || p.rol})</option>`).join('');
}
function optionsClientes(selected) {
  return '<option value="">— Sin cliente —</option>' + state.clientes
    .map(c => `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('');
}

// ============================================================
//  Carga de datos comunes
// ============================================================
async function loadProfiles() {
  const { data } = await supabase.from('profiles').select('*').order('nombre');
  state.profiles = data || [];
}
async function loadClientes() {
  const { data } = await supabase.from('clientes').select('*').order('nombre');
  state.clientes = data || [];
}

// ============================================================
//  VISTA: DASHBOARD
// ============================================================
async function renderDashboard() {
  loading();
  const { data: procesos } = await supabase.from('procesos').select('*').order('proxima_audiencia', { ascending: true });
  const list = procesos || [];
  const activos = list.filter(p => !['archivado', 'concluido'].includes(p.estado)).length;
  const ahora = new Date();
  const proximas = list.filter(p => p.proxima_audiencia && new Date(p.proxima_audiencia) >= ahora)
    .sort((a, b) => new Date(a.proxima_audiencia) - new Date(b.proxima_audiencia));
  const mios = list.filter(p => p.abogado_id === state.profile.id || p.procurador_id === state.profile.id).length;

  content().innerHTML = `
    <div class="stats-grid">
      <div class="metric"><div class="metric__top"><div class="metric__icon">${ICON.procesos}</div></div><div class="metric__num">${list.length}</div><div class="metric__label">Procesos totales</div></div>
      <div class="metric"><div class="metric__top"><div class="metric__icon">${ICON.dashboard}</div></div><div class="metric__num">${activos}</div><div class="metric__label">Procesos activos</div></div>
      <div class="metric"><div class="metric__top"><div class="metric__icon">${ICON.audiencia}</div></div><div class="metric__num">${proximas.length}</div><div class="metric__label">Audiencias próximas</div></div>
      <div class="metric"><div class="metric__top"><div class="metric__icon">${ICON.clientes}</div></div><div class="metric__num">${mios}</div><div class="metric__label">Mis procesos</div></div>
    </div>

    <div class="card">
      <div class="card__head"><h3>Próximas audiencias y plazos</h3></div>
      <div class="card__body--flush">
        ${proximas.length ? `<div class="table-wrap"><table class="data">
          <thead><tr><th>Carátula</th><th>Materia</th><th>Fecha / hora</th><th>Responsable</th></tr></thead>
          <tbody>${proximas.slice(0, 8).map(p => `
            <tr data-id="${p.id}">
              <td class="cell-strong">${esc(p.caratula)}</td>
              <td><span class="badge badge-mat">${esc(p.materia || '—')}</span></td>
              <td>${fmtDateTime(p.proxima_audiencia)}</td>
              <td>${esc(profName(p.abogado_id))}</td>
            </tr>`).join('')}</tbody></table></div>`
        : `<div class="empty">${ICON.audiencia}<p>No hay audiencias ni plazos próximos registrados.</p></div>`}
      </div>
    </div>`;

  content().querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => openProcesoDetail(tr.dataset.id));
}

// ============================================================
//  VISTA: PROCESOS
// ============================================================
async function renderProcesos() {
  loading();
  await loadClientes();
  const { data } = await supabase.from('procesos').select('*').order('created_at', { ascending: false });
  const procesos = data || [];

  content().innerHTML = `
    <div class="toolbar">
      <input type="search" id="qProc" placeholder="Buscar por carátula, número, juzgado...">
      <select id="fMateria"><option value="">Todas las materias</option>${MATERIAS.map(m => `<option>${m}</option>`).join('')}</select>
      <select id="fEstado"><option value="">Todos los estados</option>${Object.entries(ESTADOS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>
      <div class="spacer"></div>
      <button class="btn btn--primary" id="btnNuevoProc">${ICON.plus} Nuevo proceso</button>
    </div>
    <div class="card"><div class="card__body--flush"><div id="procTable"></div></div></div>`;

  function paint() {
    const q = ($('#qProc').value || '').toLowerCase();
    const fm = $('#fMateria').value, fe = $('#fEstado').value;
    const rows = procesos.filter(p =>
      (!fm || p.materia === fm) && (!fe || p.estado === fe) &&
      (!q || [p.caratula, p.numero, p.juzgado, p.parte_contraria].some(v => (v || '').toLowerCase().includes(q))));
    $('#procTable').innerHTML = rows.length ? `<div class="table-wrap"><table class="data">
      <thead><tr><th>Carátula</th><th>Materia</th><th>Tipo</th><th>Abogado</th><th>Estado</th><th>Próx. audiencia</th></tr></thead>
      <tbody>${rows.map(p => `
        <tr data-id="${p.id}">
          <td class="cell-strong">${esc(p.caratula)}<div class="cell-sub">${esc(p.numero || 'Sin número')}</div></td>
          <td><span class="badge badge-mat">${esc(p.materia || '—')}</span></td>
          <td>${p.tipo === 'administrativo' ? 'Administrativo' : 'Judicial'}</td>
          <td>${esc(profName(p.abogado_id))}</td>
          <td>${badgeEstado(p.estado)}</td>
          <td>${p.proxima_audiencia ? fmtDateTime(p.proxima_audiencia) : '—'}</td>
        </tr>`).join('')}</tbody></table></div>`
      : `<div class="empty">${ICON.procesos}<p>No se encontraron procesos.</p></div>`;
    $('#procTable').querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => openProcesoDetail(tr.dataset.id));
  }
  paint();
  $('#qProc').oninput = paint; $('#fMateria').onchange = paint; $('#fEstado').onchange = paint;
  $('#btnNuevoProc').onclick = () => procesoForm();
}

function procesoForm(proc = null) {
  const p = proc || {};
  const body = `
    <div class="field"><label>Carátula / Nombre del proceso *</label><input id="pf_caratula" value="${esc(p.caratula || '')}"></div>
    <div class="field-row">
      <div class="field"><label>N.º de proceso / expediente</label><input id="pf_numero" value="${esc(p.numero || '')}"></div>
      <div class="field"><label>Tipo</label><select id="pf_tipo"><option value="judicial" ${p.tipo !== 'administrativo' ? 'selected' : ''}>Judicial</option><option value="administrativo" ${p.tipo === 'administrativo' ? 'selected' : ''}>Administrativo</option></select></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Materia</label><select id="pf_materia"><option value="">—</option>${MATERIAS.map(m => `<option ${p.materia === m ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
      <div class="field"><label>Estado</label><select id="pf_estado">${Object.entries(ESTADOS).map(([k, v]) => `<option value="${k}" ${p.estado === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
    </div>
    <div class="field"><label>Juzgado / Entidad</label><input id="pf_juzgado" value="${esc(p.juzgado || '')}"></div>
    <div class="field-row">
      <div class="field"><label>Cliente</label><select id="pf_cliente">${optionsClientes(p.cliente_id)}</select></div>
      <div class="field"><label>Parte contraria</label><input id="pf_contraria" value="${esc(p.parte_contraria || '')}"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Abogado responsable</label><select id="pf_abogado">${optionsProfiles(p.abogado_id)}</select></div>
      <div class="field"><label>Procurador asignado</label><select id="pf_procurador">${optionsProfiles(p.procurador_id)}</select></div>
    </div>
    <div class="field-row">
      <div class="field"><label>Fecha de inicio</label><input type="date" id="pf_inicio" value="${p.fecha_inicio || ''}"></div>
      <div class="field"><label>Próxima audiencia / plazo</label><input type="datetime-local" id="pf_audiencia" value="${p.proxima_audiencia ? new Date(p.proxima_audiencia).toISOString().slice(0,16) : ''}"></div>
    </div>
    <div class="field"><label>Descripción</label><textarea id="pf_desc">${esc(p.descripcion || '')}</textarea></div>`;

  openModal(proc ? 'Editar proceso' : 'Nuevo proceso', body, [
    { label: 'Cancelar', class: 'btn--ghost', onClick: closeModal },
    { label: 'Guardar', class: 'btn--primary', id: 'pf_save', onClick: () => saveProceso(proc) }
  ], true);
}

async function saveProceso(proc) {
  const caratula = $('#pf_caratula').value.trim();
  if (!caratula) { toast('La carátula es obligatoria.', 'error'); return; }
  const aud = $('#pf_audiencia').value;
  const payload = {
    caratula,
    numero: $('#pf_numero').value.trim() || null,
    tipo: $('#pf_tipo').value,
    materia: $('#pf_materia').value || null,
    estado: $('#pf_estado').value,
    juzgado: $('#pf_juzgado').value.trim() || null,
    cliente_id: $('#pf_cliente').value || null,
    parte_contraria: $('#pf_contraria').value.trim() || null,
    abogado_id: $('#pf_abogado').value || null,
    procurador_id: $('#pf_procurador').value || null,
    fecha_inicio: $('#pf_inicio').value || null,
    proxima_audiencia: aud ? new Date(aud).toISOString() : null,
    descripcion: $('#pf_desc').value.trim() || null
  };
  $('#pf_save').disabled = true;
  let error;
  if (proc) {
    payload.updated_at = new Date().toISOString();
    ({ error } = await supabase.from('procesos').update(payload).eq('id', proc.id));
  } else {
    payload.created_by = state.profile.id;
    ({ error } = await supabase.from('procesos').insert(payload));
  }
  if (error) { toast('Error al guardar: ' + error.message, 'error'); $('#pf_save').disabled = false; return; }
  await logAccion(proc ? 'editar' : 'crear', 'proceso', proc ? proc.id : caratula, caratula);
  closeModal(); toast(proc ? 'Proceso actualizado.' : 'Proceso creado.', 'success');
  renderProcesos();
}

// ---------- Detalle de proceso ----------
async function openProcesoDetail(id) {
  openModal('Detalle del proceso', '<div class="loading"><div class="spinner"></div>Cargando...</div>', [], true);
  const { data: p } = await supabase.from('procesos').select('*').eq('id', id).single();
  if (!p) { toast('No se encontró el proceso.', 'error'); closeModal(); return; }
  const [{ data: acts }, { data: docs }] = await Promise.all([
    supabase.from('actuaciones').select('*').eq('proceso_id', id).order('fecha', { ascending: false }),
    supabase.from('documentos').select('*').eq('proceso_id', id).order('created_at', { ascending: false })
  ]);

  const detail = `
    <div class="detail-grid">
      <div class="detail-item"><label>N.º de proceso</label><span>${esc(p.numero || '—')}</span></div>
      <div class="detail-item"><label>Materia</label><span>${esc(p.materia || '—')} · ${p.tipo === 'administrativo' ? 'Administrativo' : 'Judicial'}</span></div>
      <div class="detail-item"><label>Juzgado / Entidad</label><span>${esc(p.juzgado || '—')}</span></div>
      <div class="detail-item"><label>Estado</label><span>${badgeEstado(p.estado)}</span></div>
      <div class="detail-item"><label>Cliente</label><span>${esc(clienteName(p.cliente_id))}</span></div>
      <div class="detail-item"><label>Parte contraria</label><span>${esc(p.parte_contraria || '—')}</span></div>
      <div class="detail-item"><label>Abogado responsable</label><span>${esc(profName(p.abogado_id))}</span></div>
      <div class="detail-item"><label>Procurador</label><span>${esc(profName(p.procurador_id))}</span></div>
      <div class="detail-item"><label>Fecha de inicio</label><span>${fmtDate(p.fecha_inicio)}</span></div>
      <div class="detail-item"><label>Próxima audiencia / plazo</label><span>${fmtDateTime(p.proxima_audiencia)}</span></div>
    </div>
    ${p.descripcion ? `<div class="detail-item" style="margin-top:14px"><label>Descripción</label><span>${esc(p.descripcion)}</span></div>` : ''}

    <h4 class="section-title">Memoriales y documentos</h4>
    <div class="field" style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;">
      <div style="flex-grow:1;min-width:180px;"><label style="font-size:.8rem;">Subir archivo (PDF, Word, imagen...)</label><input type="file" id="docFile"></div>
      <input id="docNombre" placeholder="Descripción (ej: Memorial de respuesta)" style="flex-grow:1;min-width:180px;padding:10px 12px;border:1.5px solid var(--line);border-radius:8px;">
      <button class="btn btn--navy" id="btnUpload">Subir</button>
    </div>
    <div id="docList">${renderDocs(docs || [])}</div>

    <h4 class="section-title">Historial de actuaciones</h4>
    <div class="field" style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;">
      <input type="date" id="actFecha" value="${new Date().toISOString().slice(0,10)}" style="padding:10px 12px;border:1.5px solid var(--line);border-radius:8px;">
      <input id="actDesc" placeholder="Describa la actuación o avance..." style="flex-grow:1;min-width:200px;padding:10px 12px;border:1.5px solid var(--line);border-radius:8px;">
      <button class="btn btn--navy" id="btnActuacion">Agregar</button>
    </div>
    <ul class="timeline" id="actList">${renderActs(acts || [])}</ul>`;

  const buttons = [{ label: 'Editar', class: 'btn--ghost', onClick: () => procesoForm(p) }];
  if (can(state.profile, 'delete_proceso')) {
    buttons.push({ label: 'Eliminar', class: 'btn--danger', onClick: () => deleteProceso(p) });
  }
  buttons.push({ label: 'Cerrar', class: 'btn--primary', onClick: closeModal });

  $('#modalTitle').textContent = p.caratula;
  $('#modalBody').innerHTML = detail;
  const foot = $('#modalFoot'); foot.innerHTML = '';
  buttons.forEach(b => { const x = document.createElement('button'); x.className = 'btn ' + b.class; x.textContent = b.label; x.onclick = b.onClick; foot.appendChild(x); });

  // Subir documento
  $('#btnUpload').onclick = async () => {
    const file = $('#docFile').files[0];
    if (!file) { toast('Seleccione un archivo.', 'error'); return; }
    $('#btnUpload').disabled = true; $('#btnUpload').textContent = 'Subiendo...';
    const path = `${id}/${Date.now()}_${file.name.replace(/[^\w.\-]/g, '_')}`;
    const { error: upErr } = await supabase.storage.from('documentos').upload(path, file);
    if (upErr) { toast('Error al subir: ' + upErr.message, 'error'); $('#btnUpload').disabled = false; $('#btnUpload').textContent = 'Subir'; return; }
    const { error: insErr } = await supabase.from('documentos').insert({
      proceso_id: id, nombre: $('#docNombre').value.trim() || file.name, tipo: 'memorial', storage_path: path, subido_por: state.profile.id
    });
    if (insErr) { toast('Error al registrar: ' + insErr.message, 'error'); }
    else {
      await logAccion('subir_documento', 'proceso', id, file.name);
      const { data: nd } = await supabase.from('documentos').select('*').eq('proceso_id', id).order('created_at', { ascending: false });
      $('#docList').innerHTML = renderDocs(nd || []); wireDocs(id);
      toast('Documento cargado.', 'success');
    }
    $('#btnUpload').disabled = false; $('#btnUpload').textContent = 'Subir'; $('#docNombre').value = ''; $('#docFile').value = '';
  };
  wireDocs(id);

  // Agregar actuación
  $('#btnActuacion').onclick = async () => {
    const desc = $('#actDesc').value.trim();
    if (!desc) { toast('Describa la actuación.', 'error'); return; }
    const { error } = await supabase.from('actuaciones').insert({
      proceso_id: id, fecha: $('#actFecha').value || new Date().toISOString().slice(0, 10), descripcion: desc, created_by: state.profile.id
    });
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    await logAccion('actuacion', 'proceso', id, desc.slice(0, 60));
    const { data: na } = await supabase.from('actuaciones').select('*').eq('proceso_id', id).order('fecha', { ascending: false });
    $('#actList').innerHTML = renderActs(na || []); $('#actDesc').value = '';
    toast('Actuación registrada.', 'success');
  };
}

function renderDocs(docs) {
  if (!docs.length) return '<p class="cell-sub" style="padding:6px 0">Aún no hay documentos cargados.</p>';
  return docs.map(d => `
    <div class="doc-row" data-path="${esc(d.storage_path)}" data-id="${d.id}">
      <div class="doc-row__info"><div class="doc-row__icon">${ICON.doc}</div>
        <div><div class="cell-strong">${esc(d.nombre)}</div><div class="cell-sub">${fmtDate(d.created_at)} · ${esc(profName(d.subido_por))}</div></div>
      </div>
      <div style="display:flex;gap:6px;">
        <button class="btn btn--ghost btn--sm js-dl">Descargar</button>
        ${(d.subido_por === state.profile.id || state.profile.rol === 'admin') ? '<button class="btn btn--danger btn--sm js-del">Eliminar</button>' : ''}
      </div>
    </div>`).join('');
}
function wireDocs(procId) {
  content(); // no-op safety
  document.querySelectorAll('#docList .doc-row').forEach(row => {
    const path = row.dataset.path, docId = row.dataset.id;
    const dl = row.querySelector('.js-dl');
    if (dl) dl.onclick = async () => {
      const { data, error } = await supabase.storage.from('documentos').createSignedUrl(path, 120);
      if (error) { toast('No se pudo generar el enlace.', 'error'); return; }
      window.open(data.signedUrl, '_blank');
    };
    const del = row.querySelector('.js-del');
    if (del) del.onclick = async () => {
      if (!confirm('¿Eliminar este documento?')) return;
      await supabase.storage.from('documentos').remove([path]);
      await supabase.from('documentos').delete().eq('id', docId);
      await logAccion('eliminar_documento', 'proceso', procId, path);
      const { data: nd } = await supabase.from('documentos').select('*').eq('proceso_id', procId).order('created_at', { ascending: false });
      $('#docList').innerHTML = renderDocs(nd || []); wireDocs(procId);
      toast('Documento eliminado.', 'success');
    };
  });
}
function renderActs(acts) {
  if (!acts.length) return '<li class="cell-sub" style="border:none">Sin actuaciones registradas.</li>';
  return acts.map(a => `<li><div class="t-date">${fmtDate(a.fecha)} · ${esc(profName(a.created_by))}</div><div>${esc(a.descripcion)}</div></li>`).join('');
}

async function deleteProceso(p) {
  if (!confirm(`¿Eliminar definitivamente el proceso "${p.caratula}"? Esta acción no se puede deshacer.`)) return;
  const { error } = await supabase.from('procesos').delete().eq('id', p.id);
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  await logAccion('eliminar', 'proceso', p.id, p.caratula);
  closeModal(); toast('Proceso eliminado.', 'success'); renderProcesos();
}

// ============================================================
//  VISTA: CLIENTES
// ============================================================
async function renderClientes() {
  loading();
  await loadClientes();
  content().innerHTML = `
    <div class="toolbar">
      <input type="search" id="qCli" placeholder="Buscar cliente...">
      <div class="spacer"></div>
      <button class="btn btn--primary" id="btnNuevoCli">${ICON.plus} Nuevo cliente</button>
    </div>
    <div class="card"><div class="card__body--flush"><div id="cliTable"></div></div></div>`;
  function paint() {
    const q = ($('#qCli').value || '').toLowerCase();
    const rows = state.clientes.filter(c => !q || [c.nombre, c.documento, c.email, c.telefono].some(v => (v || '').toLowerCase().includes(q)));
    $('#cliTable').innerHTML = rows.length ? `<div class="table-wrap"><table class="data">
      <thead><tr><th>Nombre</th><th>Documento</th><th>Teléfono</th><th>Correo</th></tr></thead>
      <tbody>${rows.map(c => `<tr data-id="${c.id}"><td class="cell-strong">${esc(c.nombre)}</td><td>${esc(c.documento || '—')}</td><td>${esc(c.telefono || '—')}</td><td>${esc(c.email || '—')}</td></tr>`).join('')}</tbody></table></div>`
      : `<div class="empty">${ICON.clientes}<p>No hay clientes registrados.</p></div>`;
    $('#cliTable').querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => {
      const c = state.clientes.find(x => x.id === tr.dataset.id); clienteForm(c);
    });
  }
  paint();
  $('#qCli').oninput = paint;
  $('#btnNuevoCli').onclick = () => clienteForm();
}

function clienteForm(cli = null) {
  const c = cli || {};
  const body = `
    <div class="field"><label>Nombre / Razón social *</label><input id="cf_nombre" value="${esc(c.nombre || '')}"></div>
    <div class="field-row">
      <div class="field"><label>Documento (CI/NIT)</label><input id="cf_doc" value="${esc(c.documento || '')}"></div>
      <div class="field"><label>Teléfono</label><input id="cf_tel" value="${esc(c.telefono || '')}"></div>
    </div>
    <div class="field"><label>Correo electrónico</label><input id="cf_email" value="${esc(c.email || '')}"></div>
    <div class="field"><label>Dirección</label><input id="cf_dir" value="${esc(c.direccion || '')}"></div>
    <div class="field"><label>Notas</label><textarea id="cf_notas">${esc(c.notas || '')}</textarea></div>`;
  const buttons = [{ label: 'Cancelar', class: 'btn--ghost', onClick: closeModal }];
  if (cli && can(state.profile, 'delete_cliente')) buttons.push({ label: 'Eliminar', class: 'btn--danger', onClick: () => deleteCliente(cli) });
  buttons.push({ label: 'Guardar', class: 'btn--primary', id: 'cf_save', onClick: () => saveCliente(cli) });
  openModal(cli ? 'Editar cliente' : 'Nuevo cliente', body, buttons);
}

async function saveCliente(cli) {
  const nombre = $('#cf_nombre').value.trim();
  if (!nombre) { toast('El nombre es obligatorio.', 'error'); return; }
  const payload = {
    nombre, documento: $('#cf_doc').value.trim() || null, telefono: $('#cf_tel').value.trim() || null,
    email: $('#cf_email').value.trim() || null, direccion: $('#cf_dir').value.trim() || null, notas: $('#cf_notas').value.trim() || null
  };
  $('#cf_save').disabled = true;
  let error;
  if (cli) ({ error } = await supabase.from('clientes').update(payload).eq('id', cli.id));
  else { payload.created_by = state.profile.id; ({ error } = await supabase.from('clientes').insert(payload)); }
  if (error) { toast('Error: ' + error.message, 'error'); $('#cf_save').disabled = false; return; }
  await logAccion(cli ? 'editar' : 'crear', 'cliente', cli ? cli.id : nombre, nombre);
  closeModal(); toast('Cliente guardado.', 'success'); renderClientes();
}
async function deleteCliente(cli) {
  if (!confirm(`¿Eliminar al cliente "${cli.nombre}"?`)) return;
  const { error } = await supabase.from('clientes').delete().eq('id', cli.id);
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  await logAccion('eliminar', 'cliente', cli.id, cli.nombre);
  closeModal(); toast('Cliente eliminado.', 'success'); renderClientes();
}

// ============================================================
//  VISTA: BLOG
// ============================================================
async function renderBlog() {
  loading();
  const { data } = await supabase.from('articulos').select('*').order('updated_at', { ascending: false });
  const arts = data || [];
  content().innerHTML = `
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
}

function articuloForm(art = null) {
  const a = art || {};
  const editable = !art || art.autor_id === state.profile.id || state.profile.rol === 'admin';
  const body = `
    <div class="field"><label>Título *</label><input id="af_titulo" value="${esc(a.titulo || '')}" ${editable ? '' : 'disabled'}></div>
    <div class="field-row">
      <div class="field"><label>Categoría</label><input id="af_cat" value="${esc(a.categoria || '')}" placeholder="Laboral, Familia..." ${editable ? '' : 'disabled'}></div>
      <div class="field"><label>Estado</label><select id="af_estado" ${editable ? '' : 'disabled'}><option value="borrador" ${a.estado !== 'publicado' ? 'selected' : ''}>Borrador</option><option value="publicado" ${a.estado === 'publicado' ? 'selected' : ''}>Publicado</option></select></div>
    </div>
    <div class="field"><label>Resumen (extracto)</label><textarea id="af_resumen" ${editable ? '' : 'disabled'}>${esc(a.resumen || '')}</textarea></div>
    <div class="field"><label>Contenido</label><textarea id="af_contenido" style="min-height:160px" ${editable ? '' : 'disabled'}>${esc(a.contenido || '')}</textarea></div>
    ${editable ? '' : '<p class="cell-sub">Solo el autor o un administrador pueden editar este artículo.</p>'}`;
  const buttons = [{ label: 'Cerrar', class: 'btn--ghost', onClick: closeModal }];
  if (art && editable) buttons.push({ label: 'Eliminar', class: 'btn--danger', onClick: () => deleteArticulo(art) });
  if (editable) buttons.push({ label: 'Guardar', class: 'btn--primary', id: 'af_save', onClick: () => saveArticulo(art) });
  openModal(art ? 'Editar artículo' : 'Nuevo artículo', body, buttons, true);
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

// ============================================================
//  VISTA: USUARIOS (solo admin)
// ============================================================
async function renderUsuarios() {
  loading();
  await loadProfiles();
  content().innerHTML = `
    <div class="card">
      <div class="card__head"><h3>Usuarios del sistema</h3></div>
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
      <h3 style="font-family:var(--font-serif);color:var(--navy);margin-bottom:8px;">¿Cómo agregar un nuevo usuario?</h3>
      <p class="cell-sub">Por seguridad, las nuevas cuentas se crean desde el panel de Supabase: <strong>Authentication → Users → Add user</strong> (correo y contraseña). El usuario aparecerá aquí automáticamente y usted podrá asignarle su rol. También puede usar la opción "Crear cuenta" de la pantalla de login.</p>
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
async function renderAuditoria() {
  loading();
  await loadProfiles();
  const { data } = await supabase.from('auditoria').select('*').order('created_at', { ascending: false }).limit(150);
  const logs = data || [];
  content().innerHTML = `
    <div class="card"><div class="card__head"><h3>Bitácora de auditoría</h3></div>
    <div class="card__body--flush">${logs.length ? `<div class="table-wrap"><table class="data">
      <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>Detalle</th></tr></thead>
      <tbody>${logs.map(l => `<tr class="no-hover"><td>${fmtDateTime(l.created_at)}</td><td>${esc(profName(l.usuario_id))}</td><td><span class="badge badge-mat">${esc(l.accion || '—')}</span></td><td>${esc(l.entidad || '—')}</td><td class="cell-sub">${esc(l.detalle || '')}</td></tr>`).join('')}</tbody></table></div>`
      : `<div class="empty">${ICON.auditoria}<p>Sin registros todavía.</p></div>`}</div></div>`;
}

// ============================================================
//  Navegación
// ============================================================
const VIEWS = {
  dashboard: { title: 'Panel general', render: renderDashboard },
  procesos: { title: 'Procesos', render: renderProcesos },
  clientes: { title: 'Clientes', render: renderClientes },
  blog: { title: 'Blog', render: renderBlog },
  usuarios: { title: 'Usuarios', render: renderUsuarios },
  auditoria: { title: 'Auditoría', render: renderAuditoria }
};

function navigate(key) {
  if (!VIEWS[key]) key = 'dashboard';
  if ((key === 'usuarios' || key === 'auditoria') && state.profile.rol !== 'admin') key = 'dashboard';
  state.view = key;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.key === key));
  $('#pageTitle').textContent = VIEWS[key].title;
  $('#sidebar').classList.remove('open'); $('#backdrop').classList.remove('show');
  VIEWS[key].render();
}

function buildSidebar() {
  const nav = $('#sidebarNav');
  nav.innerHTML = NAV.filter(n => !n.adminOnly || state.profile.rol === 'admin')
    .map(n => `<button class="nav-item" data-key="${n.key}">${n.icon}<span>${n.label}</span></button>`).join('');
  nav.querySelectorAll('.nav-item').forEach(b => b.onclick = () => navigate(b.dataset.key));
}

// ============================================================
//  Arranque
// ============================================================
(async function init() {
  const profile = await requireAuth();
  if (!profile) return;
  state.profile = profile;
  await loadProfiles();

  // Cabecera de usuario
  $('#userName').textContent = profile.nombre;
  $('#userRol').textContent = ROLES[profile.rol] || profile.rol;
  $('#userAvatar').textContent = initials(profile.nombre);

  buildSidebar();

  // Eventos globales
  $('#btnLogout').onclick = () => signOut();
  $('#modalClose').onclick = closeModal;
  $('#modalOverlay').onclick = (e) => { if (e.target === $('#modalOverlay')) closeModal(); };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  $('#menuToggle').onclick = () => { $('#sidebar').classList.toggle('open'); $('#backdrop').classList.toggle('show'); };
  $('#backdrop').onclick = () => { $('#sidebar').classList.remove('open'); $('#backdrop').classList.remove('show'); };

  navigate('dashboard');
})();
