// ============================================================
//  VISTA: DASHBOARD (panel general)
//  Resumen del bufete: indicadores, próximas audiencias/plazos, tareas, estado
//  de consultas y cobros, gráficos por estado/materia, etc. Incluye el modal
//  de recordatorio de audiencia por WhatsApp/correo (recordarPorWhatsApp).
//  Extraído de app.js (split por módulos).
// ============================================================
import { ESTADOS, ABOGADOS } from './config.js';
import { ICON } from './icons.js';
import { esc, hoyISO, fmtDate, fmtDateTime, fmtHora } from './util.js';
import { fmtMoneda } from './exportar.js';
import { $, content } from './dom.js';
import { barChart, toast, hint, loading, openModal, closeModal } from './ui.js';
import { state } from './state.js';
import { profName, namesFromIds } from './comunes.js';
import { supabase } from './supabase.js';
import { TAREA_PRIOR, tareaForm } from './tareas.js';
import { openProcesoDetail } from './procesos.js';
import { navigate, lastBackupText, exportarRespaldo, revisarRespaldo, openSeguridad2FA, openNotificaciones } from './app.js';

// Abre un modal para enviar el recordatorio por WhatsApp (a los 5 abogados)
// o por correo (a todo el personal del bufete).
function recordarPorWhatsApp(p) {
  const texto = `Recordatorio LexFive\nProceso: ${p.caratula}\nAudiencia/plazo: ${fmtDateTime(p.proxima_audiencia)}\nResponsable: ${profName(p.abogado_id)}`;
  const enc = encodeURIComponent(texto);
  // Correos del personal del bufete (desde los perfiles), para el recordatorio por correo.
  const correosEquipo = (state.profiles || [])
    .filter(u => ['admin', 'procurador', 'abogado'].includes(u.rol) && u.email)
    .map(u => u.email);
  const asunto = encodeURIComponent('Recordatorio de audiencia/plazo — ' + (p.caratula || 'Proceso'));
  const mailtoEquipo = 'mailto:' + correosEquipo.join(',') + '?subject=' + asunto + '&body=' + enc;
  const body = `
    <p class="cell-sub" style="margin-bottom:14px">Toque cada botón para enviar el recordatorio por WhatsApp a cada abogado del equipo:</p>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${ABOGADOS.map(a => `<a class="btn" style="justify-content:flex-start;background:#25d366;color:#fff;border-color:#25d366" target="_blank" rel="noopener" href="https://wa.me/${a.wa}?text=${enc}">Enviar a ${esc(a.nombre)}</a>`).join('')}
    </div>
    <p class="cell-sub" style="margin:18px 0 8px">O envíelo por <strong>correo</strong> a todo el personal del bufete de una sola vez:</p>
    ${correosEquipo.length
      ? `<a class="btn btn--primary" style="justify-content:flex-start" href="${mailtoEquipo}">✉️ Enviar recordatorio por correo (${correosEquipo.length})</a>`
      : `<p class="cell-sub" style="color:var(--danger,#c0392b)">No hay correos registrados en los perfiles del personal, así que no se puede enviar por correo todavía.</p>`}`;
  openModal('Recordar audiencia / plazo', body, [{ label: 'Cerrar', class: 'btn--primary', onClick: closeModal }]);
}

