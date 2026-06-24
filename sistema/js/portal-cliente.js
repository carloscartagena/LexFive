// ============================================================
//  PORTAL DEL CLIENTE
//  - Novedades: últimas actuaciones y documentos de SUS procesos
//    (fetchNovedades, updateNovedadesBadge para la campana/menú, renderNovedades).
//  - Mis procesos: lista de solo lectura de sus procesos y descarga del
//    estado de cuenta (renderMisProcesos, descargarEstadoCuenta).
//  Extraído de app.js (split por módulos).
// ============================================================
import { ICON } from './icons.js';
import { esc, hoyISO, fmtDate, fmtDateTime } from './util.js';
import { $, content } from './dom.js';
import { toast, loading } from './ui.js';
import { state } from './state.js';
import { badgeEstado } from './comunes.js';
import { supabase } from './supabase.js';
import { openProcesoDetail } from './procesos.js';
import { mountOpinion } from './opiniones.js';

async function fetchNovedades() {
  const [{ data: procs }, { data: acts }, { data: docs }] = await Promise.all([
    supabase.from('procesos').select('id,caratula').eq('eliminado', false),
    supabase.from('actuaciones').select('id,proceso_id,descripcion,fecha,created_at').order('created_at', { ascending: false }).limit(40),
    supabase.from('documentos').select('id,proceso_id,nombre,created_at').order('created_at', { ascending: false }).limit(40)
  ]);
  const cara = {}; (procs || []).forEach(p => { cara[p.id] = p.caratula; });
  const items = [];
  (acts || []).forEach(a => items.push({ ts: a.created_at || a.fecha, procId: a.proceso_id, cara: cara[a.proceso_id] || 'Proceso', tipo: 'Actuación', texto: a.descripcion || '' }));
  (docs || []).forEach(d => items.push({ ts: d.created_at, procId: d.proceso_id, cara: cara[d.proceso_id] || 'Proceso', tipo: 'Documento', texto: d.nombre || '' }));
  items.sort((a, b) => new Date(b.ts) - new Date(a.ts));
  return items.slice(0, 30);
}

// Pone (o quita) el contador de novedades nuevas en el menú del cliente.
export async function updateNovedadesBadge() {
  try {
    const items = await fetchNovedades();
    const visto = Number(localStorage.getItem('lexfive_nov_' + state.profile.id) || 0);
    const nuevos = items.filter(it => new Date(it.ts).getTime() > visto).length;
    const btn = document.querySelector('.nav-item[data-key="novedades"]');
    if (!btn) return;
    let b = btn.querySelector('.nav-badge');
    if (nuevos > 0) {
      if (!b) { b = document.createElement('span'); b.className = 'nav-badge'; btn.appendChild(b); }
      b.textContent = nuevos > 9 ? '9+' : String(nuevos);
    } else if (b) { b.remove(); }
  } catch (e) {}
}

export async function renderNovedades() {
  loading();
  const items = await fetchNovedades();
  const key = 'lexfive_nov_' + state.profile.id;
  const visto = Number(localStorage.getItem(key) || 0);

  content().innerHTML = `
    <div class="card">
      <div class="card__head"><h3>${ICON.campana} Novedades de sus procesos</h3></div>
      <div class="card__body--flush">
        ${items.length ? `<ul class="novedades">${items.map(it => {
          const esNuevo = new Date(it.ts).getTime() > visto;
          return `<li class="novedad ${esNuevo ? 'is-nuevo' : ''}" data-pid="${it.procId}">
            <div class="novedad__top">
              <span class="badge badge-mat">${it.tipo}</span>
              ${esNuevo ? '<span class="novedad__nuevo">Nuevo</span>' : ''}
              <span class="novedad__fecha">${fmtDate(it.ts)}</span>
            </div>
            <div class="cell-strong">${esc(it.cara)}</div>
            <div class="cell-sub">${esc(it.texto)}</div>
          </li>`;
        }).join('')}</ul>`
        : `<div class="empty">${ICON.campana}<p>Aún no hay novedades en sus procesos. Aquí verá cada avance que registre su abogado.</p></div>`}
      </div>
    </div>`;

  content().querySelectorAll('.novedad[data-pid]').forEach(li => li.onclick = () => openProcesoDetail(li.dataset.pid, true));

  // Marcar todo como visto y quitar el contador del menú.
  try { localStorage.setItem(key, String(Date.now())); } catch (e) {}
  updateNovedadesBadge();
}


