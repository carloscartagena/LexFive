// ============================================================
//  VISTA: CLIENTES
//  Alta, edición y baja de clientes del bufete, con su formulario, el texto
//  del correo de bienvenida y el alta de acceso al portal.
//  Extraído de app.js (split por módulos).
// ============================================================
import { logAccion, can } from './auth.js';
import { ICON } from './icons.js';
import { esc, hoyISO, SITIO_URL, esEmailValido, fmtDate } from './util.js';
import { descargarArchivo, clientesToCSV } from './exportar.js';
import { $, content } from './dom.js';
import { paginar, pagerHTML, wirePager, toast, tip, hint, loading, openModal, closeModal } from './ui.js';
import { state } from './state.js';
import { Draft, wireDraft, maybeOfferDraft } from './draft.js';
import { loadClientes } from './datos.js';
import { supabase } from './supabase.js';
import {
  ETAPAS_PROCESALES,
  TIPOS_ACTUACION,
  getCodigoSeguimiento,
  copiarEnlaceSeguimiento,
  enviarAvanceWhatsApp,
  renderTimelineVertical
} from './seguimiento.js';

export async function renderClientes() {
  loading();
  await loadClientes();
  content().innerHTML = `
    <div class="toolbar">
      <input type="search" id="qCli" placeholder="Buscar cliente...">
      <div class="spacer"></div>
      <button class="btn btn--ghost" id="btnExportCli" ${hint('Descarga la lista de clientes en un archivo de Excel (CSV).')}>${ICON.descargar} Excel</button>
      <button class="btn btn--primary" id="btnNuevoCli">${ICON.plus} Nuevo cliente</button>
    </div>
    <div class="card"><div class="card__body--flush"><div id="cliTable"></div></div></div>`;
  let page = 1;
  function paint() {
    const q = ($('#qCli').value || '').toLowerCase();
    const rows = state.clientes.filter(c => !q || [c.nombre, c.documento, c.email, c.telefono].some(v => (v || '').toLowerCase().includes(q)));
    const info = paginar(rows, page);
    $('#cliTable').innerHTML = rows.length ? `<div class="table-wrap"><table class="data">
      <thead><tr><th>Nombre</th><th>Documento</th><th>Teléfono</th><th>Correo</th></tr></thead>
      <tbody>${info.slice.map(c => `<tr data-id="${c.id}"><td class="cell-strong">${esc(c.nombre)}</td><td>${esc(c.documento || '—')}</td><td>${esc(c.telefono || '—')}</td><td>${esc(c.email || '—')}</td></tr>`).join('')}</tbody></table></div>${pagerHTML(info)}`
      : `<div class="empty">${ICON.clientes}<p>No hay clientes registrados.</p></div>`;
    $('#cliTable').querySelectorAll('tr[data-id]').forEach(tr => tr.onclick = () => {
      const c = state.clientes.find(x => x.id === tr.dataset.id); clienteForm(c);
    });
    wirePager($('#cliTable'), info, (n) => { page = n; paint(); });
  }
  paint();
  $('#qCli').oninput = () => { page = 1; paint(); };
  $('#btnNuevoCli').onclick = () => clienteForm();
  $('#btnExportCli').onclick = () => {
    if (!state.clientes.length) { toast('No hay clientes para exportar.', 'error'); return; }
    descargarArchivo('clientes-lexfive-' + hoyISO() + '.csv', clientesToCSV(state.clientes), 'text/csv;charset=utf-8');
    toast('Lista de clientes exportada a Excel (CSV).', 'success');
  };
}

