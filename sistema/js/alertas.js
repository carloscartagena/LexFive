// ============================================================
//  LexFive — Centro de Alertas en Vivo y Notificaciones
//  Monitorea plazos perentorios (vencidos, hoy y próximas 48h)
//  respetando hora de Bolivia (UTC-4) y consultas web pendientes.
// ============================================================
import { supabase } from './supabase.js';
import { state } from './state.js';
import { esc, fmtDateTime, fmtDate } from './util.js';
import { ICON } from './icons.js';
import { $ } from './dom.js';
import { toast } from './ui.js';
import { navigate } from './app.js';

export const ALERTAS = {
  vencidos_hoy: [],
  proximos_48h: [],
  consultas_pendientes: [],
  total: 0,
  cargado: false
};

// Calcula fechas en zona horaria de Bolivia (America/La_Paz, UTC-4) sin desfase
export function getFechasBolivia() {
  const now = new Date();
  const hoyStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);

  const [y, m, d] = hoyStr.split('-').map(Number);

  // Mañana (+24 horas)
  const mananaDate = new Date(Date.UTC(y, m - 1, d + 1));
  const mananaStr = mananaDate.toISOString().slice(0, 10);

  // Pasado mañana (+48 horas)
  const pasadoDate = new Date(Date.UTC(y, m - 1, d + 2));
  const pasadoStr = pasadoDate.toISOString().slice(0, 10);

  return { hoyStr, mananaStr, pasadoStr };
}

// Consulta plazos perentorios y consultas web sin atender
export async function cargarAlertasEnVivo() {
  if (!state.profile) return;
  const { hoyStr, pasadoStr } = getFechasBolivia();

  try {
    const [{ data: tareasData, error: tarErr }, { data: consultasData, error: consErr }] = await Promise.all([
      supabase.from('tareas').select('id, titulo, descripcion, prioridad, estado, vence, asignado_a, proceso_id')
        .neq('estado', 'hecha')
        .not('vence', 'is', null)
        .lte('vence', pasadoStr)
        .order('vence', { ascending: true }),
      supabase.from('consultas').select('id, nombre, apellido, telefono, email, area, mensaje, created_at, estado')
        .eq('estado', 'nueva')
        .order('created_at', { ascending: false })
        .limit(20)
    ]);

    if (!tarErr && Array.isArray(tareasData)) {
      ALERTAS.vencidos_hoy = tareasData.filter(t => t.vence <= hoyStr);
      ALERTAS.proximos_48h = tareasData.filter(t => t.vence > hoyStr && t.vence <= pasadoStr);
    } else {
      ALERTAS.vencidos_hoy = [];
      ALERTAS.proximos_48h = [];
    }

    if (!consErr && Array.isArray(consultasData)) {
      ALERTAS.consultas_pendientes = consultasData;
    } else {
      ALERTAS.consultas_pendientes = [];
    }

    ALERTAS.total = ALERTAS.vencidos_hoy.length + ALERTAS.proximos_48h.length + ALERTAS.consultas_pendientes.length;
    ALERTAS.cargado = true;
  } catch (err) {
    console.warn('Advertencia al cargar alertas en vivo:', err);
    ALERTAS.cargado = true;
  }

  pintarCampanaAlertas();
  dispararNotificacionEscritorioSiCorresponde();
}

// Actualiza el indicador visual de la campana en la barra superior
export function pintarCampanaAlertas() {
  const bell = $('#btnNotif');
  if (!bell) return;

  // Siempre visible para el personal
  bell.hidden = false;
  const badge = bell.querySelector('.notif-bell__count');
  if (badge) {
    if (ALERTAS.total > 0) {
      badge.hidden = false;
      badge.textContent = ALERTAS.total > 9 ? '9+' : String(ALERTAS.total);
      badge.style.display = 'inline-flex';
      badge.style.background = ALERTAS.vencidos_hoy.length > 0 ? '#c0392b' : '#d97706';
    } else {
      badge.hidden = true;
      badge.style.display = 'none';
    }
  }

  const panel = $('#notifPanel');
  if (panel && panel.classList.contains('open')) {
    renderAlertasPanel(panel);
  }
}

// Solicita permiso para alertas nativas de escritorio (Notification API)
export async function solicitarPermisoEscritorio() {
  if (!('Notification' in window)) {
    toast('Su navegador no soporta notificaciones de escritorio.', 'error');
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      toast('Alertas de escritorio activadas correctamente.', 'success');
      try {
        new Notification('LexFive Bufete de Abogados', {
          body: 'Las alertas de plazos fatales y recordatorios están activadas en este equipo.',
          icon: '../assets/pwa/icon-192.png'
        });
      } catch (e) {
        // En móviles o PWA
        if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification('LexFive Bufete de Abogados', {
              body: 'Las alertas de plazos fatales y recordatorios están activadas.',
              icon: '../assets/pwa/icon-192.png'
            }).catch(() => {});
          }).catch(() => {});
        }
      }
    } else if (permission === 'denied') {
      toast('Las notificaciones están bloqueadas en los ajustes de su navegador.', 'error');
    }
    const panel = $('#notifPanel');
    if (panel && panel.classList.contains('open')) renderAlertasPanel(panel);
  } catch (err) {
    console.warn('Error al solicitar permiso de notificación:', err);
  }
}

