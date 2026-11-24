// ============================================================
//  LexFive — Módulo de Respaldo y Copias de Seguridad (Backup)
//  Resumen en vivo del estado de tablas, descarga completa en JSON
//  y exportaciones rápidas a Excel (.csv con UTF-8 BOM).
// ============================================================
import { supabase } from './supabase.js';
import { state } from './state.js';
import { esc, hoyISO, fmtDateTime } from './util.js';
import { descargarArchivo } from './exportar.js';
import { loading, toast, tip } from './ui.js';
import { $, content } from './dom.js';
import { ICON } from './icons.js';
import { revisarRespaldo } from './app.js';

export const TABLAS_RESPALDO = [
  { key: 'clientes', label: 'Clientes', icon: '👤', desc: 'Fichas de clientes y personas jurídicas', csvNombre: 'Clientes.csv' },
  { key: 'procesos', label: 'Procesos Judiciales', icon: '⚖️', desc: 'Expedientes, causas y NUREJ' },
  { key: 'actuaciones', label: 'Actuaciones Procesales', icon: '📜', desc: 'Historial cronológico de pasos y memoriales' },
  { key: 'documentos', label: 'Documentos', icon: '📎', desc: 'Metadatos de archivos adjuntos' },
  { key: 'consultas', label: 'Consultas Web', icon: '💬', desc: 'Bandeja de clientes potenciales del formulario', csvNombre: 'Consultas.csv' },
  { key: 'tareas', label: 'Tareas y Plazos', icon: '📌', desc: 'Plazos procesales y actividades del equipo', csvNombre: 'Tareas.csv' },
  { key: 'eventos', label: 'Eventos / Audiencias', icon: '📅', desc: 'Audiencias y fechas de agenda' },
  { key: 'certificados', label: 'Certificados', icon: '🎓', desc: 'Constancias y certificados emitidos', csvNombre: 'Certificados.csv' },
  { key: 'certificados_pasantia', label: 'Pasantías Universitarias', icon: '🏛️', desc: 'Expedientes curriculares e informes únicos' },
  { key: 'honorarios', label: 'Honorarios', icon: '💰', desc: 'Contratos y cuotas fijadas por casos', csvNombre: 'Honorarios.csv' },
  { key: 'pagos', label: 'Pagos / Recibos', icon: '🧾', desc: 'Recibos oficiales y cobros registrados' },
  { key: 'aranceles', label: 'Aranceles del Colegio', icon: '📋', desc: 'Tarifario de referencia ICALP' },
  { key: 'articulos', label: 'Blog Jurídico', icon: '📰', desc: 'Artículos y publicaciones del portal web' },
  { key: 'areas_practica', label: 'Áreas de Práctica', icon: '⚖️', desc: 'Especialidades legales del sitio' },
  { key: 'testimonios', label: 'Testimonios', icon: '⭐', desc: 'Reseñas y recomendaciones públicas' },
  { key: 'categorias', label: 'Categorías', icon: '🏷️', desc: 'Ramas y materias del derecho' },
  { key: 'profiles', label: 'Usuarios / Perfiles', icon: '👥', desc: 'Cuentas de abogados y personal' },
  { key: 'auditoria', label: 'Bitácora de Auditoría', icon: '🛡️', desc: 'Registro de seguridad y trazabilidad' },
  { key: 'configuracion', label: 'Configuración / Branding', icon: '⚙️', desc: 'Logo, sellos y datos institucionales' }
];

export function getUltimoBackupTexto() {
  const ts = Number(localStorage.getItem('lexfive_last_backup'));
  if (!ts) return 'Aún no se ha realizado ninguna copia de seguridad en este equipo.';
  const d = new Date(ts);
  return `Última copia de seguridad local: ${d.toLocaleDateString('es-BO')} a las ${d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}`;
}

