// ============================================================
//  LexFive — Sistema de Gestión Legal · Lógica principal
// ============================================================
import { supabase } from './supabase.js';
import { requireAuth, signOut, signOutTo, withTimeout, mfaFactors, mfaEnroll, mfaVerify, mfaUnenroll } from './auth.js';
import { ROLES, VAPID_PUBLIC_KEY } from './config.js';
import { ICON } from './icons.js';
import { esc, hoyISO, fmtDate, fmtDateTime, initials } from './util.js';
import { $, content } from './dom.js';
import { toast, tip, initTooltipEngine, loading, openModal, closeModal } from './ui.js';
import { state } from './state.js';
import { renderCategorias } from './categorias.js';
import { clienteName } from './comunes.js';
import { renderConsultas, consultaNombre, openConsultaDetail } from './consultas.js';
import { loadProfiles } from './datos.js';
import { renderUsuarios, renderAuditoria } from './admin.js';
import { renderBackup } from './backup.js';
import { initNotifBell } from './alertas.js';
import { renderBlog } from './blog.js';
import { renderPlantillas } from './plantillas.js';
import { renderModelos } from './modelos.js';
import { renderEscritos } from './escritos.js';
import { renderTareas } from './tareas.js';
import { renderReportes } from './reportes.js';
import { renderFinanzas } from './finanzas.js';
import { renderAranceles } from './aranceles.js';
import { renderCotizador } from './cotizador.js';
import { renderPapelera } from './papelera.js';
import { renderAreas } from './areas.js';
import { renderSitio } from './sitio.js';
import { renderSellos } from './sellos.js';
import { renderCredenciales, renderCredGuardadas } from './credenciales.js';
import { renderCertificados } from './certificados.js';
import { renderTarjetas } from './tarjetas.js';
import { renderMembrete } from './membrete.js';
import { renderInforme } from './informe.js';
import { renderMiOpinion, renderTestimonios } from './opiniones.js';
import { renderClientes, clienteForm } from './clientes.js';
import { renderProcesos, openProcesoDetail } from './procesos.js';
import { renderAgenda } from './agenda.js';
import { renderDashboard } from './dashboard.js';
import { updateNovedadesBadge, renderNovedades, renderMisProcesos } from './portal-cliente.js';
import { IMG, ensureImgCache } from './media.js';
import { wmOpacityActual, applyWmOpacity, Branding, lastBrandingPush, hydrateBranding, applyLogo } from './branding.js';

// 4 Secciones principales agrupadas y plegables para el panel
const SECCIONES_NAV = [
  {
    id: 'gestion_juridica',
    titulo: 'Gestión Jurídica',
    defOpen: true,
    items: [
      { key: 'dashboard', label: 'Inicio', icon: ICON.dashboard },
      { key: 'clientes', label: 'Clientes y Causas', icon: ICON.clientes },
      { key: 'tareas', label: 'Tareas y Plazos', icon: ICON.tareas },
      { key: 'consultas', label: 'Consultas', icon: ICON.consultas }
    ]
  },
  {
    id: 'documentos_finanzas',
    titulo: 'Documentos y Finanzas',
    defOpen: true,
    items: [
      { key: 'escritos', label: 'Escritos y Plantillas', icon: ICON.doc },
      { key: 'finanzas', label: 'Honorarios y Aranceles', icon: ICON.dinero, finOnly: true },
      { key: 'certificados', label: 'Certificados y Pasantías', icon: ICON.doc, credOnly: true }
    ]
  },
  {
    id: 'sitio_web',
    titulo: 'Sitio Web y Publicaciones',
    defOpen: false,
    items: [
      { key: 'gestorweb', label: 'Gestor Web', icon: ICON.blog, credOnly: true }
    ]
  },
  {
    id: 'identidad_sistema',
    titulo: 'Identidad y Sistema',
    defOpen: false,
    items: [
      { key: 'papeleria', label: 'Papelería y Marca', icon: ICON.sello, credOnly: true },
      { key: 'administracion', label: 'Administración', icon: ICON.usuarios, adminOnly: true }
    ]
  }
];