export async function renderDashboard() {
  loading();
  const { data: procesos } = await supabase.from('procesos').select('*').eq('eliminado', false).order('proxima_audiencia', { ascending: true });
  const list = procesos || [];
  const activos = list.filter(p => !['archivado', 'concluido'].includes(p.estado)).length;
  const ahora = new Date();
  const proximas = list.filter(p => p.proxima_audiencia && new Date(p.proxima_audiencia) >= ahora)
    .sort((a, b) => new Date(a.proxima_audiencia) - new Date(b.proxima_audiencia));
  const mios = list.filter(p => p.abogado_id === state.profile.id || p.procurador_id === state.profile.id || (p.abogados_ids || []).includes(state.profile.id) || (p.procuradores_ids || []).includes(state.profile.id)).length;

  // Consultas nuevas recibidas desde el formulario de contacto de la web
  let consultasNuevas = 0;
  try {
    const { count } = await supabase.from('consultas').select('id', { count: 'exact', head: true }).eq('estado', 'nueva');
    consultasNuevas = count || 0;
  } catch (e) { consultasNuevas = 0; }

  // Tareas pendientes (no completadas)
  let tareasPend = 0;
  try {
    const { count } = await supabase.from('tareas').select('id', { count: 'exact', head: true }).neq('estado', 'hecha');
    tareasPend = count || 0;
  } catch (e) { tareasPend = 0; }

  // Mis tareas pendientes (asignadas a mí) para el panel personal "Mis pendientes".
  let misTareas = [];
  try {
    const { data } = await supabase.from('tareas').select('*')
      .neq('estado', 'hecha').eq('asignado_a', state.profile.id)
      .order('vence', { ascending: true, nullsFirst: false });
    misTareas = data || [];
  } catch (e) { misTareas = []; }

  // Mi agenda próxima (7 días): audiencias de mis procesos + plazos pendientes.
  const esMio = (p) => p.abogado_id === state.profile.id || p.procurador_id === state.profile.id
    || (p.abogados_ids || []).includes(state.profile.id) || (p.procuradores_ids || []).includes(state.profile.id);
  const en7d = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);
  const misProcesos = list.filter(esMio);
  let miAgenda = misProcesos
    .filter(p => p.proxima_audiencia && new Date(p.proxima_audiencia) >= ahora && new Date(p.proxima_audiencia) <= en7d && !['archivado', 'concluido'].includes(p.estado))
    .map(p => ({ tipo: 'Audiencia', fecha: p.proxima_audiencia, titulo: p.caratula, proceso_id: p.id }));
  try {
    const idsMios = misProcesos.map(p => p.id);
    if (idsMios.length) {
      const { data: evs } = await supabase.from('eventos').select('*')
        .eq('estado', 'pendiente')
        .gte('fecha', ahora.toISOString()).lte('fecha', en7d.toISOString())
        .in('proceso_id', idsMios);
      const caratulaDe = {}; misProcesos.forEach(p => { caratulaDe[p.id] = p.caratula; });
      (evs || []).forEach(e => miAgenda.push({ tipo: e.tipo || 'Plazo', fecha: e.fecha, titulo: e.titulo + (caratulaDe[e.proceso_id] ? ' — ' + caratulaDe[e.proceso_id] : ''), proceso_id: e.proceso_id }));
    }
  } catch (e) { /* la tabla eventos puede no existir aún; se ignora */ }
  miAgenda.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  // Por cobrar (solo admin y abogado)
  let porCobrar = null;
  let ingresos6 = [];
  if (['admin', 'abogado'].includes(state.profile.rol)) {
    try {
      const [{ data: hs }, { data: ps }] = await Promise.all([
        supabase.from('honorarios').select('monto'),
        supabase.from('pagos').select('monto,fecha')
      ]);
      const th = (hs || []).reduce((a, b) => a + Number(b.monto || 0), 0);
      const tp = (ps || []).reduce((a, b) => a + Number(b.monto || 0), 0);
      porCobrar = th - tp;
      // Ingresos (pagos recibidos) de los últimos 6 meses, para el gráfico.
      const porMes = {};
      (ps || []).forEach(p => { if (p.fecha) { const k = String(p.fecha).slice(0, 7); porMes[k] = (porMes[k] || 0) + Number(p.monto || 0); } });
      for (let i = 5; i >= 0; i--) {
        const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
        const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        ingresos6.push({ label: d.toLocaleDateString('es-BO', { month: 'short', year: '2-digit' }), value: Math.round(porMes[k] || 0) });
      }
    } catch (e) { porCobrar = null; }
  }

  // Alertas: audiencias vencidas y dentro de los próximos 7 días
  const en7 = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);
  const vencidas = list.filter(p => p.proxima_audiencia && new Date(p.proxima_audiencia) < ahora && !['archivado', 'concluido'].includes(p.estado))
    .sort((a, b) => new Date(b.proxima_audiencia) - new Date(a.proxima_audiencia));
  const urgentes = proximas.filter(p => new Date(p.proxima_audiencia) <= en7);

  // Datos para los gráficos
  const porEstado = Object.entries(ESTADOS)
    .map(([k, v]) => ({ label: v, value: list.filter(p => p.estado === k).length }));
  const matCount = {};
  list.forEach(p => { const mt = p.materia || 'Sin materia'; matCount[mt] = (matCount[mt] || 0) + 1; });
  const porMateria = Object.entries(matCount).map(([k, v]) => ({ label: k, value: v }))
    .sort((a, b) => b.value - a.value).slice(0, 8);
  const activosList = list.filter(p => !['archivado', 'concluido'].includes(p.estado));
  const aboCount = {};
  activosList.forEach(p => {
    const ids = (p.abogados_ids && p.abogados_ids.length) ? p.abogados_ids : (p.abogado_id ? [p.abogado_id] : []);
    ids.forEach(id => { aboCount[id] = (aboCount[id] || 0) + 1; });
  });
  const porAbogado = Object.entries(aboCount).map(([id, v]) => ({ label: profName(id), value: v }))
    .sort((a, b) => b.value - a.value).slice(0, 8);

  const alertRow = (p, cls) => `
    <div class="alert-row ${cls}">
      <div><strong>${esc(p.caratula)}</strong><div class="cell-sub">${fmtDateTime(p.proxima_audiencia)} · ${esc(profName(p.abogado_id))}</div></div>
      <button class="btn btn--ghost btn--sm js-recordar" data-id="${p.id}">${ICON.whatsapp} Recordar a los 5</button>
    </div>`;
  const alertasHtml = (vencidas.length || urgentes.length) ? `
    <div class="card">
      <div class="card__head"><h3>${ICON.alerta} Alertas de audiencias y plazos</h3></div>
      <div class="card__body">
        ${vencidas.length ? `<p class="alert-title alert-title--red">Vencidas (${vencidas.length})</p>${vencidas.slice(0, 5).map(p => alertRow(p, 'alert-row--red')).join('')}` : ''}
        ${urgentes.length ? `<p class="alert-title alert-title--amber" style="margin-top:${vencidas.length ? '16px' : '0'}">Próximas (7 días) (${urgentes.length})</p>${urgentes.slice(0, 5).map(p => alertRow(p, 'alert-row--amber')).join('')}` : ''}
      </div>
    </div>` : '';

  // Panel personal: tareas pendientes asignadas a quien inició sesión, con las
  // vencidas / que vencen hoy resaltadas y acciones rápidas (completar / abrir).
  const hoyS = hoyISO();
  const misPendientesHtml = `
    <div class="card">
      <div class="card__head"><h3>${ICON.tareas} Mis pendientes</h3>${misTareas.length ? `<button class="btn btn--ghost btn--sm" id="btnVerTareas" type="button">Ver tablero</button>` : ''}</div>
      <div class="card__body--flush">
        ${misTareas.length ? `<div class="pend-list">${misTareas.slice(0, 8).map(t => {
          const vencida = t.vence && t.vence < hoyS;
          const venceHoy = t.vence === hoyS;
          const vencHtml = t.vence
            ? `<span class="pend-venc ${vencida ? 'pend-venc--red' : (venceHoy ? 'pend-venc--amber' : '')}">${vencida ? 'Venció ' + fmtDate(t.vence) : (venceHoy ? 'Vence hoy' : 'Vence ' + fmtDate(t.vence))}</span>`
            : '';
          return `<div class="pend-row">
            <button class="pend-row__check js-done-tarea" data-id="${t.id}" type="button" title="Marcar como hecha" aria-label="Completar tarea">✓</button>
            <div class="pend-row__main js-open-tarea" data-id="${t.id}">
              <div class="cell-strong">${esc(t.titulo)}</div>
              <div class="pend-row__meta"><span class="badge-prio badge-prio--${t.prioridad}">${TAREA_PRIOR[t.prioridad] || t.prioridad}</span>${vencHtml}</div>
            </div>
          </div>`;
        }).join('')}</div>${misTareas.length > 8 ? `<p class="cell-sub" style="padding:10px 16px">y ${misTareas.length - 8} tarea(s) más…</p>` : ''}`
        : `<div class="empty" style="padding:26px 16px">${ICON.tareas}<p>No tiene tareas pendientes asignadas. ¡Buen trabajo!</p></div>`}
      </div>
    </div>`;

  // Panel "Mi agenda": audiencias de mis procesos y plazos de los próximos 7 días.
  const fechaCorta = (iso) => { try { return new Date(iso).toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + fmtHora(iso); } catch (e) { return fmtDateTime(iso); } };
  const miAgendaHtml = miAgenda.length ? `
    <div class="card">
      <div class="card__head"><h3>${ICON.audiencia} Mi agenda · próximos 7 días</h3><button class="btn btn--ghost btn--sm" id="btnVerAgenda" type="button">Ver calendario</button></div>
      <div class="card__body--flush">
        <div class="pend-list">${miAgenda.slice(0, 8).map(a => {
          const dia = (a.fecha || '').slice(0, 10);
          const esHoy = dia === hoyS;
          return `<div class="pend-row pend-row--agenda js-open-proc" data-id="${a.proceso_id}">
            <span class="agenda-tag agenda-tag--${a.tipo === 'Audiencia' ? 'aud' : 'plazo'}">${esc(a.tipo)}</span>
            <div class="pend-row__main">
              <div class="cell-strong">${esc(a.titulo)}</div>
              <div class="pend-row__meta"><span class="pend-venc ${esHoy ? 'pend-venc--amber' : ''}">${esHoy ? 'Hoy · ' + fmtHora(a.fecha) : fechaCorta(a.fecha)}</span></div>
            </div>
          </div>`;
        }).join('')}</div>${miAgenda.length > 8 ? `<p class="cell-sub" style="padding:10px 16px">y ${miAgenda.length - 8} más…</p>` : ''}
      </div>
    </div>` : '';

  content().innerHTML = `
    <div class="stats-grid">
      <div class="metric"><div class="metric__top"><div class="metric__icon">${ICON.procesos}</div></div><div class="metric__num">${list.length}</div><div class="metric__label">Procesos totales</div></div>
      <div class="metric"><div class="metric__top"><div class="metric__icon">${ICON.dashboard}</div></div><div class="metric__num">${activos}</div><div class="metric__label">Procesos activos</div></div>
      <div class="metric"><div class="metric__top"><div class="metric__icon">${ICON.audiencia}</div></div><div class="metric__num">${proximas.length}</div><div class="metric__label">Audiencias próximas</div></div>
      <div class="metric"><div class="metric__top"><div class="metric__icon">${ICON.clientes}</div></div><div class="metric__num">${mios}</div><div class="metric__label">Mis procesos</div></div>
      <div class="metric" id="mConsultas" style="cursor:pointer" ${hint('Mensajes nuevos enviados desde el formulario de contacto de la web. Haga clic para verlos y responder.')}><div class="metric__top"><div class="metric__icon">${ICON.consultas}</div></div><div class="metric__num">${consultasNuevas}</div><div class="metric__label">Consultas nuevas</div></div>
      <div class="metric" id="mTareas" style="cursor:pointer" ${hint('Tareas del equipo que aún no se completan. Haga clic para ver el tablero.')}><div class="metric__top"><div class="metric__icon">${ICON.tareas}</div></div><div class="metric__num">${tareasPend}</div><div class="metric__label">Tareas pendientes</div></div>
      ${porCobrar !== null ? `<div class="metric" id="mPorCobrar" style="cursor:pointer" ${hint('Honorarios facturados menos lo cobrado. Haga clic para ver el detalle.')}><div class="metric__top"><div class="metric__icon">${ICON.dinero}</div></div><div class="metric__num" style="font-size:1.4rem">${fmtMoneda(porCobrar)}</div><div class="metric__label">Por cobrar</div></div>` : ''}
    </div>

    ${misPendientesHtml}

    ${miAgendaHtml}

    ${alertasHtml}

    <div class="charts-grid">
      <div class="card"><div class="card__head"><h3>${ICON.grafico} Procesos por estado</h3></div><div class="card__body">${barChart(porEstado)}</div></div>
      <div class="card"><div class="card__head"><h3>${ICON.grafico} Procesos por materia</h3></div><div class="card__body">${barChart(porMateria)}</div></div>
      <div class="card"><div class="card__head"><h3>${ICON.grafico} Carga de trabajo por abogado (casos activos)</h3></div><div class="card__body">${barChart(porAbogado)}</div></div>
      ${ingresos6.length ? `<div class="card"><div class="card__head"><h3>${ICON.grafico} Ingresos por mes (Bs, últimos 6)</h3></div><div class="card__body">${barChart(ingresos6)}</div></div>` : ''}
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
              <td>${esc(namesFromIds(p.abogados_ids) || profName(p.abogado_id))}</td>
            </tr>`).join('')}</tbody></table></div>`
        : `<div class="empty">${ICON.audiencia}<p>No hay audiencias ni plazos próximos registrados.</p></div>`}
      </div>
    </div>

    <div class="card">
      <div class="card__head"><h3>${ICON.doc} Manuales y guías</h3></div>
      <div class="card__body">
        <p class="cell-sub" style="margin-bottom:10px">Descargue los manuales en PDF para aprender a usar el sistema o para compartirlos con su equipo y sus clientes.</p>
        <div class="manual-links">
          <a class="btn btn--ghost btn--sm" href="../Manual-Sistema-LexFive.pdf" download>Manual completo del sistema</a>
          <a class="btn btn--ghost btn--sm" href="../Manual-Abogados-LexFive.pdf" download>Manual para abogados</a>
          <a class="btn btn--ghost btn--sm" href="../Manual-Clientes-LexFive.pdf" download>Manual para clientes</a>
        </div>
        <p class="cell-sub" style="margin-top:8px">El «Manual para clientes» es ideal para enviárselo a sus clientes cuando creen su cuenta.</p>
      </div>
    </div>

    ${state.profile.rol !== 'cliente' ? `
    <div class="card">
      <div class="card__head"><h3>${ICON.llave} Seguridad de la cuenta</h3></div>
      <div class="card__body">
        <p class="cell-sub" style="margin-bottom:10px">Active la <strong>verificación en dos pasos (2FA)</strong> para proteger su acceso: además de la contraseña, se le pedirá un código que genera una app en su teléfono (Google Authenticator, Microsoft Authenticator, Authy…).</p>
        <button class="btn btn--ghost btn--sm" id="btn2FA" type="button">Verificación en dos pasos</button>
        <button class="btn btn--ghost btn--sm" id="btnPush" type="button">Notificaciones</button>
      </div>
    </div>` : ''}

    ${state.profile.rol === 'admin' ? `
    <div class="card">
      <div class="card__head"><h3>${ICON.doc} Respaldos y datos</h3></div>
      <div class="card__body">
        <p class="cell-sub" style="margin-bottom:10px">La base de datos se respalda <strong>automáticamente cada día</strong> en GitHub (pestaña «Actions» → «Respaldo de base de datos»). Además, puede descargar cuando quiera una copia manual de los datos principales en formato JSON.</p>
        <button class="btn btn--ghost btn--sm" id="btnExportBackup" type="button">Exportar respaldo (JSON)</button>
        <button class="btn btn--ghost btn--sm" id="btnRevisarBackup" type="button">Revisar un respaldo</button>
        <span class="cell-sub" id="lastBackupInfo" style="margin-left:10px">${lastBackupText()}</span>
      </div>
    </div>` : ''}`;

  content().querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => openProcesoDetail(tr.dataset.id));
  content().querySelectorAll('.js-recordar').forEach(btn => btn.onclick = (e) => {
    e.stopPropagation();
    const p = list.find(x => x.id === btn.dataset.id);
    if (p) recordarPorWhatsApp(p);
  });
  const mc = $('#mConsultas'); if (mc) mc.onclick = () => navigate('consultas');
  const mt = $('#mTareas'); if (mt) mt.onclick = () => navigate('tareas');
  const mpc = $('#mPorCobrar'); if (mpc) mpc.onclick = () => navigate('finanzas');
  const beb = $('#btnExportBackup'); if (beb) beb.onclick = () => exportarRespaldo(beb);
  const brb = $('#btnRevisarBackup'); if (brb) brb.onclick = () => revisarRespaldo();
  const b2fa = $('#btn2FA'); if (b2fa) b2fa.onclick = () => openSeguridad2FA();
  const bpush = $('#btnPush'); if (bpush) bpush.onclick = () => openNotificaciones();

  // Panel "Mis pendientes": completar una tarea con un toque, abrirla para
  // editarla, o ir al tablero completo.
  const bvt = $('#btnVerTareas'); if (bvt) bvt.onclick = () => navigate('tareas');
  content().querySelectorAll('.js-open-tarea').forEach(el => el.onclick = () => {
    const t = misTareas.find(x => x.id === el.dataset.id);
    if (t) tareaForm(t);
  });
  content().querySelectorAll('.js-done-tarea').forEach(b => b.onclick = async (e) => {
    e.stopPropagation();
    b.disabled = true;
    const { error } = await supabase.from('tareas').update({ estado: 'hecha', updated_at: new Date().toISOString() }).eq('id', b.dataset.id);
    if (error) { b.disabled = false; toast('No se pudo actualizar: ' + error.message, 'error'); return; }
    toast('Tarea completada. ¡Bien hecho!', 'success');
    renderDashboard();
  });

  // Panel "Mi agenda": abrir el proceso o ir al calendario.
  const bva = $('#btnVerAgenda'); if (bva) bva.onclick = () => navigate('agenda');
  content().querySelectorAll('.js-open-proc').forEach(el => el.onclick = () => {
    if (el.dataset.id) openProcesoDetail(el.dataset.id);
  });
}
