// ============================================================
//  LexFive — Sistema de Gestión Legal · Lógica principal
// ============================================================
import { supabase } from './supabase.js';
import { requireAuth, getProfile, signOut, signOutTo, logAccion, can, withTimeout, mfaFactors, mfaEnroll, mfaVerify, mfaUnenroll } from './auth.js';
import { ROLES, ESTADOS, MATERIAS, WHATSAPP, ABOGADOS, VAPID_PUBLIC_KEY } from './config.js';
import { ICON } from './icons.js';
import { esc, hoyISO, addAnios, fmtFechaCorta, qrURL, RPA_URL, SITIO_URL, qrPersona, resaltarRepre, fmtDate, fmtDateTime, fmtHora, initials, esEmailValido } from './util.js';
import { descargarArchivo, srcDe, pad2, icsFecha, icsEscape, buildICS, googleCalURL, sumarDiasHabiles, fmtMoneda, clientesToCSV, honorariosToCSV, montoEnLetras } from './exportar.js';
import { $, content } from './dom.js';
import { paginar, pagerHTML, wirePager, barChart, toast, flashAutosave, tip, hint, initTooltipEngine, loading, openModal, closeModal } from './ui.js';
import { state } from './state.js';
import { loadCategorias, categoriaOptions, wireCategoriaSelect, renderCategorias } from './categorias.js';
import { profName, clienteName, badgeEstado, optionsProfiles, checkboxesProfiles, namesFromIds, optionsClientes } from './comunes.js';
import { renderConsultas, consultaNombre, openConsultaDetail } from './consultas.js';
import { loadProfiles, loadClientes } from './datos.js';
import { renderUsuarios, renderAuditoria } from './admin.js';
import { Draft, wireDraft, maybeOfferDraft } from './draft.js';
import { renderBlog } from './blog.js';
import { renderPlantillas } from './plantillas.js';
import { subirDocumento, enlaceDocumento, subirImagenBranding } from './storage.js';
import { renderModelos } from './modelos.js';
import { renderTareas, TAREA_PRIOR } from './tareas.js';
import { abrirImpresion } from './print.js';
import { renderReportes } from './reportes.js';
import { renderFinanzas, openHonorarios } from './finanzas.js';
import { renderPapelera } from './papelera.js';
import { abrirEditorImagen } from './imagenes.js';
import { renderAreas } from './areas.js';
import { renderSitio } from './sitio.js';
import { renderSellos } from './sellos.js';
import { renderCredenciales, renderCredGuardadas } from './credenciales.js';
import { renderCertificados } from './certificados.js';
import { mountOpinion, renderMiOpinion, renderTestimonios } from './opiniones.js';
import { renderClientes, clienteForm } from './clientes.js';
import { renderProcesos, openProcesoDetail } from './procesos.js';
import { renderAgenda } from './agenda.js';
import { updateNovedadesBadge, renderNovedades, renderMisProcesos } from './portal-cliente.js';
import { normCred, CredStore } from './credstore.js';
import { openHoras } from './horas.js';
import { BRAND_LOGOS, BRAND_SELLOS, BRAND_LOGO_DEFAULT, BRAND_SELLO_DEFAULT, brandHidden, brandLogosVisibles, brandSellosVisibles } from './branding-catalogos.js';
import { ImgDB, IMG, ensureImgCache, guardarImagen, borrarImagen, saveLogosCustom, saveSellosCustom, findCustomLogo, findCustomSello } from './media.js';
import { wmOpacityActual, applyWmOpacity, bgOpOf, Branding, Galerias, snapshotGalerias, pushGalerias, snapshotBranding, lastBrandingPush, pushBranding, hydrateBranding, brandingHydrated, pickActiveLogo, pickActiveSello, brandLogoSrc, brandSelloSrc, nombreLogoArchivo, nombreSelloArchivo, applyLogo } from './branding.js';

// ---------- Estado global ----------
// El objeto state se movió a ./state.js (se importa arriba) para poder
// compartirlo con los módulos de vistas.

// ---------- Iconos ----------
// El objeto ICON se movió a ./icons.js y se importa arriba.

const NAV = [
  { key: 'dashboard', label: 'Panel', icon: ICON.dashboard },
  { key: 'procesos', label: 'Procesos', icon: ICON.procesos },
  { key: 'agenda', label: 'Agenda', icon: ICON.audiencia },
  { key: 'reportes', label: 'Reportes', icon: ICON.grafico },
  { key: 'tareas', label: 'Tareas', icon: ICON.tareas },
  { key: 'modelos', label: 'Modelos', icon: ICON.doc },
  { key: 'plantillas', label: 'Plantillas', icon: ICON.plantilla },
  { key: 'clientes', label: 'Clientes', icon: ICON.clientes },
  { key: 'consultas', label: 'Consultas', icon: ICON.consultas },
  { key: 'finanzas', label: 'Honorarios', icon: ICON.dinero, finOnly: true },
  { key: 'blog', label: 'Blog', icon: ICON.blog },
  { key: 'credenciales', label: 'Credenciales', icon: ICON.llave, credOnly: true },
  { key: 'credguardadas', label: 'Credenciales guardadas', icon: ICON.usuarios, credOnly: true },
  { key: 'sellos', label: 'Sellos y logos', icon: ICON.sello, credOnly: true },
  { key: 'sitio', label: 'Sitio web', icon: ICON.blog, credOnly: true },
  { key: 'areas', label: 'Áreas de práctica', icon: ICON.categorias, credOnly: true },
  { key: 'certificados', label: 'Certificados', icon: ICON.doc, credOnly: true },
  { key: 'testimonios', label: 'Testimonios', icon: ICON.estrella, adminOnly: true },
  { key: 'categorias', label: 'Categorías', icon: ICON.categorias, adminOnly: true },
  { key: 'usuarios', label: 'Usuarios', icon: ICON.usuarios, adminOnly: true },
  { key: 'auditoria', label: 'Auditoría', icon: ICON.auditoria, adminOnly: true },
  { key: 'papelera', label: 'Papelera', icon: ICON.papelera, adminOnly: true }
];
// credOnly = solo administrador y abogado (NO procurador ni cliente)

// ============================================================
//  Utilidades de interfaz
// ============================================================
// Los atajos $ y content están en ./dom.js; los helpers de UI (paginación,
// toast, modal, tooltips, etc.) en ./ui.js. Ambos se importan arriba.

// Barra discreta que avisa cuando hay una versión nueva del panel disponible
// (la detecta el Service Worker). Con un botón para recargar y aplicarla.
let _avisoActualizacionVisible = false;
function mostrarAvisoActualizacion() {
  if (_avisoActualizacionVisible) return;
  _avisoActualizacionVisible = true;
  const bar = document.createElement('div');
  bar.id = 'updateBar';
  bar.setAttribute('role', 'status');
  bar.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:9999;display:flex;align-items:center;gap:14px;max-width:92vw;background:#0e1b2c;color:#eef3f9;border:1px solid rgba(255,255,255,.18);box-shadow:0 10px 30px rgba(0,0,0,.35);border-radius:12px;padding:12px 16px;font-size:.92rem';
  bar.innerHTML = '<span>Hay una versión nueva del sistema disponible.</span>' +
    '<button type="button" id="updateNow" style="background:#c2a25a;color:#0e1b2c;border:none;border-radius:8px;padding:8px 14px;font-weight:700;cursor:pointer">Actualizar</button>' +
    '<button type="button" id="updateLater" aria-label="Cerrar" style="background:transparent;color:inherit;border:none;font-size:1.2rem;cursor:pointer;line-height:1">&times;</button>';
  document.body.appendChild(bar);
  const cerrar = () => { bar.remove(); _avisoActualizacionVisible = false; };
  bar.querySelector('#updateNow').onclick = () => location.reload();
  bar.querySelector('#updateLater').onclick = cerrar;
}

// ---------- Utilidades puras ----------
// Las funciones esc, fmtDate, fmtDateTime, fmtHora, hoyISO, addAnios,
// fmtFechaCorta, qrURL, qrPersona, resaltarRepre, initials, esEmailValido y las
// constantes RPA_URL / SITIO_URL se movieron a ./util.js y se importan arriba.

// ============================================================
//  Utilidades de exportación (descargas, calendario .ics, CSV)
// ============================================================
// descargarArchivo, srcDe, pad2, icsFecha, icsEscape, buildICS, googleCalURL,
// sumarDiasHabiles, fmtMoneda, clientesToCSV, honorariosToCSV y montoEnLetras
// se movieron a ./exportar.js y se importan arriba.

