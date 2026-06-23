// ============================================================
//  VISTA: AGENDA / CALENDARIO  (audiencias y plazos del bufete)
//  - renderAgenda: calendario de audiencias y eventos próximos.
//  - descargarICSEvento: exporta un evento a .ics (privado del módulo).
//  - openPlazos: gestión de plazos de un proceso (se usa desde el detalle de
//    proceso, por eso se exporta para ./procesos.js).
//  Extraído de app.js (split por módulos).
// ============================================================
import { logAccion } from './auth.js';
import { ICON } from './icons.js';
import { esc, fmtDate, fmtDateTime } from './util.js';
import { descargarArchivo, pad2, icsFecha, icsEscape, googleCalURL, sumarDiasHabiles } from './exportar.js';
import { $, content } from './dom.js';
import { toast, loading, openModal, closeModal } from './ui.js';
import { state } from './state.js';
import { profName, namesFromIds } from './comunes.js';
import { supabase } from './supabase.js';
import { openProcesoDetail } from './procesos.js';

export async function renderAgenda() {
  loading();
  const [{ data: procs }, { data: evs }] = await Promise.all([
    supabase.from('procesos').select('*').eq('eliminado', false),
    supabase.from('eventos').select('*')
  ]);
  const procMap = {};
  (procs || []).forEach(p => { procMap[p.id] = p; });

  const hoy = new Date();
  const ahora = new Date();
  const en7 = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Unificar: "próxima audiencia" del proceso (heredado) + eventos/plazos múltiples.
  const items = [];
  (procs || []).forEach(p => {
    if (p.proxima_audiencia) items.push({ procId: p.id, fecha: p.proxima_audiencia, titulo: p.caratula, kind: 'proc', proc: p });
  });
  (evs || []).forEach(e => {
    const p = procMap[e.proceso_id];
    items.push({ procId: e.proceso_id, fecha: e.fecha, titulo: e.titulo + (p ? ' · ' + p.caratula : ''), kind: 'ev', ev: e, proc: p });
  });
  items.forEach((it, i) => { it.i = i; });

  const claseItem = it => {
    if (it.kind === 'ev' && it.ev.estado === 'cumplido') return 'cal-ev--done';
    const d = new Date(it.fecha);
    if (d < ahora && !(it.proc && ['archivado', 'concluido'].includes(it.proc.estado))) return 'cal-ev--red';
    if (d <= en7) return 'cal-ev--amber';
    return '';
  };

  if (!state.agenda) state.agenda = { y: hoy.getFullYear(), m: hoy.getMonth() };
  const { y, m } = state.agenda;
  const primero = new Date(y, m, 1);
  const diasMes = new Date(y, m + 1, 0).getDate();
  const inicioSemana = primero.getDay(); // 0=Dom
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Agrupar por día (solo del mes mostrado)
  const porDia = {};
  items.forEach(it => {
    const d = new Date(it.fecha);
    if (d.getFullYear() === y && d.getMonth() === m) {
      const k = d.getDate();
      (porDia[k] = porDia[k] || []).push(it);
    }
  });

  // Construir celdas (incluye huecos del inicio de semana)
  let celdas = '';
  for (let i = 0; i < inicioSemana; i++) celdas += '<div class="cal-cell cal-cell--empty"></div>';
  for (let dia = 1; dia <= diasMes; dia++) {
    const evsDia = (porDia[dia] || []).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    const esHoy = (y === hoy.getFullYear() && m === hoy.getMonth() && dia === hoy.getDate());
    const evHtml = evsDia.slice(0, 3).map(it => {
      const hora = new Date(it.fecha).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
      return `<button class="cal-ev ${claseItem(it)}" data-pid="${it.procId}" title="${esc(it.titulo)}">${hora} ${esc(it.titulo)}</button>`;
    }).join('');
    const mas = evsDia.length > 3 ? `<span class="cal-mas">+${evsDia.length - 3} más</span>` : '';
    celdas += `<div class="cal-cell ${esHoy ? 'cal-cell--hoy' : ''}"><span class="cal-daynum">${dia}</span>${evHtml}${mas}</div>`;
  }

  // Lista de eventos del mes (con botón para exportar a calendario personal)
  const delMes = items.filter(it => {
    const d = new Date(it.fecha);
    return d.getFullYear() === y && d.getMonth() === m;
  }).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  content().innerHTML = `
    <div class="card">
      <div class="cal-nav">
        <button class="btn btn--ghost btn--sm" id="calPrev">&larr;</button>
        <h3 class="cal-title">${meses[m]} ${y}</h3>
        <button class="btn btn--ghost btn--sm" id="calNext">&rarr;</button>
        <div class="spacer"></div>
        <button class="btn btn--ghost btn--sm" id="calHoy">Hoy</button>
      </div>
      <div class="card__body--flush">
        <div class="cal-weekdays">${dias.map(d => `<div>${d}</div>`).join('')}</div>
        <div class="cal-grid">${celdas}</div>
      </div>
    </div>

    <div class="card">
      <div class="card__head"><h3>${ICON.audiencia} Audiencias y plazos de ${meses[m]}</h3>${delMes.length ? `<button class="btn btn--ghost btn--sm" id="calExport" type="button">${ICON.descargar} Exportar mes (.ics)</button>` : ''}</div>
      <div class="card__body--flush">
        ${delMes.length ? `<div class="table-wrap"><table class="data">
          <thead><tr><th>Fecha / hora</th><th>Evento / proceso</th><th>Tipo</th><th>Responsable</th><th></th></tr></thead>
          <tbody>${delMes.map(it => {
            const detalleGcal = it.kind === 'ev'
              ? (it.ev.nota || '')
              : [it.proc && it.proc.numero ? ('Nº ' + it.proc.numero) : '', it.proc && it.proc.materia ? it.proc.materia : ''].filter(Boolean).join(' · ');
            const gcal = googleCalURL(new Date(it.fecha), it.titulo, detalleGcal, it.proc ? it.proc.juzgado : '');
            return `
            <tr>
              <td>${fmtDateTime(it.fecha)}</td>
              <td class="cell-strong js-open" data-pid="${it.procId}" style="cursor:pointer">${esc(it.titulo)}</td>
              <td>${it.kind === 'ev' ? esc(it.ev.tipo) : 'audiencia'}${it.kind === 'ev' && it.ev.estado === 'cumplido' ? ' ✓' : ''}</td>
              <td>${esc(it.proc ? (namesFromIds(it.proc.abogados_ids) || profName(it.proc.abogado_id)) : '—')}</td>
              <td style="white-space:nowrap">
                <button class="btn btn--ghost btn--sm js-ics" data-i="${it.i}">${ICON.descargar} .ics</button>
                ${gcal ? `<a class="btn btn--ghost btn--sm" target="_blank" rel="noopener" href="${gcal}" title="Agregar a Google Calendar">📅 Google</a>` : ''}
              </td>
            </tr>`; }).join('')}</tbody></table></div>`
        : `<div class="empty">${ICON.audiencia}<p>No hay audiencias ni plazos registrados en este mes.</p></div>`}
      </div>
    </div>`;

  const irMes = (delta) => {
    let nm = m + delta, ny = y;
    if (nm < 0) { nm = 11; ny--; } else if (nm > 11) { nm = 0; ny++; }
    state.agenda = { y: ny, m: nm };
    renderAgenda();
  };
  $('#calPrev').onclick = () => irMes(-1);
  $('#calNext').onclick = () => irMes(1);
  $('#calHoy').onclick = () => { state.agenda = { y: hoy.getFullYear(), m: hoy.getMonth() }; renderAgenda(); };
  content().querySelectorAll('.cal-ev, .js-open').forEach(el => el.onclick = () => openProcesoDetail(el.dataset.pid));
  content().querySelectorAll('.js-ics').forEach(b => b.onclick = (e) => {
    e.stopPropagation();
    const it = items[b.dataset.i];
    if (!it) return;
    if (it.kind === 'ev') descargarICSEvento(it.ev, it.proc ? it.proc.caratula : '');
    else descargarICS(it.proc);
  });
  const bexp = $('#calExport');
  if (bexp) bexp.onclick = () => {
    if (!delMes.length) { toast('No hay eventos este mes para exportar.', 'error'); return; }
    const vevents = delMes.map(it => {
      const inicio = new Date(it.fecha);
      const fin = new Date(inicio.getTime() + 60 * 60 * 1000);
      const uid = (it.kind === 'ev' ? 'ev-' + it.ev.id : 'proc-' + it.procId) + '@lexfive';
      const desc = it.kind === 'ev' ? (it.ev.nota || it.ev.tipo || '') : (it.proc && it.proc.numero ? 'Nº ' + it.proc.numero : '');
      return [
        'BEGIN:VEVENT', 'UID:lexfive-' + uid, 'DTSTAMP:' + icsFecha(new Date()),
        'DTSTART:' + icsFecha(inicio), 'DTEND:' + icsFecha(fin), 'SUMMARY:' + icsEscape(it.titulo),
        desc ? 'DESCRIPTION:' + icsEscape(desc) : '',
        'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEscape(it.titulo), 'END:VALARM',
        'END:VEVENT'
      ].filter(Boolean).join('\r\n');
    });
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LexFive//Sistema//ES', 'CALSCALE:GREGORIAN', ...vevents, 'END:VCALENDAR'].join('\r\n');
    descargarArchivo('agenda-' + y + '-' + String(m + 1).padStart(2, '0') + '.ics', ics, 'text/calendar;charset=utf-8');
    toast('Agenda de ' + meses[m] + ' descargada (' + delMes.length + ' eventos). Ábrala para agregarla a su calendario.', 'success');
  };
}