// Dispara una notificación matutina al abrir el panel si hay plazos de hoy
function dispararNotificacionEscritorioSiCorresponde() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (!ALERTAS.vencidos_hoy.length) return;

  // Evita spam: máximo 1 notificación emergente por sesión de navegador
  if (sessionStorage.getItem('lexfive_desktop_alert_sent')) return;
  sessionStorage.setItem('lexfive_desktop_alert_sent', '1');

  const cantidad = ALERTAS.vencidos_hoy.length;
  const texto = `Tienes ${cantidad} plazo(s) perentorio(s) vencidos o que vencen hoy en LexFive.`;

  try {
    new Notification('⚠️ Plazos Fatales de Hoy — LexFive', {
      body: texto,
      icon: '../assets/pwa/icon-192.png',
      badge: '../assets/pwa/icon-192.png'
    });
  } catch (e) {
    if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification('⚠️ Plazos Fatales de Hoy — LexFive', {
          body: texto,
          icon: '../assets/pwa/icon-192.png'
        }).catch(() => {});
      }).catch(() => {});
    }
  }
}

// Renderiza el panel desplegable de la campana
export function renderAlertasPanel(panel) {
  const { hoyStr, mananaStr } = getFechasBolivia();
  const hasDesktopApi = 'Notification' in window;
  const isGranted = hasDesktopApi && Notification.permission === 'granted';

  panel.innerHTML = `
    <!-- Cabecera del Panel -->
    <div class="notif-panel__head" style="padding:14px 16px; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; align-items:center; background:var(--card-bg,var(--white));">
      <div>
        <strong style="font-size:0.95rem; color:var(--ink); display:flex; align-items:center; gap:6px;">
          🔔 Centro de Alertas
          ${ALERTAS.total > 0 ? `<span class="badge" style="background:${ALERTAS.vencidos_hoy.length ? '#c0392b' : '#d97706'}; color:#fff; font-size:0.75rem; padding:1px 7px; border-radius:10px;">${ALERTAS.total}</span>` : ''}
        </strong>
      </div>
      <div>
        ${isGranted
          ? `<span style="font-size:0.74rem; color:#16a34a; font-weight:600; display:inline-flex; align-items:center; gap:3px;">✓ Alertas activas</span>`
          : `<button class="btn btn--ghost btn--sm" id="btnActivarDesktopAlerts" type="button" style="font-size:0.74rem; padding:3px 8px; border-radius:6px; font-weight:600;" title="Recibir aviso en el escritorio del equipo">🔔 Activar escritorio</button>`}
      </div>
    </div>

    <!-- Cuerpo con los 3 bloques -->
    <div class="notif-list" style="max-height:65vh; overflow-y:auto; padding:8px 0;">

      <!-- 1. PLAZOS VENCIDOS / HOY (ROJO) -->
      <div style="padding:8px 16px 4px;">
        <div style="font-size:0.74rem; text-transform:uppercase; font-weight:700; color:#c0392b; letter-spacing:0.04em; display:flex; align-items:center; justify-content:space-between;">
          <span>🔴 Plazos Vencidos / Hoy (${ALERTAS.vencidos_hoy.length})</span>
          ${ALERTAS.vencidos_hoy.length ? `<span class="cell-sub" style="font-size:0.7rem; color:#c0392b; cursor:pointer;" class="js-jump-tareas">Ver tareas &rarr;</span>` : ''}
        </div>
      </div>

      ${ALERTAS.vencidos_hoy.length ? ALERTAS.vencidos_hoy.map(t => {
        const esHoy = t.vence === hoyStr;
        return `
          <div class="notif-item js-jump-tareas" style="border-left:3.5px solid #c0392b; background:rgba(192,57,43,0.06); margin:3px 8px; border-radius:6px; padding:9px 12px; cursor:pointer;" title="Clic para ir a Tareas y Plazos">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
              <strong class="notif-item__title" style="font-size:0.86rem; color:var(--ink);">${esc(t.titulo)}</strong>
              <span class="badge" style="background:#c0392b; color:#fff; font-size:0.7rem; font-weight:700; white-space:nowrap; padding:2px 6px;">
                ${esHoy ? '⚡ VENCE HOY' : `Venció ${fmtDate(t.vence)}`}
              </span>
            </div>
            ${t.descripcion ? `<div class="notif-item__body" style="font-size:0.78rem; color:var(--muted); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(t.descripcion)}</div>` : ''}
          </div>
        `;
      }).join('') : `
        <div style="padding:6px 16px 10px; font-size:0.8rem; color:var(--muted);">
          Sin plazos vencidos ni para hoy.
        </div>
      `}

      <div style="border-top:1px solid var(--line); margin:6px 0;"></div>

      <!-- 2. VENCEN EN 24–48 HORAS (ÁMBAR) -->
      <div style="padding:8px 16px 4px;">
        <div style="font-size:0.74rem; text-transform:uppercase; font-weight:700; color:#d97706; letter-spacing:0.04em; display:flex; align-items:center; justify-content:space-between;">
          <span>🟡 Vencen en 24–48 h (${ALERTAS.proximos_48h.length})</span>
          ${ALERTAS.proximos_48h.length ? `<span class="cell-sub" style="font-size:0.7rem; color:#d97706; cursor:pointer;" class="js-jump-tareas">Ver tareas &rarr;</span>` : ''}
        </div>
      </div>

      ${ALERTAS.proximos_48h.length ? ALERTAS.proximos_48h.map(t => {
        const esManana = t.vence === mananaStr;
        return `
          <div class="notif-item js-jump-tareas" style="border-left:3.5px solid #d97706; background:rgba(217,119,6,0.06); margin:3px 8px; border-radius:6px; padding:9px 12px; cursor:pointer;" title="Clic para ir a Tareas y Plazos">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
              <strong class="notif-item__title" style="font-size:0.86rem; color:var(--ink);">${esc(t.titulo)}</strong>
              <span class="badge" style="background:rgba(217,119,6,0.18); color:var(--text-primary, #92400e); border:1px solid rgba(217,119,6,0.45); font-size:0.7rem; font-weight:700; white-space:nowrap; padding:2px 6px;">
                ${esManana ? '⏳ Vence Mañana' : `Vence ${fmtDate(t.vence)}`}
              </span>
            </div>
            ${t.descripcion ? `<div class="notif-item__body" style="font-size:0.78rem; color:var(--muted); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(t.descripcion)}</div>` : ''}
          </div>
        `;
      }).join('') : `
        <div style="padding:6px 16px 10px; font-size:0.8rem; color:var(--muted);">
          Sin plazos perentorios en 48 horas.
        </div>
      `}

      <div style="border-top:1px solid var(--line); margin:6px 0;"></div>

      <!-- 3. CONSULTAS PENDIENTES (AZUL/DORADO) -->
      <div style="padding:8px 16px 4px;">
        <div style="font-size:0.74rem; text-transform:uppercase; font-weight:700; color:#0284c7; letter-spacing:0.04em; display:flex; align-items:center; justify-content:space-between;">
          <span>💬 Consultas sin atender (${ALERTAS.consultas_pendientes.length})</span>
          ${ALERTAS.consultas_pendientes.length ? `<span class="cell-sub" style="font-size:0.7rem; color:#0284c7; cursor:pointer;" class="js-jump-consultas">Ir a consultas &rarr;</span>` : ''}
        </div>
      </div>

      ${ALERTAS.consultas_pendientes.length ? ALERTAS.consultas_pendientes.map(c => {
        const nom = [c.nombre, c.apellido].filter(Boolean).join(' ') || 'Consulta Web';
        return `
          <div class="notif-item js-jump-consultas" style="border-left:3.5px solid #0284c7; background:rgba(2,132,199,0.06); margin:3px 8px; border-radius:6px; padding:9px 12px; cursor:pointer;" title="Clic para ir a Consultas">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
              <strong class="notif-item__title" style="font-size:0.86rem; color:var(--ink);">${esc(nom)}</strong>
              <span class="badge" style="background:rgba(2,132,199,0.18); color:var(--text-primary, #0369a1); border:1px solid rgba(2,132,199,0.45); font-size:0.7rem; font-weight:600; padding:1px 6px;">
                ${esc(c.area || 'General')}
              </span>
            </div>
            <div class="notif-item__body" style="font-size:0.78rem; color:var(--muted); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${esc(c.mensaje || c.telefono || 'Sin mensaje')}
            </div>
          </div>
        `;
      }).join('') : `
        <div style="padding:6px 16px 10px; font-size:0.8rem; color:var(--muted);">
          No hay consultas web pendientes de respuesta.
        </div>
      `}

    </div>

    <!-- Pie del panel con accesos directos -->
    <div style="padding:10px 14px; background:var(--bg,#f8fafc); border-top:1px solid var(--line); display:flex; gap:8px; justify-content:space-between;">
      <button class="btn btn--ghost btn--sm js-jump-tareas" style="flex:1; font-size:0.76rem; padding:5px 8px;">
        📌 Tareas y Plazos
      </button>
      <button class="btn btn--ghost btn--sm js-jump-consultas" style="flex:1; font-size:0.76rem; padding:5px 8px;">
        💬 Consultas
      </button>
    </div>
  `;

  // Botón de activación de alertas de escritorio
  const btnActivar = panel.querySelector('#btnActivarDesktopAlerts');
  if (btnActivar) {
    btnActivar.onclick = (e) => {
      e.stopPropagation();
      solicitarPermisoEscritorio();
    };
  }

  // Saltos con un clic a Tareas y Consultas
  panel.querySelectorAll('.js-jump-tareas').forEach(el => {
    el.onclick = () => {
      panel.classList.remove('open');
      navigate('tareas');
    };
  });

  panel.querySelectorAll('.js-jump-consultas').forEach(el => {
    el.onclick = () => {
      panel.classList.remove('open');
      navigate('consultas');
    };
  });
}

