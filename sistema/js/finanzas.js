// ============================================================
//  LexFive — Vista FINANZAS (honorarios y pagos)
//  Resumen de cartera por proceso/cliente, gestión de honorarios y
//  pagos por proceso, recibos y recordatorio de cobro.
//  Extraído de app.js (paso 14 del split).
// ============================================================
import { supabase } from './supabase.js';
import { logAccion } from './auth.js';
import { state } from './state.js';
import { esc, fmtDate, hoyISO } from './util.js';
import { fmtMoneda, montoEnLetras, descargarArchivo } from './exportar.js';
import { ICON } from './icons.js';
import { $, content } from './dom.js';
import { loading, toast, openModal, closeModal } from './ui.js';
import { profName, clienteName } from './comunes.js';
import { loadClientes } from './datos.js';
import { abrirImpresion } from './print.js';

// Abre un modal para recordar el COBRO de un saldo pendiente a un cliente,
// por WhatsApp y/o correo, con un mensaje cordial pre-redactado.
function recordarCobro(cli, saldo) {
  if (!cli) return;
  const texto = `Estimado/a ${cli.nombre}:\n\nLe recordamos cordialmente que su cuenta con LexFive Abogados presenta un saldo pendiente de ${fmtMoneda(saldo)}. Agradeceremos coordinar su pago a la brevedad.\n\nQuedamos atentos. Saludos cordiales,\nLexFive Abogados`;
  const enc = encodeURIComponent(texto);
  let tel = (cli.telefono || '').replace(/[^\d]/g, '');
  if (tel && tel.length <= 8) tel = '591' + tel; // prefijo Bolivia si es número local
  const wa = tel ? `https://wa.me/${tel}?text=${enc}` : '';
  const mailto = cli.email ? `mailto:${cli.email}?subject=${encodeURIComponent('Recordatorio de pago — LexFive Abogados')}&body=${enc}` : '';
  const body = `
    <p class="cell-sub" style="margin-bottom:12px">Recordatorio de cobro para <strong>${esc(cli.nombre)}</strong> — saldo pendiente <strong>${fmtMoneda(saldo)}</strong>:</p>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${wa ? `<a class="btn" style="justify-content:flex-start;background:#25d366;color:#fff;border-color:#25d366" target="_blank" rel="noopener" href="${wa}">${ICON.whatsapp} Enviar por WhatsApp</a>` : '<p class="cell-sub">Este cliente no tiene teléfono registrado.</p>'}
      ${mailto ? `<a class="btn btn--primary" style="justify-content:flex-start" href="${mailto}">✉️ Enviar por correo</a>` : '<p class="cell-sub">Este cliente no tiene correo registrado.</p>'}
    </div>`;
  openModal('Recordar cobro', body, [{ label: 'Cerrar', class: 'btn--primary', onClick: closeModal }]);
}

