// ============================================================
//  LexFive — Módulo de Seguimiento de Causas y Avances por WhatsApp
//  Estructuración procesal, generación de enlaces para clientes,
//  construcción de mensajes para WhatsApp y renderizado de línea de tiempo.
// ============================================================
import { esc, fmtDate, hoyISO } from './util.js';
import { toast } from './ui.js';

export const ETAPAS_PROCESALES = [
  'Preparatoria / Demanda',
  'Admisión / Radicatoria',
  'Prueba / Audiencias',
  'Resolución / Sentencia',
  'Recursos / Apelación',
  'Ejecución de Sentencia',
  'Concluido'
];

export const TIPOS_ACTUACION = [
  'Decreto judicial',
  'Notificación',
  'Audiencia',
  'Presentación de memorial',
  'Resolución / Sentencia',
  'Diligencia / Trámite',
  'Reunión / Coordinación',
  'Otro'
];

// Obtiene o genera un código de seguimiento alfanumérico limpio
export function getCodigoSeguimiento(proc) {
  if (!proc) return 'LX-CASO';
  if (proc.codigo_seguimiento && proc.codigo_seguimiento.trim()) {
    return proc.codigo_seguimiento.trim().toUpperCase();
  }
  // Genera código determinístico a partir del UUID: LX-XXXXXXX
  const idStr = String(proc.id || '').replace(/-/g, '');
  return 'LX-' + (idStr.slice(0, 7) || 'EXP001').toUpperCase();
}

// Limpia y formatea números de teléfono bolivianos con prefijo internacional 591
export function formatTelBolivia(tel) {
  if (!tel) return '';
  let digits = String(tel).replace(/\D/g, '');
  if (digits.length === 8) {
    digits = '591' + digits;
  }
  return digits;
}

// URL canónica de consulta pública para el cliente
export function getEnlaceSeguimiento(proc) {
  const cod = getCodigoSeguimiento(proc);
  return `https://lexfive.netlify.app/casos.html?codigo=${encodeURIComponent(cod)}`;
}

// Copia el enlace de seguimiento al portapapeles
export function copiarEnlaceSeguimiento(proc) {
  const link = getEnlaceSeguimiento(proc);
  const done = () => toast(`Enlace copiado: ${link}`, 'success');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(link).then(done).catch(() => {
      prompt('Copie el enlace de seguimiento del cliente:', link);
    });
  } else {
    prompt('Copie el enlace de seguimiento del cliente:', link);
  }
}

// Construye el texto formal para enviar avance por WhatsApp
export function construirMensajeWhatsApp(cli, proc, actuacion = null) {
  const nombre = (cli && cli.nombre) ? cli.nombre.trim() : 'estimado(a) cliente';
  const asunto = (proc && proc.caratula) ? proc.caratula.trim() : 'su trámite legal';
  const nurejInfo = (proc && proc.nurej) ? ` · NUREJ: ${proc.nurej.trim()}` : '';
  const desc = (actuacion && actuacion.descripcion)
    ? actuacion.descripcion.trim()
    : 'Hemos registrado una nueva actuación y actualización procesal en su expediente.';
  const fecha = (actuacion && actuacion.fecha) ? fmtDate(actuacion.fecha) : fmtDate(hoyISO());
  const link = getEnlaceSeguimiento(proc);

  return `Estimado(a) ${nombre}, le saludamos de LexFive Bufete de Abogados. Le informamos el último avance de su trámite (${asunto}${nurejInfo}): "${desc}" (Fecha: ${fecha}). Puede revisar el historial completo en línea aquí: ${link}`;
}

// Abre WhatsApp Web / app en 1 clic
export function enviarAvanceWhatsApp(cli, proc, actuacion = null) {
  const rawTel = (cli && cli.telefono) ? cli.telefono : '';
  let tel = formatTelBolivia(rawTel);

  if (!tel) {
    const askTel = prompt('El cliente no tiene teléfono registrado. Ingrese el número de WhatsApp (ej. 78360469):');
    if (!askTel) return;
    tel = formatTelBolivia(askTel);
  }

  const texto = construirMensajeWhatsApp(cli, proc, actuacion);
  const waUrl = `https://wa.me/${tel}?text=${encodeURIComponent(texto)}`;
  window.open(waUrl, '_blank', 'noopener,noreferrer');
  toast('Abriendo WhatsApp con el mensaje de avance...', 'success');
}