// --- Operaciones de Storage con TIEMPO LÍMITE ---------------------------------
// subirDocumento, enlaceDocumento y subirImagenBranding se movieron a
// ./storage.js (se importan arriba).

// ICS/calendario movidos a ./exportar.js (pad2, icsFecha, icsEscape, buildICS).

// Descarga la audiencia de un proceso como archivo de calendario.
function descargarICS(proc) {
  const ics = buildICS(proc);
  if (!ics) { toast('Este proceso no tiene fecha de audiencia.', 'error'); return; }
  const nombre = 'audiencia-' + (proc.caratula || 'proceso').toLowerCase().replace(/[^\w]+/g, '-').slice(0, 40) + '.ics';
  descargarArchivo(nombre, ics, 'text/calendar;charset=utf-8');
  toast('Evento descargado. Ábralo para agregarlo a su calendario.', 'success');
}

// googleCalURL y sumarDiasHabiles se movieron a ./exportar.js.


// fmtMoneda, clientesToCSV, honorariosToCSV y montoEnLetras se movieron a
// ./exportar.js; procesosToCSV se movió a ./procesos.js (junto a su vista).


// ============================================================
//  Utilidades de interfaz (paginación, barras, toast, tooltips, modal)
//  Se movieron a ./ui.js y se importan arriba.
// ============================================================




// ============================================================
//  BORRADORES — autoguardado para no perder lo que se está escribiendo
//  (p. ej. la descripción de un caso o un memorial largo). Se guarda en
//  el navegador, por usuario, y se recupera aunque la sesión se cierre
//  por inactividad o se cierre el navegador.
// ============================================================
// El sistema de borradores (Draft, wireDraft, maybeOfferDraft) se movió a
// ./draft.js (se importa arriba).

// ============================================================
//  Credenciales guardadas (compartidas en la nube vía Supabase).
//  Antes la credencial solo se autoguardaba como un único borrador
//  local, así que al crear otra se perdía la anterior y no se veía en
//  otros equipos. Ahora cada credencial creada se GUARDA en la tabla
//  "credenciales" de Supabase, por lo que se puede EDITAR, REIMPRIMIR
//  y eliminar IGUAL desde cualquier dispositivo del bufete.
//  Se mantiene una caché local para pintar rápido y tolerar cortes de red.
// ============================================================
// normCred y CredStore (almacén de credenciales en la nube) se movieron a
// ./credstore.js (se importan arriba).

// ============================================================
//  Almacén de imágenes del bufete (logo y sello) en IndexedDB.
//  Antes se guardaban en localStorage, pero las imágenes en base64
//  son grandes y llenaban el cupo (~5MB), lo que hacía que el
//  autoguardado de la credencial fallara y se perdieran datos.
//  IndexedDB tiene mucho más espacio y resuelve ese problema.
// ============================================================
// El almacén de imágenes (ImgDB, IMG, ensureImgCache, guardarImagen,
// borrarImagen, saveLogosCustom, saveSellosCustom, findCustomLogo,
// findCustomSello) se movió a ./media.js (se importa arriba).

// ---- Intensidad (opacidad) de la marca de agua del logo en la credencial ----
// Se guarda como porcentaje (3–40) y se sincroniza con los demás dispositivos
// junto al resto del branding.
// Opacidades (wmOpacityActual, applyWmOpacity, bgOpOf) se movieron a ./branding.js.

// ---- Indicador de "sin conexión" (offline) ----
// Avisa cuando no hay internet: los cambios se guardan localmente y se
// sincronizan al volver la conexión.
function initOfflineIndicator() {
  let b = document.getElementById('offlineBanner');
  if (!b) {
    b = document.createElement('div');
    b.id = 'offlineBanner';
    b.className = 'offline-banner';
    b.innerHTML = '<span class="offline-banner__dot"></span><span>Sin conexión. Lo que guarde queda en este equipo y se sincronizará al volver el internet.</span>';
    document.body.appendChild(b);
  }
  const upd = () => b.classList.toggle('show', !navigator.onLine);
  window.addEventListener('offline', upd);
  window.addEventListener('online', () => { b.classList.remove('show'); toast('Conexión restablecida.', 'success'); });
  upd();
}

// ---- Respaldo manual de datos (exportar a JSON) ----
function lastBackupText() {
  const ts = Number(localStorage.getItem('lexfive_last_backup'));
  if (!ts) return 'Aún no ha exportado un respaldo manual.';
  return 'Último respaldo manual: ' + new Date(ts).toLocaleString('es-BO');
}
async function exportarRespaldo(btn) {
  if (btn) { btn.disabled = true; btn.textContent = 'Generando...'; }
  try {
    const tablas = ['profiles', 'clientes', 'procesos', 'consultas', 'articulos', 'testimonios',
      'tareas', 'eventos', 'honorarios', 'pagos', 'categorias', 'credenciales'];
    const dump = { generado: new Date().toISOString(), version: 1, tablas: {} };
    for (const t of tablas) {
      try { const { data } = await supabase.from(t).select('*'); dump.tablas[t] = data || []; }
      catch (e) { dump.tablas[t] = []; }
    }
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'lexfive-respaldo-' + hoyISO() + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    localStorage.setItem('lexfive_last_backup', String(Date.now()));
    const info = document.getElementById('lastBackupInfo'); if (info) info.textContent = lastBackupText();
    toast('Respaldo descargado en este equipo.', 'success');
  } catch (e) {
    toast('No se pudo generar el respaldo. Revise su conexión.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Exportar respaldo (JSON)'; }
  }
}