// Flat array para compatibilidad con código existente
const NAV = SECCIONES_NAV.flatMap(s => s.items);
// credOnly = solo administrador y abogado (NO procurador ni cliente)

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
export function lastBackupText() {
  const ts = Number(localStorage.getItem('lexfive_last_backup'));
  if (!ts) return 'Aún no ha exportado un respaldo manual.';
  return 'Último respaldo manual: ' + new Date(ts).toLocaleString('es-BO');
}
export async function exportarRespaldo(btn) {
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
export function revisarRespaldo() {
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


// ============================================================
//  SEGURIDAD: verificación en dos pasos (2FA / TOTP)
// ============================================================
export async function openSeguridad2FA() {
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
export async function openNotificaciones() {
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

// ============================================================
//  Navegación y Grupos de Pestañas
// ============================================================
const VIEWS = {
  dashboard: { title: 'Inicio', render: renderDashboard },
  procesos: { title: 'Procesos', render: renderProcesos },
  agenda: { title: 'Agenda y calendario', render: renderAgenda },
  reportes: { title: 'Reportes', render: renderReportes },
  tareas: { title: 'Tareas y Plazos', render: renderTareas },
  finanzas: { title: 'Honorarios y pagos', render: renderFinanzas },
  cotizador: { title: 'Cotizador de Servicios Jurídicos', render: renderCotizador },
  modelos: { title: 'Modelos de memoriales', render: renderModelos },
  plantillas: { title: 'Plantillas de memoriales', render: renderPlantillas },
  clientes: { title: 'Clientes y Causas', render: renderClientes },
  consultas: { title: 'Consultas recibidas', render: renderConsultas },
  aranceles: { title: 'Calculadora de Aranceles', render: renderAranceles },
  blog: { title: 'Blog', render: renderBlog },
  credenciales: { title: 'Credenciales y accesos', render: renderCredenciales },
  credguardadas: { title: 'Credenciales guardadas', render: renderCredGuardadas },
  sellos: { title: 'Sellos y logos del bufete', render: renderSellos },
  sitio: { title: 'Sitio web público', render: renderSitio },
  areas: { title: 'Áreas de práctica', render: renderAreas },
  certificados: { title: 'Certificados y constancias', render: renderCertificados },
  tarjetas: { title: 'Tarjetas de presentación', render: renderTarjetas },
  membrete: { title: 'Hoja membretada', render: renderMembrete },
  informe: { title: 'Informe Único de Pasantía', render: renderInforme },
  testimonios: { title: 'Testimonios', render: renderTestimonios },
  categorias: { title: 'Categorías', render: renderCategorias },
  usuarios: { title: 'Usuarios', render: renderUsuarios },
  auditoria: { title: 'Auditoría', render: renderAuditoria },
  backup: { title: 'Respaldo / Backup', render: renderBackup },
  papelera: { title: 'Papelera', render: renderPapelera },
  escritos: { title: 'Escritos y Plantillas', render: renderEscritos },
  redactor: { title: 'Redactor Inteligente', render: renderEscritos },
  gestorweb: { title: 'Gestor Web', render: renderBlog },
  papeleria: { title: 'Papelería y Marca', render: renderCredenciales },
  administracion: { title: 'Administración', render: renderUsuarios },
  misprocesos: { title: 'Mis procesos', render: renderMisProcesos },
  novedades: { title: 'Novedades de mis procesos', render: renderNovedades },
  opinion: { title: 'Mi opinión', render: renderMiOpinion }
};

const GRUPOS_TABS = {
  clientes: {
    title: 'Clientes y Causas',
    defaultTab: 'clientes',
    tabs: [
      { key: 'clientes', label: 'Clientes', icon: '👥', render: renderClientes },
      { key: 'procesos', label: 'Causas (Procesos)', icon: '⚖️', render: renderProcesos },
      { key: 'agenda', label: 'Agenda y Plazos', icon: '📅', render: renderAgenda },
      { key: 'reportes', label: 'Reportes', icon: '📊', render: renderReportes }
    ]
  },
  escritos: {
    title: 'Escritos y Plantillas',
    defaultTab: 'escritos',
    tabs: [
      { key: 'escritos', label: 'Redactor Inteligente', icon: '✍️', render: renderEscritos },
      { key: 'plantillas', label: 'Plantillas de memoriales', icon: '📝', render: renderPlantillas },
      { key: 'modelos', label: 'Modelos de memoriales', icon: '📑', render: renderModelos }
    ]
  },
  finanzas: {
    title: 'Honorarios y Aranceles',
    defaultTab: 'finanzas',
    finOnly: true,
    tabs: [
      { key: 'finanzas', label: 'Honorarios y pagos', icon: '💰', render: renderFinanzas },
      { key: 'aranceles', label: 'Calculadora de Aranceles', icon: '⚖️', render: renderAranceles },
      { key: 'cotizador', label: 'Cotizador', icon: '📝', render: renderCotizador }
    ]
  },
  certificados: {
    title: 'Certificados y Pasantías',
    defaultTab: 'certificados',
    credOnly: true,
    tabs: [
      { key: 'certificados', label: 'Certificados y Pasantías', icon: '📜', render: renderCertificados },
      { key: 'informe', label: 'Historial de Informes', icon: '📋', render: renderInforme }
    ]
  },
  gestorweb: {
    title: 'Gestor Web',
    defaultTab: 'blog',
    credOnly: true,
    extraRightHTML: '<a href="../index.html" target="_blank" rel="noopener" class="btn btn--sm btn--ghost" style="margin-left:auto;font-weight:600;display:inline-flex;align-items:center;gap:6px;">Ver sitio público ↗</a>',
    tabs: [
      { key: 'blog', label: 'Blog', icon: '📰', render: renderBlog },
      { key: 'areas', label: 'Áreas de práctica', icon: '🏛️', render: renderAreas },
      { key: 'testimonios', label: 'Testimonios', icon: '⭐', render: renderTestimonios, adminOnly: true },
      { key: 'categorias', label: 'Categorías', icon: '🏷️', render: renderCategorias, adminOnly: true },
      { key: 'sitio', label: 'Configuración del Sitio', icon: '⚙️', render: renderSitio }
    ]
  },
  papeleria: {
    title: 'Papelería y Marca',
    defaultTab: 'credenciales',
    credOnly: true,
    tabs: [
      { key: 'credenciales', label: 'Credenciales', icon: '🪪', render: renderCredenciales },
      { key: 'credguardadas', label: 'Credenciales guardadas', icon: '🗂️', render: renderCredGuardadas },
      { key: 'membrete', label: 'Hoja membretada', icon: '📄', render: renderMembrete },
      { key: 'tarjetas', label: 'Tarjetas de presentación', icon: '💳', render: renderTarjetas },
      { key: 'sellos', label: 'Sellos y logos', icon: '🔖', render: renderSellos }
    ]
  },
  administracion: {
    title: 'Administración',
    defaultTab: 'usuarios',
    adminOnly: true,
    tabs: [
      { key: 'usuarios', label: 'Usuarios', icon: '👥', render: renderUsuarios },
      { key: 'auditoria', label: 'Auditoría', icon: '📜', render: renderAuditoria },
      { key: 'backup', label: 'Respaldo / Backup', icon: '💾', render: renderBackup },
      { key: 'papelera', label: 'Papelera', icon: '🗑️', render: renderPapelera }
    ]
  }
};

const SUBKEY_MAP = {
  // Clientes y Causas
  clientes: { group: 'clientes', tab: 'clientes' },
  procesos: { group: 'clientes', tab: 'procesos' },
  agenda: { group: 'clientes', tab: 'agenda' },
  reportes: { group: 'clientes', tab: 'reportes' },
  // Escritos y Plantillas
  escritos: { group: 'escritos', tab: 'escritos' },
  redactor: { group: 'escritos', tab: 'escritos' },
  plantillas: { group: 'escritos', tab: 'plantillas' },
  modelos: { group: 'escritos', tab: 'modelos' },
  // Honorarios y Aranceles
  finanzas: { group: 'finanzas', tab: 'finanzas' },
  aranceles: { group: 'finanzas', tab: 'aranceles' },
  cotizador: { group: 'finanzas', tab: 'cotizador' },
  // Certificados y Pasantías
  certificados: { group: 'certificados', tab: 'certificados' },
  informe: { group: 'certificados', tab: 'informe' },
  // Gestor Web
  gestorweb: { group: 'gestorweb', tab: 'blog' },
  blog: { group: 'gestorweb', tab: 'blog' },
  areas: { group: 'gestorweb', tab: 'areas' },
  testimonios: { group: 'gestorweb', tab: 'testimonios' },
  categorias: { group: 'gestorweb', tab: 'categorias' },
  sitio: { group: 'gestorweb', tab: 'sitio' },
  // Papelería y Marca
  papeleria: { group: 'papeleria', tab: 'credenciales' },
  credenciales: { group: 'papeleria', tab: 'credenciales' },
  credguardadas: { group: 'papeleria', tab: 'credguardadas' },
  membrete: { group: 'papeleria', tab: 'membrete' },
  tarjetas: { group: 'papeleria', tab: 'tarjetas' },
  sellos: { group: 'papeleria', tab: 'sellos' },
  // Administración
  administracion: { group: 'administracion', tab: 'usuarios' },
  usuarios: { group: 'administracion', tab: 'usuarios' },
  auditoria: { group: 'administracion', tab: 'auditoria' },
  backup: { group: 'administracion', tab: 'backup' },
  papelera: { group: 'administracion', tab: 'papelera' }
};

const CLIENT_NAV = [
  { key: 'misprocesos', label: 'Mis procesos', icon: ICON.procesos },
  { key: 'novedades', label: 'Novedades', icon: ICON.campana },
  { key: 'opinion', label: 'Mi opinión', icon: ICON.estrella }
];

export function closeSidebar() {
  const sb = $('#sidebar'); if (sb) sb.classList.remove('open');
  const bd = $('#backdrop'); if (bd) bd.classList.remove('show');
  document.body.style.overflow = '';
}
export function openSidebar() {
  const sb = $('#sidebar'); if (sb) sb.classList.add('open');
  const bd = $('#backdrop'); if (bd) bd.classList.add('show');
  document.body.style.overflow = 'hidden';
}
export function initSidebarControls() {
  const mt = $('#menuToggle');
  if (mt && !mt.dataset.navBound) {
    mt.dataset.navBound = '1';
    mt.onclick = (e) => {
      e.stopPropagation();
      const sb = $('#sidebar');
      if (sb && sb.classList.contains('open')) closeSidebar();
      else openSidebar();
    };
  }
  const bd = $('#backdrop');
  if (bd && !bd.dataset.navBound) {
    bd.dataset.navBound = '1';
    bd.onclick = closeSidebar;
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeSidebar();
    }
  });
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSidebarControls);
} else {
  initSidebarControls();
}

export function navigate(key) {
  const isClient = state.profile.rol === 'cliente';
  if (isClient) {
    if (!['misprocesos', 'novedades', 'opinion'].includes(key)) key = 'misprocesos';
    state.view = key;
    const tabsCont = $('#viewTabsContainer');
    if (tabsCont) { tabsCont.style.display = 'none'; tabsCont.innerHTML = ''; }
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.key === key));
    $('#pageTitle').textContent = VIEWS[key] ? VIEWS[key].title : 'Portal del Cliente';
    closeSidebar();
    runViewRender(key, VIEWS[key].render);
    return;
  }

  const rol = state.profile.rol;
  const mapping = SUBKEY_MAP[key];

  let parentKey = key;
  let activeTabKey = key;
  let pageTitle = '';
  let renderFn = null;

  if (mapping) {
    const grp = GRUPOS_TABS[mapping.group];
    parentKey = mapping.group;
    activeTabKey = mapping.tab;

    // Permisos del grupo
    if (grp.adminOnly && rol !== 'admin') { navigate('dashboard'); return; }
    if (grp.credOnly && !['admin', 'abogado'].includes(rol)) { navigate('dashboard'); return; }
    if (grp.finOnly && !['admin', 'abogado'].includes(rol)) { navigate('dashboard'); return; }

    // Encontrar tab específica
    let tabObj = grp.tabs.find(t => t.key === activeTabKey);
    if (tabObj && tabObj.adminOnly && rol !== 'admin') {
      tabObj = grp.tabs.find(t => !t.adminOnly) || grp.tabs[0];
      activeTabKey = tabObj.key;
    }
    if (!tabObj) tabObj = grp.tabs[0];

    pageTitle = grp.title;
    renderFn = tabObj.render;

    // Renderizar barra de pestañas en #viewTabsContainer
    const tabsCont = $('#viewTabsContainer');
    if (tabsCont) {
      tabsCont.style.display = 'block';
      const visibleTabs = grp.tabs.filter(t => !t.adminOnly || rol === 'admin');
      tabsCont.innerHTML = `
        <div class="view-tabs-bar" role="tablist">
          ${visibleTabs.map(t => {
            const isActive = (t.key === activeTabKey);
            return `<button class="btn btn--sm ${isActive ? 'btn--primary' : 'btn--ghost'} js-vtab" data-tab="${t.key}" type="button" role="tab" style="${isActive ? 'font-weight:700;' : ''}">${t.icon || ''} ${esc(t.label)}</button>`;
          }).join('')}
          ${grp.extraRightHTML || ''}
        </div>
      `;
      tabsCont.querySelectorAll('.js-vtab').forEach(btn => {
        btn.onclick = () => {
          if (btn.dataset.tab !== activeTabKey) {
            navigate(btn.dataset.tab);
          }
        };
      });
    }
  } else {
    // Vistas standalone (dashboard, tareas, consultas)
    if (!VIEWS[key]) key = 'dashboard';
    parentKey = key;
    activeTabKey = key;
    pageTitle = (key === 'dashboard') ? 'Inicio' : VIEWS[key].title;
    renderFn = VIEWS[key].render;

    const tabsCont = $('#viewTabsContainer');
    if (tabsCont) { tabsCont.style.display = 'none'; tabsCont.innerHTML = ''; }
  }

  state.view = parentKey;
  state.subview = activeTabKey;

  // Auto-expandir la sección que contiene el nav-item si está plegada
  const targetItem = document.querySelector(`.nav-item[data-key="${parentKey}"]`);
  if (targetItem) {
    const secEl = targetItem.closest('.nav-section');
    if (secEl && secEl.classList.contains('is-collapsed')) {
      secEl.classList.remove('is-collapsed');
      const secId = secEl.id.replace('sec_', '');
      localStorage.setItem('lexfive_nav_sec_' + secId, '1');
    }
  }

  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.key === parentKey));
  $('#pageTitle').textContent = pageTitle;
  closeSidebar();

  runViewRender(activeTabKey, renderFn);
}