// Alterna la visibilidad del panel desplegable
export function toggleNotifPanel() {
  let panel = $('#notifPanel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'notifPanel';
    panel.className = 'notif-panel';
    document.body.appendChild(panel);
  }

  if (panel.classList.contains('open')) {
    panel.classList.remove('open');
    return;
  }

  renderAlertasPanel(panel);
  const bell = $('#btnNotif');
  if (bell) {
    const r = bell.getBoundingClientRect();
    panel.style.top = (r.bottom + 8) + 'px';
    panel.style.right = Math.max(8, window.innerWidth - r.right) + 'px';
  }
  panel.classList.add('open');
}

// Inicializa la campana en la barra superior
export function initNotifBell() {
  const actions = $('#topbarActions');
  if (!actions) return;

  let btn = $('#btnNotif');
  if (!btn) {
    btn = document.createElement('button');
    btn.className = 'btn btn--ghost btn--sm notif-bell';
    btn.id = 'btnNotif';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Centro de Alertas');
    btn.title = 'Centro de Alertas y Plazos Fatales';
    btn.innerHTML = `${ICON.campana}<span class="notif-bell__count" style="display:none;" hidden></span>`;
    actions.insertBefore(btn, actions.firstChild);

    btn.onclick = (e) => {
      e.stopPropagation();
      toggleNotifPanel();
    };

    document.addEventListener('click', (e) => {
      const panel = $('#notifPanel');
      if (panel && panel.classList.contains('open') && !panel.contains(e.target) && !btn.contains(e.target)) {
        panel.classList.remove('open');
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        cargarAlertasEnVivo();
      }
    });
  }

  cargarAlertasEnVivo();
}

