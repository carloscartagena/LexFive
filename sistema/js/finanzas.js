// ============================================================
//  LexFive — Vista FINANZAS (honorarios y pagos)
//  Resumen de cartera por proceso/cliente, gestión de honorarios y
//  pagos por proceso, recibos y recordatorio de cobro.
//  Extraído de app.js (paso 14 del split).
// ============================================================
import { supabase } from './supabase.js';
import { logAccion } from './auth.js';
import { state } from './state.js';
import { esc, fmtDate, hoyISO, qrURL, SITIO_URL } from './util.js';
import { fmtMoneda, montoEnLetras, descargarArchivo } from './exportar.js';
import { ICON } from './icons.js';
import { $, content } from './dom.js';
import { loading, toast, openModal, closeModal } from './ui.js';
import { profName, clienteName } from './comunes.js';
import { loadClientes } from './datos.js';
import { abrirImpresion } from './print.js';
import { membreteHeader, membreteFooter, modeloMembrete, abrirImpresionVectorial } from './membrete-base.js';

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
    const pct = totalCargos > 0 ? Math.min(100, Math.round((totalPagos / totalCargos) * 100)) : (totalPagos > 0 ? 100 : 0);

    const filaH = h => `<div class="fin-row" data-id="${h.id}"><div><div class="cell-strong">${esc(h.concepto)}</div><div class="cell-sub">${fmtDate(h.fecha)} · ${esc(profName(h.created_by))}</div></div><div class="fin-row__right"><span class="fin-monto">${fmtMoneda(h.monto, h.moneda)}</span><button class="btn btn--danger btn--sm js-delh" data-id="${h.id}">✕</button></div></div>`;
    const filaP = p => `<div class="fin-row" data-id="${p.id}"><div><div class="cell-strong">${fmtMoneda(p.monto, p.moneda)} ${p.metodo ? '<span class="cell-sub">(' + esc(p.metodo) + ')</span>' : ''}</div><div class="cell-sub">${fmtDate(p.fecha)}${p.nota ? ' · ' + esc(p.nota) : ''}</div></div><div class="fin-row__right"><button class="btn btn--ghost btn--sm js-recibo" data-id="${p.id}" style="border:1px solid #b89446;color:#b89446;font-weight:600;">🧾 Recibo PDF</button><button class="btn btn--danger btn--sm js-delp" data-id="${p.id}">✕</button></div></div>`;

    const body = `
      <div class="fin-summary">
        <div><span>Honorarios</span><strong>${fmtMoneda(totalCargos)}</strong></div>
        <div><span>Pagado</span><strong>${fmtMoneda(totalPagos)}</strong></div>
        <div class="${saldo > 0 ? 'fin-saldo--debe' : 'fin-saldo--ok'}"><span>Saldo pendiente</span><strong>${fmtMoneda(saldo)}</strong></div>
        <div><span>% Cubierto</span><strong>${pct}%</strong></div>
      </div>

      <div style="margin: 10px 0 16px;">
        <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:4px;color:var(--text-sub, #666);">
          <span>Progreso de cobro</span>
          <strong>${pct}% completado</strong>
        </div>
        <div style="height:10px;background:rgba(14,27,44,0.12);border-radius:5px;overflow:hidden;">
          <div style="width:${pct}%;height:100%;background:${pct >= 100 ? '#10b981' : 'linear-gradient(90deg, #c2a25a, #b89446)'};border-radius:5px;transition:width 0.3s ease;"></div>
        </div>
      </div>

      <h4 class="section-title">Honorarios pactados (cargos)</h4>
      <div class="fin-list">${cargos.length ? cargos.map(filaH).join('') : '<p class="cell-sub">Sin honorarios registrados.</p>'}</div>
      <div class="card" style="margin-top:10px"><div class="card__body"><div class="field-row">
        <div class="field"><label>Concepto *</label><input id="h_concepto" placeholder="Ej: Honorarios profesionales, cuota inicial..."></div>
        <div class="field"><label>Monto (Bs) *</label><input id="h_monto" type="number" min="0" step="0.01" placeholder="0.00"></div>
        <div class="field"><label>Fecha</label><input id="h_fecha" type="date" value="${hoyISO()}"></div>
      </div><button class="btn btn--navy" id="h_add">${ICON.plus} Agregar honorario</button></div></div>

      <h4 class="section-title">Pagos recibidos (cuotas)</h4>
      <div class="fin-list">${pagos.length ? pagos.map(filaP).join('') : '<p class="cell-sub">Sin pagos registrados.</p>'}</div>
      <div class="card" style="margin-top:10px"><div class="card__body"><div class="field-row">
        <div class="field"><label>Monto (Bs) *</label><input id="p_monto" type="number" min="0" step="0.01" placeholder="0.00"></div>
        <div class="field"><label>Método de pago</label>
          <select id="p_metodo" class="input">
            <option value="Efectivo">Efectivo</option>
            <option value="QR Bancario">QR Bancario</option>
            <option value="Transferencia">Transferencia bancaria</option>
            <option value="Depósito">Depósito bancario</option>
            <option value="Cheque">Cheque</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
        <div class="field"><label>Fecha de cobro</label><input id="p_fecha" type="date" value="${hoyISO()}"></div>
      </div>
      <div class="field"><label>Concepto / Detalle de la cuota (opcional)</label><input id="p_nota" placeholder="Ej: Cuota 1 de 2, anticipo del 50%, cancelación total..."></div>
      <button class="btn btn--navy" id="p_add">${ICON.plus} Registrar pago / cuota</button></div></div>`;
    openModal('Honorarios y Cuotas · ' + proc.caratula, body, [{ label: 'Cerrar', class: 'btn--primary', onClick: closeModal }], true);

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