export async function openHonorarios(proc) {
  const pintar = async () => {
    const [{ data: hs }, { data: ps }] = await Promise.all([
      supabase.from('honorarios').select('*').eq('proceso_id', proc.id).order('fecha', { ascending: false }),
      supabase.from('pagos').select('*').eq('proceso_id', proc.id).order('fecha', { ascending: false })
    ]);
    const cargos = hs || [], pagos = ps || [];
    const totalCargos = cargos.reduce((a, b) => a + Number(b.monto || 0), 0);
    const totalPagos = pagos.reduce((a, b) => a + Number(b.monto || 0), 0);
    const saldo = totalCargos - totalPagos;

    const filaH = h => `<div class="fin-row" data-id="${h.id}"><div><div class="cell-strong">${esc(h.concepto)}</div><div class="cell-sub">${fmtDate(h.fecha)} · ${esc(profName(h.created_by))}</div></div><div class="fin-row__right"><span class="fin-monto">${fmtMoneda(h.monto, h.moneda)}</span><button class="btn btn--danger btn--sm js-delh" data-id="${h.id}">✕</button></div></div>`;
    const filaP = p => `<div class="fin-row" data-id="${p.id}"><div><div class="cell-strong">${fmtMoneda(p.monto, p.moneda)} ${p.metodo ? '<span class="cell-sub">(' + esc(p.metodo) + ')</span>' : ''}</div><div class="cell-sub">${fmtDate(p.fecha)}${p.nota ? ' · ' + esc(p.nota) : ''}</div></div><div class="fin-row__right"><button class="btn btn--ghost btn--sm js-recibo" data-id="${p.id}">Recibo</button><button class="btn btn--danger btn--sm js-delp" data-id="${p.id}">✕</button></div></div>`;

    const body = `
      <div class="fin-summary">
        <div><span>Honorarios</span><strong>${fmtMoneda(totalCargos)}</strong></div>
        <div><span>Pagado</span><strong>${fmtMoneda(totalPagos)}</strong></div>
        <div class="${saldo > 0 ? 'fin-saldo--debe' : 'fin-saldo--ok'}"><span>Saldo pendiente</span><strong>${fmtMoneda(saldo)}</strong></div>
      </div>

      <h4 class="section-title">Honorarios (cargos)</h4>
      <div class="fin-list">${cargos.length ? cargos.map(filaH).join('') : '<p class="cell-sub">Sin honorarios registrados.</p>'}</div>
      <div class="card" style="margin-top:10px"><div class="card__body"><div class="field-row">
        <div class="field"><label>Concepto *</label><input id="h_concepto" placeholder="Ej: Honorarios profesionales"></div>
        <div class="field"><label>Monto (Bs) *</label><input id="h_monto" type="number" min="0" step="0.01" placeholder="0.00"></div>
        <div class="field"><label>Fecha</label><input id="h_fecha" type="date" value="${hoyISO()}"></div>
      </div><button class="btn btn--navy" id="h_add">${ICON.plus} Agregar honorario</button></div></div>

      <h4 class="section-title">Pagos recibidos</h4>
      <div class="fin-list">${pagos.length ? pagos.map(filaP).join('') : '<p class="cell-sub">Sin pagos registrados.</p>'}</div>
      <div class="card" style="margin-top:10px"><div class="card__body"><div class="field-row">
        <div class="field"><label>Monto (Bs) *</label><input id="p_monto" type="number" min="0" step="0.01" placeholder="0.00"></div>
        <div class="field"><label>Método</label><input id="p_metodo" placeholder="Efectivo, transferencia..."></div>
        <div class="field"><label>Fecha</label><input id="p_fecha" type="date" value="${hoyISO()}"></div>
      </div>
      <div class="field"><label>Nota (opcional)</label><input id="p_nota" placeholder="Detalle del pago"></div>
      <button class="btn btn--navy" id="p_add">${ICON.plus} Registrar pago</button></div></div>`;
    openModal('Honorarios · ' + proc.caratula, body, [{ label: 'Cerrar', class: 'btn--primary', onClick: closeModal }], true);

    $('#h_add').onclick = async () => {
      const concepto = $('#h_concepto').value.trim();
      const monto = parseFloat($('#h_monto').value);
      if (!concepto || isNaN(monto)) { toast('Indique concepto y monto.', 'error'); return; }
      $('#h_add').disabled = true;
      const { error } = await supabase.from('honorarios').insert({ proceso_id: proc.id, concepto, monto, fecha: $('#h_fecha').value || hoyISO(), created_by: state.profile.id });
      if (error) { toast('Error: ' + error.message, 'error'); $('#h_add').disabled = false; return; }
      await logAccion('crear', 'honorario', proc.id, concepto + ' ' + monto);
      toast('Honorario agregado.', 'success'); pintar();
    };
    $('#p_add').onclick = async () => {
      const monto = parseFloat($('#p_monto').value);
      if (isNaN(monto)) { toast('Indique el monto del pago.', 'error'); return; }
      $('#p_add').disabled = true;
      const { error } = await supabase.from('pagos').insert({ proceso_id: proc.id, monto, metodo: $('#p_metodo').value.trim() || null, nota: $('#p_nota').value.trim() || null, fecha: $('#p_fecha').value || hoyISO(), created_by: state.profile.id });
      if (error) { toast('Error: ' + error.message, 'error'); $('#p_add').disabled = false; return; }
      await logAccion('crear', 'pago', proc.id, String(monto));
      toast('Pago registrado.', 'success'); pintar();
    };
    document.querySelectorAll('.js-delh').forEach(b => b.onclick = async () => {
      if (!confirm('¿Eliminar este honorario?')) return;
      await supabase.from('honorarios').delete().eq('id', b.dataset.id); toast('Eliminado.', 'success'); pintar();
    });
    document.querySelectorAll('.js-delp').forEach(b => b.onclick = async () => {
      if (!confirm('¿Eliminar este pago?')) return;
      await supabase.from('pagos').delete().eq('id', b.dataset.id); toast('Eliminado.', 'success'); pintar();
    });
    document.querySelectorAll('.js-recibo').forEach(b => b.onclick = () => {
      const pago = pagos.find(x => x.id === b.dataset.id);
      if (pago) imprimirReciboPago(pago, proc);
    });
  };
  await pintar();
}

