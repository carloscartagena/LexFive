// ============================================================
//  LexFive — Vista REPORTES (estadísticas de procesos y cobranza)
//  Métricas por estado/materia/abogado/mes y tasa de cobranza,
//  con filtro de período e impresión. Extraído de app.js (paso 13).
// ============================================================
import { supabase } from '@/api/supabase.js';
import { ESTADOS } from '@/utils/config.js';
import { esc, fmtDate, hoyISO } from '@/utils/util.js';
import { ICON } from '@/utils/icons.js';
import { $, content } from '@/utils/dom.js';
import { loading, barChart } from '@/utils/ui.js';
import { profName } from '@/shared/comunes.js';
import { abrirImpresion } from '@/utils/print.js';

export async function renderReportes() {
  loading();
  const { data } = await supabase.from('procesos').select('*').eq('eliminado', false);
  const todos = data || [];
  // Honorarios y pagos para la tasa de cobranza (si el rol no tiene acceso, quedan vacíos).
  let honor = [], pag = [];
  try {
    const [h, p] = await Promise.all([
      supabase.from('honorarios').select('proceso_id,monto'),
      supabase.from('pagos').select('proceso_id,monto')
    ]);
    honor = h.data || []; pag = p.data || [];
  } catch (e) { honor = []; pag = []; }
  const bs = (n) => 'Bs ' + Number(n || 0).toFixed(2);
  const fechaProc = p => (p.fecha_inicio || (p.created_at ? p.created_at.slice(0, 10) : ''));
  const hoy = hoyISO();
  const iniAnio = hoy.slice(0, 4) + '-01-01';

  content().innerHTML = `
    <div class="toolbar">
      <label class="chk-inline">Desde&nbsp;<input type="date" id="rDesde" value="${iniAnio}"></label>
      <label class="chk-inline">Hasta&nbsp;<input type="date" id="rHasta" value="${hoy}"></label>
      <div class="spacer"></div>
      <button class="btn btn--ghost" id="rTodo">Todo el historial</button>
      <button class="btn btn--primary" id="rPrint">${ICON.doc} Imprimir / PDF</button>
    </div>
    <div id="repBody"></div>`;

  let rango = { desde: iniAnio, hasta: hoy };
  const enRango = p => {
    const f = fechaProc(p);
    if (!f) return true;
    if (rango.desde && f < rango.desde) return false;
    if (rango.hasta && f > rango.hasta) return false;
    return true;
  };

  let datos = {};
  function calc() {
    const filt = todos.filter(enRango);
    const activos = filt.filter(p => !['archivado', 'concluido'].includes(p.estado)).length;
    const judiciales = filt.filter(p => p.tipo !== 'administrativo').length;
    const administrativos = filt.length - judiciales;
    const porEstado = Object.entries(ESTADOS).map(([k, v]) => ({ label: v, value: filt.filter(p => p.estado === k).length }));
    const matCount = {}; filt.forEach(p => { const m = p.materia || 'Sin materia'; matCount[m] = (matCount[m] || 0) + 1; });
    const porMateria = Object.entries(matCount).map(([k, v]) => ({ label: k, value: v })).sort((a, b) => b.value - a.value);
    const aboCount = {}; filt.forEach(p => { const ids = (p.abogados_ids && p.abogados_ids.length) ? p.abogados_ids : (p.abogado_id ? [p.abogado_id] : []); ids.forEach(id => { aboCount[id] = (aboCount[id] || 0) + 1; }); });
    const porAbogado = Object.entries(aboCount).map(([id, v]) => ({ label: profName(id), value: v })).sort((a, b) => b.value - a.value);
    // Tasa de cobranza (pagado / facturado) de los procesos del período.
    const idsFilt = new Set(filt.map(p => p.id));
    const totHon = honor.filter(h => idsFilt.has(h.proceso_id)).reduce((a, b) => a + Number(b.monto || 0), 0);
    const totPag = pag.filter(p => idsFilt.has(p.proceso_id)).reduce((a, b) => a + Number(b.monto || 0), 0);
    const cobranza = totHon > 0 ? Math.round((totPag / totHon) * 100) : null;
    // Casos nuevos por mes (según fecha de inicio / alta).
    const mesCount = {};
    filt.forEach(p => { const f = fechaProc(p); if (f) { const k = f.slice(0, 7); mesCount[k] = (mesCount[k] || 0) + 1; } });
    const porMes = Object.keys(mesCount).sort().map(k => { const a = k.split('-'); return { label: a[1] + '/' + a[0].slice(2), value: mesCount[k] }; });
    datos = { filt, activos, judiciales, administrativos, porEstado, porMateria, porAbogado, cobranza, totHon, totPag, porMes };

    $('#repBody').innerHTML = `
      <div class="stats-grid">
        <div class="metric"><div class="metric__top"><div class="metric__icon">${ICON.procesos}</div></div><div class="metric__num">${filt.length}</div><div class="metric__label">Procesos en el período</div></div>
        <div class="metric"><div class="metric__top"><div class="metric__icon">${ICON.dashboard}</div></div><div class="metric__num">${activos}</div><div class="metric__label">Activos</div></div>
        <div class="metric"><div class="metric__top"><div class="metric__icon">${ICON.doc}</div></div><div class="metric__num">${judiciales}</div><div class="metric__label">Judiciales</div></div>
        <div class="metric"><div class="metric__top"><div class="metric__icon">${ICON.doc}</div></div><div class="metric__num">${administrativos}</div><div class="metric__label">Administrativos</div></div>
        ${cobranza !== null ? `<div class="metric"><div class="metric__top"><div class="metric__icon">${ICON.dinero}</div></div><div class="metric__num">${cobranza}%</div><div class="metric__label">Tasa de cobranza</div></div>` : ''}
      </div>
      ${cobranza !== null ? `<div class="card"><div class="card__head"><h3>${ICON.dinero} Cobranza del período</h3></div><div class="card__body" style="display:flex;flex-wrap:wrap;gap:24px">
        <div><div class="cell-sub">Facturado (honorarios)</div><div class="cell-strong" style="font-size:1.2rem">${bs(totHon)}</div></div>
        <div><div class="cell-sub">Cobrado (pagos)</div><div class="cell-strong" style="font-size:1.2rem">${bs(totPag)}</div></div>
        <div><div class="cell-sub">Saldo por cobrar</div><div class="cell-strong" style="font-size:1.2rem">${bs(totHon - totPag)}</div></div>
      </div></div>` : ''}
      <div class="charts-grid">
        <div class="card"><div class="card__head"><h3>${ICON.grafico} Por estado</h3></div><div class="card__body">${barChart(porEstado)}</div></div>
        <div class="card"><div class="card__head"><h3>${ICON.grafico} Por materia</h3></div><div class="card__body">${barChart(porMateria)}</div></div>
        <div class="card"><div class="card__head"><h3>${ICON.grafico} Por abogado</h3></div><div class="card__body">${barChart(porAbogado)}</div></div>
        ${porMes.length ? `<div class="card"><div class="card__head"><h3>${ICON.grafico} Casos nuevos por mes</h3></div><div class="card__body">${barChart(porMes)}</div></div>` : ''}
      </div>`;
  }
  calc();

  const aplicar = () => { rango = { desde: $('#rDesde').value, hasta: $('#rHasta').value }; calc(); };
  $('#rDesde').onchange = aplicar;
  $('#rHasta').onchange = aplicar;
  $('#rTodo').onclick = () => { $('#rDesde').value = ''; $('#rHasta').value = ''; aplicar(); };
  $('#rPrint').onclick = () => {
    const d = datos;
    const tabla = (titulo, colName, arr) => `<h2 style="font-size:13px;margin:16px 0 4px;color:#0e1b2c">${esc(titulo)}</h2>
      <table><thead><tr><th>${esc(colName)}</th><th style="width:120px">Cantidad</th></tr></thead>
      <tbody>${arr.filter(i => i.value > 0).map(i => `<tr><td>${esc(i.label)}</td><td>${i.value}</td></tr>`).join('') || '<tr><td colspan="2">Sin datos</td></tr>'}</tbody></table>`;
    const periodo = (rango.desde || rango.hasta)
      ? `Período: ${rango.desde ? fmtDate(rango.desde) : 'inicio'} — ${rango.hasta ? fmtDate(rango.hasta) : 'hoy'}`
      : 'Todo el historial';
    const body = `<h1>Reporte de procesos</h1>
      <p style="color:#5c6675;font-size:12px;margin:0 0 4px">${esc(periodo)} · ${d.filt.length} proceso(s) · ${d.activos} activo(s)${d.cobranza !== null ? ' · Cobranza: ' + d.cobranza + '%' : ''}</p>
      ${d.cobranza !== null ? `<p style="font-size:12px;margin:0 0 4px">Facturado: ${bs(d.totHon)} · Cobrado: ${bs(d.totPag)} · Saldo: ${bs(d.totHon - d.totPag)}</p>` : ''}
      ${tabla('Por estado', 'Estado', d.porEstado)}
      ${tabla('Por materia', 'Materia', d.porMateria)}
      ${tabla('Por abogado', 'Abogado', d.porAbogado)}
      ${d.porMes && d.porMes.length ? tabla('Casos nuevos por mes', 'Mes', d.porMes) : ''}`;
    abrirImpresion('Reporte de procesos', body);
  };
}
