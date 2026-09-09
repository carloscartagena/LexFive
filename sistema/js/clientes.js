// ============================================================
//  VISTA: CLIENTES
//  Alta, edición y baja de clientes del bufete, con su formulario, el texto
//  del correo de bienvenida y el alta de acceso al portal.
//  Extraído de app.js (split por módulos).
// ============================================================
import { logAccion, can } from './auth.js';
import { ICON } from './icons.js';
import { esc, hoyISO, SITIO_URL, esEmailValido } from './util.js';
import { descargarArchivo, clientesToCSV } from './exportar.js';
import { $, content } from './dom.js';
import { paginar, pagerHTML, wirePager, toast, tip, hint, loading, openModal, closeModal } from './ui.js';
import { state } from './state.js';
import { Draft, wireDraft, maybeOfferDraft } from './draft.js';
import { loadClientes } from './datos.js';
import { supabase } from './supabase.js';

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

export function clienteForm(cli = null) {
  const c = cli || {};
  const body = `
    <div class="field"><label>Nombre / Razón social *${tip('Nombre completo de la persona o el nombre de la empresa que representamos.')}</label><input id="cf_nombre" value="${esc(c.nombre || '')}"></div>
    <div class="field-row">
      <div class="field"><label>Documento (CI/NIT)${tip('Cédula de Identidad de la persona o NIT si es empresa.')}</label><input id="cf_doc" value="${esc(c.documento || '')}"></div>
      <div class="field"><label>Teléfono${tip('Número de contacto, preferentemente con WhatsApp.')}</label><input id="cf_tel" value="${esc(c.telefono || '')}"></div>
    </div>
    <div class="field"><label>Correo electrónico${tip('Importante: si el cliente se registra en el portal con este mismo correo, verá automáticamente sus procesos.')}</label><input id="cf_email" value="${esc(c.email || '')}"></div>
    <div class="field"><label>Dirección${tip('Domicilio del cliente (opcional).')}</label><input id="cf_dir" value="${esc(c.direccion || '')}"></div>
    <div class="field"><label>Notas${tip('Anotaciones internas sobre el cliente. Solo las ve el personal del bufete.')}</label><textarea id="cf_notas">${esc(c.notas || '')}</textarea></div>`;
  const buttons = [{ label: 'Cancelar', class: 'btn--ghost', onClick: closeModal }];
  if (cli && can(state.profile, 'delete_cliente')) buttons.push({ label: 'Eliminar', class: 'btn--danger', onClick: () => deleteCliente(cli) });
  if (cli) buttons.push({ label: 'Correo de bienvenida', class: 'btn--ghost', onClick: () => mostrarCorreoBienvenida(cli) });
  buttons.push({ label: 'Guardar', class: 'btn--primary', id: 'cf_save', onClick: () => saveCliente(cli) });
  openModal(cli ? 'Editar cliente' : 'Nuevo cliente', body, buttons);

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