// HTML para el banner matutino discreto del Dashboard
export function renderMorningAlertBannerHTML() {
  const cantVencidasHoy = ALERTAS.vencidos_hoy.length;
  if (!cantVencidasHoy) return '';

  // Si fue descartado durante la sesión actual, no mostrar
  if (sessionStorage.getItem('lexfive_dismiss_morning_banner') === '1') return '';

  return `
    <div class="card" id="morningAlertBanner" style="background:linear-gradient(135deg, rgba(192,57,43,0.08) 0%, rgba(184,148,70,0.1) 100%); border:1.5px solid rgba(192,57,43,0.35); border-left:5px solid #c0392b; margin-bottom:20px; padding:14px 18px; border-radius:8px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
      <div style="display:flex; align-items:center; gap:12px;">
        <span style="font-size:1.6rem;">⚠️</span>
        <div>
          <div style="font-weight:700; color:#c0392b; font-size:0.96rem;">
            Tienes ${cantVencidasHoy} plazo(s) perentorio(s) para hoy o vencidos
          </div>
          <div class="cell-sub" style="margin:0; font-size:0.85rem;">
            Revise el tablero de Tareas y Plazos para evitar preclusión de términos judiciales.
          </div>
        </div>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <button class="btn btn--primary btn--sm" id="btnVerPlazosHoy" type="button" style="background:#c0392b; border-color:#c0392b; font-weight:600;">
          Ver plazos en Tareas
        </button>
        <button class="btn btn--ghost btn--sm" id="btnDismissMorningBanner" type="button" title="Descartar este aviso durante esta sesión">
          ✕ Descartar
        </button>
      </div>
    </div>
  `;
}

// Conecta los eventos del banner matutino
export function wireMorningAlertBanner() {
  const btnVer = $('#btnVerPlazosHoy');
  if (btnVer) {
    btnVer.onclick = () => navigate('tareas');
  }

  const btnDismiss = $('#btnDismissMorningBanner');
  if (btnDismiss) {
    btnDismiss.onclick = () => {
      sessionStorage.setItem('lexfive_dismiss_morning_banner', '1');
      const b = $('#morningAlertBanner');
      if (b) b.remove();
    };
  }
}