// El bloque «Procesos» (renderProcesos + imprimirListaProcesos + procesoForm +
// saveProceso + openProcesoDetail + renderDocs/wireDocs/renderActs/wireTimelineDocs
// + deleteProceso + procesosToCSV) se movió a ./procesos.js. renderProcesos y
// openProcesoDetail se importan arriba; openPlazos se exporta para procesos.js.
// ============================================================
//  VISTA: PAPELERA DE PROCESOS (solo administrador)
// ============================================================
// La vista de Papelera (renderPapelera + papeleraProcesos/papeleraClientes,
// restaurar/eliminar definitivo de procesos y clientes) se movió a
// ./papelera.js (se importa renderPapelera arriba).

// El bloque «Clientes» (renderClientes + clienteForm + welcomeEmailText +
// mostrarCorreoBienvenida + saveCliente + deleteCliente) se movió a ./clientes.js
// (renderClientes y clienteForm se importan arriba).

// ============================================================
//  VISTA: BLOG
// ============================================================
// renderBlog (y articuloForm/saveArticulo/deleteArticulo) se movió a ./blog.js
// (se importa arriba renderBlog; las demás son internas del módulo).

// ============================================================
//  VISTA: USUARIOS / AUDITORÍA (solo admin)
// ============================================================
// renderUsuarios y renderAuditoria se movieron a ./admin.js (se importan arriba).

// ============================================================
//  PORTAL DEL CLIENTE (solo lectura de sus propios procesos)
// ============================================================
export async function renderMisProcesos() {
  loading();
  const { data } = await supabase.from('procesos').select('*').eq('eliminado', false).order('proxima_audiencia', { ascending: true });
  const procesos = data || [];
  const ahora = new Date();
  const proximas = procesos.filter(p => p.proxima_audiencia && new Date(p.proxima_audiencia) >= ahora).length;

  const waMsg = encodeURIComponent(`Hola, soy ${state.profile.nombre}, cliente de LexFive. Deseo hacer una consulta sobre mi proceso.`);
  const waUrl = `https://wa.me/${WHATSAPP}?text=${waMsg}`;

  content().innerHTML = `
    <div class="stats-grid">
      <div class="metric"><div class="metric__top"><div class="metric__icon">${ICON.procesos}</div></div><div class="metric__num">${procesos.length}</div><div class="metric__label">Mis procesos</div></div>
      <div class="metric"><div class="metric__top"><div class="metric__icon">${ICON.audiencia}</div></div><div class="metric__num">${proximas}</div><div class="metric__label">Audiencias próximas</div></div>
    </div>

    <div class="card" style="margin-bottom:18px">
      <div class="card__body" style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;justify-content:space-between">
        <p class="cell-sub" style="margin:0">¿Primera vez aquí? Descargue la guía rápida para aprender a usar su portal.</p>
        <a class="btn btn--ghost btn--sm" href="../Manual-Clientes-LexFive.pdf" download>${ICON.doc} Descargar guía del cliente</a>
      </div>
    </div>

    <div class="card">
      <div class="card__head">
        <h3>Mis procesos</h3>
        <span style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn--ghost btn--sm" id="btnEstadoCuenta" type="button">${ICON.doc} Mi estado de cuenta</button>
          <a class="btn btn--primary btn--sm" href="${waUrl}" target="_blank" rel="noopener">Consultar por WhatsApp</a>
        </span>
      </div>
      <div class="card__body--flush">
        ${procesos.length ? `<div class="table-wrap"><table class="data">
          <thead><tr><th>Carátula</th><th>Materia</th><th>Estado</th><th>Próx. audiencia</th></tr></thead>
          <tbody>${procesos.map(p => `
            <tr data-id="${p.id}">
              <td class="cell-strong">${esc(p.caratula)}<div class="cell-sub">${esc(p.numero || '')}</div></td>
              <td><span class="badge badge-mat">${esc(p.materia || '—')}</span></td>
              <td>${badgeEstado(p.estado)}</td>
              <td>${p.proxima_audiencia ? fmtDateTime(p.proxima_audiencia) : '—'}</td>
            </tr>`).join('')}</tbody></table></div>`
        : `<div class="empty">${ICON.procesos}<p>Aún no hay procesos asociados a su cuenta.<br>Verifique que se registró con el mismo correo que dejó en el bufete, o consúltenos por WhatsApp.</p></div>`}
      </div>
    </div>

    <div class="card" id="opinionDash" style="margin-top:18px"></div>`;
  content().querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => openProcesoDetail(tr.dataset.id, true));
  const bec = $('#btnEstadoCuenta'); if (bec) bec.onclick = () => descargarEstadoCuenta(procesos);
  mountOpinion($('#opinionDash'));
}