// Renderiza la línea de tiempo vertical limpia para un expediente
export function renderTimelineVertical(acts = [], docs = [], cli = null, proc = null, readonly = false) {
  if (!acts || !acts.length) {
    return `
      <div style="text-align:center;padding:26px 16px;background:var(--bg,#f8fafc);border-radius:8px;border:1px dashed var(--line,#cbd5e1);margin-top:10px;">
        <span style="font-size:1.8rem;display:block;margin-bottom:6px;">⏱️</span>
        <p style="color:var(--muted,#64748b);font-size:.9rem;margin-bottom:4px;">Aún no se registraron actuaciones en este expediente.</p>
        <span class="cell-sub">Registre la primera actuación arriba para comenzar la línea de tiempo.</span>
      </div>
    `;
  }

  return `
    <div class="timeline-vertical" style="position:relative;margin:16px 0 10px 10px;padding-left:26px;border-left:2.5px solid #c2a25a;">
      ${acts.map((a, idx) => {
        const actDocs = (docs || []).filter(d => d.actuacion_id === a.id);
        const tipoLabel = a.tipo || 'Actuación';
        const fechaLocal = fmtDate(a.fecha);

        return `
          <div class="timeline-node" style="position:relative;margin-bottom:20px;">
            <!-- Punto indicador en la línea -->
            <div style="position:absolute;left:-33px;top:4px;width:14px;height:14px;border-radius:50%;background:#0e1b2c;border:2.5px solid #c2a25a;box-shadow:0 0 0 2px #fff;"></div>
            
            <!-- Tarjeta de actuación -->
            <div style="background:var(--card-bg,#fff);border:1px solid var(--line,#e2e8f0);border-radius:8px;padding:12px 16px;box-shadow:0 2px 8px rgba(0,0,0,0.03);">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:6px;">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                  <span style="font-size:0.82rem;font-weight:700;color:var(--navy,#0e1b2c);">${fechaLocal}</span>
                  <span style="font-size:0.75rem;padding:2px 8px;border-radius:12px;background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;font-weight:600;">
                    ${esc(tipoLabel)}
                  </span>
                </div>

                <!-- Botón de WhatsApp por actuación -->
                ${cli && proc ? `
                  <button type="button" class="btn btn--sm js-wa-act" data-act-id="${a.id}" style="background:#25d366;border-color:#25d366;color:#fff;font-size:0.76rem;padding:3px 9px;border-radius:6px;font-weight:600;display:inline-flex;align-items:center;gap:4px;" title="Enviar este avance al cliente por WhatsApp">
                    <span>💬</span> Enviar avance por WhatsApp
                  </button>
                ` : ''}
              </div>

              <!-- Descripción de la actividad -->
              <div style="font-size:0.92rem;color:var(--ink,#1e293b);line-height:1.55;margin-bottom:8px;white-space:pre-wrap;">
                ${esc(a.descripcion)}
              </div>

              <!-- Documentos adjuntos a esta actuación -->
              ${actDocs.length ? `
                <div style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--line,#e2e8f0);">
                  <div style="font-size:0.76rem;color:var(--muted,#64748b);font-weight:600;margin-bottom:4px;">Documentos adjuntos:</div>
                  <div style="display:flex;flex-wrap:wrap;gap:6px;">
                    ${actDocs.map(d => `
                      <span class="act-file" data-path="${esc(d.storage_path)}" data-id="${d.id}" style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;padding:3px 8px;font-size:0.76rem;color:#0369a1;display:inline-flex;align-items:center;gap:6px;">
                        <span>📎</span> <span class="act-file__name">${esc(d.nombre || 'Archivo')}</span>
                        ${d.storage_path ? `<button type="button" class="btn btn--ghost btn--sm js-tl-dl" style="padding:2px 6px;font-size:0.72rem;line-height:1;border-radius:4px;cursor:pointer;" title="Ver archivo">Ver</button>` : ''}
                      </span>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}