// Genera e imprime un recibo de un pago concreto.
async function imprimirReciboPago(pago, proc) {
  let clienteNombre = '—';
  try {
    const { data: pr } = await supabase.from('procesos').select('cliente_id').eq('id', proc.id).maybeSingle();
    if (pr && pr.cliente_id) {
      const { data: cl } = await supabase.from('clientes').select('nombre').eq('id', pr.cliente_id).maybeSingle();
      if (cl) clienteNombre = cl.nombre;
    }
  } catch (e) {}
  const nro = pago.nro_recibo
    ? String(pago.nro_recibo).padStart(5, '0')
    : String(pago.id || '').replace(/-/g, '').slice(0, 8).toUpperCase();
  const body = `
    <h1>Recibo de pago N.º ${esc(nro)}</h1>
    <table>
      <tr><th style="width:38%">Fecha</th><td>${esc(fmtDate(pago.fecha))}</td></tr>
      <tr><th>Recibí de</th><td>${esc(clienteNombre)}</td></tr>
      <tr><th>Por concepto de</th><td>Pago a cuenta de honorarios — ${esc(proc.caratula || '')}</td></tr>
      ${pago.metodo ? `<tr><th>Forma de pago</th><td>${esc(pago.metodo)}</td></tr>` : ''}
      ${pago.nota ? `<tr><th>Detalle</th><td>${esc(pago.nota)}</td></tr>` : ''}
      <tr class="tot"><th>Monto recibido</th><td>${esc(fmtMoneda(pago.monto, pago.moneda))}</td></tr>
      <tr><th>Son</th><td>${esc(montoEnLetras(pago.monto, pago.moneda))}</td></tr>
    </table>
    <div class="imp-foot">
      <p>Este recibo acredita el pago indicado a favor de LexFive por los servicios profesionales del proceso señalado.</p>
      <div style="display:flex;justify-content:space-between;gap:40px;margin-top:46px;">
        <div style="flex:1;border-top:1px solid #888;padding-top:6px;text-align:center;">Firma autorizada · LexFive</div>
        <div style="flex:1;border-top:1px solid #888;padding-top:6px;text-align:center;">Recibí conforme</div>
      </div>
    </div>`;
  abrirImpresion('Recibo ' + nro, body);
}