// Genera el estado de cuenta del cliente (honorarios y pagos de sus procesos)
// en una ventana lista para imprimir o guardar como PDF. Requiere que el
// cliente pueda leer sus honorarios/pagos (ver db/24_mejoras_portal_notif.sql);
// si aún no se aplicó ese permiso, no aparecerán movimientos y se avisa.
async function descargarEstadoCuenta(procesos) {
  const procIds = (procesos || []).map(p => p.id);
  if (!procIds.length) { toast('No hay procesos asociados a su cuenta.', 'error'); return; }
  const money = (n) => 'Bs ' + Number(n || 0).toFixed(2);
  let hs = [], ps = [];
  try {
    const [h, p] = await Promise.all([
      supabase.from('honorarios').select('proceso_id,concepto,monto,fecha').in('proceso_id', procIds),
      supabase.from('pagos').select('proceso_id,monto,metodo,fecha').in('proceso_id', procIds)
    ]);
    hs = h.data || []; ps = p.data || [];
  } catch (e) { hs = []; ps = []; }
  if (!hs.length && !ps.length) {
    toast('Aún no hay honorarios ni pagos registrados en sus procesos.', 'error');
    return;
  }
  const car = {}; (procesos || []).forEach(p => { car[p.id] = p.caratula; });
  let totalH = 0, totalP = 0;
  const bloques = procIds.map(pid => {
    const hh = hs.filter(x => x.proceso_id === pid);
    const pp = ps.filter(x => x.proceso_id === pid);
    if (!hh.length && !pp.length) return '';
    const sh = hh.reduce((a, b) => a + Number(b.monto || 0), 0);
    const sp = pp.reduce((a, b) => a + Number(b.monto || 0), 0);
    totalH += sh; totalP += sp;
    const filasH = hh.length ? hh.map(x => `<tr><td>${fmtDate(x.fecha)}</td><td>${esc(x.concepto || 'Honorario')}</td><td class="r">${money(x.monto)}</td></tr>`).join('') : '<tr><td colspan="3" class="muted">Sin cargos.</td></tr>';
    const filasP = pp.length ? pp.map(x => `<tr><td>${fmtDate(x.fecha)}</td><td>${esc(x.metodo || 'Pago')}</td><td class="r">${money(x.monto)}</td></tr>`).join('') : '<tr><td colspan="3" class="muted">Sin pagos.</td></tr>';
    return `<h2>${esc(car[pid] || 'Proceso')}</h2>
      <table><thead><tr><th colspan="3">Honorarios (cargos)</th></tr></thead><tbody>${filasH}</tbody></table>
      <table><thead><tr><th colspan="3">Pagos recibidos</th></tr></thead><tbody>${filasP}</tbody></table>
      <p class="saldo">Saldo del proceso: <strong>${money(sh - sp)}</strong></p>`;
  }).join('');
  const saldo = totalH - totalP;
  const win = window.open('', '_blank');
  if (!win) { toast('Permita las ventanas emergentes para descargar el estado de cuenta.', 'error'); return; }
  win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Estado de cuenta · LexFive</title>
    <style>
      *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#1a2330;margin:0;padding:28px;max-width:800px;margin:auto}
      .hd{background:#0e1b2c;color:#fff;padding:18px 22px;border-radius:10px;margin-bottom:18px}
      .hd b{font-size:20px} .hd .g{color:#c2a25a} .hd .sub{color:#c2a25a;font-size:12px;letter-spacing:2px;text-transform:uppercase}
      h2{font-size:15px;margin:18px 0 6px;color:#0e1b2c;border-bottom:2px solid #c2a25a;padding-bottom:4px}
      table{width:100%;border-collapse:collapse;margin:4px 0 10px}
      th,td{padding:6px 8px;font-size:12.5px;text-align:left;border-bottom:1px solid #e6e8ec}
      th{background:#f3eedf;color:#0e1b2c} td.r,th.r{text-align:right} .r{text-align:right}
      .muted{color:#888} .saldo{text-align:right;margin:2px 0 6px}
      .tot{background:#f7f8fa;border-radius:10px;padding:14px 18px;margin-top:16px}
      .tot .big{font-size:18px;color:#0e1b2c}
      .pie{color:#888;font-size:11px;margin-top:20px;text-align:center}
      @media print{body{padding:0}}
    </style></head>
    <body onload="window.print()">
      <div class="hd"><b>Lex<span class="g">Five</span></b><div class="sub">Estado de cuenta</div></div>
      <p><strong>Cliente:</strong> ${esc(state.profile.nombre || '')}<br>
         <strong>Fecha:</strong> ${fmtDate(hoyISO())}</p>
      ${bloques || '<p>No hay movimientos para mostrar.</p>'}
      <div class="tot">
        <p>Total honorarios: <strong>${money(totalH)}</strong></p>
        <p>Total pagado: <strong>${money(totalP)}</strong></p>
        <p class="big">Saldo pendiente: <strong>${money(saldo)}</strong></p>
      </div>
      <p class="pie">Documento generado desde el portal del cliente de LexFive. Si tiene dudas sobre algún monto, consúltenos.</p>
    </body></html>`);
  win.document.close();
}