export async function clienteForm(cli = null) {
  const c = cli || {};
  let procsHTML = '';
  let procsList = [];
  let actsByProc = {};
  let docsByProc = {};

  if (cli && cli.id) {
    try {
      const { data: procs } = await supabase
        .from('procesos')
        .select('*')
        .eq('cliente_id', cli.id)
        .eq('eliminado', false)
        .order('created_at', { ascending: false });

      procsList = procs || [];
      const pids = procsList.map(p => p.id);

      if (pids.length > 0) {
        const [{ data: acts }, { data: docs }] = await Promise.all([
          supabase.from('actuaciones').select('*').in('proceso_id', pids).order('fecha', { ascending: false }),
          supabase.from('documentos').select('*').in('proceso_id', pids).order('created_at', { ascending: false })
        ]);

        (acts || []).forEach(a => {
          (actsByProc[a.proceso_id] = actsByProc[a.proceso_id] || []).push(a);
        });
        (docs || []).forEach(d => {
          (docsByProc[d.proceso_id] = docsByProc[d.proceso_id] || []).push(d);
        });
      }
    } catch (e) {
      console.warn('Error cargando causas del cliente:', e);
    }

    if (procsList.length > 0) {
      procsHTML = `
        <div style="margin-top:24px;border-top:2px solid #c2a25a;padding-top:16px;">
          <h4 style="font-size:1.1rem;color:var(--navy,#0e1b2c);margin-bottom:12px;display:flex;align-items:center;gap:8px;">
            <span>⚖️</span> Ficha Procesal y Seguimiento de Causas (${procsList.length})
          </h4>

          ${procsList.map(p => {
            const codSeg = getCodigoSeguimiento(p);
            const pActs = actsByProc[p.id] || [];
            const pDocs = docsByProc[p.id] || [];
            const etapaActual = p.etapa || 'Preparatoria / Demanda';

            return `
              <div class="card" style="margin-bottom:18px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;box-shadow:0 3px 12px rgba(14,27,44,0.04);">
                <!-- Encabezado de la Causa -->
                <div style="background:#f8fafc;padding:12px 16px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                  <div>
                    <strong style="font-size:1.02rem;color:var(--navy,#0e1b2c);">${esc(p.caratula)}</strong>
                    <div class="cell-sub" style="margin-top:2px;font-size:.82rem;">${esc(p.materia || 'General')} · ${p.tipo === 'administrativo' ? 'Administrativo' : 'Judicial'}</div>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <span class="badge" style="background:#0e1b2c;color:#c2a25a;font-weight:700;font-family:monospace;letter-spacing:1px;padding:4px 8px;border-radius:4px;border:1px solid #c2a25a;" title="Código oficial de seguimiento del cliente">
                      ${esc(codSeg)}
                    </span>
                    <button type="button" class="btn btn--sm btn--ghost js-copiar-link" data-pid="${p.id}" style="font-size:.78rem;padding:4px 9px;" title="Copiar enlace directo para casos.html">
                      🔗 Copiar enlace
                    </button>
                    <button type="button" class="btn btn--sm js-wa-proc" data-pid="${p.id}" style="background:#25d366;border-color:#25d366;color:#fff;font-size:.78rem;padding:4px 10px;font-weight:600;display:inline-flex;align-items:center;gap:4px;" title="Enviar último avance procesal por WhatsApp">
                      💬 Enviar avance por WhatsApp
                    </button>
                  </div>
                </div>

                <!-- Ficha Procesal Estructurada y Editable -->
                <div style="padding:14px 16px;">
                  <div class="field-row" style="margin-bottom:10px;">
                    <div class="field" style="margin-bottom:0;flex:1.2;">
                      <label style="font-size:.78rem;font-weight:600;">NUREJ / IANUS / Código Fiscalía</label>
                      <input id="cf_nurej_${p.id}" value="${esc(p.nurej || p.numero || '')}" placeholder="Ej: 20129381 / IANUS-8392" style="font-size:.86rem;padding:7px 10px;">
                    </div>
                    <div class="field" style="margin-bottom:0;flex:1.5;">
                      <label style="font-size:.78rem;font-weight:600;">Juzgado / Entidad / Fiscalía</label>
                      <input id="cf_juzgado_${p.id}" value="${esc(p.juzgado || '')}" placeholder="Ej: Juzgado 3° de Familia El Alto" style="font-size:.86rem;padding:7px 10px;">
                    </div>
                    <div class="field" style="margin-bottom:0;flex:1.2;">
                      <label style="font-size:.78rem;font-weight:600;">Etapa Procesal Actual</label>
                      <select id="cf_etapa_${p.id}" style="font-size:.86rem;padding:7px 10px;">
                        ${ETAPAS_PROCESALES.map(et => `<option value="${esc(et)}" ${etapaActual === et ? 'selected' : ''}>${esc(et)}</option>`).join('')}
                      </select>
                    </div>
                    <div style="display:flex;align-items:flex-end;">
                      <button type="button" class="btn btn--sm btn--navy js-save-ficha" data-pid="${p.id}" style="font-weight:600;height:34px;">
                        💾 Guardar ficha
                      </button>
                    </div>
                  </div>

                  <!-- Línea de Tiempo de Actuaciones -->
                  <div style="margin-top:16px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
                      <h5 style="margin:0;font-size:.92rem;color:var(--navy,#0e1b2c);font-weight:700;display:flex;align-items:center;gap:6px;">
                        <span>⏱️</span> Línea de Tiempo de Actuaciones (${pActs.length})
                      </h5>
                      <button type="button" class="btn btn--sm btn--ghost js-toggle-act" data-pid="${p.id}" style="font-weight:600;color:var(--navy,#0e1b2c);border:1px solid #cbd5e1;font-size:.78rem;">
                        + Registrar actuación
                      </button>
                    </div>

                    <!-- Formulario desplegable para registrar actuación -->
                    <div id="form_act_${p.id}" style="display:none;background:#f8fafc;padding:12px 14px;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:14px;">
                      <div class="field-row" style="margin-bottom:8px;">
                        <div class="field" style="margin-bottom:0;flex:1;">
                          <label style="font-size:.76rem;font-weight:600;">Fecha de la actuación</label>
                          <input type="date" id="act_f_${p.id}" value="${hoyISO()}" style="font-size:.85rem;padding:6px 8px;">
                        </div>
                        <div class="field" style="margin-bottom:0;flex:1.5;">
                          <label style="font-size:.76rem;font-weight:600;">Tipo de actuación</label>
                          <select id="act_t_${p.id}" style="font-size:.85rem;padding:6px 8px;">
                            ${TIPOS_ACTUACION.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('')}
                          </select>
                        </div>
                      </div>
                      <div class="field" style="margin-bottom:8px;">
                        <label style="font-size:.76rem;font-weight:600;">Descripción clara para el cliente</label>
                        <textarea id="act_d_${p.id}" rows="2" placeholder="Ej: Se presentó memorial de apersonamiento. El juzgado admitió la demanda y señaló audiencia." style="font-size:.86rem;padding:8px;"></textarea>
                      </div>
                      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                        <label style="display:inline-flex;align-items:center;gap:6px;font-size:.8rem;cursor:pointer;">
                          <input type="checkbox" id="act_wa_${p.id}" checked>
                          <span>Enviar avance por WhatsApp inmediatamente</span>
                        </label>
                        <button type="button" class="btn btn--sm btn--primary js-add-act" data-pid="${p.id}">
                          Guardar actuación
                        </button>
                      </div>
                    </div>

                    <!-- Render de la línea de tiempo vertical -->
                    <div id="tl_wrap_${p.id}">
                      ${renderTimelineVertical(pActs, pDocs, cli, p)}
                    </div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else {
      procsHTML = `
        <div style="margin-top:20px;border-top:1px dashed #cbd5e1;padding-top:14px;text-align:center;">
          <p class="cell-sub" style="margin-bottom:6px;">Este cliente aún no tiene expedientes o causas asignadas.</p>
        </div>
      `;
    }
  }

  const body = `
    <div class="field"><label>Nombre / Razón social *${tip('Nombre completo de la persona o el nombre de la empresa que representamos.')}</label><input id="cf_nombre" value="${esc(c.nombre || '')}"></div>
    <div class="field-row">
      <div class="field"><label>Documento (CI/NIT)${tip('Cédula de Identidad de la persona o NIT si es empresa.')}</label><input id="cf_doc" value="${esc(c.documento || '')}"></div>
      <div class="field"><label>Teléfono${tip('Número de contacto, preferentemente con WhatsApp.')}</label><input id="cf_tel" value="${esc(c.telefono || '')}"></div>
    </div>
    <div class="field"><label>Correo electrónico${tip('Importante: si el cliente se registra en el portal con este mismo correo, verá automáticamente sus procesos.')}</label><input id="cf_email" value="${esc(c.email || '')}"></div>
    <div class="field"><label>Dirección${tip('Domicilio del cliente (opcional).')}</label><input id="cf_dir" value="${esc(c.direccion || '')}"></div>
    <div class="field"><label>Notas${tip('Anotaciones internas sobre el cliente. Solo las ve el personal del bufete.')}</label><textarea id="cf_notas">${esc(c.notas || '')}</textarea></div>
    ${procsHTML}`;

  const buttons = [{ label: 'Cancelar', class: 'btn--ghost', onClick: closeModal }];
  if (cli && can(state.profile, 'delete_cliente')) buttons.push({ label: 'Eliminar', class: 'btn--danger', onClick: () => deleteCliente(cli) });
  if (cli) buttons.push({ label: 'Correo de bienvenida', class: 'btn--ghost', onClick: () => mostrarCorreoBienvenida(cli) });
  buttons.push({ label: 'Guardar cliente', class: 'btn--primary', id: 'cf_save', onClick: () => saveCliente(cli) });

  openModal(cli ? 'Ficha del Cliente y Causas' : 'Nuevo cliente', body, buttons, true);

  // Conectar acciones de causas si es edición de cliente
  if (cli && procsList.length > 0) {
    // 1) Copiar enlace de seguimiento
    document.querySelectorAll('.js-copiar-link').forEach(btn => {
      btn.onclick = () => {
        const proc = procsList.find(p => p.id === btn.dataset.pid);
        if (proc) copiarEnlaceSeguimiento(proc);
      };
    });

    // 2) Enviar avance general por WhatsApp
    document.querySelectorAll('.js-wa-proc').forEach(btn => {
      btn.onclick = () => {
        const proc = procsList.find(p => p.id === btn.dataset.pid);
        const lastAct = (actsByProc[btn.dataset.pid] || [])[0] || null;
        if (proc) enviarAvanceWhatsApp(cli, proc, lastAct);
      };
    });

    // 3) Enviar avance de una actuación específica por WhatsApp
    document.querySelectorAll('.js-wa-act').forEach(btn => {
      btn.onclick = () => {
        const actId = btn.dataset.actId;
        for (const [pid, acts] of Object.entries(actsByProc)) {
          const act = acts.find(a => a.id === actId);
          if (act) {
            const proc = procsList.find(p => p.id === pid);
            if (proc) enviarAvanceWhatsApp(cli, proc, act);
            break;
          }
        }
      };
    });

    // 4) Guardar cambios en la ficha procesal (NUREJ, Juzgado, Etapa)
    document.querySelectorAll('.js-save-ficha').forEach(btn => {
      btn.onclick = async () => {
        const pid = btn.dataset.pid;
        const nurej = ($(`#cf_nurej_${pid}`)?.value || '').trim();
        const juzgado = ($(`#cf_juzgado_${pid}`)?.value || '').trim();
        const etapa = ($(`#cf_etapa_${pid}`)?.value || '').trim();

        btn.disabled = true;
        btn.textContent = 'Guardando...';

        // Intento con todas las columnas
        let updatePayload = { nurej: nurej || null, juzgado: juzgado || null, etapa: etapa || null };
        let { error } = await supabase.from('procesos').update(updatePayload).eq('id', pid);

        // Fallback seguro si faltase la columna 'etapa' en Supabase antes de la migración
        if (error && error.message && error.message.includes('etapa')) {
          delete updatePayload.etapa;
          const retry = await supabase.from('procesos').update(updatePayload).eq('id', pid);
          error = retry.error;
        }

        btn.disabled = false;
        btn.textContent = '💾 Guardar ficha';

        if (error) {
          toast('Error al guardar datos procesales: ' + error.message, 'error');
        } else {
          toast('Ficha procesal actualizada con éxito.', 'success');
          // Actualizar estado local
          const proc = procsList.find(p => p.id === pid);
          if (proc) {
            proc.nurej = nurej;
            proc.juzgado = juzgado;
            proc.etapa = etapa;
          }
        }
      };
    });

    // 5) Toggle formulario de actuación
    document.querySelectorAll('.js-toggle-act').forEach(btn => {
      btn.onclick = () => {
        const pid = btn.dataset.pid;
        const f = document.getElementById(`form_act_${pid}`);
        if (f) {
          const isVisible = f.style.display !== 'none';
          f.style.display = isVisible ? 'none' : 'block';
          btn.textContent = isVisible ? '+ Registrar actuación' : '✕ Cancelar';
        }
      };
    });

    // 6) Guardar nueva actuación
    document.querySelectorAll('.js-add-act').forEach(btn => {
      btn.onclick = async () => {
        const pid = btn.dataset.pid;
        const fecha = $(`#act_f_${pid}`)?.value || hoyISO();
        const tipo = $(`#act_t_${pid}`)?.value || 'Actuación';
        const desc = ($(`#act_d_${pid}`)?.value || '').trim();
        const sendWA = $(`#act_wa_${pid}`)?.checked;

        if (!desc) {
          toast('Indique la descripción de la actuación.', 'error');
          $(`#act_d_${pid}`)?.focus();
          return;
        }

        btn.disabled = true;
        btn.textContent = 'Guardando...';

        const { data: newAct, error } = await supabase.from('actuaciones').insert({
          proceso_id: pid,
          fecha,
          tipo,
          descripcion: desc,
          created_by: state.profile.id
        }).select().single();

        btn.disabled = false;
        btn.textContent = 'Guardar actuación';

        if (error) {
          toast('Error al registrar actuación: ' + error.message, 'error');
          return;
        }

        toast('Actuación registrada en el expediente.', 'success');
        await logAccion('crear', 'actuacion', pid, `${tipo}: ${desc}`);

        // Opcional: Enviar WhatsApp de inmediato
        if (sendWA && newAct) {
          const proc = procsList.find(p => p.id === pid);
          if (proc) enviarAvanceWhatsApp(cli, proc, newAct);
        }

        // Recargar modal del cliente para actualizar la línea de tiempo
        clienteForm(cli);
      };
    });
  }

  // Autoguardado de borrador
  const draftName = 'cliente_' + (cli ? cli.id : 'nuevo');
  const draft = wireDraft(draftName, ['cf_nombre', 'cf_doc', 'cf_tel', 'cf_email', 'cf_dir', 'cf_notas']);
  maybeOfferDraft(draftName, draft);
}

// Plantilla del correo/mensaje de bienvenida para un cliente nuevo: incluye los
// pasos para registrarse y el enlace a la guía del cliente. Lista para copiar.
function welcomeEmailText(cli) {
  const nombre = (cli && cli.nombre) ? cli.nombre : 'cliente';
  const correo = (cli && cli.email) ? cli.email : '(el correo que registró en el bufete)';
  return [
    'Estimado/a ' + nombre + ':',
    '',
    'Le damos la bienvenida a LexFive Abogados. Habilitamos un portal en línea donde puede '
    + 'seguir el avance de sus procesos de forma segura, desde su computadora o su celular.',
    '',
    'Para crear su cuenta:',
    '1) Ingrese a: ' + SITIO_URL + 'sistema/login.html',
    '2) Elija «¿Es cliente del bufete? Cree su cuenta aquí».',
    '3) Regístrese con ESTE MISMO correo: ' + correo,
    '   (es importante usar este correo para que vea automáticamente sus casos).',
    '4) Cree una contraseña que recuerde. ¡Listo!',
    '',
    'Le compartimos una guía sencilla de uso del portal (PDF):',
    SITIO_URL + 'Manual-Clientes-LexFive.pdf',
    '',
    'Ante cualquier duda, estamos a su disposición.',
    '',
    'Atentamente,',
    'LexFive Abogados'
  ].join('\n');
}

function mostrarCorreoBienvenida(cli) {
  const texto = welcomeEmailText(cli);
  const correo = (cli && cli.email) ? cli.email : '';
  const tel = (cli && cli.telefono) ? String(cli.telefono).replace(/\D/g, '') : '';
  const body = `
    <p class="cell-sub" style="margin-bottom:10px">Copie este mensaje y envíelo al cliente por correo o WhatsApp. Ya viene con sus datos y el enlace a la guía del cliente.${correo ? '' : ' <strong>Sugerencia:</strong> agregue el correo del cliente en su ficha para personalizarlo.'}</p>
    <textarea id="welcomeMail" rows="15" style="width:100%;font:inherit;font-size:.9rem;line-height:1.5;padding:12px;border:1.5px solid var(--line);border-radius:8px;background:var(--white);color:var(--ink);resize:vertical">${esc(texto)}</textarea>`;
  const copiar = () => {
    const ta = document.getElementById('welcomeMail');
    const done = () => toast('Texto copiado. Péguelo en su correo o WhatsApp.', 'success');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(done).catch(() => { try { ta.select(); document.execCommand('copy'); done(); } catch (e) {} });
    } else { try { ta.select(); document.execCommand('copy'); done(); } catch (e) {} }
  };
  const buttons = [{ label: 'Copiar texto', class: 'btn--primary', onClick: copiar }];
  if (tel) buttons.push({ label: 'Enviar por WhatsApp', class: 'btn--ghost', onClick: () => window.open('https://wa.me/' + tel + '?text=' + encodeURIComponent(texto), '_blank') });
  if (correo) buttons.push({ label: 'Abrir en correo', class: 'btn--ghost', onClick: () => { window.location.href = 'mailto:' + correo + '?subject=' + encodeURIComponent('Bienvenido a LexFive Abogados') + '&body=' + encodeURIComponent(texto); } });
  buttons.push({ label: 'Cerrar', class: 'btn--ghost', onClick: closeModal });
  openModal('Correo de bienvenida para el cliente', body, buttons, true);
}