// Permite abrir un archivo de respaldo JSON exportado previamente y explorar
// su contenido en una tabla interactiva (solo lectura). No modifica la base.
function revisarRespaldo() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json,application/json';
  input.onchange = () => {
    const f = input.files && input.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const dump = JSON.parse(reader.result);
        if (!dump || !dump.tablas) { toast('El archivo no parece un respaldo válido de LexFive.', 'error'); return; }
        const tablas = Object.keys(dump.tablas);
        const resumen = tablas.map(t => `<tr><td class="cell-strong">${esc(t)}</td><td>${(dump.tablas[t] || []).length} registros</td></tr>`).join('');
        const body = `
          <p class="cell-sub" style="margin-bottom:10px">Archivo: <strong>${esc(f.name)}</strong> · Generado: ${dump.generado ? new Date(dump.generado).toLocaleString('es-BO') : 'desconocido'}</p>
          <p class="cell-sub" style="margin-bottom:14px">Este visor es de <strong>solo lectura</strong>. No modifica la base de datos.</p>
          <div class="table-wrap" style="max-height:320px;overflow:auto"><table class="data"><thead><tr><th>Tabla</th><th>Registros</th></tr></thead><tbody>${resumen}</tbody></table></div>
          <p class="cell-sub" style="margin-top:12px">Haga clic en una tabla para ver sus datos en detalle.</p>`;
        openModal('Revisar respaldo', body, [{ label: 'Cerrar', class: 'btn--ghost', onClick: closeModal }], true);
        // Click en una tabla para ver sus registros.
        $('#modalBody').querySelectorAll('tr').forEach(tr => {
          tr.style.cursor = 'pointer';
          tr.onclick = () => {
            const nombre = (tr.querySelector('.cell-strong') || {}).textContent;
            const rows = dump.tablas[nombre] || [];
            if (!rows.length) { toast('Esa tabla está vacía en el respaldo.', 'error'); return; }
            const cols = Object.keys(rows[0]);
            const head = cols.map(c => `<th>${esc(c)}</th>`).join('');
            const filas = rows.slice(0, 100).map(r => `<tr>${cols.map(c => `<td style="font-size:.78rem;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(String(r[c] != null ? r[c] : ''))}</td>`).join('')}</tr>`).join('');
            openModal(`${esc(nombre)} (${rows.length} registros${rows.length > 100 ? ', primeros 100' : ''})`,
              `<div class="table-wrap" style="max-height:420px;overflow:auto"><table class="data"><thead><tr>${head}</tr></thead><tbody>${filas}</tbody></table></div>`,
              [{ label: '← Volver', class: 'btn--ghost', onClick: () => revisarRespaldoConDump(dump, f.name) }, { label: 'Cerrar', class: 'btn--ghost', onClick: closeModal }], true);
          };
        });
      } catch (e) { toast('Error al leer el archivo. ¿Está corrupto?', 'error'); }
    };
    reader.readAsText(f);
  };
  input.click();
}
// Re-abre el resumen del respaldo (para el botón "← Volver" desde el detalle de una tabla).
function revisarRespaldoConDump(dump, nombre) {
  const tablas = Object.keys(dump.tablas);
  const resumen = tablas.map(t => `<tr><td class="cell-strong">${esc(t)}</td><td>${(dump.tablas[t] || []).length} registros</td></tr>`).join('');
  const body = `
    <p class="cell-sub" style="margin-bottom:10px">Archivo: <strong>${esc(nombre)}</strong> · Generado: ${dump.generado ? new Date(dump.generado).toLocaleString('es-BO') : 'desconocido'}</p>
    <p class="cell-sub" style="margin-bottom:14px">Este visor es de <strong>solo lectura</strong>. No modifica la base de datos.</p>
    <div class="table-wrap" style="max-height:320px;overflow:auto"><table class="data"><thead><tr><th>Tabla</th><th>Registros</th></tr></thead><tbody>${resumen}</tbody></table></div>
    <p class="cell-sub" style="margin-top:12px">Haga clic en una tabla para ver sus datos.</p>`;
  openModal('Revisar respaldo', body, [{ label: 'Cerrar', class: 'btn--ghost', onClick: closeModal }], true);
  $('#modalBody').querySelectorAll('tr').forEach(tr => {
    tr.style.cursor = 'pointer';
    tr.onclick = () => {
      const n = (tr.querySelector('.cell-strong') || {}).textContent;
      const rows = dump.tablas[n] || [];
      if (!rows.length) { toast('Tabla vacía.', 'error'); return; }
      const cols = Object.keys(rows[0]);
      const head = cols.map(c => `<th>${esc(c)}</th>`).join('');
      const filas = rows.slice(0, 100).map(r => `<tr>${cols.map(c => `<td style="font-size:.78rem;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(String(r[c] != null ? r[c] : ''))}</td>`).join('')}</tr>`).join('');
      openModal(`${esc(n)} (${rows.length} registros${rows.length > 100 ? ', primeros 100' : ''})`,
        `<div class="table-wrap" style="max-height:420px;overflow:auto"><table class="data"><thead><tr>${head}</tr></thead><tbody>${filas}</tbody></table></div>`,
        [{ label: '← Volver', class: 'btn--ghost', onClick: () => revisarRespaldoConDump(dump, nombre) }, { label: 'Cerrar', class: 'btn--ghost', onClick: closeModal }], true);
    };
  });
}

// ============================================================
//  Configuración compartida del bufete (logo y sello) en Supabase.
//  Antes el logo se guardaba SOLO en este navegador, por eso un
//  cambio hecho en la computadora no se veía en el celular. Ahora
//  se guarda en la nube (tabla "configuracion", clave 'branding')
//  y se aplica igual en todos los dispositivos y en la web pública.
// ============================================================
// El motor de branding (Branding, Galerias, snapshotGalerias, pushGalerias,
// snapshotBranding, pushBranding, hydrateBranding y lastBrandingPush) se movió a
// ./branding.js (se importan arriba). El canal en tiempo real se queda aquí
// porque refresca las vistas Sellos/Credenciales.

// ============================================================
//  Branding en tiempo real: si el logo o el sello del bufete cambia en
//  otro dispositivo, este equipo lo aplica al instante (sin recargar).
//  Requiere haber ejecutado db/18_realtime_branding.sql en Supabase.
// ============================================================
let brandingRealtimeOn = false;
function subscribeBrandingRealtime() {
  if (brandingRealtimeOn) return;
  brandingRealtimeOn = true;
  try {
    supabase
      .channel('lexfive-branding')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'configuracion', filter: 'clave=eq.branding' },
        async () => {
          // Si el cambio lo acaba de hacer ESTE equipo (hace menos de 8 s),
          // no hace falta volver a descargar nada ni re-renderizar: ya tenemos
          // la última versión localmente. Esto evita el "lag" al elegir, subir
          // o eliminar logos/sellos (antes se recargaba todo en cada acción).
          if (Date.now() - lastBrandingPush < 8000) return;
          try {
            await ensureImgCache();
            await hydrateBranding(true);
            const lg = localStorage.getItem('lexfive_logo'); if (lg) applyLogo(lg);
            // Si está abierta la pestaña de Credenciales, se refresca para ver
            // los nuevos logos/sellos (el formulario se recupera del autoguardado).
            if (state.view === 'credenciales') { try { await renderCredenciales(); } catch (e) {} }
            else if (state.view === 'sellos') { try { await renderSellos(); } catch (e) {} }
            else { toast('Se actualizó el logo o sello del bufete en este dispositivo.', 'success'); }
          } catch (e) {}
        })
      .subscribe();
  } catch (e) { brandingRealtimeOn = false; }
}

// draftAgo, wireDraft y maybeOfferDraft se movieron a ./draft.js (se importan arriba).

// Helpers comunes de presentación (profName, clienteName, badgeEstado,
// optionsProfiles, checkboxesProfiles, namesFromIds, optionsClientes) se
// movieron a ./comunes.js (se importan arriba).

// ============================================================
//  Carga de datos comunes
// ============================================================
// loadProfiles y loadClientes se movieron a ./datos.js (se importan arriba).

// ---------- Categorías / áreas del derecho (dinámicas) ----------
// loadCategorias, categoriaOptions, crearCategoria, wireCategoriaSelect,
// renombrarCategoria, eliminarCategoria y renderCategorias se movieron a
// ./categorias.js (se importan arriba).

// ============================================================
//  VISTA: CATEGORÍAS / ÁREAS DEL DERECHO (solo admin)
// ============================================================
// renderCategorias se movió a ./categorias.js (se importa arriba).

// Genera un enlace de WhatsApp con un recordatorio de audiencia ya escrito
function waRecordatorio(p) {
  const t = encodeURIComponent(
    `Recordatorio LexFive\nProceso: ${p.caratula}\nAudiencia/plazo: ${fmtDateTime(p.proxima_audiencia)}\nResponsable: ${profName(p.abogado_id)}`
  );
  return `https://wa.me/${WHATSAPP}?text=${t}`;
}

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

// recordarCobro (modal de recordatorio de cobro) se movió a ./finanzas.js.