export async function renderFinanzas() {
  loading();
  const [{ data: procs }, { data: hs }, { data: ps }] = await Promise.all([
    supabase.from('procesos').select('id,caratula,cliente_id,estado').eq('eliminado', false),
    supabase.from('honorarios').select('proceso_id,monto'),
    supabase.from('pagos').select('proceso_id,monto')
  ]);
  await loadClientes();
  const procList = procs || [];
  const sumBy = (arr) => { const o = {}; (arr || []).forEach(x => { o[x.proceso_id] = (o[x.proceso_id] || 0) + Number(x.monto || 0); }); return o; };
  const cargosByProc = sumBy(hs), pagosByProc = sumBy(ps);

  const filas = procList
    .map(p => ({ p, cargos: cargosByProc[p.id] || 0, pagos: pagosByProc[p.id] || 0 }))
    .filter(r => r.cargos > 0 || r.pagos > 0)
    .map(r => ({ ...r, saldo: r.cargos - r.pagos }))
    .sort((a, b) => b.saldo - a.saldo);

  const totCargos = filas.reduce((a, b) => a + b.cargos, 0);
  const totPagos = filas.reduce((a, b) => a + b.pagos, 0);
  const totSaldo = totCargos - totPagos;

  // Estado de cuenta agrupado por CLIENTE (suma de todos sus procesos).
  const cliAgg = {};
  filas.forEach(r => {
    const cid = r.p.cliente_id || '__sin__';
    const a = cliAgg[cid] || (cliAgg[cid] = { cid, cargos: 0, pagos: 0, nprocs: 0 });
    a.cargos += r.cargos; a.pagos += r.pagos; a.nprocs += 1;
  });
  const filasCli = Object.values(cliAgg).map(a => ({ ...a, saldo: a.cargos - a.pagos }))
    .sort((a, b) => b.saldo - a.saldo);
  const nombreCli = cid => cid === '__sin__' ? 'Sin cliente asignado' : clienteName(cid);

  const vista = state.finVista === 'cliente' ? 'cliente' : 'proceso';
  const toggle = `
    <div class="tabs-bar" role="tablist" style="margin-bottom:14px">
      <button class="btn btn--sm ${vista === 'proceso' ? 'btn--navy' : 'btn--ghost'}" id="finTabProc" role="tab">Por proceso</button>
      <button class="btn btn--sm ${vista === 'cliente' ? 'btn--navy' : 'btn--ghost'}" id="finTabCli" role="tab">Por cliente (estado de cuenta)</button>
    </div>`;
  const metrics = `
    <div class="stats-grid">
      <div class="metric"><div class="metric__top"><div class="metric__icon">${ICON.dinero}</div></div><div class="metric__num" style="font-size:1.5rem">${fmtMoneda(totCargos)}</div><div class="metric__label">Honorarios facturados</div></div>
      <div class="metric"><div class="metric__top"><div class="metric__icon">${ICON.dinero}</div></div><div class="metric__num" style="font-size:1.5rem">${fmtMoneda(totPagos)}</div><div class="metric__label">Cobrado</div></div>
      <div class="metric"><div class="metric__top"><div class="metric__icon">${ICON.alerta}</div></div><div class="metric__num" style="font-size:1.5rem">${fmtMoneda(totSaldo)}</div><div class="metric__label">Por cobrar</div></div>
    </div>`;

  const tablaProc = `<div class="card"><div class="card__head"><h3>Saldo por proceso</h3>${filas.length ? `<span style="display:flex;gap:8px"><button class="btn btn--ghost btn--sm" id="btnFinCSV">${ICON.descargar} Excel</button><button class="btn btn--ghost btn--sm" id="btnRepFin">${ICON.doc} Imprimir / PDF</button></span>` : ''}</div>
      <div class="card__body--flush">
        ${filas.length ? `<div class="table-wrap"><table class="data">
          <thead><tr><th>Proceso</th><th>Cliente</th><th>Honorarios</th><th>Pagado</th><th>Saldo</th></tr></thead>
          <tbody>${filas.map(r => `
            <tr data-id="${r.p.id}" data-cara="${esc(r.p.caratula)}" style="cursor:pointer">
              <td class="cell-strong">${esc(r.p.caratula)}</td>
              <td>${esc(clienteName(r.p.cliente_id))}</td>
              <td>${fmtMoneda(r.cargos)}</td>
              <td>${fmtMoneda(r.pagos)}</td>
              <td class="${r.saldo > 0 ? 'fin-debe' : ''}"><strong>${fmtMoneda(r.saldo)}</strong></td>
            </tr>`).join('')}</tbody></table></div>`
        : `<div class="empty">${ICON.dinero}<p>Aún no hay honorarios ni pagos registrados. Agréguelos desde el detalle de un proceso (botón “Honorarios”).</p></div>`}
      </div>
    </div>`;

  const tablaCli = `<div class="card"><div class="card__head"><h3>Estado de cuenta por cliente</h3>${filasCli.length ? `<span style="display:flex;gap:8px"><button class="btn btn--ghost btn--sm" id="btnFinCliCSV">${ICON.descargar} Excel</button></span>` : ''}</div>
      <div class="card__body--flush">
        ${filasCli.length ? `<div class="table-wrap"><table class="data">
          <thead><tr><th>Cliente</th><th>Procesos</th><th>Honorarios</th><th>Pagado</th><th>Saldo</th><th></th></tr></thead>
          <tbody>${filasCli.map(r => `
            <tr>
              <td class="cell-strong">${esc(nombreCli(r.cid))}</td>
              <td>${r.nprocs}</td>
              <td>${fmtMoneda(r.cargos)}</td>
              <td>${fmtMoneda(r.pagos)}</td>
              <td class="${r.saldo > 0 ? 'fin-debe' : ''}"><strong>${fmtMoneda(r.saldo)}</strong></td>
              <td>${r.saldo > 0 && r.cid !== '__sin__' ? `<button class="btn btn--ghost btn--sm js-cobro" data-cid="${r.cid}" data-saldo="${r.saldo}">${ICON.whatsapp} Recordar cobro</button>` : ''}</td>
            </tr>`).join('')}</tbody></table></div>`
        : `<div class="empty">${ICON.dinero}<p>Aún no hay honorarios ni pagos registrados.</p></div>`}
      </div>
    </div>`;

  content().innerHTML = toggle + metrics + (vista === 'cliente' ? tablaCli : tablaProc);

  $('#finTabProc').onclick = () => { state.finVista = 'proceso'; renderFinanzas(); };
  $('#finTabCli').onclick = () => { state.finVista = 'cliente'; renderFinanzas(); };

  if (vista === 'cliente') {
    content().querySelectorAll('.js-cobro').forEach(b => b.onclick = () => {
      const cli = (state.clientes || []).find(c => c.id === b.dataset.cid);
      if (cli) recordarCobro(cli, Number(b.dataset.saldo));
    });
    const btnCliCsv = $('#btnFinCliCSV');
    if (btnCliCsv) btnCliCsv.onclick = () => {
      const celda = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
      const lineas = [['Cliente', 'Procesos', 'Honorarios', 'Pagado', 'Saldo'].map(celda).join(';')];
      filasCli.forEach(r => lineas.push([nombreCli(r.cid), r.nprocs, r.cargos.toFixed(2), r.pagos.toFixed(2), r.saldo.toFixed(2)].map(celda).join(';')));
      lineas.push(['TOTALES', '', totCargos.toFixed(2), totPagos.toFixed(2), totSaldo.toFixed(2)].map(celda).join(';'));
      descargarArchivo('estado-cuenta-clientes-' + hoyISO() + '.csv', '\ufeff' + lineas.join('\r\n'), 'text/csv;charset=utf-8');
      toast('Estado de cuenta exportado a Excel (CSV).', 'success');
    };
    return;
  }

  content().querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => openHonorarios({ id: tr.dataset.id, caratula: tr.dataset.cara }));
  const btnFinCsv = $('#btnFinCSV');
  if (btnFinCsv) btnFinCsv.onclick = () => {
    const celda = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const lineas = [['Proceso', 'Cliente', 'Honorarios', 'Pagado', 'Saldo'].map(celda).join(';')];
    filas.forEach(r => lineas.push([r.p.caratula, clienteName(r.p.cliente_id), r.cargos.toFixed(2), r.pagos.toFixed(2), r.saldo.toFixed(2)].map(celda).join(';')));
    lineas.push(['TOTALES', '', totCargos.toFixed(2), totPagos.toFixed(2), totSaldo.toFixed(2)].map(celda).join(';'));
    descargarArchivo('honorarios-lexfive-' + hoyISO() + '.csv', '\ufeff' + lineas.join('\r\n'), 'text/csv;charset=utf-8');
    toast('Honorarios exportados a Excel (CSV).', 'success');
  };
  const btnRep = $('#btnRepFin');
  if (btnRep) btnRep.onclick = () => {
    const cuerpo = `<h1>Reporte de honorarios — cartera</h1>
      <table>
        <thead><tr><th>Proceso</th><th>Cliente</th><th>Honorarios</th><th>Pagado</th><th>Saldo</th></tr></thead>
        <tbody>${filas.map(r => `<tr>
          <td>${esc(r.p.caratula)}</td>
          <td>${esc(clienteName(r.p.cliente_id))}</td>
          <td>${esc(fmtMoneda(r.cargos))}</td>
          <td>${esc(fmtMoneda(r.pagos))}</td>
          <td>${esc(fmtMoneda(r.saldo))}</td>
        </tr>`).join('')}
        <tr class="tot"><td colspan="2">TOTALES</td><td>${esc(fmtMoneda(totCargos))}</td><td>${esc(fmtMoneda(totPagos))}</td><td>${esc(fmtMoneda(totSaldo))}</td></tr>
        </tbody>
      </table>`;
    abrirImpresion('Reporte de honorarios', cuerpo);
  };
}