function celdaCSV(v) {
  return '"' + String(v == null ? '' : v).replace(/"/g, '""').replace(/\r?\n/g, ' ') + '"';
}

function toCSV(headers, rows) {
  const lineas = [headers.map(celdaCSV).join(';')];
  rows.forEach(r => lineas.push(r.map(celdaCSV).join(';')));
  return '\ufeff' + lineas.join('\r\n');
}

export async function exportarTablaCSV(key) {
  toast(`Generando exportación de ${key}...`, 'info');
  try {
    const { data, error } = await supabase.from(key).select('*');
    if (error) throw error;
    const rows = data || [];
    if (!rows.length) {
      toast(`La tabla "${key}" no contiene registros para exportar.`, 'error');
      return;
    }

    let csvContent = '';
    let filename = `${key}_${hoyISO()}.csv`;

    if (key === 'clientes') {
      const headers = ['ID', 'Nombre Completo', 'CI / Documento', 'Teléfono', 'Correo', 'Dirección', 'Notas', 'Fecha Registro'];
      const formatRows = rows.map(c => [
        c.id, c.nombre || '', c.documento || c.ci || '', c.telefono || '', c.email || '', c.direccion || '', c.notas || '', c.created_at ? fmtDateTime(c.created_at) : ''
      ]);
      csvContent = toCSV(headers, formatRows);
      filename = 'Clientes.csv';
    } else if (key === 'consultas') {
      const headers = ['ID', 'Fecha', 'Nombre', 'Apellido', 'Teléfono', 'Correo', 'Área', 'Mensaje', 'Estado'];
      const formatRows = rows.map(c => [
        c.id, c.created_at ? fmtDateTime(c.created_at) : '', c.nombre || '', c.apellido || '', c.telefono || '', c.email || '', c.area || 'General', c.mensaje || '', c.estado || 'nueva'
      ]);
      csvContent = toCSV(headers, formatRows);
      filename = 'Consultas.csv';
    } else if (key === 'tareas') {
      const headers = ['ID', 'Título', 'Descripción', 'Prioridad', 'Estado', 'Fecha Vencimiento', 'Fecha Creación'];
      const formatRows = rows.map(t => [
        t.id, t.titulo || '', t.descripcion || '', t.prioridad || 'media', t.estado || 'pendiente', t.vence || 'Sin fecha', t.created_at ? fmtDateTime(t.created_at) : ''
      ]);
      csvContent = toCSV(headers, formatRows);
      filename = 'Tareas.csv';
    } else if (key === 'honorarios') {
      const headers = ['ID', 'ID Proceso', 'Monto', 'Moneda', 'Fecha', 'Descripción', 'Fecha Registro'];
      const formatRows = rows.map(h => [
        h.id, h.proceso_id || '', h.monto || 0, h.moneda || 'Bs', h.fecha || '', h.descripcion || '', h.created_at ? fmtDateTime(h.created_at) : ''
      ]);
      csvContent = toCSV(headers, formatRows);
      filename = 'Honorarios.csv';
    } else if (key === 'certificados') {
      const headers = ['ID', 'Código Verificación', 'Tipo', 'Beneficiario / Estudiante', 'CI', 'Universidad / Institución', 'Horas', 'Fecha Emisión', 'Estado'];
      const formatRows = rows.map(c => [
        c.id, c.codigo || c.codigo_verificacion || '', c.tipo || 'Pasantía', c.nombre_estudiante || c.estudiante || c.nombre || '', c.ci || '', c.universidad || c.institucion || '', c.horas || '', c.fecha_emision || c.fecha || '', c.estado || 'Activo'
      ]);
      csvContent = toCSV(headers, formatRows);
      filename = 'Certificados.csv';
    } else {
      // Exportación genérica para cualquier otra tabla
      const cols = Object.keys(rows[0]);
      const formatRows = rows.map(r => cols.map(c => r[c]));
      csvContent = toCSV(cols, formatRows);
      filename = `${key}.csv`;
    }

    descargarArchivo(filename, csvContent, 'text/csv;charset=utf-8');
    toast(`Archivo ${filename} descargado exitosamente.`, 'success');
  } catch (err) {
    console.error('Error al exportar CSV:', err);
    toast(`Error al exportar "${key}": ${err.message || 'error desconocido'}`, 'error');
  }
}

export async function descargarBackupCompletoJSON(btn = null) {
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Generando copia completa...';
  }
  toast('Extrayendo todas las tablas de Supabase para el backup...', 'info');

  try {
    const dumpTablas = {};
    let totalRegistros = 0;

    for (const t of TABLAS_RESPALDO) {
      try {
        const { data, error } = await supabase.from(t.key).select('*');
        if (!error && Array.isArray(data)) {
          dumpTablas[t.key] = data;
          totalRegistros += data.length;
        } else {
          dumpTablas[t.key] = [];
        }
      } catch (e) {
        dumpTablas[t.key] = [];
      }
    }

    const backupData = {
      sistema: 'LexFive Bufete de Abogados',
      version: '2.0',
      generado: new Date().toISOString(),
      generado_bolivia: new Date().toLocaleString('es-BO', { timeZone: 'America/La_Paz' }),
      usuario: state.profile ? state.profile.nombre : 'Administrador',
      total_tablas: Object.keys(dumpTablas).length,
      total_registros: totalRegistros,
      tablas: dumpTablas
    };

    const fileName = `LexFive_Backup_${hoyISO()}.json`;
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    descargarArchivo(fileName, blob, 'application/json');

    // Registrar fecha y hora del último backup
    localStorage.setItem('lexfive_last_backup', String(Date.now()));
    const infoEl = document.getElementById('backupStatusInfo');
    if (infoEl) infoEl.textContent = getUltimoBackupTexto();

    toast(`¡Backup completo descargado con éxito! (${totalRegistros} registros)`, 'success');
  } catch (err) {
    console.error('Error en backup completo:', err);
    toast('No se pudo generar el archivo de respaldo: ' + err.message, 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '💾 Descargar Backup Completo (.json)';
    }
  }
}