// ============================================================
//  VISTA: DASHBOARD
// ============================================================
async function renderDashboard() {
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

// ============================================================
//  SEGURIDAD: verificación en dos pasos (2FA / TOTP)
// ============================================================
async function openSeguridad2FA() {
  openModal('Verificación en dos pasos', '<div class="loading"><div class="spinner"></div>Cargando...</div>', [], true);
  const factors = await mfaFactors();
  const activos = (factors.totp || []).filter(f => f.status === 'verified');

  // Ya está activado -> ofrecer desactivar.
  if (activos.length) {
    const body = `<p class="cell-sub">La verificación en dos pasos está <strong style="color:var(--green,#1f9d6b)">ACTIVADA</strong> en su cuenta. Cada vez que inicie sesión se le pedirá el código de su app de autenticación.</p>
      <p class="cell-sub" style="margin-top:8px">Si desactiva la 2FA, su cuenta volverá a protegerse solo con la contraseña.</p>`;
    openModal('Verificación en dos pasos', body, [
      { label: 'Desactivar 2FA', class: 'btn--danger', onClick: async () => {
          if (!confirm('¿Seguro que desea desactivar la verificación en dos pasos?')) return;
          for (const f of activos) { try { await mfaUnenroll(f.id); } catch (e) {} }
          toast('Verificación en dos pasos desactivada.', 'success');
          closeModal();
        } },
      { label: 'Cerrar', class: 'btn--primary', onClick: closeModal }
    ], true);
    return;
  }

  // No activado -> iniciar el alta (enroll) y mostrar el QR.
  const { data, error } = await mfaEnroll();
  if (error || !data) {
    openModal('Verificación en dos pasos', `<p class="cell-sub">No se pudo iniciar la activación: ${esc(error ? error.message : 'error desconocido')}</p>`, [{ label: 'Cerrar', class: 'btn--primary', onClick: closeModal }]);
    return;
  }
  const factorId = data.id;
  const qr = data.totp && data.totp.qr_code;
  const secret = data.totp && data.totp.secret;
  const body = `
    <p class="cell-sub" style="margin-bottom:8px"><strong>Paso 1.</strong> Escanee este código QR con una app de autenticación (Google Authenticator, Microsoft Authenticator, Authy…).</p>
    <div style="text-align:center;margin:10px 0">${qr ? `<img src="${qr}" alt="Código QR para 2FA" style="width:200px;height:200px;background:#fff;border-radius:8px;padding:6px">` : ''}</div>
    <p class="cell-sub">¿No puede escanear? Ingrese esta clave manualmente en la app:<br><code style="font-size:.9rem;word-break:break-all">${esc(secret || '')}</code></p>
    <div class="field" style="margin-top:14px"><label><strong>Paso 2.</strong> Escriba el código de 6 dígitos que muestra la app</label><input id="mfa_code" inputmode="numeric" maxlength="6" placeholder="123456" autocomplete="one-time-code"></div>
    <p class="form-msg" id="mfa_msg" role="status" aria-live="polite"></p>`;
  openModal('Activar verificación en dos pasos', body, [
    { label: 'Activar', class: 'btn--primary', onClick: async () => {
        const code = ($('#mfa_code').value || '').trim();
        const msg = $('#mfa_msg');
        if (!/^\d{6}$/.test(code)) { if (msg) { msg.textContent = 'Ingrese el código de 6 dígitos.'; msg.className = 'form-msg error'; } return; }
        const { error: vErr } = await mfaVerify(factorId, code);
        if (vErr) { if (msg) { msg.textContent = 'Código incorrecto o expirado. Intente de nuevo.'; msg.className = 'form-msg error'; } return; }
        toast('¡Verificación en dos pasos activada!', 'success');
        closeModal();
      } },
    { label: 'Cancelar', class: 'btn--ghost', onClick: async () => { try { await mfaUnenroll(factorId); } catch (e) {} closeModal(); } }
  ], true);
}

// ============================================================
//  NOTIFICACIONES PUSH (función #10 — Fase A: activar + prueba local)
// ============================================================
async function openNotificaciones() {
  const soporta = ('serviceWorker' in navigator) && ('PushManager' in window) && ('Notification' in window);
  if (!soporta) {
    openModal('Notificaciones', '<p class="cell-sub">Este navegador no soporta notificaciones push. En iPhone/iPad primero debe <strong>instalar la app</strong> en la pantalla de inicio (iOS 16.4+).</p>', [{ label: 'Cerrar', class: 'btn--primary', onClick: closeModal }]);
    return;
  }
  openModal('Notificaciones', '<div class="loading"><div class="spinner"></div>Cargando...</div>', [], true);
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  const activo = !!sub && Notification.permission === 'granted';
  const estado = Notification.permission === 'denied'
    ? 'El permiso está <strong>bloqueado</strong> en este navegador. Actívelo desde la configuración del sitio (el candado junto a la dirección).'
    : (activo ? 'Las notificaciones están <strong style="color:var(--green,#1f9d6b)">ACTIVADAS</strong> en este dispositivo.' : 'Las notificaciones están <strong>desactivadas</strong> en este dispositivo.');
  const body = `
    <p class="cell-sub" style="margin-bottom:10px">${estado}</p>
    <p class="cell-sub">Cuando estén activas, recibirá avisos de audiencias y plazos próximos aunque el sistema esté cerrado. <em>(El envío automático se completa en una fase posterior; por ahora puede probar una notificación local.)</em></p>`;
  const botones = [];
  if (activo) {
    botones.push({ label: 'Enviar prueba', class: 'btn--ghost', onClick: async () => {
      try {
        const r = await navigator.serviceWorker.ready;
        await r.showNotification('LexFive — prueba ✅', {
          body: 'Si ve esto, las notificaciones funcionan en este dispositivo.',
          icon: '../assets/pwa/icon-192.png',
          badge: '../assets/pwa/icon-192.png',
          requireInteraction: true,
          tag: 'lexfive-prueba'
        });
        toast('Notificación enviada. Si no aparece, revise en Windows: «No molestar» desactivado y notificaciones permitidas para Chrome.', 'success');
      } catch (e) {
        console.error('showNotification:', e);
        toast('No se pudo mostrar la notificación: ' + (e && e.message ? e.message : e), 'error');
      }
    } });
    botones.push({ label: 'Desactivar', class: 'btn--danger', onClick: async () => {
      try {
        const s = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
        if (s) { await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint); await s.unsubscribe(); }
        toast('Notificaciones desactivadas en este dispositivo.', 'success');
      } catch (e) { toast('No se pudo desactivar.', 'error'); }
      closeModal();
    } });
  } else if (Notification.permission !== 'denied') {
    botones.push({ label: 'Activar', class: 'btn--primary', onClick: async () => { await activarPush(); closeModal(); } });
  }
  botones.push({ label: 'Cerrar', class: 'btn--ghost', onClick: closeModal });
  openModal('Notificaciones', body, botones, true);
}

async function activarPush() {
  try {
    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') { toast('No se concedió el permiso de notificaciones.', 'error'); return; }
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      try {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
      } catch (subErr) {
        console.error('push subscribe:', subErr);
        openModal('No se pudo activar', `
          <p class="cell-sub">El navegador no permitió crear la suscripción de notificaciones.</p>
          <p class="cell-sub" style="margin-top:10px"><strong>Si usa Brave</strong> (es lo más común): las push vienen desactivadas. Actívelas así:</p>
          <ol class="cell-sub" style="margin:6px 0 0 18px">
            <li>Abra una pestaña nueva y vaya a <code>brave://settings/privacy</code></li>
            <li>Active <strong>«Usar los servicios de Google para la mensajería push»</strong></li>
            <li><strong>Cierre y vuelva a abrir Brave</strong> y reintente aquí.</li>
          </ol>
          <p class="cell-sub" style="margin-top:10px">También funciona en <strong>Chrome</strong> o <strong>Edge</strong> sin configurar nada. En iPhone/iPad, primero instale la app en la pantalla de inicio (iOS 16.4+).</p>
          <p class="cell-sub" style="margin-top:10px;opacity:.65">Detalle técnico: ${esc(subErr && subErr.message ? subErr.message : String(subErr))}</p>`,
          [{ label: 'Cerrar', class: 'btn--primary', onClick: closeModal }], true);
        return;
      }
    }
    const json = sub.toJSON();
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: state.profile.id,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth
    }, { onConflict: 'endpoint' });
    if (error) {
      if (/push_subscriptions/.test(error.message) && /exist|relation/i.test(error.message)) {
        toast('Falta crear la tabla. Ejecute db/22_push_subscriptions.sql en Supabase.', 'error');
      } else {
        toast('Activado en el navegador, pero no se pudo guardar: ' + error.message, 'error');
      }
      return;
    }
    toast('Notificaciones activadas en este dispositivo.', 'success');
  } catch (e) {
    console.error('push:', e);
    toast('No se pudieron activar: ' + (e && e.message ? e.message : e), 'error');
  }
}

// Convierte la clave VAPID (base64url) al formato que exige pushManager.subscribe.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}


// La vista «Agenda/Calendario» (renderAgenda + descargarICSEvento) y la gestión
// de plazos de un proceso (openPlazos) se movieron a ./agenda.js (renderAgenda se
// importa arriba; openPlazos lo importa ./procesos.js desde ./agenda.js).
// ============================================================
//  VISTA: TAREAS / PENDIENTES  (tablero del equipo)
// ============================================================
// La vista de Tareas (TAREA_ESTADOS, renderTareas, tareaForm, saveTarea,
// toggleTareaEstado, deleteTarea) se movió a ./tareas.js. Se importan arriba
// renderTareas y TAREA_PRIOR (este último lo usa el Dashboard).


// ============================================================
//  HONORARIOS y PAGOS de un proceso  (solo admin y abogado)
// ============================================================
// openHonorarios (gestión de honorarios y pagos de un proceso) se movió a
// ./finanzas.js (se importa arriba; lo usan Finanzas y Procesos).

// ============================================================
//  REGISTRO DE HORAS de un proceso  (time tracking · admin/abogado)
// ============================================================
// fmtDuracion y openHoras se movieron a ./horas.js (se importa openHoras arriba).

// ============================================================
//  VISTA: FINANZAS  (resumen de honorarios por proceso · admin/abogado)
// ============================================================
// renderFinanzas (cartera de honorarios/pagos) se movió a ./finanzas.js
// (se importa arriba).

// ============================================================
//  VISTA: REPORTES  (procesos por estado, materia y abogado, por período)
// ============================================================
// renderReportes (estadísticas de procesos y cobranza) se movió a ./reportes.js
// (se importa arriba).