async function saveCliente(cli) {
  const nombre = $('#cf_nombre').value.trim();
  if (!nombre) { toast('El nombre es obligatorio.', 'error'); $('#cf_nombre').focus(); return; }
  const email = $('#cf_email').value.trim();
  if (email && !esEmailValido(email)) { toast('El correo no parece válido. Revíselo (ejemplo: nombre@correo.com).', 'error'); $('#cf_email').focus(); return; }
  const payload = {
    nombre, documento: $('#cf_doc').value.trim() || null, telefono: $('#cf_tel').value.trim() || null,
    email: email || null, direccion: $('#cf_dir').value.trim() || null, notas: $('#cf_notas').value.trim() || null
  };
  $('#cf_save').disabled = true;
  let error;
  if (cli) ({ error } = await supabase.from('clientes').update(payload).eq('id', cli.id));
  else { payload.created_by = state.profile.id; ({ error } = await supabase.from('clientes').insert(payload)); }
  if (error) { toast('No se pudo guardar el cliente: ' + (error.message || 'revise su conexión e intente de nuevo.'), 'error'); $('#cf_save').disabled = false; return; }
  Draft.clear('cliente_' + (cli ? cli.id : 'nuevo'));
  await logAccion(cli ? 'editar' : 'crear', 'cliente', cli ? cli.id : nombre, nombre);
  closeModal(); toast('Cliente guardado.', 'success'); renderClientes();
}
async function deleteCliente(cli) {
  if (!confirm(`¿Enviar al cliente "${cli.nombre}" a la papelera?\n\nNo se borra definitivamente: el administrador podrá restaurarlo o eliminarlo desde la Papelera.`)) return;
  const { error } = await supabase.from('clientes').update({
    eliminado: true, eliminado_at: new Date().toISOString(), eliminado_por: state.profile.id
  }).eq('id', cli.id);
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  await logAccion('eliminar', 'cliente', cli.id, cli.nombre);
  closeModal(); toast('Cliente enviado a la papelera.', 'success'); renderClientes();
}