export async function renderBackup() {
  loading();

  // Consultar conteos en vivo de todas las tablas con try/catch individual
  const conteos = {};
  await Promise.all(
    TABLAS_RESPALDO.map(async (t) => {
      try {
        const { count, error } = await supabase.from(t.key).select('id', { count: 'exact', head: true });
        if (error) {
          conteos[t.key] = { ok: false, count: 0, error: error.message };
        } else {
          conteos[t.key] = { ok: true, count: count || 0 };
        }
      } catch (e) {
        conteos[t.key] = { ok: false, count: 0, error: e.message };
      }
    })
  );

  const totalTablasActivas = Object.values(conteos).filter(c => c.ok).length;
  const totalRegistrosEstimados = Object.values(conteos).reduce((sum, c) => sum + (c.ok ? c.count : 0), 0);

  content().innerHTML = `
    <!-- Encabezado de Respaldo -->
    <div class="card" style="margin-bottom: 20px; border-left: 5px solid var(--gold,#b89446);">
      <div class="card__head" style="justify-content:space-between; flex-wrap:wrap; gap:12px;">
        <div>
          <h3 style="margin:0; font-size:1.2rem; display:flex; align-items:center; gap:8px;">
            💾 Respaldo y Copia de Seguridad del Despacho
            ${tip('Permite generar copias de seguridad íntegras de toda la base de datos de LexFive en un archivo JSON local, así como exportar planillas compatibles con Excel (.csv).')}
          </h3>
          <p class="cell-sub" id="backupStatusInfo" style="margin-top:4px; font-weight:600; color:var(--ink);">
            ${getUltimoBackupTexto()}
          </p>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn btn--primary" id="btnDescargarBackupJSON" type="button" style="display:inline-flex; align-items:center; gap:6px; font-weight:700;">
            💾 Descargar Backup Completo (.json)
          </button>
          <button class="btn btn--ghost" id="btnRevisarBackupJSON" type="button" style="display:inline-flex; align-items:center; gap:6px;">
            🔍 Explorar archivo de respaldo
          </button>
        </div>
      </div>
      <div class="card__body" style="padding-top:14px;">
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px;">
          <div style="background:var(--bg,#f8fafc); border:1px solid var(--line,#e2e8f0); border-radius:8px; padding:12px 16px;">
            <div style="font-size:0.78rem; text-transform:uppercase; color:var(--muted); font-weight:700;">Tablas detectadas</div>
            <div style="font-size:1.6rem; font-weight:700; color:var(--primary); margin-top:2px;">${totalTablasActivas} / ${TABLAS_RESPALDO.length}</div>
          </div>
          <div style="background:var(--bg,#f8fafc); border:1px solid var(--line,#e2e8f0); border-radius:8px; padding:12px 16px;">
            <div style="font-size:0.78rem; text-transform:uppercase; color:var(--muted); font-weight:700;">Registros totales en BD</div>
            <div style="font-size:1.6rem; font-weight:700; color:#16a34a; margin-top:2px;">${totalRegistrosEstimados.toLocaleString('es-BO')}</div>
          </div>
          <div style="background:var(--bg,#f8fafc); border:1px solid var(--line,#e2e8f0); border-radius:8px; padding:12px 16px;">
            <div style="font-size:0.78rem; text-transform:uppercase; color:var(--muted); font-weight:700;">Formato Principal</div>
            <div style="font-size:1rem; font-weight:700; color:var(--gold,#b89446); margin-top:6px;">JSON Estructurado v2.0</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Exportación rápida a Excel -->
    <div class="card" style="margin-bottom: 20px;">
      <div class="card__head">
        <h3 style="margin:0; font-size:1.05rem; display:flex; align-items:center; gap:8px;">
          📊 Exportación Rápida a Excel (.csv con BOM UTF-8)
          ${tip('Archivos CSV optimizados con codificación UTF-8 BOM y punto y coma (;) para abrirse perfectamente en Microsoft Excel en español sin deformar tildes ni eñes.')}
        </h3>
      </div>
      <div class="card__body">
        <p class="cell-sub" style="margin-bottom:14px;">Descargue en 1 clic planillas individuales de las tablas esenciales del bufete:</p>
        <div style="display:flex; flex-wrap:wrap; gap:10px;">
          <button class="btn btn--ghost btn--sm js-btn-csv-fast" data-key="clientes" type="button" style="display:inline-flex; align-items:center; gap:6px; font-weight:600;">
            📥 Clientes.csv (${(conteos['clientes'] && conteos['clientes'].count) || 0})
          </button>
          <button class="btn btn--ghost btn--sm js-btn-csv-fast" data-key="consultas" type="button" style="display:inline-flex; align-items:center; gap:6px; font-weight:600;">
            📥 Consultas.csv (${(conteos['consultas'] && conteos['consultas'].count) || 0})
          </button>
          <button class="btn btn--ghost btn--sm js-btn-csv-fast" data-key="tareas" type="button" style="display:inline-flex; align-items:center; gap:6px; font-weight:600;">
            📥 Tareas.csv (${(conteos['tareas'] && conteos['tareas'].count) || 0})
          </button>
          <button class="btn btn--ghost btn--sm js-btn-csv-fast" data-key="honorarios" type="button" style="display:inline-flex; align-items:center; gap:6px; font-weight:600;">
            📥 Honorarios.csv (${(conteos['honorarios'] && conteos['honorarios'].count) || 0})
          </button>
          <button class="btn btn--ghost btn--sm js-btn-csv-fast" data-key="certificados" type="button" style="display:inline-flex; align-items:center; gap:6px; font-weight:600;">
            📥 Certificados.csv (${(conteos['certificados'] && conteos['certificados'].count) || 0})
          </button>
        </div>
      </div>
    </div>

    <!-- Detalle de Tablas Respaldadas -->
    <div class="card">
      <div class="card__head">
        <h3 style="margin:0; font-size:1.05rem;">Detalle de Tablas en Base de Datos</h3>
      </div>
      <div class="card__body--flush">
        <div class="table-wrap">
          <table class="data">
            <thead>
              <tr>
                <th>Tabla</th>
                <th>Descripción</th>
                <th style="text-align:right;">Registros</th>
                <th>Estado</th>
                <th style="text-align:right;">Acción</th>
              </tr>
            </thead>
            <tbody>
              ${TABLAS_RESPALDO.map(t => {
                const info = conteos[t.key] || { ok: false, count: 0 };
                return `
                  <tr class="no-hover">
                    <td class="cell-strong" style="font-family:monospace; font-size:0.9rem;">
                      ${t.icon} ${esc(t.key)}
                    </td>
                    <td style="font-size:0.88rem; color:var(--muted);">${esc(t.desc)}</td>
                    <td style="text-align:right; font-weight:700; font-size:0.95rem;">
                      ${info.ok ? info.count.toLocaleString('es-BO') : '—'}
                    </td>
                    <td>
                      ${info.ok
                        ? `<span class="badge badge-on" style="background:rgba(22,163,74,0.15); color:#16a34a; font-weight:600;">Disponible</span>`
                        : `<span class="badge badge-off" style="color:var(--muted);">No creada</span>`}
                    </td>
                    <td style="text-align:right;">
                      ${info.ok && info.count > 0 ? `
                        <button class="btn btn--ghost btn--sm js-btn-table-csv" data-key="${t.key}" type="button" title="Descargar esta tabla en CSV">
                          CSV
                        </button>
                      ` : '<span class="cell-sub">—</span>'}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Conectar eventos
  const btnBackupJSON = $('#btnDescargarBackupJSON');
  if (btnBackupJSON) btnBackupJSON.onclick = () => descargarBackupCompletoJSON(btnBackupJSON);

  const btnRevisar = $('#btnRevisarBackupJSON');
  if (btnRevisar) btnRevisar.onclick = () => revisarRespaldo();

  content().querySelectorAll('.js-btn-csv-fast, .js-btn-table-csv').forEach(btn => {
    btn.onclick = () => exportarTablaCSV(btn.dataset.key);
  });
}