// ============================================================
//  VISTA: PLANTILLAS DE MEMORIALES  (texto con campos que se rellenan)
// ============================================================
// Toda la vista de Plantillas (motor de campos {{...}}, generación e impresión
// y la vista en sí) se movió a ./plantillas.js (se importa renderPlantillas).

// HTML imprimible / Word del memorial generado.
// Abre una ventana con cabecera de LexFive lista para imprimir o guardar como PDF.
// abrirImpresion (impresión con membrete del bufete) se movió a ./print.js
// (se importa arriba).

// Genera e imprime un recibo de un pago concreto (imprimirReciboPago) se movió
// a ./finanzas.js.

// El bloque «Certificados y constancias» (renderCertificados + CERT_PLANTILLAS +
// urlAbs/fechaLarga/qrCertificado/buildCertDoc/abrirImpresionCert) se movió a
// ./certificados.js (renderCertificados se importa arriba).

// renderPlantillas (y plantillaForm/savePlantilla/deletePlantilla/usarPlantilla)
// se movió a ./plantillas.js (se importa renderPlantillas arriba).

// El portal del cliente (Novedades: fetchNovedades/updateNovedadesBadge/
// renderNovedades; y Mis procesos: renderMisProcesos/descargarEstadoCuenta) se
// movió a ./portal-cliente.js (updateNovedadesBadge/renderNovedades/renderMisProcesos
// se importan arriba).


// El bloque «Opiniones y testimonios» (starsHtml + mountOpinion + renderMiOpinion
// + renderTestimonios) se movió a ./opiniones.js (mountOpinion/renderMiOpinion/
// renderTestimonios se importan arriba).

// ============================================================
//  VISTA: MODELOS DE MEMORIALES (biblioteca reutilizable, solo personal)
// ============================================================
// renderModelos se movió a ./modelos.js (se importa arriba).

// ============================================================
//  VISTA: CONSULTAS (bandeja del formulario de contacto de la web)
// ============================================================
// La vista de Consultas (consultaNombre, consultaEstadoBadge, waLinkTel,
// renderConsultas, openConsultaDetail, setConsultaEstado, deleteConsulta) se
// movió a ./consultas.js (se importan arriba renderConsultas, consultaNombre y
// openConsultaDetail; las demás son internas del módulo).

// ============================================================
//  VISTA: CREDENCIALES Y ACCESOS (solo administrador y abogados)
//  Genera una credencial/carnet del bufete para el usuario, lista para
//  imprimir. El administrador y los abogados son los únicos que la ven;
//  ellos entregan las credenciales a sus procuradores.
// ============================================================
// ============================================================
//  Catálogo y utilidades de branding (logo y sello del bufete).
//  Se comparten entre la pestaña «Sellos y logos» (renderSellos) y la
//  marca de agua de la credencial (renderCredenciales).
// ============================================================
// El catálogo de logos/sellos (BRAND_LOGOS, BRAND_SELLOS, *_DEFAULT, brandHidden,
// brandLogosVisibles, brandSellosVisibles) se movió a ./branding-catalogos.js
// (se importan arriba). findCustomLogo/findCustomSello usan IMG y se quedan aquí.
// findCustomLogo/findCustomSello se movieron a ./media.js (se importan arriba).
// pickActiveLogo/pickActiveSello/brandLogoSrc/brandSelloSrc/nombreLogoArchivo/
// nombreSelloArchivo se movieron a ./branding.js (se importan arriba).

// El bloque «Sellos y logos» (renderSellos + previewBrandImage/seleccionarLogo/
// seleccionarSello/leerImagenBufete) se movió a ./sellos.js (renderSellos se importa arriba).

// ============================================================
//  Pestaña «Sitio web»: el bufete controla la IMAGEN principal (hero) y el
//  ESTILO DE FONDO del sitio público. Se guardan en la nube (config
//  'branding', campos heroImg/bgStyle) y la web los aplica automáticamente.
// ============================================================
// La vista «Sitio web» (renderSitio + sus helpers cajaImg/sliderOpacidad/
// wireImagen/wireOp) se movió a ./sitio.js (se importa renderSitio arriba).

// ============================================================
//  VISTA: ÁREAS DE PRÁCTICA (carrusel de la web pública)
//  Tabla areas_practica (db/27_areas_practica.sql). Cada área tiene
//  título, descripción e imagen. Se administran aquí y se muestran
//  como carrusel en la página de inicio.
// ============================================================
// La vista de Áreas de práctica (renderAreas + paintAreas/formArea/guardarArea/
// eliminarArea/moverArea y su caché) se movió a ./areas.js (se importa
// renderAreas arriba).

// El bloque «Credenciales y accesos» (renderCredenciales + renderCredGuardadas +
// imprimirCredencial + credEditId) se movió a ./credenciales.js (las vistas se
// importan arriba). verImagenGrande era código muerto y se eliminó en este paso.

// ============================================================
//  Navegación
// ============================================================
const VIEWS = {
  dashboard: { title: 'Panel general', render: renderDashboard },
  procesos: { title: 'Procesos', render: renderProcesos },
  agenda: { title: 'Agenda y calendario', render: renderAgenda },
  reportes: { title: 'Reportes', render: renderReportes },
  tareas: { title: 'Tareas y pendientes', render: renderTareas },
  finanzas: { title: 'Honorarios y pagos', render: renderFinanzas },
  modelos: { title: 'Modelos de memoriales', render: renderModelos },
  plantillas: { title: 'Plantillas de memoriales', render: renderPlantillas },
  clientes: { title: 'Clientes', render: renderClientes },
  consultas: { title: 'Consultas recibidas', render: renderConsultas },
  blog: { title: 'Blog', render: renderBlog },
  credenciales: { title: 'Credenciales y accesos', render: renderCredenciales },
  credguardadas: { title: 'Credenciales guardadas', render: renderCredGuardadas },
  sellos: { title: 'Sellos y logos del bufete', render: renderSellos },
  sitio: { title: 'Sitio web público', render: renderSitio },
  areas: { title: 'Áreas de práctica', render: renderAreas },
  certificados: { title: 'Certificados y constancias', render: renderCertificados },
  testimonios: { title: 'Testimonios', render: renderTestimonios },
  categorias: { title: 'Categorías', render: renderCategorias },
  usuarios: { title: 'Usuarios', render: renderUsuarios },
  auditoria: { title: 'Auditoría', render: renderAuditoria },
  papelera: { title: 'Papelera', render: renderPapelera },
  misprocesos: { title: 'Mis procesos', render: renderMisProcesos },
  novedades: { title: 'Novedades de mis procesos', render: renderNovedades },
  opinion: { title: 'Mi opinión', render: renderMiOpinion }
};

const CLIENT_NAV = [
  { key: 'misprocesos', label: 'Mis procesos', icon: ICON.procesos },
  { key: 'novedades', label: 'Novedades', icon: ICON.campana },
  { key: 'opinion', label: 'Mi opinión', icon: ICON.estrella }
];

export function navigate(key) {
  const isClient = state.profile.rol === 'cliente';
  if (isClient) {
    if (!['misprocesos', 'novedades', 'opinion'].includes(key)) key = 'misprocesos';
  } else {
    if (!VIEWS[key]) key = 'dashboard';
    if (['usuarios', 'auditoria', 'testimonios', 'categorias', 'papelera'].includes(key) && state.profile.rol !== 'admin') key = 'dashboard';
    if (key === 'credenciales' && !['admin', 'abogado'].includes(state.profile.rol)) key = 'dashboard';
    if (key === 'credguardadas' && !['admin', 'abogado'].includes(state.profile.rol)) key = 'dashboard';
    if (key === 'sellos' && !['admin', 'abogado'].includes(state.profile.rol)) key = 'dashboard';
    if (key === 'sitio' && !['admin', 'abogado'].includes(state.profile.rol)) key = 'dashboard';
    if (key === 'areas' && !['admin', 'abogado'].includes(state.profile.rol)) key = 'dashboard';
    if (key === 'certificados' && !['admin', 'abogado'].includes(state.profile.rol)) key = 'dashboard';
    if (key === 'finanzas' && !['admin', 'abogado'].includes(state.profile.rol)) key = 'dashboard';
  }
  state.view = key;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.key === key));
  $('#pageTitle').textContent = VIEWS[key].title;
  $('#sidebar').classList.remove('open'); $('#backdrop').classList.remove('show');
  // Render con red de seguridad: si la vista falla o tarda demasiado, en vez de
  // quedarse en "Cargando..." se muestra un aviso con botón para reintentar.
  const cont = content();
  let settled = false;
  Promise.resolve().then(() => VIEWS[key].render())
    .then(() => { settled = true; actualizarBadgesMenu(); })
    .catch((e) => {
      settled = true;
      console.error('Error al cargar la vista «' + key + '»', e);
      if (cont && state.view === key) {
        cont.innerHTML = '<div class="empty"><p>No se pudo cargar esta sección.</p><button class="btn btn--primary btn--sm" id="btnReintentarVista" type="button">Reintentar</button></div>';
        const r = document.getElementById('btnReintentarVista'); if (r) r.onclick = () => navigate(key);
      }
    });
  setTimeout(() => {
    if (settled || state.view !== key) return;
    if (cont && cont.querySelector('.loading')) {
      cont.innerHTML = '<div class="empty"><p>Esta sección está tardando más de lo normal. Puede reintentar.</p><button class="btn btn--primary btn--sm" id="btnReintentarVista" type="button">Reintentar</button></div>';
      const r = document.getElementById('btnReintentarVista'); if (r) r.onclick = () => navigate(key);
    }
  }, 15000);
}