// Genera e imprime un recibo oficial con membrete y QR de un pago concreto.
async function imprimirReciboPago(pago, proc) {
  let clienteNombre = '—';
  let clienteCI = '';
  try {
    const { data: pr } = await supabase.from('procesos').select('cliente_id').eq('id', proc.id).maybeSingle();
    if (pr && pr.cliente_id) {
      const { data: cl } = await supabase.from('clientes').select('nombre, ci, telefono').eq('id', pr.cliente_id).maybeSingle();
      if (cl) {
        clienteNombre = cl.nombre || '—';
        clienteCI = cl.ci || '';
      }
    }
  } catch (e) {}

  // Obtener estado financiero total de la causa (honorarios y pagos acumulados)
  let totalCargos = 0, totalPagos = 0;
  try {
    const [{ data: hs }, { data: ps }] = await Promise.all([
      supabase.from('honorarios').select('monto').eq('proceso_id', proc.id),
      supabase.from('pagos').select('monto').eq('proceso_id', proc.id)
    ]);
    totalCargos = (hs || []).reduce((a, b) => a + Number(b.monto || 0), 0);
    totalPagos = (ps || []).reduce((a, b) => a + Number(b.monto || 0), 0);
  } catch (e) {}
  const saldoActual = Math.max(0, totalCargos - totalPagos);

  const nro = pago.nro_recibo
    ? 'REC-' + String(pago.nro_recibo).padStart(6, '0')
    : 'REC-' + String(pago.id || '').replace(/-/g, '').slice(0, 6).toUpperCase();

  const fechaLocal = fmtDate(pago.fecha);
  const horaLocal = (pago.created_at ? new Date(pago.created_at) : new Date()).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });

  const verifyUrl = `${SITIO_URL}verificar.html?tipo=recibo&nro=${encodeURIComponent(nro)}&c=${encodeURIComponent(clienteNombre)}&m=${encodeURIComponent(fmtMoneda(pago.monto, pago.moneda))}&f=${encodeURIComponent(fechaLocal)}`;
  const qrSrc = qrURL(verifyUrl, 140);

  const model = modeloMembrete();
  const logoSrc = localStorage.getItem('lexfive_logo') || 'assets/logo-emblem.svg';
  const headerHtml = membreteHeader(model, logoSrc);
  const footerHtml = membreteFooter(model);

  const docHTML = `
    <div class="hoja-carta" style="display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;font-family:Georgia,'Times New Roman',serif;color:#1e293b;position:relative;background:#fff;padding:0;">
      <div>
        ${headerHtml}
        
        <div style="padding: 24px 44px 0;">
          <!-- Título y Correlativo -->
          <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #c2a25a;padding-bottom:12px;margin-bottom:18px;">
            <div>
              <h1 style="margin:0;font-size:20px;color:#0e1b2c;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">Recibo Oficial de Pago</h1>
              <div style="font-size:12px;color:#64748b;font-family:Arial,sans-serif;margin-top:3px;">Gestión de Honorarios Profesionales y Servicios Jurídicos</div>
            </div>
            <div style="text-align:right;">
              <div style="display:inline-block;background:#0e1b2c;color:#c2a25a;padding:5px 14px;border-radius:6px;font-family:Arial,sans-serif;font-weight:700;font-size:14px;letter-spacing:1px;border:1px solid #c2a25a;">
                ${esc(nro)}
              </div>
              <div style="font-size:11px;color:#64748b;font-family:Arial,sans-serif;margin-top:4px;">${esc(fechaLocal)} · ${esc(horaLocal)}</div>
            </div>
          </div>

          <!-- Datos del Pago -->
          <table style="width:100%;border-collapse:collapse;font-size:13px;line-height:1.6;margin-bottom:16px;">
            <tbody>
              <tr style="border-bottom:1px solid #e2e8f0;">
                <th style="text-align:left;padding:8px 0;width:24%;color:#475569;font-family:Arial,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Recibí de:</th>
                <td style="padding:8px 0;font-weight:700;color:#0e1b2c;font-size:14px;">
                  ${esc(clienteNombre)}${clienteCI ? ` &nbsp;<span style="font-size:12px;font-weight:400;color:#64748b;">(C.I. ${esc(clienteCI)})</span>` : ''}
                </td>
              </tr>
              <tr style="border-bottom:1px solid #e2e8f0;">
                <th style="text-align:left;padding:8px 0;color:#475569;font-family:Arial,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Causa / Proceso:</th>
                <td style="padding:8px 0;color:#1e293b;font-weight:600;">
                  ${esc(proc.caratula || 'Servicios Jurídicos')}
                </td>
              </tr>
              <tr style="border-bottom:1px solid #e2e8f0;">
                <th style="text-align:left;padding:8px 0;color:#475569;font-family:Arial,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Concepto:</th>
                <td style="padding:8px 0;color:#334155;">
                  ${esc(pago.nota || 'Pago a cuenta de honorarios profesionales')}
                </td>
              </tr>
              <tr style="border-bottom:1px solid #e2e8f0;">
                <th style="text-align:left;padding:8px 0;color:#475569;font-family:Arial,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Forma de pago:</th>
                <td style="padding:8px 0;color:#334155;">
                  <span style="display:inline-block;background:#f1f5f9;border:1px solid #cbd5e1;padding:2px 8px;border-radius:4px;font-family:Arial,sans-serif;font-size:11px;font-weight:600;">
                    ${esc(pago.metodo || 'Efectivo')}
                  </span>
                </td>
              </tr>
              <tr style="border-bottom:2px solid #0e1b2c;background:#fbfaf7;">
                <th style="text-align:left;padding:12px 10px;color:#0e1b2c;font-family:Arial,sans-serif;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Monto Recibido:</th>
                <td style="padding:12px 10px;font-weight:800;color:#0e1b2c;font-size:18px;">
                  ${esc(fmtMoneda(pago.monto, pago.moneda))}
                </td>
              </tr>
              <tr>
                <th style="text-align:left;padding:8px 10px;color:#475569;font-family:Arial,sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;">Son:</th>
                <td style="padding:8px 10px;font-style:italic;color:#334155;font-size:13px;">
                  ${esc(montoEnLetras(pago.monto, pago.moneda))}
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Estado de Cuenta de la Causa -->
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin-bottom:22px;display:flex;justify-content:space-around;text-align:center;">
            <div>
              <div style="font-family:Arial,sans-serif;font-size:10px;text-transform:uppercase;color:#64748b;font-weight:600;">Honorario Pactado</div>
              <div style="font-size:14px;font-weight:700;color:#0e1b2c;margin-top:2px;">${fmtMoneda(totalCargos)}</div>
            </div>
            <div style="border-left:1px solid #cbd5e1;"></div>
            <div>
              <div style="font-family:Arial,sans-serif;font-size:10px;text-transform:uppercase;color:#16a34a;font-weight:600;">Total Abonado</div>
              <div style="font-size:14px;font-weight:700;color:#16a34a;margin-top:2px;">${fmtMoneda(totalPagos)}</div>
            </div>
            <div style="border-left:1px solid #cbd5e1;"></div>
            <div>
              <div style="font-family:Arial,sans-serif;font-size:10px;text-transform:uppercase;color:${saldoActual > 0 ? '#dc2626' : '#64748b'};font-weight:600;">Saldo Pendiente</div>
              <div style="font-size:14px;font-weight:700;color:${saldoActual > 0 ? '#dc2626' : '#0e1b2c'};margin-top:2px;">${fmtMoneda(saldoActual)}</div>
            </div>
          </div>

          <!-- Validación institucional y QR -->
          <div style="display:flex;align-items:center;gap:18px;background:#fbf7ec;border:1px solid #ecdfbf;border-radius:8px;padding:10px 14px;margin-bottom:34px;">
            <img src="${qrSrc}" alt="QR Verificación" style="width:72px;height:72px;border-radius:4px;border:1px solid #c2a25a;background:#fff;padding:2px;display:block;">
            <div style="font-family:Arial,sans-serif;font-size:11px;color:#6b5a2c;line-height:1.5;">
              <strong style="color:#0e1b2c;font-size:12px;">Validación Oficial de Autenticidad</strong><br>
              Este recibo fue generado formalmente por el bufete <strong>LexFive Abogados</strong>. Para verificar su legitimidad y registro en el sistema central, escanee el código QR o visite el portal oficial.
            </div>
          </div>

          <!-- Doble Firma -->
          <div style="display:flex;justify-content:space-between;gap:50px;margin-top:10px;">
            <div style="flex:1;text-align:center;">
              <div style="height:44px;"></div>
              <div style="border-top:1px solid #0e1b2c;padding-top:6px;font-family:Arial,sans-serif;font-size:11px;color:#0e1b2c;font-weight:700;">
                LexFive Abogados
              </div>
              <div style="font-family:Arial,sans-serif;font-size:10px;color:#64748b;">
                Firma Autorizada
              </div>
            </div>
            <div style="flex:1;text-align:center;">
              <div style="height:44px;"></div>
              <div style="border-top:1px solid #0e1b2c;padding-top:6px;font-family:Arial,sans-serif;font-size:11px;color:#0e1b2c;font-weight:700;">
                ${esc(clienteNombre)}
              </div>
              <div style="font-family:Arial,sans-serif;font-size:10px;color:#64748b;">
                Recibí Conforme / Interesado
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        ${footerHtml}
      </div>
    </div>
  `;

  abrirImpresionVectorial('Recibo ' + nro, docHTML);
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
          <thead><tr><th>Proceso</th><th>Cliente</th><th>Honorarios</th><th>Pagado</th><th>Avance</th><th>Saldo</th></tr></thead>
          <tbody>${filas.map(r => {
            const pct = r.cargos > 0 ? Math.min(100, Math.round((r.pagos / r.cargos) * 100)) : (r.pagos > 0 ? 100 : 0);
            return `
            <tr data-id="${r.p.id}" data-cara="${esc(r.p.caratula)}" style="cursor:pointer">
              <td class="cell-strong">${esc(r.p.caratula)}</td>
              <td>${esc(clienteName(r.p.cliente_id))}</td>
              <td>${fmtMoneda(r.cargos)}</td>
              <td>${fmtMoneda(r.pagos)}</td>
              <td>
                <div style="display:flex;align-items:center;gap:6px;min-width:105px;">
                  <div style="flex:1;height:7px;background:rgba(14,27,44,0.12);border-radius:4px;overflow:hidden;">
                    <div style="width:${pct}%;height:100%;background:${pct >= 100 ? '#10b981' : '#b89446'};border-radius:4px;"></div>
                  </div>
                  <span style="font-size:0.75rem;font-weight:600;min-width:32px;color:var(--text, inherit);">${pct}%</span>
                </div>
              </td>
              <td class="${r.saldo > 0 ? 'fin-debe' : ''}"><strong>${fmtMoneda(r.saldo)}</strong></td>
            </tr>`;
          }).join('')}</tbody></table></div>`
        : `<div class="empty">${ICON.dinero}<p>Aún no hay honorarios ni pagos registrados. Agréguelos desde el detalle de un proceso (botón “Honorarios”).</p></div>`}
      </div>
    </div>`;

  const tablaCli = `<div class="card"><div class="card__head"><h3>Estado de cuenta por cliente</h3>${filasCli.length ? `<span style="display:flex;gap:8px"><button class="btn btn--ghost btn--sm" id="btnFinCliCSV">${ICON.descargar} Excel</button></span>` : ''}</div>
      <div class="card__body--flush">
        ${filasCli.length ? `<div class="table-wrap"><table class="data">
          <thead><tr><th>Cliente</th><th>Procesos</th><th>Honorarios</th><th>Pagado</th><th>Avance</th><th>Saldo</th><th></th></tr></thead>
          <tbody>${filasCli.map(r => {
            const pct = r.cargos > 0 ? Math.min(100, Math.round((r.pagos / r.cargos) * 100)) : (r.pagos > 0 ? 100 : 0);
            return `
            <tr>
              <td class="cell-strong">${esc(nombreCli(r.cid))}</td>
              <td>${r.nprocs}</td>
              <td>${fmtMoneda(r.cargos)}</td>
              <td>${fmtMoneda(r.pagos)}</td>
              <td>
                <div style="display:flex;align-items:center;gap:6px;min-width:105px;">
                  <div style="flex:1;height:7px;background:rgba(14,27,44,0.12);border-radius:4px;overflow:hidden;">
                    <div style="width:${pct}%;height:100%;background:${pct >= 100 ? '#10b981' : '#b89446'};border-radius:4px;"></div>
                  </div>
                  <span style="font-size:0.75rem;font-weight:600;min-width:32px;color:var(--text, inherit);">${pct}%</span>
                </div>
              </td>
              <td class="${r.saldo > 0 ? 'fin-debe' : ''}"><strong>${fmtMoneda(r.saldo)}</strong></td>
              <td>${r.saldo > 0 && r.cid !== '__sin__' ? `<button class="btn btn--ghost btn--sm js-cobro" data-cid="${r.cid}" data-saldo="${r.saldo}">${ICON.whatsapp} Recordar cobro</button>` : ''}</td>
            </tr>`;
          }).join('')}</tbody></table></div>`
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
      const lineas = [['Cliente', 'Procesos', 'Honorarios', 'Pagado', 'Avance (%)', 'Saldo'].map(celda).join(';')];
      filasCli.forEach(r => {
        const pct = r.cargos > 0 ? Math.min(100, Math.round((r.pagos / r.cargos) * 100)) : (r.pagos > 0 ? 100 : 0);
        lineas.push([nombreCli(r.cid), r.nprocs, r.cargos.toFixed(2), r.pagos.toFixed(2), pct + '%', r.saldo.toFixed(2)].map(celda).join(';'));
      });
      lineas.push(['TOTALES', '', totCargos.toFixed(2), totPagos.toFixed(2), (totCargos > 0 ? Math.round((totPagos / totCargos) * 100) : 0) + '%', totSaldo.toFixed(2)].map(celda).join(';'));
      descargarArchivo('estado-cuenta-clientes-' + hoyISO() + '.csv', '\ufeff' + lineas.join('\r\n'), 'text/csv;charset=utf-8');
      toast('Estado de cuenta exportado a Excel (CSV).', 'success');
    };
    return;
  }

  content().querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => openHonorarios({ id: tr.dataset.id, caratula: tr.dataset.cara }));
  const btnFinCsv = $('#btnFinCSV');
  if (btnFinCsv) btnFinCsv.onclick = () => {
    const celda = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const lineas = [['Proceso', 'Cliente', 'Honorarios', 'Pagado', 'Avance (%)', 'Saldo'].map(celda).join(';')];
    filas.forEach(r => {
      const pct = r.cargos > 0 ? Math.min(100, Math.round((r.pagos / r.cargos) * 100)) : (r.pagos > 0 ? 100 : 0);
      lineas.push([r.p.caratula, clienteName(r.p.cliente_id), r.cargos.toFixed(2), r.pagos.toFixed(2), pct + '%', r.saldo.toFixed(2)].map(celda).join(';'));
    });
    lineas.push(['TOTALES', '', totCargos.toFixed(2), totPagos.toFixed(2), (totCargos > 0 ? Math.round((totPagos / totCargos) * 100) : 0) + '%', totSaldo.toFixed(2)].map(celda).join(';'));
    descargarArchivo('honorarios-lexfive-' + hoyISO() + '.csv', '\ufeff' + lineas.join('\r\n'), 'text/csv;charset=utf-8');
    toast('Honorarios exportados a Excel (CSV).', 'success');
  };
  const btnRep = $('#btnRepFin');
  if (btnRep) btnRep.onclick = () => {
    const cuerpo = `<h1>Reporte de honorarios — cartera</h1>
      <table>
        <thead><tr><th>Proceso</th><th>Cliente</th><th>Honorarios</th><th>Pagado</th><th>Avance</th><th>Saldo</th></tr></thead>
        <tbody>${filas.map(r => {
          const pct = r.cargos > 0 ? Math.min(100, Math.round((r.pagos / r.cargos) * 100)) : (r.pagos > 0 ? 100 : 0);
          return `<tr>
          <td>${esc(r.p.caratula)}</td>
          <td>${esc(clienteName(r.p.cliente_id))}</td>
          <td>${esc(fmtMoneda(r.cargos))}</td>
          <td>${esc(fmtMoneda(r.pagos))}</td>
          <td>${pct}%</td>
          <td>${esc(fmtMoneda(r.saldo))}</td>
        </tr>`;
        }).join('')}
        <tr class="tot"><td colspan="2">TOTALES</td><td>${esc(fmtMoneda(totCargos))}</td><td>${esc(fmtMoneda(totPagos))}</td><td>${totCargos > 0 ? Math.round((totPagos / totCargos) * 100) : 0}%</td><td>${esc(fmtMoneda(totSaldo))}</td></tr>
        </tbody>
      </table>`;
    abrirImpresion('Reporte de honorarios', cuerpo);
  };
}
