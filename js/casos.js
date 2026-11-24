/* ============================================================
   LexFive — Portal Público de Seguimiento de Casos (casos.html)
   Permite a los clientes consultar en tiempo real el avance de su
   expediente judicial o administrativo mediante su código o enlace WhatsApp.
   ============================================================ */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_KEY, WHATSAPP } from './sistema/js/config.js';

(function () {
  'use strict';

  var sb = createClient(SUPABASE_URL, SUPABASE_KEY);

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  function formatearFecha(fechaStr) {
    if (!fechaStr) return '—';
    try {
      var parts = String(fechaStr).slice(0, 10).split('-');
      if (parts.length === 3) {
        var meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        var dia = parseInt(parts[2], 10);
        var mes = meses[parseInt(parts[1], 10) - 1];
        var anio = parts[0];
        return dia + ' de ' + mes + ' de ' + anio;
      }
      return fechaStr;
    } catch (e) {
      return fechaStr;
    }
  }

  function etapaColor(etapa) {
    var e = (etapa || '').toLowerCase();
    if (e.includes('preparatoria') || e.includes('demanda')) return '#1d4ed8'; // azul
    if (e.includes('admisión') || e.includes('radicatoria')) return '#b45309'; // ambar
    if (e.includes('prueba') || e.includes('audiencia')) return '#7e22ce'; // purpura
    if (e.includes('resolución') || e.includes('sentencia')) return '#047857'; // verde
    if (e.includes('recurso') || e.includes('apelación')) return '#c2410c'; // naranja
    if (e.includes('ejecución')) return '#0f766e'; // teal
    if (e.includes('concluido')) return '#475569'; // gris
    return '#c2a25a'; // dorado
  }

  async function consultarCaso(codigo) {
    var cod = (codigo || '').trim();
    var cont = document.getElementById('resultadoCaso');
    if (!cont) return;

    if (!cod) {
      cont.style.display = 'block';
      cont.innerHTML = '<div style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;padding:12px 16px;border-radius:8px;font-size:.9rem;">Por favor ingrese un código de seguimiento válido.</div>';
      return;
    }

    cont.style.display = 'block';
    cont.innerHTML = `
      <div style="text-align:center;padding:36px 16px;">
        <div style="display:inline-block;width:38px;height:38px;border:3px solid rgba(194,162,90,0.25);border-top-color:#c2a25a;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
        <p style="margin-top:14px;color:var(--muted,#64748b);font-size:.92rem;">Consultando estado del expediente en los registros oficiales de LexFive...</p>
      </div>
      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    `;

    try {
      var res = await sb.rpc('consultar_caso_publico', { p_codigo: cod });
      var data = res ? res.data : null;

      if (!data || !data.proceso) {
        cont.innerHTML = `
          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:26px 20px;text-align:center;box-shadow:0 6px 20px rgba(0,0,0,0.04);">
            <div style="width:56px;height:56px;border-radius:50%;background:#fef2f2;color:#dc2626;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:1.6rem;">✕</div>
            <h3 style="color:#0e1b2c;font-family:'Cormorant Garamond',Georgia,serif;font-size:1.4rem;margin-bottom:6px;">Expediente no encontrado</h3>
            <p style="color:#64748b;font-size:.92rem;max-width:540px;margin:0 auto 18px;line-height:1.5;">
              No se encontró un expediente activo con el código <strong>${escapeHtml(cod)}</strong>. Por favor verifique el código o comuníquese directamente con su abogado de LexFive.
            </p>
            <a href="https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Hola LexFive, tengo una consulta sobre mi expediente con código ' + cod)}" target="_blank" rel="noopener" class="btn btn--primary" style="display:inline-flex;align-items:center;gap:8px;">
              <span>💬</span> Consultar con un abogado por WhatsApp
            </a>
          </div>
        `;
        return;
      }

      var proc = data.proceso;
      var acts = data.actuaciones || [];
      var colorEtapa = etapaColor(proc.etapa);
      var linkWA = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent('Hola LexFive, le escribo para hacer una consulta sobre mi expediente "' + proc.caratula + '" (Código: ' + (proc.codigo_seguimiento || cod) + ').');

      var timelineHTML = '';
      if (!acts.length) {
        timelineHTML = `
          <div style="padding:16px;background:#f8fafc;border-radius:8px;text-align:center;color:#64748b;font-size:.88rem;border:1px dashed #cbd5e1;margin-top:12px;">
            El expediente se encuentra registrado en el sistema. Las actuaciones procesales se publicarán conforme al avance judicial.
          </div>
        `;
      } else {
        timelineHTML = `
          <div style="position:relative;margin:18px 0 10px 10px;padding-left:24px;border-left:2.5px solid #c2a25a;">
            ${acts.map(function (a) {
              return `
                <div style="position:relative;margin-bottom:22px;">
                  <!-- Indicador visual en la línea -->
                  <div style="position:absolute;left:-31px;top:4px;width:14px;height:14px;border-radius:50%;background:#0e1b2c;border:2.5px solid #c2a25a;box-shadow:0 0 0 2px #fff;"></div>
                  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;box-shadow:0 2px 8px rgba(0,0,0,0.03);">
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:6px;">
                      <span style="font-size:0.82rem;font-weight:700;color:#0e1b2c;">${formatearFecha(a.fecha)}</span>
                      <span style="font-size:0.75rem;padding:2px 8px;border-radius:12px;background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;font-weight:600;">
                        ${escapeHtml(a.tipo || 'Actuación')}
                      </span>
                    </div>
                    <div style="font-size:0.92rem;color:#1e293b;line-height:1.55;white-space:pre-wrap;">
                      ${escapeHtml(a.descripcion)}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }

      cont.innerHTML = `
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;box-shadow:0 8px 30px rgba(14,27,44,0.08);">
          <!-- Encabezado de la Causa -->
          <div style="background:linear-gradient(135deg, #0e1b2c 0%, #16273d 100%);color:#fff;padding:22px 24px;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:10px;">
              <span style="display:inline-block;background:rgba(194,162,90,0.18);border:1px solid #c2a25a;color:#e7d3a1;padding:4px 10px;border-radius:4px;font-family:monospace;font-size:0.82rem;font-weight:700;letter-spacing:1px;">
                CÓDIGO: ${escapeHtml(proc.codigo_seguimiento || cod)}
              </span>
              <span style="display:inline-block;background:${colorEtapa};color:#fff;padding:4px 12px;border-radius:20px;font-size:0.78rem;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">
                ETAPA: ${escapeHtml(proc.etapa || 'En trámite')}
              </span>
            </div>
            <h3 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:1.6rem;color:#fff;margin:0 0 6px;line-height:1.25;">
              ${escapeHtml(proc.caratula)}
            </h3>
            <div style="color:rgba(255,255,255,0.78);font-size:0.86rem;">
              Materia: <strong>${escapeHtml(proc.materia || 'General')}</strong> &nbsp;·&nbsp; Tipo: <strong>${proc.tipo === 'administrativo' ? 'Administrativo' : 'Judicial'}</strong>
            </div>
          </div>

          <!-- Cuadrícula de Datos Procesales Clave -->
          <div style="padding:18px 24px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:14px;">
              <div>
                <div style="font-size:0.75rem;text-transform:uppercase;color:#64748b;font-weight:600;letter-spacing:0.5px;">NUREJ / IANUS</div>
                <div style="font-size:0.95rem;font-weight:700;color:#0e1b2c;margin-top:2px;">${escapeHtml(proc.nurej || 'En asignación')}</div>
              </div>
              <div>
                <div style="font-size:0.75rem;text-transform:uppercase;color:#64748b;font-weight:600;letter-spacing:0.5px;">Juzgado / Entidad</div>
                <div style="font-size:0.95rem;font-weight:700;color:#0e1b2c;margin-top:2px;">${escapeHtml(proc.juzgado || 'Juzgado asignado')}</div>
              </div>
              <div>
                <div style="font-size:0.75rem;text-transform:uppercase;color:#64748b;font-weight:600;letter-spacing:0.5px;">Estado General</div>
                <div style="font-size:0.95rem;font-weight:700;color:#10b981;margin-top:2px;">Activo / En seguimiento</div>
              </div>
              <div>
                <div style="font-size:0.75rem;text-transform:uppercase;color:#64748b;font-weight:600;letter-spacing:0.5px;">Fecha de Inicio</div>
                <div style="font-size:0.95rem;font-weight:600;color:#0e1b2c;margin-top:2px;">${formatearFecha(proc.fecha_inicio)}</div>
              </div>
            </div>
          </div>

          <!-- Historial de Actuaciones (Línea de Tiempo Vertical) -->
          <div style="padding:22px 24px;">
            <h4 style="margin:0 0 14px;font-size:1.15rem;color:#0e1b2c;font-family:'Cormorant Garamond',Georgia,serif;display:flex;align-items:center;gap:8px;">
              <span>⏱️</span> Historial Cronológico de Actuaciones (${acts.length})
            </h4>
            ${timelineHTML}
          </div>

          <!-- Pie con llamada a WhatsApp -->
          <div style="padding:16px 24px;background:#fbfaf7;border-top:1px solid #ece8de;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
            <div style="font-size:0.85rem;color:#64748b;">
              ¿Tiene preguntas sobre este avance? Su equipo legal está disponible para atenderle.
            </div>
            <a href="${linkWA}" target="_blank" rel="noopener" class="btn btn--primary" style="background:#25d366;border-color:#25d366;color:#fff;font-weight:700;display:inline-flex;align-items:center;gap:8px;padding:9px 18px;font-size:.92rem;">
              <span>💬</span> Consultar con mi abogado por WhatsApp
            </a>
          </div>
        </div>
      `;

      // Desplazamiento suave hacia el resultado
      cont.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (e) {
      console.error('Error en consulta de caso:', e);
      cont.innerHTML = `
        <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:24px 20px;text-align:center;">
          <h3 style="color:#0e1b2c;margin-bottom:8px;">Consulta de Expediente</h3>
          <p style="color:#64748b;font-size:.92rem;margin-bottom:16px;">
            No se pudo completar la consulta automática para el código <strong>${escapeHtml(cod)}</strong>. Por favor contáctenos directamente por WhatsApp para brindarle el estado de su causa.
          </p>
          <a href="https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Hola LexFive, deseo consultar el avance de mi trámite con código ' + cod)}" target="_blank" rel="noopener" class="btn btn--primary">
            <span>💬</span> Consultar por WhatsApp
          </a>
        </div>
      `;
    }
  }

  // Inicialización al cargar la página
  window.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('formConsultaCaso');
    var input = document.getElementById('inputCodigoCaso');

    if (form && input) {
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        consultarCaso(input.value);
      });
    }

    // Comprobar parámetros de URL (ej. ?codigo=LX-12345 o ?c=...)
    var params = new URLSearchParams(window.location.search);
    var codUrl = params.get('codigo') || params.get('c') || '';

    if (!codUrl && window.location.hash) {
      var h = window.location.hash.replace(/^#/, '');
      if (h.length >= 3) codUrl = h;
    }

    if (codUrl && input) {
      input.value = codUrl;
      consultarCaso(codUrl);
    }
  });

})();