function buildSidebar() {
  const nav = $('#sidebarNav');
  const rol = state.profile.rol;
  const items = rol === 'cliente'
    ? CLIENT_NAV
    : NAV.filter(n => {
        if (n.adminOnly) return rol === 'admin';
        if (n.credOnly) return rol === 'admin' || rol === 'abogado';
        if (n.finOnly) return rol === 'admin' || rol === 'abogado';
        return true;
      });
  nav.innerHTML = items
    .map(n => `<button class="nav-item" data-key="${n.key}">${n.icon}<span>${n.label}</span></button>`).join('');
  nav.querySelectorAll('.nav-item').forEach(b => b.onclick = () => navigate(b.dataset.key));
  actualizarBadgesMenu();
}

// Pone (o quita) un contador junto a una opción del menú lateral.
function setNavBadge(key, n) {
  const item = document.querySelector(`.nav-item[data-key="${key}"]`);
  if (!item) return;
  let badge = item.querySelector('.nav-badge');
  if (n > 0) {
    if (!badge) { badge = document.createElement('span'); badge.className = 'nav-badge'; item.appendChild(badge); }
    badge.textContent = n > 99 ? '99+' : String(n);
  } else if (badge) {
    badge.remove();
  }
}

// Actualiza los contadores del menú: tareas pendientes asignadas a quien inició
// sesión y consultas nuevas sin atender. Se llama al construir el menú y cada
// vez que se navega, para que los números estén siempre al día. Los clientes no
// tienen estas secciones, así que no se calcula nada para ellos.
async function actualizarBadgesMenu() {
  if (!state.profile || state.profile.rol === 'cliente') return;
  const rol = state.profile.rol;
  try {
    const [tareasRes, consRes] = await Promise.all([
      supabase.from('tareas').select('id', { count: 'exact', head: true })
        .neq('estado', 'hecha').eq('asignado_a', state.profile.id),
      supabase.from('consultas').select('id', { count: 'exact', head: true }).eq('estado', 'nueva')
    ]);
    setNavBadge('tareas', tareasRes.count || 0);
    setNavBadge('consultas', consRes.count || 0);
  } catch (e) { /* sin conexión: se deja como esté */ }
}

// ============================================================
//  Buscador global (procesos, clientes y consultas)
// ============================================================
async function openBuscadorGlobal() {
  openModal('Buscar en el sistema', `
    <div class="field" style="margin-bottom:6px">
      <input id="gqInput" type="search" placeholder="Escriba carátula, número, NUREJ, cliente, correo, actuación..." autocomplete="off">
    </div>
    <p class="cell-sub" id="gqHint">Busca a la vez en procesos, clientes, consultas y actuaciones.</p>
    <div id="gqResults"></div>`, [{ label: 'Cerrar', class: 'btn--ghost', onClick: closeModal }], true);

  const input = $('#gqInput');
  const cont = $('#gqResults');
  if (input) input.focus();

  // Cargar datos una sola vez al abrir
  const [{ data: procesos }, { data: clientes }, { data: consultas }, actuRes] = await Promise.all([
    supabase.from('procesos').select('*').eq('eliminado', false),
    supabase.from('clientes').select('*'),
    supabase.from('consultas').select('*').order('created_at', { ascending: false }),
    supabase.from('actuaciones').select('id,proceso_id,descripcion,fecha').order('fecha', { ascending: false }).limit(500).then(r => r, () => ({ data: [] }))
  ]);
  const P = procesos || [], C = (clientes || []).filter(c => !c.eliminado), Q = consultas || [];
  const A = (actuRes && actuRes.data) || [];
  const procById = {}; P.forEach(p => { procById[p.id] = p; });

  const pinta = () => {
    const q = (input.value || '').trim().toLowerCase();
    if (q.length < 2) { cont.innerHTML = ''; $('#gqHint').style.display = ''; return; }
    $('#gqHint').style.display = 'none';
    const match = (...vals) => vals.some(v => (v || '').toString().toLowerCase().includes(q));

    const pr = P.filter(p => match(p.caratula, p.numero, p.nurej, p.juzgado, p.parte_contraria, clienteName(p.cliente_id))).slice(0, 8);
    const cl = C.filter(c => match(c.nombre, c.documento, c.email, c.telefono)).slice(0, 6);
    const cs = Q.filter(c => match(consultaNombre(c), c.email, c.mensaje, c.area)).slice(0, 6);
    const ac = A.filter(a => match(a.descripcion, procById[a.proceso_id] && procById[a.proceso_id].caratula)).slice(0, 6);

    let html = '';
    if (pr.length) html += `<div class="gq-group"><div class="gq-group__title">${ICON.procesos} Procesos (${pr.length})</div>${pr.map(p => `
      <button class="gq-item" data-tipo="proceso" data-id="${p.id}">
        <strong>${esc(p.caratula)}</strong>
        <span class="cell-sub">${esc(p.numero || 'Sin número')} · ${esc(p.materia || '—')} · ${esc(clienteName(p.cliente_id))}</span>
      </button>`).join('')}</div>`;
    if (cl.length) html += `<div class="gq-group"><div class="gq-group__title">${ICON.clientes} Clientes (${cl.length})</div>${cl.map(c => `
      <button class="gq-item" data-tipo="cliente" data-id="${c.id}">
        <strong>${esc(c.nombre)}</strong>
        <span class="cell-sub">${esc([c.documento, c.telefono, c.email].filter(Boolean).join(' · ') || 'Sin datos de contacto')}</span>
      </button>`).join('')}</div>`;
    if (cs.length) html += `<div class="gq-group"><div class="gq-group__title">${ICON.consultas} Consultas (${cs.length})</div>${cs.map(c => `
      <button class="gq-item" data-tipo="consulta" data-id="${c.id}">
        <strong>${esc(consultaNombre(c))}</strong>
        <span class="cell-sub">${esc((c.mensaje || '').slice(0, 70))}</span>
      </button>`).join('')}</div>`;
    if (ac.length) html += `<div class="gq-group"><div class="gq-group__title">${ICON.doc} Actuaciones (${ac.length})</div>${ac.map(a => `
      <button class="gq-item" data-tipo="actuacion" data-id="${a.proceso_id}">
        <strong>${esc((a.descripcion || 'Actuación').slice(0, 70))}</strong>
        <span class="cell-sub">${esc(fmtDate(a.fecha))}${procById[a.proceso_id] ? ' · ' + esc(procById[a.proceso_id].caratula) : ''}</span>
      </button>`).join('')}</div>`;
    if (!html) html = `<p class="empty" style="padding:20px">Sin resultados para “${esc(q)}”.</p>`;
    cont.innerHTML = html;

    cont.querySelectorAll('.gq-item').forEach(b => b.onclick = () => {
      const id = b.dataset.id;
      if (b.dataset.tipo === 'proceso') openProcesoDetail(id);
      else if (b.dataset.tipo === 'actuacion') openProcesoDetail(id);
      else if (b.dataset.tipo === 'cliente') { const c = C.find(x => x.id === id); if (c) clienteForm(c); }
      else { const c = Q.find(x => x.id === id); if (c) openConsultaDetail(c); }
    });
  };
  if (input) input.oninput = pinta;
}