function runViewRender(viewKey, renderFn) {
  const cont = content();
  let settled = false;
  Promise.resolve().then(() => renderFn())
    .then(() => { settled = true; actualizarBadgesMenu(); })
    .catch((e) => {
      settled = true;
      console.error('Error al cargar la vista «' + viewKey + '»', e);
      if (cont) {
        cont.innerHTML = '<div class="empty"><p>No se pudo cargar esta sección.</p><button class="btn btn--primary btn--sm" id="btnReintentarVista" type="button">Reintentar</button></div>';
        const r = document.getElementById('btnReintentarVista'); if (r) r.onclick = () => navigate(viewKey);
      }
    });
  setTimeout(() => {
    if (settled) return;
    if (cont && cont.querySelector('.loading')) {
      cont.innerHTML = '<div class="empty"><p>Esta sección está tardando más de lo normal. Puede reintentar.</p><button class="btn btn--primary btn--sm" id="btnReintentarVista" type="button">Reintentar</button></div>';
      const r = document.getElementById('btnReintentarVista'); if (r) r.onclick = () => navigate(viewKey);
    }
  }, 15000);
}

function buildSidebar() {
  const nav = $('#sidebarNav');
  if (!nav) return;
  const rol = state.profile.rol;

  if (rol === 'cliente') {
    nav.innerHTML = CLIENT_NAV
      .map(n => `<button class="nav-item ${state.view === n.key ? 'active' : ''}" data-key="${n.key}">${n.icon}<span>${esc(n.label)}</span></button>`).join('');
    nav.querySelectorAll('.nav-item').forEach(b => b.onclick = () => navigate(b.dataset.key));
    actualizarBadgesMenu();
    return;
  }

  nav.innerHTML = SECCIONES_NAV.map(sec => {
    const itemsVisibles = sec.items.filter(n => {
      if (n.adminOnly) return rol === 'admin';
      if (n.credOnly) return rol === 'admin' || rol === 'abogado';
      if (n.finOnly) return rol === 'admin' || rol === 'abogado';
      return true;
    });
    if (!itemsVisibles.length) return '';

    const storeKey = 'lexfive_nav_sec_' + sec.id;
    const stored = localStorage.getItem(storeKey);
    const isOpen = stored !== null ? stored === '1' : sec.defOpen;

    const itemsHtml = itemsVisibles.map(n => {
      const isActive = (state.view === n.key);
      return `<button class="nav-item ${isActive ? 'active' : ''}" data-key="${n.key}" type="button">
        ${n.icon}<span>${esc(n.label)}</span>
      </button>`;
    }).join('');

    return `
      <div class="nav-section ${isOpen ? '' : 'is-collapsed'}" id="sec_${sec.id}">
        <button class="nav-section__header js-toggle-sec" data-sec="${sec.id}" type="button" aria-expanded="${isOpen}">
          <span>${esc(sec.titulo)}</span>
          <span class="nav-section__arrow">▼</span>
        </button>
        <div class="nav-section__items">
          ${itemsHtml}
        </div>
      </div>
    `;
  }).join('');

  nav.querySelectorAll('.js-toggle-sec').forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      const secId = btn.dataset.sec;
      const secEl = document.getElementById('sec_' + secId);
      if (!secEl) return;
      const willCollapse = !secEl.classList.contains('is-collapsed');
      secEl.classList.toggle('is-collapsed', willCollapse);
      btn.setAttribute('aria-expanded', !willCollapse);
      localStorage.setItem('lexfive_nav_sec_' + secId, willCollapse ? '0' : '1');
    };
  });

  nav.querySelectorAll('.nav-item').forEach(b => {
    b.onclick = () => navigate(b.dataset.key);
  });

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
//  Centro de Alertas en Vivo y Notificaciones (alertas.js)
// ============================================================

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
  try {
    const profile = await arrancarSesion();
    if (!profile) return;

    // Cabecera de usuario
    try {
      const un = $('#userName'); if (un) un.textContent = profile.nombre;
      const ur = $('#userRol'); if (ur) ur.textContent = ROLES[profile.rol] || profile.rol;
      const ua = $('#userAvatar'); if (ua) ua.textContent = initials(profile.nombre);
    } catch (e) { console.warn('Error al pintar cabecera de usuario:', e); }

    try {
      buildSidebar();
    } catch (e) { console.warn('Error al construir sidebar:', e); }

    // Buscador global en la barra superior (solo personal, no clientes).
    if (profile.rol !== 'cliente') {
      try {
        const actions = $('#topbarActions');
        if (actions && !$('#btnBuscarGlobal')) {
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
      } catch (e) { console.warn('Error al inicializar buscador global:', e); }
    }

    // Campanita de notificaciones (alertas en vivo)
    try {
      initNotifBell();
    } catch (e) { console.warn('Error al iniciar campana de notificaciones:', e); }

    // Registrar el service worker para PWA
    try {
      if ('serviceWorker' in navigator) {
        let _recargaPorSW = false;
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (_recargaPorSW) return;
            _recargaPorSW = true;
            const modal = document.getElementById('modalOverlay');
            if (modal && modal.classList.contains('open')) { mostrarAvisoActualizacion(); return; }
            location.reload();
          });
        }

        navigator.serviceWorker.register('sw.js').then((reg) => {
          try { reg.update(); } catch (e) {}
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') { try { reg.update(); } catch (e) {} }
          });
          setInterval(() => { try { reg.update(); } catch (e) {} }, 30 * 60 * 1000);
        }).catch(() => {});

        navigator.serviceWorker.addEventListener('message', (e) => {
          if (e.data && e.data.tipo === 'lexfive-nueva-version') mostrarAvisoActualizacion();
        });
      }
    } catch (e) { console.warn('Error con Service Worker:', e); }

    // Aplica el logo elegido por el bufete
    try {
      const cache = Branding.local();
      if (cache.logoImg) IMG.logo = cache.logoImg;
      if (cache.logoId) applyLogo(cache.logoId);
      else { const lg = localStorage.getItem('lexfive_logo'); if (lg) applyLogo(lg); }
    } catch (e) {}
    try {
      Branding.load().then(b => {
        if (!b) return;
        if (b.logoImg) IMG.logo = b.logoImg;
        if (b.logoId) { localStorage.setItem('lexfive_logo', b.logoId); applyLogo(b.logoId); }
      }).catch(() => {});
    } catch (e) {}

    try { subscribeBrandingRealtime(); } catch (e) {}

    // Respaldo de branding al volver a la pestaña
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      try {
        Branding.load().then(b => {
          if (!b) return;
          if (b.logoImg) IMG.logo = b.logoImg;
          if (b.selloImg) IMG.sello = b.selloImg;
          if (b.logoId) { localStorage.setItem('lexfive_logo', b.logoId); applyLogo(b.logoId); }
        }).catch(() => {});
      } catch (e) {}
    });

    try {
      applyWmOpacity(wmOpacityActual());
      initOfflineIndicator();
    } catch (e) {}

    // Manejo global de errores amigables
    let _lastErr = 0;
    const avisoError = () => {
      const now = Date.now();
      if (now - _lastErr < 8000) return;
      _lastErr = now;
      if (!navigator.onLine) return;
      toast('Ocurrió un problema. Si persiste, recargue la página.', 'error');
    };
    window.addEventListener('error', avisoError);
    window.addEventListener('unhandledrejection', avisoError);

    // Eventos globales de UI
    try {
      const btnLogout = $('#btnLogout');
      if (btnLogout) btnLogout.onclick = () => signOutTo('../index.html');
      initTooltipEngine();

      applyTheme(currentTheme());
      const btnTheme = $('#btnTheme');
      if (btnTheme) btnTheme.onclick = toggleTheme;

      applyFontScale(currentFontScale());
      const bFontMinus = $('#btnFontMinus'); if (bFontMinus) bFontMinus.onclick = () => changeFontScale(-1);
      const bFontPlus = $('#btnFontPlus'); if (bFontPlus) bFontPlus.onclick = () => changeFontScale(1);

      const panelLogo = document.querySelector('.sidebar__head .logo');
      if (panelLogo) {
        panelLogo.setAttribute('data-tip', 'Vuelve al sitio web público y cierra su sesión por seguridad.');
        panelLogo.addEventListener('click', (e) => {
          e.preventDefault();
          signOutTo('../index.html');
        });
      }
      const mc = $('#modalClose'); if (mc) mc.onclick = closeModal;
      const mo = $('#modalOverlay'); if (mo) mo.onclick = (e) => { if (e.target === mo) closeModal(); };
      const mt = $('#menuToggle');
      if (mt && !mt.dataset.navBound) {
        mt.dataset.navBound = '1';
        mt.onclick = (e) => {
          e.stopPropagation();
          const sb = $('#sidebar');
          if (sb && sb.classList.contains('open')) closeSidebar();
          else openSidebar();
        };
      }
      const bd = $('#backdrop');
      if (bd && !bd.dataset.navBound) {
        bd.dataset.navBound = '1';
        bd.onclick = closeSidebar;
      }
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          closeModal();
          closeSidebar();
        }
      });
    } catch (e) { console.warn('Error en listeners de UI:', e); }

    // Cierre de sesión por inactividad
    try {
      const IDLE_MS = 10 * 60 * 1000;
      let idleTimer;
      function resetIdle() {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(async () => {
          alert('Su sesión se cerró automáticamente por 10 minutos de inactividad.\n\nTranquilo: lo que estaba escribiendo quedó guardado.');
          await signOutTo('../index.html');
        }, IDLE_MS);
      }
      ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'].forEach(ev =>
        document.addEventListener(ev, resetIdle, { passive: true }));
      resetIdle();
    } catch (e) {}

    // Vista inicial según el rol
    try {
      navigate(profile.rol === 'cliente' ? 'misprocesos' : 'dashboard');
      if (profile.rol === 'cliente') updateNovedadesBadge();
    } catch (e) {
      console.warn('Error al navegar a vista inicial:', e);
      content().innerHTML = `<div class="card" style="margin:24px auto;max-width:600px;padding:24px;"><h3>Bienvenido a LexFive</h3><p>Haga clic en el menú lateral para ingresar a sus módulos.</p></div>`;
    }

    // Recordatorio automático de audiencias
    if (profile.rol !== 'cliente') {
      try {
        const lastRemind = Number(localStorage.getItem('lexfive_remind_ts') || 0);
        const now = Date.now();
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
      } catch (e) {}
    }

  } catch (bootErr) {
    console.error('Error crítico al inicializar el panel:', bootErr);
    const cont = content();
    if (cont) {
      cont.innerHTML = `
        <div class="card" style="max-width:540px;margin:64px auto;padding:28px;text-align:center;border-left:5px solid #c0392b;box-shadow:0 8px 30px rgba(0,0,0,0.12);">
          <div style="font-size:2.4rem;margin-bottom:8px;">⚠️</div>
          <h3 style="color:#c0392b;margin:0 0 10px;">No se pudo iniciar el panel</h3>
          <p class="cell-sub" style="margin:0 0 18px;font-size:0.92rem;">
            Ocurrió un problema durante el arranque del sistema: <br>
            <strong style="color:var(--ink);">${esc(bootErr.message || bootErr)}</strong>
          </p>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
            <button class="btn btn--primary" onclick="location.reload()">Reintentar</button>
            <button class="btn btn--ghost" onclick="localStorage.clear();sessionStorage.clear();location.reload()">Limpiar caché local y recargar</button>
            <a href="../index.html" class="btn btn--ghost">Ir al inicio</a>
          </div>
        </div>
      `;
    }
  }
})();
