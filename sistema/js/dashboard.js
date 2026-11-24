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
import { openConsultaDetail, consultaNombre } from './consultas.js';
import { clienteForm } from './clientes.js';
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
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString();

  let procesos = [], clientesActivos = 0, consultasNuevas = 0, tareasPend = 0, certsMes = 0;
  let ultimasConsultas = [], proximasTareas = [], misTareas = [];

  try {
    const [
      procRes,
      cliRes,
      consRes,
      tarRes,
      certRes,
      ultConsRes,
      proxTarRes,
      misTarRes
    ] = await Promise.all([
      supabase.from('procesos').select('*').eq('eliminado', false).order('proxima_audiencia', { ascending: true }),
      supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('eliminado', false),
      supabase.from('consultas').select('id', { count: 'exact', head: true }).eq('estado', 'nueva'),
      supabase.from('tareas').select('id', { count: 'exact', head: true }).neq('estado', 'hecha'),
      supabase.from('certificados').select('id', { count: 'exact', head: true }).gte('created_at', inicioMes),
      supabase.from('consultas').select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from('tareas').select('*').neq('estado', 'hecha').order('vence', { ascending: true, nullsFirst: false }).limit(5),
      supabase.from('tareas').select('*').neq('estado', 'hecha').eq('asignado_a', state.profile.id).order('vence', { ascending: true, nullsFirst: false }).limit(8)
    ]);

    procesos = procRes.data || [];
    clientesActivos = cliRes.count || 0;
    consultasNuevas = consRes.count || 0;
    tareasPend = tarRes.count || 0;
    certsMes = certRes.count || 0;
    ultimasConsultas = ultConsRes.data || [];
    proximasTareas = proxTarRes.data || [];
    misTareas = misTarRes.data || [];
  } catch (errDb) {
    console.warn('Carga parcial del dashboard:', errDb);
  }

  const list = procesos;
  const activos = list.filter(p => !['archivado', 'concluido'].includes(p.estado)).length;
  const proximas = list.filter(p => p.proxima_audiencia && new Date(p.proxima_audiencia) >= ahora)
    .sort((a, b) => new Date(a.proxima_audiencia) - new Date(b.proxima_audiencia));
  const mios = list.filter(p => p.abogado_id === state.profile.id || p.procurador_id === state.profile.id || (p.abogados_ids || []).includes(state.profile.id) || (p.procuradores_ids || []).includes(state.profile.id)).length;

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
  } catch (e) { /* tabla eventos opcional */ }
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

  const hoyS = hoyISO();
  const fechaHoyStr = ahora.toLocaleDateString('es-BO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const fechaHoyCap = fechaHoyStr.charAt(0).toUpperCase() + fechaHoyStr.slice(1);

  // Panel personal adicional si hay tareas asignadas
  const misPendientesHtml = misTareas.length ? `
    <div class="card">
      <div class="card__head" style="justify-content:space-between;">
        <h3>${ICON.tareas} Mis pendientes asignados</h3>
        <button class="btn btn--ghost btn--sm" id="btnVerTareas" type="button">Ver tablero</button>
      </div>
      <div class="card__body--flush">
        <div class="pend-list">${misTareas.slice(0, 8).map(t => {
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
        }).join('')}</div>
      </div>
    </div>` : '';

  const fechaCorta = (iso) => { try { return new Date(iso).toLocaleDateString('es-BO', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + fmtHora(iso); } catch (e) { return fmtDateTime(iso); } };
  const miAgendaHtml = miAgenda.length ? `
    <div class="card">
      <div class="card__head" style="justify-content:space-between;">
        <h3>${ICON.audiencia} Mi agenda · próximos 7 días</h3>
        <button class="btn btn--ghost btn--sm" id="btnVerAgenda" type="button">Ver calendario</button>
      </div>
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
        }).join('')}</div>
      </div>
    </div>` : '';

  content().innerHTML = `
    <!-- 1. HERO Y ACCESOS RÁPIDOS DEL DESPACHO -->
    <div class="dash-hero">
      <div class="dash-hero__info">
        <h2>Hola, ${esc(profName(state.profile.id))}</h2>
        <p>Sistema de Gestión Jurídica · LexFive · ${esc(fechaHoyCap)}</p>
      </div>
      <div class="dash-quick-actions">
        <button class="btn btn--primary" id="dashBtnNuevaConsulta" type="button">${ICON.plus} Nueva consulta / cliente</button>
        <button class="btn btn--ghost" id="dashBtnNuevoEscrito" type="button">${ICON.doc} Nuevo escrito</button>
        <button class="btn btn--ghost" id="dashBtnEmitirCert" type="button">📜 Emitir certificado / pasantía</button>
        <button class="btn btn--ghost" id="dashBtnPublicarBlog" type="button">${ICON.blog} Publicar en Blog</button>
      </div>
    </div>

    <!-- 2. 4 TARJETAS KPI CLICABLES -->
    <div class="stats-grid dashboard-kpis" style="margin-bottom:24px;">
      <div class="metric metric--clickable" id="kpiConsultas" title="Ver bandeja de consultas">
        <div class="metric__top">
          <div class="metric__icon" style="background:rgba(239,68,68,0.12);color:#ef4444;">${ICON.consultas}</div>
          <span class="badge" style="background:rgba(239,68,68,0.15);color:#ef4444;font-size:0.72rem;font-weight:700;">${consultasNuevas} nuevas</span>
        </div>
        <div class="metric__num">${consultasNuevas}</div>
        <div class="metric__label">Consultas pendientes</div>
      </div>

      <div class="metric metric--clickable" id="kpiClientes" title="Ver clientes y causas">
        <div class="metric__top">
          <div class="metric__icon" style="background:rgba(59,130,246,0.12);color:#3b82f6;">${ICON.clientes}</div>
          <span class="badge" style="background:rgba(59,130,246,0.15);color:#3b82f6;font-size:0.72rem;font-weight:700;">Activos</span>
        </div>
        <div class="metric__num">${clientesActivos}</div>
        <div class="metric__label">Clientes activos</div>
      </div>

      <div class="metric metric--clickable" id="kpiTareas" title="Ver tareas y plazos">
        <div class="metric__top">
          <div class="metric__icon" style="background:rgba(245,158,11,0.12);color:#f59e0b;">${ICON.tareas}</div>
          <span class="badge" style="background:rgba(245,158,11,0.15);color:#f59e0b;font-size:0.72rem;font-weight:700;">Pendientes</span>
        </div>
        <div class="metric__num">${tareasPend}</div>
        <div class="metric__label">Tareas y plazos próximos</div>
      </div>

      <div class="metric metric--clickable" id="kpiCerts" title="Ver certificados y pasantías">
        <div class="metric__top">
          <div class="metric__icon" style="background:rgba(16,185,129,0.12);color:#10b981;">${ICON.doc}</div>
          <span class="badge" style="background:rgba(16,185,129,0.15);color:#10b981;font-size:0.72rem;font-weight:700;">Este mes</span>
        </div>
        <div class="metric__num">${certsMes}</div>
        <div class="metric__label">Certificados emitidos</div>
      </div>
    </div>

    <!-- 3. BLOQUE «ATENCIÓN PRIORITARIA» (2 COLUMNAS) -->
    <div class="priority-grid">
      <!-- Columna 1: Últimas consultas recibidas -->
      <div class="card" style="margin-bottom:0;">
        <div class="card__head" style="justify-content:space-between;">
          <h3 style="margin:0;font-size:1.15rem;display:flex;align-items:center;gap:8px;">${ICON.consultas} Últimas consultas recibidas</h3>
          <button class="btn btn--ghost btn--sm" id="dashVerConsultas" type="button">Ver todas</button>
        </div>
        <div class="card__body--flush">
          ${ultimasConsultas.length ? ultimasConsultas.map(c => `
            <div class="priority-item">
              <div class="priority-item__main">
                <div class="priority-item__title">${esc(consultaNombre(c))}</div>
                <div class="priority-item__sub">
                  <span>${fmtDate(c.created_at)}</span>
                  ${c.telefono ? `<span>· ${esc(c.telefono)}</span>` : ''}
                  ${c.asunto ? `<span>· ${esc(c.asunto)}</span>` : ''}
                  ${c.estado === 'nueva' ? `<span class="badge" style="background:rgba(239,68,68,0.12);color:#ef4444;font-size:.65rem;padding:2px 6px;">Nueva</span>` : `<span class="badge" style="background:rgba(16,185,129,0.12);color:#10b981;font-size:.65rem;padding:2px 6px;">${esc(c.estado)}</span>`}
                </div>
              </div>
              <button class="btn btn--primary btn--sm js-dash-ver-consulta" data-id="${c.id}" type="button" style="white-space:nowrap;font-size:.78rem;">Ver / Responder</button>
            </div>
          `).join('') : `<div class="empty" style="padding:24px;">${ICON.consultas}<p>No hay consultas registradas aún.</p></div>`}
        </div>
      </div>

      <!-- Columna 2: Próximas tareas pendientes -->
      <div class="card" style="margin-bottom:0;">
        <div class="card__head" style="justify-content:space-between;">
          <h3 style="margin:0;font-size:1.15rem;display:flex;align-items:center;gap:8px;">${ICON.tareas} Próximas tareas pendientes</h3>
          <button class="btn btn--ghost btn--sm" id="dashVerTareas" type="button">Ver tablero</button>
        </div>
        <div class="card__body--flush">
          ${proximasTareas.length ? proximasTareas.map(t => {
            const vencida = t.vence && t.vence < hoyS;
            const venceHoy = t.vence === hoyS;
            return `
              <div class="priority-item">
                <button class="pend-row__check js-dash-done-tarea" data-id="${t.id}" type="button" title="Marcar como hecha" aria-label="Completar" style="width:24px;height:24px;margin-right:8px;font-size:11px;border-radius:6px;border:1.5px solid var(--line);background:transparent;cursor:pointer;">✓</button>
                <div class="priority-item__main js-dash-open-tarea" data-id="${t.id}" style="cursor:pointer;">
                  <div class="priority-item__title">${esc(t.titulo)}</div>
                  <div class="priority-item__sub">
                    <span class="badge-prio badge-prio--${t.prioridad}" style="font-size:.65rem;">${TAREA_PRIOR[t.prioridad] || t.prioridad}</span>
                    ${t.vence ? `<span style="font-weight:600;color:${vencida ? '#ef4444' : (venceHoy ? '#f59e0b' : 'inherit')}">${vencida ? 'Venció ' + fmtDate(t.vence) : (venceHoy ? 'Vence hoy' : 'Vence ' + fmtDate(t.vence))}</span>` : ''}
                    ${t.asignado_a ? `<span>· ${esc(profName(t.asignado_a))}</span>` : ''}
                  </div>
                </div>
              </div>
            `;
          }).join('') : `<div class="empty" style="padding:24px;">${ICON.tareas}<p>No hay tareas pendientes. ¡Todo al día!</p></div>`}
        </div>
      </div>
    </div>

    <!-- 4. PANELES PERSONALES Y ALERTAS -->
    ${misPendientesHtml}
    ${miAgendaHtml}
    ${alertasHtml}

    <!-- 5. ANALÍTICA DE CASOS Y HONORARIOS -->
    <div class="charts-grid" style="margin-top:20px;">
      <div class="card"><div class="card__head"><h3>${ICON.grafico} Procesos por estado</h3></div><div class="card__body">${barChart(porEstado)}</div></div>
      <div class="card"><div class="card__head"><h3>${ICON.grafico} Procesos por materia</h3></div><div class="card__body">${barChart(porMateria)}</div></div>
      <div class="card"><div class="card__head"><h3>${ICON.grafico} Carga de trabajo por abogado (casos activos)</h3></div><div class="card__body">${barChart(porAbogado)}</div></div>
      ${ingresos6.length ? `<div class="card"><div class="card__head"><h3>${ICON.grafico} Ingresos por mes (Bs, últimos 6)</h3></div><div class="card__body">${barChart(ingresos6)}</div></div>` : ''}
    </div>

    <!-- 6. PRÓXIMAS AUDIENCIAS Y PLAZOS -->
    <div class="card">
      <div class="card__head" style="justify-content:space-between;">
        <h3 style="margin:0;">Próximas audiencias y plazos</h3>
        ${proximas.length ? `<button class="btn btn--ghost btn--sm" id="btnVerAgendaBottom" type="button">Ver calendario</button>` : ''}
      </div>
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

    <!-- 7. MANUALES Y SEGURIDAD -->
    <div class="card">
      <div class="card__head" style="justify-content:space-between;">
        <h3 style="margin:0;">${ICON.doc} Manuales y guías</h3>
      </div>
      <div class="card__body">
        <p class="cell-sub" style="margin-bottom:10px">Descargue los manuales en PDF para aprender a usar el sistema o para compartirlos con su equipo y sus clientes.</p>
        <div class="manual-links">
          <a class="btn btn--ghost btn--sm" href="../Manual-Sistema-LexFive.pdf" download>Manual completo del sistema</a>
          <a class="btn btn--ghost btn--sm" href="../Manual-Abogados-LexFive.pdf" download>Manual para abogados</a>
          <a class="btn btn--ghost btn--sm" href="../Manual-Clientes-LexFive.pdf" download>Manual para clientes</a>
        </div>
      </div>
    </div>

    ${state.profile.rol !== 'cliente' ? `
    <div class="card">
      <div class="card__head" style="justify-content:space-between;">
        <h3 style="margin:0;">${ICON.llave} Seguridad de la cuenta</h3>
      </div>
      <div class="card__body">
        <p class="cell-sub" style="margin-bottom:10px">Active la <strong>verificación en dos pasos (2FA)</strong> para proteger su acceso con un código temporal.</p>
        <button class="btn btn--ghost btn--sm" id="btn2FA" type="button">Verificación en dos pasos</button>
        <button class="btn btn--ghost btn--sm" id="btnPush" type="button">Notificaciones</button>
      </div>
    </div>` : ''}

    ${state.profile.rol === 'admin' ? `
    <div class="card">
      <div class="card__head" style="justify-content:space-between;">
        <h3 style="margin:0;">${ICON.doc} Respaldos y datos</h3>
      </div>
      <div class="card__body">
        <p class="cell-sub" style="margin-bottom:10px">Respaldo manual en formato JSON y verificación de copias.</p>
        <button class="btn btn--ghost btn--sm" id="btnExportBackup" type="button">Exportar respaldo (JSON)</button>
        <button class="btn btn--ghost btn--sm" id="btnRevisarBackup" type="button">Revisar un respaldo</button>
        <span class="cell-sub" id="lastBackupInfo" style="margin-left:10px">${lastBackupText()}</span>
      </div>
    </div>` : ''}
  `;

  // Listeners de los 4 KPIs
  const kCons = $('#kpiConsultas'); if (kCons) kCons.onclick = () => navigate('consultas');
  const kCli = $('#kpiClientes'); if (kCli) kCli.onclick = () => navigate('clientes');
  const kTar = $('#kpiTareas'); if (kTar) kTar.onclick = () => navigate('tareas');
  const kCert = $('#kpiCerts'); if (kCert) kCert.onclick = () => navigate('certificados');

  // Listeners de accesos rápidos
  const btnNuevConsCli = $('#dashBtnNuevaConsulta');
  if (btnNuevConsCli) {
    btnNuevConsCli.onclick = () => {
      openModal('Nueva consulta o cliente', `
        <p class="cell-sub" style="margin-bottom:14px">Seleccione la acción rápida a realizar:</p>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <button class="btn btn--primary" id="modalBtnNewCli" type="button" style="justify-content:flex-start;padding:12px 16px;">
            👥 <strong>Registrar nuevo cliente</strong>
          </button>
          <button class="btn btn--ghost" id="modalBtnGoCons" type="button" style="justify-content:flex-start;padding:12px 16px;">
            ✉️ <strong>Ir a consultas web recibidas</strong>
          </button>
        </div>
      `, [{ label: 'Cerrar', class: 'btn--ghost', onClick: closeModal }], true);
      const mbc = document.getElementById('modalBtnNewCli');
      if (mbc) mbc.onclick = () => { closeModal(); clienteForm(null, () => renderDashboard()); };
      const mbgc = document.getElementById('modalBtnGoCons');
      if (mbgc) mbgc.onclick = () => { closeModal(); navigate('consultas'); };
    };
  }

  const btnNuevEsc = $('#dashBtnNuevoEscrito'); if (btnNuevEsc) btnNuevEsc.onclick = () => navigate('modelos');
  const btnEmCert = $('#dashBtnEmitirCert'); if (btnEmCert) btnEmCert.onclick = () => navigate('certificados');
  const btnPubBlog = $('#dashBtnPublicarBlog'); if (btnPubBlog) btnPubBlog.onclick = () => navigate('blog');

  // Listeners de Atención Prioritaria
  const dvc = $('#dashVerConsultas'); if (dvc) dvc.onclick = () => navigate('consultas');
  const dvt = $('#dashVerTareas'); if (dvt) dvt.onclick = () => navigate('tareas');
  const bvaBot = $('#btnVerAgendaBottom'); if (bvaBot) bvaBot.onclick = () => navigate('agenda');

  content().querySelectorAll('.js-dash-ver-consulta').forEach(btn => {
    btn.onclick = () => {
      const c = ultimasConsultas.find(x => x.id === btn.dataset.id);
      if (c) openConsultaDetail(c);
      else navigate('consultas');
    };
  });

  content().querySelectorAll('.js-dash-open-tarea').forEach(el => {
    el.onclick = () => {
      const t = proximasTareas.find(x => x.id === el.dataset.id);
      if (t) tareaForm(t, () => renderDashboard());
      else navigate('tareas');
    };
  });

  content().querySelectorAll('.js-dash-done-tarea').forEach(b => {
    b.onclick = async (e) => {
      e.stopPropagation();
      b.disabled = true;
      const { error } = await supabase.from('tareas').update({ estado: 'hecha', updated_at: new Date().toISOString() }).eq('id', b.dataset.id);
      if (error) { b.disabled = false; toast('No se pudo actualizar: ' + error.message, 'error'); return; }
      toast('Tarea completada.', 'success');
      renderDashboard();
    };
  });

  // Listeners de procesos y alertas
  content().querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => openProcesoDetail(tr.dataset.id));
  content().querySelectorAll('.js-recordar').forEach(btn => btn.onclick = (e) => {
    e.stopPropagation();
    const p = list.find(x => x.id === btn.dataset.id);
    if (p) recordarPorWhatsApp(p);
  });

  const beb = $('#btnExportBackup'); if (beb) beb.onclick = () => exportarRespaldo(beb);
  const brb = $('#btnRevisarBackup'); if (brb) brb.onclick = () => revisarRespaldo();
  const b2fa = $('#btn2FA'); if (b2fa) b2fa.onclick = () => openSeguridad2FA();
  const bpush = $('#btnPush'); if (bpush) bpush.onclick = () => openNotificaciones();

  const bvt = $('#btnVerTareas'); if (bvt) bvt.onclick = () => navigate('tareas');
  content().querySelectorAll('.js-open-tarea').forEach(el => el.onclick = () => {
    const t = misTareas.find(x => x.id === el.dataset.id);
    if (t) tareaForm(t, () => renderDashboard());
  });
  content().querySelectorAll('.js-done-tarea').forEach(b => b.onclick = async (e) => {
    e.stopPropagation();
    b.disabled = true;
    const { error } = await supabase.from('tareas').update({ estado: 'hecha', updated_at: new Date().toISOString() }).eq('id', b.dataset.id);
    if (error) { b.disabled = false; toast('No se pudo actualizar: ' + error.message, 'error'); return; }
    toast('Tarea completada.', 'success');
    renderDashboard();
  });

  const bva = $('#btnVerAgenda'); if (bva) bva.onclick = () => navigate('agenda');
  content().querySelectorAll('.js-open-proc').forEach(el => el.onclick = () => {
    if (el.dataset.id) openProcesoDetail(el.dataset.id);
  });
}