// ============================================================
//  Modo oscuro / claro
// ============================================================
const THEME_KEY = 'lexfive_theme';
function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  const dark = t === 'dark';
  const btn = $('#btnTheme');
  if (btn) {
    btn.innerHTML = dark ? ICON.sol : ICON.luna;
    btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
    btn.title = dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#0b131e' : '#0e1b2c');
}
function toggleTheme() {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
  applyTheme(next);
}

// ---- Tamaño de letra (accesibilidad) ----
// Escala la letra de TODO el sistema cambiando el tamaño base (rem). Se guarda
// en este equipo y se aplica también antes de pintar (ver index.html) para que
// no haya parpadeo.
const FONT_KEY = 'lexfive_fontscale';
const FONT_STEPS = [0.9, 1, 1.1, 1.25, 1.4];
function currentFontScale() {
  const v = parseFloat(localStorage.getItem(FONT_KEY));
  return FONT_STEPS.indexOf(v) !== -1 ? v : 1;
}
function applyFontScale(s) {
  document.documentElement.style.fontSize = (s * 100) + '%';
}
function changeFontScale(dir) {
  let i = FONT_STEPS.indexOf(currentFontScale());
  if (i === -1) i = 1;
  i = Math.max(0, Math.min(FONT_STEPS.length - 1, i + dir));
  const s = FONT_STEPS[i];
  try { localStorage.setItem(FONT_KEY, String(s)); } catch (e) {}
  applyFontScale(s);
  toast('Tamaño de letra: ' + Math.round(s * 100) + '%', 'success');
}

// ============================================================
//  Campanita de notificaciones (novedades dentro de la app).
//  El cliente ve "Novedad en su proceso" al entrar, sin depender del correo.
//  Si la tabla 'notificaciones' aún no se creó (db/24), la campana se oculta
//  sola y nada se rompe.
// ============================================================
const NOTIF = { items: [], unread: 0, ok: false };

async function cargarNotificaciones() {
  if (!state.profile) return;
  try {
    const { data, error } = await supabase.from('notificaciones').select('*')
      .eq('user_id', state.profile.id)
      .order('created_at', { ascending: false }).limit(25);
    if (error) throw error;
    NOTIF.items = data || [];
    NOTIF.unread = NOTIF.items.filter(n => !n.leida).length;
    NOTIF.ok = true;
  } catch (e) {
    NOTIF.ok = false; // la tabla no existe todavía: ocultamos la campana
  }
  pintarCampana();
}

function pintarCampana() {
  const bell = $('#btnNotif');
  if (!bell) return;
  bell.hidden = !NOTIF.ok;
  const c = bell.querySelector('.notif-bell__count');
  if (c) {
    if (NOTIF.ok && NOTIF.unread > 0) { c.hidden = false; c.textContent = NOTIF.unread > 9 ? '9+' : String(NOTIF.unread); }
    else c.hidden = true;
  }
  const panel = $('#notifPanel');
  if (panel && panel.classList.contains('open')) renderNotifPanel(panel);
}

function notifListHTML() {
  if (!NOTIF.items.length) return '<div class="notif-empty">No tiene notificaciones.</div>';
  return NOTIF.items.map(n => `
    <button class="notif-item ${n.leida ? '' : 'is-unread'}" data-id="${n.id}" type="button">
      <div class="notif-item__title">${esc(n.titulo || 'Notificación')}</div>
      ${n.cuerpo ? `<div class="notif-item__body">${esc(n.cuerpo)}</div>` : ''}
      <div class="notif-item__time">${fmtDateTime(n.created_at)}</div>
    </button>`).join('');
}

function renderNotifPanel(panel) {
  panel.innerHTML = `
    <div class="notif-panel__head">
      <strong>Notificaciones</strong>
      ${NOTIF.unread ? '<button class="btn btn--ghost btn--sm" id="notifReadAll" type="button">Marcar leídas</button>' : ''}
    </div>
    <div class="notif-list">${notifListHTML()}</div>`;
  panel.querySelectorAll('.notif-item').forEach(it => it.onclick = () => marcarNotifLeida(it.dataset.id));
  const ra = panel.querySelector('#notifReadAll'); if (ra) ra.onclick = marcarTodasLeidas;
}

function toggleNotifPanel() {
  let panel = $('#notifPanel');
  if (!panel) { panel = document.createElement('div'); panel.id = 'notifPanel'; panel.className = 'notif-panel'; document.body.appendChild(panel); }
  if (panel.classList.contains('open')) { panel.classList.remove('open'); return; }
  renderNotifPanel(panel);
  const bell = $('#btnNotif');
  const r = bell.getBoundingClientRect();
  panel.style.top = (r.bottom + 8) + 'px';
  panel.style.right = Math.max(8, window.innerWidth - r.right) + 'px';
  panel.classList.add('open');
}

async function marcarNotifLeida(id) {
  const n = NOTIF.items.find(x => x.id === id);
  if (n && !n.leida) {
    n.leida = true; NOTIF.unread = Math.max(0, NOTIF.unread - 1); pintarCampana();
    try { await supabase.from('notificaciones').update({ leida: true }).eq('id', id); } catch (e) {}
  }
}

async function marcarTodasLeidas() {
  const ids = NOTIF.items.filter(n => !n.leida).map(n => n.id);
  NOTIF.items.forEach(n => n.leida = true); NOTIF.unread = 0; pintarCampana();
  try { if (ids.length) await supabase.from('notificaciones').update({ leida: true }).in('id', ids); } catch (e) {}
}

function subscribeNotifsRealtime() {
  try {
    supabase.channel('notif-' + state.profile.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: 'user_id=eq.' + state.profile.id }, () => cargarNotificaciones())
      .subscribe();
  } catch (e) {}
}

function initNotifBell() {
  const actions = $('#topbarActions');
  if (!actions || $('#btnNotif')) return;
  const btn = document.createElement('button');
  btn.className = 'btn btn--ghost btn--sm notif-bell';
  btn.id = 'btnNotif';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Notificaciones');
  btn.title = 'Notificaciones';
  btn.innerHTML = ICON.campana + '<span class="notif-bell__count" hidden></span>';
  btn.hidden = true;
  btn.onclick = (e) => { e.stopPropagation(); toggleNotifPanel(); };
  actions.insertBefore(btn, actions.firstChild);
  document.addEventListener('click', (e) => {
    const panel = $('#notifPanel');
    if (panel && panel.classList.contains('open') && !panel.contains(e.target) && !btn.contains(e.target)) panel.classList.remove('open');
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') cargarNotificaciones(); });
  cargarNotificaciones();
  subscribeNotifsRealtime();
}

// ============================================================
//  Arranque
// ============================================================

// Muestra un estado amable mientras se conecta con la base. Incluye botones
// para reintentar de inmediato o cerrar sesión, para que el usuario nunca se
// quede atrapado en un "Cargando..." que no avanza.
function mostrarEstadoArranque(intento) {
  const cont = content();
  if (!cont) return;
  cont.innerHTML = `
    <div class="loading" style="flex-direction:column;gap:14px;text-align:center;max-width:440px;margin:64px auto;">
      <div class="spinner"></div>
      <div>
        <p style="margin:0 0 6px;font-weight:600;">Conectando con la base de datos…</p>
        <p class="cell-sub" style="margin:0;">La base puede tardar unos segundos en «despertar» (plan gratuito). Reintentando automáticamente… (intento ${intento})</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
        <button class="btn btn--primary btn--sm" id="btnReintentarArranque" type="button">Reintentar ahora</button>
        <button class="btn btn--ghost btn--sm" id="btnSalirArranque" type="button">Cerrar sesión</button>
      </div>
    </div>`;
  const salir = document.getElementById('btnSalirArranque');
  if (salir) salir.onclick = () => signOut();
}

// Espera "ms" milisegundos, pero se interrumpe antes si el usuario pulsa
// "Reintentar ahora".
function esperarOReintento(ms) {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    const btn = document.getElementById('btnReintentarArranque');
    if (btn) btn.onclick = () => { clearTimeout(t); resolve(); };
  });
}

// Carga el perfil y los usuarios con reintentos. Solo devuelve null cuando NO
// hay sesión válida (en ese caso requireAuth ya redirige al login o cierra
// sesión). Si la base no responde, reintenta indefinidamente con una espera
// progresiva en vez de quedarse colgado.
async function arrancarSesion() {
  let intento = 0;
  while (true) {
    intento++;
    try {
      const profile = await requireAuth();
      if (!profile) return null;
      state.profile = profile;
      await withTimeout(loadProfiles(), 12000, 'usuarios');
      return profile;
    } catch (e) {
      console.warn('Arranque: la base no respondió a tiempo, reintentando…', e);
      mostrarEstadoArranque(intento);
      // Espera progresiva: 3s, 6s, 9s… (máximo 9s) antes de reintentar.
      await esperarOReintento(Math.min(3000 * intento, 9000));
    }
  }
}