// Descarga un evento/plazo como archivo de calendario (.ics).
function descargarICSEvento(ev, caratula) {
  const inicio = new Date(ev.fecha);
  const fin = new Date(inicio.getTime() + 60 * 60 * 1000);
  const resumen = (ev.titulo || 'Evento') + (caratula ? ' — ' + caratula : '');
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LexFive//Sistema//ES', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', 'UID:lexfive-ev-' + ev.id + '@lexfive', 'DTSTAMP:' + icsFecha(new Date()),
    'DTSTART:' + icsFecha(inicio), 'DTEND:' + icsFecha(fin), 'SUMMARY:' + icsEscape(resumen),
    ev.nota ? 'DESCRIPTION:' + icsEscape(ev.nota) : '',
    'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEscape(resumen), 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'
  ].filter(Boolean).join('\r\n');
  descargarArchivo('evento-' + (ev.titulo || 'evento').toLowerCase().replace(/[^\w]+/g, '-').slice(0, 30) + '.ics', ics, 'text/calendar;charset=utf-8');
  toast('Evento descargado. Ábralo para agregarlo a su calendario.', 'success');
}


export async function openPlazos(proc) {
  const pintar = async () => {
    const { data } = await supabase.from('eventos').select('*').eq('proceso_id', proc.id).order('fecha', { ascending: true });
    const evs = data || [];
    const lista = evs.length ? evs.map(e => {
      const cumplido = e.estado === 'cumplido';
      const gcalEv = googleCalURL(new Date(e.fecha), (e.titulo || 'Evento') + (proc.caratula ? ' — ' + proc.caratula : ''), e.nota || '', proc.juzgado || '');
      return `<div class="plazo-row ${cumplido ? 'is-done' : ''}" data-id="${e.id}">
        <div>
          <div class="cell-strong">${esc(e.titulo)} <span class="badge badge-mat">${esc(e.tipo)}</span></div>
          <div class="cell-sub">${fmtDateTime(e.fecha)}${e.nota ? ' · ' + esc(e.nota) : ''}</div>
        </div>
        <div class="plazo-row__actions">
          <button class="btn btn--ghost btn--sm js-ics" data-id="${e.id}" title="Descargar .ics">${ICON.descargar}</button>
          ${gcalEv ? `<a class="btn btn--ghost btn--sm" target="_blank" rel="noopener" href="${gcalEv}" title="Agregar a Google Calendar">📅</a>` : ''}
          <button class="btn btn--ghost btn--sm js-done" data-id="${e.id}">${cumplido ? 'Reabrir' : 'Cumplido'}</button>
          <button class="btn btn--danger btn--sm js-del" data-id="${e.id}">Eliminar</button>
        </div>
      </div>`;
    }).join('') : '<p class="cell-sub" style="padding:8px 0">Aún no hay plazos ni audiencias registrados.</p>';

    const body = `
      <p class="cell-sub" style="margin-bottom:10px">Registre todas las audiencias y plazos de este proceso. Aparecerán en la <strong>Agenda</strong> y podrá exportarlos a su calendario.</p>
      <div class="plazo-list">${lista}</div>
      <div class="card" style="margin-top:14px"><div class="card__body">
        <div class="field-row">
          <div class="field"><label>Título *</label><input id="ev_titulo" placeholder="Ej: Audiencia preliminar"></div>
          <div class="field"><label>Tipo</label><select id="ev_tipo"><option value="audiencia">Audiencia</option><option value="plazo">Plazo / vencimiento</option><option value="reunion">Reunión</option><option value="otro">Otro</option></select></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Fecha y hora *</label><input type="datetime-local" id="ev_fecha"></div>
          <div class="field"><label>Nota (opcional)</label><input id="ev_nota" placeholder="Sala, detalle..."></div>
        </div>
        <button class="btn btn--navy" id="ev_add">${ICON.plus} Agregar plazo</button>
      </div></div>
      <div class="card" style="margin-top:14px"><div class="card__body">
        <h4 class="section-title" style="margin-top:0">Calculadora de plazo (días hábiles)</h4>
        <p class="cell-sub" style="margin-bottom:10px">Calcule la fecha de vencimiento contando días hábiles (omite sábados y domingos). No incluye feriados.</p>
        <div class="field-row">
          <div class="field"><label>Fecha base</label><input type="date" id="pl_base" value="${new Date().toISOString().slice(0, 10)}"></div>
          <div class="field"><label>Días hábiles</label><input type="number" id="pl_dias" min="1" value="5"></div>
        </div>
        <button class="btn btn--ghost btn--sm" id="pl_calc">Calcular vencimiento</button>
        <span class="cell-sub" id="pl_result" style="margin-left:10px"></span>
      </div></div>`;
    openModal('Plazos y audiencias · ' + proc.caratula, body, [{ label: 'Cerrar', class: 'btn--primary', onClick: closeModal }], true);

    $('#ev_add').onclick = async () => {
      const titulo = $('#ev_titulo').value.trim();
      const fecha = $('#ev_fecha').value;
      if (!titulo || !fecha) { toast('Indique título y fecha.', 'error'); return; }
      $('#ev_add').disabled = true;
      const { error } = await supabase.from('eventos').insert({
        proceso_id: proc.id, titulo, tipo: $('#ev_tipo').value,
        fecha: new Date(fecha).toISOString(), nota: $('#ev_nota').value.trim() || null,
        created_by: state.profile.id
      });
      if (error) { toast('Error: ' + error.message, 'error'); $('#ev_add').disabled = false; return; }
      await logAccion('crear', 'evento', proc.id, titulo);
      toast('Plazo agregado.', 'success');
      pintar();
    };
    document.querySelectorAll('.plazo-row .js-done').forEach(b => b.onclick = async () => {
      const e = evs.find(x => x.id === b.dataset.id);
      await supabase.from('eventos').update({ estado: e.estado === 'cumplido' ? 'pendiente' : 'cumplido' }).eq('id', e.id);
      pintar();
    });
    document.querySelectorAll('.plazo-row .js-del').forEach(b => b.onclick = async () => {
      if (!confirm('¿Eliminar este plazo?')) return;
      await supabase.from('eventos').delete().eq('id', b.dataset.id);
      toast('Plazo eliminado.', 'success');
      pintar();
    });
    document.querySelectorAll('.plazo-row .js-ics').forEach(b => b.onclick = () => {
      const e = evs.find(x => x.id === b.dataset.id);
      if (e) descargarICSEvento(e, proc.caratula);
    });

    // Calculadora de plazo en días hábiles.
    const plCalc = $('#pl_calc');
    if (plCalc) plCalc.onclick = () => {
      const base = $('#pl_base').value;
      const dias = $('#pl_dias').value;
      if (!base || !dias) { toast('Indique la fecha base y los días hábiles.', 'error'); return; }
      const venc = sumarDiasHabiles(base + 'T00:00:00', dias);
      if (!venc) { toast('Fecha base no válida.', 'error'); return; }
      const iso = venc.getFullYear() + '-' + pad2(venc.getMonth() + 1) + '-' + pad2(venc.getDate());
      $('#pl_result').innerHTML = `Vence el <strong>${fmtDate(iso)}</strong> &nbsp;<button class="btn btn--ghost btn--sm" id="pl_usar" type="button">Usar en el plazo</button>`;
      const usar = $('#pl_usar');
      if (usar) usar.onclick = () => {
        const f = $('#ev_fecha'); if (f) f.value = iso + 'T09:00';
        toast('Fecha colocada en el formulario de plazo (9:00). Ajústela si hace falta.', 'success');
      };
    };
  };
  await pintar();
}