(async function init() {
  const profile = await arrancarSesion();
  if (!profile) return;

  // Cabecera de usuario
  $('#userName').textContent = profile.nombre;
  $('#userRol').textContent = ROLES[profile.rol] || profile.rol;
  $('#userAvatar').textContent = initials(profile.nombre);

  buildSidebar();

  // Buscador global en la barra superior (solo personal, no clientes).
  if (profile.rol !== 'cliente') {
    const actions = $('#topbarActions');
    if (actions) {
      const btn = document.createElement('button');
      btn.className = 'btn btn--ghost btn--sm topbar__search';
      btn.id = 'btnBuscarGlobal';
      btn.innerHTML = ICON.buscar + '<span>Buscar</span>';
      btn.setAttribute('data-tip', 'Busque a la vez en procesos, clientes y consultas (atajo: Ctrl/⌘ + K).');
      btn.onclick = () => openBuscadorGlobal();
      actions.appendChild(btn);
    }
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); openBuscadorGlobal(); }
    });
  }

  // Campanita de notificaciones (novedades dentro de la app), para todos los roles.
  initNotifBell();

  // Registrar el service worker para que el sistema se pueda instalar como
  // app en el celular y funcione mejor (PWA).
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
    // El SW avisa cuando detecta una versión nueva del panel (app.js/CSS) en el
    // servidor. Mostramos una barra discreta con un botón para recargar, así el
    // usuario siempre puede pasar a la última versión sin tener que forzar nada.
    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e.data && e.data.tipo === 'lexfive-nueva-version') mostrarAvisoActualizacion();
    });
  }

  // Aplica el logo elegido por el bufete. Primero, pintado rápido con la
  // última versión conocida en este equipo; luego se refresca desde la nube
  // para que coincida con lo elegido en cualquier otro dispositivo.
  try {
    const cache = Branding.local();
    if (cache.logoImg) IMG.logo = cache.logoImg;
    if (cache.logoId) applyLogo(cache.logoId);
    else { const lg = localStorage.getItem('lexfive_logo'); if (lg) applyLogo(lg); }
  } catch (e) {}
  Branding.load().then(b => {
    if (!b) return;
    if (b.logoImg) IMG.logo = b.logoImg;
    if (b.logoId) { localStorage.setItem('lexfive_logo', b.logoId); applyLogo(b.logoId); }
  }).catch(() => {});

  // Escuchar cambios de logo/sello en vivo desde otros dispositivos.
  subscribeBrandingRealtime();

  // Respaldo del tiempo real: al volver a esta pestaña/app, refresca el logo y
  // el sello desde la nube. Así se actualiza aunque el canal en vivo no esté
  // disponible (p. ej. si aún no se ejecutó db/18 o el navegador lo bloquea).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    Branding.load().then(b => {
      if (!b) return;
      if (b.logoImg) IMG.logo = b.logoImg;
      if (b.selloImg) IMG.sello = b.selloImg;
      if (b.logoId) { localStorage.setItem('lexfive_logo', b.logoId); applyLogo(b.logoId); }
    }).catch(() => {});
  });

  // Aplica la intensidad guardada del logo de fondo y activa el aviso de "sin conexión".
  applyWmOpacity(wmOpacityActual());
  initOfflineIndicator();

  // Manejo global de errores: en vez de fallar en silencio, avisa con un mensaje
  // amable (sin abrumar: máximo uno cada 8 segundos).
  let _lastErr = 0;
  const avisoError = () => {
    const now = Date.now();
    if (now - _lastErr < 8000) return;
    _lastErr = now;
    if (!navigator.onLine) return; // el banner de "sin conexión" ya lo cubre
    toast('Ocurrió un problema. Si persiste, recargue la página.', 'error');
  };
  window.addEventListener('error', avisoError);
  window.addEventListener('unhandledrejection', avisoError);

  // Eventos globales
  // Al cerrar sesión, llevar al sitio web público (front-end) en vez de a la
  // pantalla de login. Así es coherente con el cierre por inactividad y con el
  // clic en el logo, que también van al sitio público. Lo autoguardado se
  // conserva y se puede recuperar al volver a iniciar sesión.
  $('#btnLogout').onclick = () => signOutTo('../index.html');
  initTooltipEngine();

  // Modo claro/oscuro: sincroniza el botón con el tema ya aplicado y permite alternarlo.
  applyTheme(currentTheme());
  const btnTheme = $('#btnTheme');
  if (btnTheme) btnTheme.onclick = toggleTheme;

  // Tamaño de letra (accesibilidad): botones A− / A+ en la barra superior.
  applyFontScale(currentFontScale());
  const bFontMinus = $('#btnFontMinus'); if (bFontMinus) bFontMinus.onclick = () => changeFontScale(-1);
  const bFontPlus = $('#btnFontPlus'); if (bFontPlus) bFontPlus.onclick = () => changeFontScale(1);

  // Al hacer clic en el logo (ir al sitio público), cerrar la sesión por
  // seguridad. El autoguardado conserva lo que se estaba escribiendo, así que
  // al volver a iniciar sesión se podrá recuperar.
  const panelLogo = document.querySelector('.sidebar__head .logo');
  if (panelLogo) {
    panelLogo.setAttribute('data-tip', 'Vuelve al sitio web público y cierra su sesión por seguridad. Lo que esté escribiendo queda autoguardado y podrá recuperarlo al volver a entrar.');
    panelLogo.addEventListener('click', (e) => {
      e.preventDefault();
      signOutTo('../index.html');
    });
  }
  $('#modalClose').onclick = closeModal;
  $('#modalOverlay').onclick = (e) => { if (e.target === $('#modalOverlay')) closeModal(); };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  $('#menuToggle').onclick = () => { $('#sidebar').classList.toggle('open'); $('#backdrop').classList.toggle('show'); };
  $('#backdrop').onclick = () => { $('#sidebar').classList.remove('open'); $('#backdrop').classList.remove('show'); };

  // Cierre de sesión automático por inactividad (10 minutos)
  const IDLE_MS = 10 * 60 * 1000;
  let idleTimer;
  function resetIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(async () => {
      alert('Su sesión se cerró automáticamente por 10 minutos de inactividad.\n\nTranquilo: lo que estaba escribiendo (descripción del caso, memorial, etc.) quedó guardado y podrá recuperarlo al volver a iniciar sesión.');
      await signOutTo('../index.html');
    }, IDLE_MS);
  }
  ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'].forEach(ev =>
    document.addEventListener(ev, resetIdle, { passive: true }));
  resetIdle();

  // Vista inicial según el rol
  navigate(profile.rol === 'cliente' ? 'misprocesos' : 'dashboard');
  if (profile.rol === 'cliente') updateNovedadesBadge();

  // Recordatorio automático de audiencias vencidas/próximas al abrir el panel.
  if (profile.rol !== 'cliente') {
    const lastRemind = Number(localStorage.getItem('lexfive_remind_ts') || 0);
    const now = Date.now();
    // Solo avisar una vez cada 4 horas (para no molestar en cada recarga).
    if (now - lastRemind > 4 * 60 * 60 * 1000) {
      (async () => {
        try {
          const { data: pp } = await supabase.from('procesos').select('caratula,proxima_audiencia,estado')
            .eq('eliminado', false).not('proxima_audiencia', 'is', null);
          if (!pp || !pp.length) return;
          const ahora = new Date();
          const en7 = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);
          const vencidas = pp.filter(p => new Date(p.proxima_audiencia) < ahora && !['archivado', 'concluido'].includes(p.estado));
          const proximas = pp.filter(p => { const d = new Date(p.proxima_audiencia); return d >= ahora && d <= en7 && !['archivado', 'concluido'].includes(p.estado); });
          if (vencidas.length || proximas.length) {
            const msgs = [];
            if (vencidas.length) msgs.push(vencidas.length + ' audiencia(s) VENCIDA(S)');
            if (proximas.length) msgs.push(proximas.length + ' audiencia(s) en los próximos 7 días');
            toast('Atención: ' + msgs.join(' y ') + '. Revise el panel general.', vencidas.length ? 'error' : '');
            localStorage.setItem('lexfive_remind_ts', String(now));
          }
        } catch (e) {}
      })();
    }
  }
})();
