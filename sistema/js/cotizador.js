// ============================================================
//  LexFive — Cotizador de Servicios Jurídicos y Honorarios
//  Emisión ágil de propuestas formales en PDF membretado
//  y envío de resumen ejecutivo por WhatsApp.
// ============================================================
import { supabase } from './supabase.js';
import { state } from './state.js';
import { esc, hoyISO, slugNombre, SITIO_URL } from './util.js';
import { fmtMoneda, montoEnLetras } from './exportar.js';
import { ICON } from './icons.js';
import { $, content } from './dom.js';
import { loading, toast } from './ui.js';
import { getAllAranceles } from './aranceles-data.js';
import { membreteHeader, membreteFooter, modeloMembrete, abrirImpresionVectorial } from './membrete-base.js';

let logoCache = null;
async function fetchLogoBase64() {
  if (logoCache) return logoCache;
  const logoUrl = (state.branding && state.branding.logo_url) || '/assets/logo.png';
  try {
    const res = await fetch(logoUrl);
    const blob = await res.blob();
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => { logoCache = reader.result; resolve(logoCache); };
      reader.onerror = () => resolve(logoUrl);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return logoUrl;
  }
}

function fechaLocalLarga() {
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const now = new Date();
  const d = now.getDate();
  const m = meses[now.getMonth()];
  const a = now.getFullYear();
  return `${d} de ${m} de ${a}`;
}

function getNextCotCodigo() {
  const anio = new Date().getFullYear();
  let seq = parseInt(localStorage.getItem('lexfive_cot_seq') || '1', 10);
  if (isNaN(seq) || seq < 1) seq = 1;
  return `COT-${anio}-${String(seq).padStart(3, '0')}`;
}

function incrementCotCodigo() {
  let seq = parseInt(localStorage.getItem('lexfive_cot_seq') || '1', 10);
  if (isNaN(seq) || seq < 1) seq = 1;
  localStorage.setItem('lexfive_cot_seq', String(seq + 1));
}

export async function renderCotizador() {
  loading();
  const logoSrc = await fetchLogoBase64();

  // Cargar clientes existentes para autocompletado rápido
  let clientes = [];
  try {
    const { data } = await supabase.from('clientes').select('id,nombre,telefono,ci').order('nombre');
    clientes = data || [];
  } catch (e) {
    clientes = [];
  }

  const allAranceles = getAllAranceles();
  // Agrupar aranceles por categoría
  const arancelesPorCat = {};
  allAranceles.forEach(a => {
    if (!arancelesPorCat[a.categoria]) arancelesPorCat[a.categoria] = [];
    arancelesPorCat[a.categoria].push(a);
  });

  // Estado local del cotizador
  let items = [
    { id: 1, concepto: 'Patrocinio legal integral y representación procesal', monto: 4500 }
  ];
  let nextItemId = 2;
  let codigoCot = getNextCotCodigo();

  const html = `
    <div class="header-actions" style="margin-bottom:16px;">
      <div>
        <h2 style="margin:0 0 4px;">Cotizador de Servicios Jurídicos</h2>
        <p class="cell-sub" style="margin:0;">Emite propuestas formales de honorarios en hoja Carta membretada con 1 clic.</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn--primary" id="cot_btn_imprimir" type="button" style="font-weight:bold;background:#b89446;color:#fff;">
          🖨️ Guardar PDF / Imprimir
        </button>
        <button class="btn btn--ghost" id="cot_btn_whatsapp" type="button" style="font-weight:600;border:1px solid #10b981;color:#10b981;">
          📲 Enviar resumen por WhatsApp
        </button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(420px, 1fr));gap:20px;align-items:start;">
      <!-- COLUMNA IZQUIERDA: FORMULARIO -->
      <div class="card" style="margin:0;">
        <div class="card__head">
          <h3 style="margin:0;font-size:1.05rem;">📋 Datos de la Propuesta</h3>
        </div>
        <div class="card__body" style="display:flex;flex-direction:column;gap:12px;">
          
          <div class="field">
            <label>Cargar cliente existente (opcional)</label>
            <select id="cot_sel_cliente" class="input">
              <option value="">-- Escribir datos libremente o elegir cliente --</option>
              ${clientes.map(c => `<option value="${c.id}" data-tel="${esc(c.telefono || '')}" data-nombre="${esc(c.nombre)}">${esc(c.nombre)}${c.telefono ? ` · Tel: ${esc(c.telefono)}` : ''}</option>`).join('')}
            </select>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div class="field">
              <label>Nombre del solicitante / Cliente *</label>
              <input id="cot_nombre" placeholder="Ej. Juan Pérez Quispe" value="Sr. Cliente Solicitante">
            </div>
            <div class="field">
              <label>Teléfono / WhatsApp</label>
              <input id="cot_telefono" placeholder="Ej. 70012345" value="">
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div class="field">
              <label>Materia / Especialidad</label>
              <select id="cot_materia">
                <option value="Materia Civil y Comercial" selected>Civil y Comercial</option>
                <option value="Materia Familiar">Familiar (Ley 603)</option>
                <option value="Materia Penal">Penal y Cautelar</option>
                <option value="Materia Laboral">Laboral y Seguridad Social</option>
                <option value="Materia Administrativa y Municipal">Administrativa / GAMEA</option>
                <option value="Materia Notarial y Derechos Reales">DDRR y Notarial</option>
                <option value="Asesoramiento Corporativo">Corporativo / Contratos</option>
              </select>
            </div>
            <div class="field">
              <label>Moneda de cobro</label>
              <select id="cot_moneda">
                <option value="BOB" selected>Bolivianos (Bs.)</option>
                <option value="USD">Dólares Americanos ($us)</option>
              </select>
            </div>
          </div>

          <!-- SELECTOR RÁPIDO DESDE ARANCELES -->
          <div class="field" style="border-top:1px dashed var(--line);padding-top:10px;">
            <label style="font-weight:600;color:var(--primary, #c2a25a);display:flex;align-items:center;gap:6px;">
              <span>⚖️</span> Agregar servicio desde Aranceles Oficiales
            </label>
            <select id="cot_sel_arancel" class="input">
              <option value="">-- Seleccionar proceso o actuación arancelaria para agregar --</option>
              ${Object.entries(arancelesPorCat).map(([cat, procs]) => `
                <optgroup label="${esc(cat)}">
                  ${procs.map(p => {
                    const price = (typeof p.costo_bs === 'number') ? `${p.costo_bs} Bs.` : p.costo_bs;
                    return `<option value="${p.id}" data-cat="${esc(cat)}" data-nombre="${esc(p.proceso)}" data-costo="${p.costo_bs}">
                      ${esc(p.proceso)} (${price})
                    </option>`;
                  }).join('')}
                </optgroup>
              `).join('')}
            </select>
            <p class="cell-sub" style="margin:4px 0 0;font-size:.78rem;">Al elegir un arancel, se suma automáticamente a la tabla inferior con su costo referencial.</p>
          </div>

          <!-- TABLA DE SERVICIOS COTIZADOS -->
          <div class="field">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <label style="font-weight:600;margin:0;">Servicios y honorarios propuestos</label>
              <button class="btn btn--ghost btn--sm" id="cot_btn_add_item" type="button" style="font-size:.78rem;padding:2px 8px;">
                ${ICON.plus} Agregar ítem manual
              </button>
            </div>
            <div id="cot_items_container" style="display:flex;flex-direction:column;gap:6px;"></div>
            <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:8px;padding-top:6px;border-top:1px solid var(--line);font-size:.95rem;">
              <span>Total calculado:</span>
              <strong id="cot_total_txt" style="color:var(--gold, #b89446);font-size:1.1rem;">0.00 Bs.</strong>
            </div>
          </div>

          <!-- CONDICIONES DE PAGO Y VALIDEZ -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;border-top:1px dashed var(--line);padding-top:10px;">
            <div class="field">
              <label>Plan de pagos sugerido</label>
              <select id="cot_sel_plan">
                <option value="50 % al inicio · 50 % a la conclusión" selected>50 % al inicio · 50 % a la conclusión</option>
                <option value="Pago único anticipado al 100 %">Pago único anticipado al 100 %</option>
                <option value="30 % anticipo · 40 % audiencia · 30 % sentencia">30 % anticipo · 40 % audiencia · 30 % sentencia</option>
                <option value="3 cuotas mensuales iguales">3 cuotas mensuales iguales</option>
                <option value="custom">Personalizado (escribir abajo)</option>
              </select>
              <input id="cot_plan_pago" value="50 % al inicio · 50 % a la conclusión" style="margin-top:4px;">
            </div>
            <div class="field">
              <label>Validez de la oferta</label>
              <input id="cot_validez" value="15 días calendario">
            </div>
          </div>

          <div class="field">
            <label>Alcance y Exclusiones (gastos a cargo del patrocinado)</label>
            <textarea id="cot_exclusiones" rows="2" style="font-size:.85rem;">Aranceles judiciales, valores fiscales, legalizaciones, gastos notariales y diligencias externas corren por cuenta del patrocinado.</textarea>
          </div>

          <div class="field">
            <label>Notas adicionales / Compromiso</label>
            <textarea id="cot_notas" rows="2" style="font-size:.85rem;">LexFive Abogados garantiza rigurosidad técnica, debida diligencia procesal y absoluta reserva y confidencialidad profesional.</textarea>
          </div>

        </div>
      </div>

      <!-- COLUMNA DERECHA: VISTA PREVIA EN HOJA CARTA MEMBRETADA -->
      <div>
        <div class="card" style="margin:0;">
          <div class="card__head" style="display:flex;justify-content:space-between;align-items:center;">
            <h3 style="margin:0;font-size:1.05rem;">👁️ Vista Previa de la Propuesta</h3>
            <span style="font-size:.8rem;color:#5c6675;">Formato Carta oficial (1 hoja)</span>
          </div>
          <div class="card__body" style="padding:16px;background:var(--body-bg, #0b131f);overflow-x:auto;">
            <div id="cot_preview_wrap" style="transform-origin:top left;transition:transform .2s;"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  content(html);

  // Renderizar tabla editable de ítems
  const renderItemsInputs = () => {
    const container = $('#cot_items_container');
    if (!container) return;
    container.innerHTML = items.map((it, idx) => `
      <div style="display:flex;gap:6px;align-items:center;" data-id="${it.id}">
        <input class="input cot-inp-concepto" data-id="${it.id}" value="${esc(it.concepto)}" placeholder="Concepto del servicio..." style="flex:1;">
        <input class="input cot-inp-monto" data-id="${it.id}" type="number" step="10" min="0" value="${it.monto}" placeholder="0.00" style="width:110px;text-align:right;">
        <button class="btn btn--ghost btn--sm cot-btn-del" data-id="${it.id}" type="button" style="color:#e11d48;padding:4px 8px;">✕</button>
      </div>
    `).join('');

    // Listeners para inputs de la tabla
    container.querySelectorAll('.cot-inp-concepto').forEach(inp => {
      inp.oninput = () => {
        const id = Number(inp.dataset.id);
        const item = items.find(x => x.id === id);
        if (item) { item.concepto = inp.value; pintarPreview(); }
      };
    });
    container.querySelectorAll('.cot-inp-monto').forEach(inp => {
      inp.oninput = () => {
        const id = Number(inp.dataset.id);
        const item = items.find(x => x.id === id);
        if (item) { item.monto = parseFloat(inp.value) || 0; pintarPreview(); }
      };
    });
    container.querySelectorAll('.cot-btn-del').forEach(btn => {
      btn.onclick = () => {
        const id = Number(btn.dataset.id);
        if (items.length <= 1) { toast('Debe existir al menos un servicio en la cotización.', 'info'); return; }
        items = items.filter(x => x.id !== id);
        renderItemsInputs();
        pintarPreview();
      };
    });
  };

  // Calcular total
  const calcularTotal = () => items.reduce((sum, it) => sum + (Number(it.monto) || 0), 0);

  // Generar HTML de la Hoja Carta Membretada
  const generarDocumentoHTML = () => {
    const model = modeloMembrete();
    const nombre = ($('#cot_nombre') ? $('#cot_nombre').value.trim() : '') || 'Cliente Solicitante';
    const telefono = ($('#cot_telefono') ? $('#cot_telefono').value.trim() : '') || '';
    const materia = ($('#cot_materia') ? $('#cot_materia').value : 'Civil y Comercial');
    const moneda = ($('#cot_moneda') ? $('#cot_moneda').value : 'BOB');
    const monedaSimbolo = moneda === 'USD' ? '$us' : 'Bs.';
    const planPago = ($('#cot_plan_pago') ? $('#cot_plan_pago').value : '50 % al inicio · 50 % a la conclusión');
    const validez = ($('#cot_validez') ? $('#cot_validez').value : '15 días calendario');
    const exclusiones = ($('#cot_exclusiones') ? $('#cot_exclusiones').value : '');
    const notas = ($('#cot_notas') ? $('#cot_notas').value : '');

    const total = calcularTotal();
    const totalLiteral = montoEnLetras(total, moneda);

    const headHTML = membreteHeader(model, logoSrc);
    const footHTML = membreteFooter(model);

    const filasTabla = items.map((it, idx) => `
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:7px 10px;text-align:center;color:#64748b;font-size:9.5pt;">${idx + 1}</td>
        <td style="padding:7px 10px;color:#1e293b;font-size:10pt;">${esc(it.concepto)}</td>
        <td style="padding:7px 10px;text-align:right;font-weight:600;color:#0e1b2c;font-size:10pt;white-space:nowrap;">
          ${fmtMoneda(it.monto, moneda)}
        </td>
      </tr>
    `).join('');

    return `
      <div class="hoja-carta" style="display:flex;flex-direction:column;width:21.59cm;height:27.94cm;min-height:27.94cm;max-height:27.94cm;margin:0 auto;background:#fff;color:#101820;box-sizing:border-box;overflow:hidden;box-shadow:0 3px 12px rgba(0,0,0,0.12);page-break-after:always;break-after:page;position:relative;font-family:Arial,Helvetica,sans-serif;">
        ${headHTML}
        
        <div style="position:relative;flex:1 1 auto;display:flex;flex-direction:column;padding:12px 2.2cm 14px;overflow:hidden;box-sizing:border-box;background:transparent !important;justify-content:space-between;">
          <div>
            <!-- ENCABEZADO DE LA PROPUESTA -->
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;border-bottom:1.5px solid #0e1b2c;padding-bottom:8px;">
              <div>
                <h1 style="font-size:13pt !important;font-weight:bold;color:#0e1b2c;letter-spacing:0.5px;text-transform:uppercase;margin:0 0 2px;font-family:Georgia,serif;">
                  PROPUESTA DE SERVICIOS JURÍDICOS Y HONORARIOS
                </h1>
                <div style="font-size:8.5pt;font-weight:bold;color:#a8853c;letter-spacing:1.5px;text-transform:uppercase;">
                  BUFETE DE ABOGADOS LEXFIVE &middot; DEPARTAMENTO CONTENCIOSO
                </div>
              </div>
              <div style="text-align:right;line-height:1.3;">
                <div style="font-size:9.5pt;font-weight:bold;color:#0e1b2c;">${codigoCot}</div>
                <div style="font-size:8.5pt;color:#475569;">La Paz, ${fechaLocalLarga()}</div>
                <div style="font-size:8pt;color:#64748b;">Validez: ${esc(validez)}</div>
              </div>
            </div>

            <!-- FICHA DE ATENCIÓN AL CLIENTE -->
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #b89446;border-radius:4px;padding:8px 12px;margin-bottom:12px;display:grid;grid-template-columns:2fr 1fr;gap:8px;font-size:9.5pt;">
              <div>
                <span style="color:#64748b;font-size:8pt;text-transform:uppercase;display:block;">Señor(a) / Solicitante:</span>
                <strong style="color:#0e1b2c;font-size:10.5pt;">${esc(nombre)}</strong>
                ${telefono ? `<div style="font-size:8.5pt;color:#475569;margin-top:2px;">Contacto: <strong>${esc(telefono)}</strong></div>` : ''}
              </div>
              <div>
                <span style="color:#64748b;font-size:8pt;text-transform:uppercase;display:block;">Área jurídica:</span>
                <strong style="color:#0e1b2c;">${esc(materia)}</strong>
              </div>
            </div>

            <!-- TABLA DE CONCEPTOS -->
            <table style="width:100%;border-collapse:collapse;margin-bottom:10px;font-size:9.5pt;">
              <thead>
                <tr style="background:#0e1b2c;color:#fff;">
                  <th style="padding:6px 10px;text-align:center;width:32px;font-size:8pt;letter-spacing:1px;">N.º</th>
                  <th style="padding:6px 10px;text-align:left;font-size:8pt;letter-spacing:1px;text-transform:uppercase;">Descripción del Servicio Profesional</th>
                  <th style="padding:6px 10px;text-align:right;width:120px;font-size:8pt;letter-spacing:1px;text-transform:uppercase;">Honorario (${monedaSimbolo})</th>
                </tr>
              </thead>
              <tbody>
                ${filasTabla}
              </tbody>
            </table>

            <!-- RECUADRO DE TOTAL DESTACADO -->
            <div style="background:linear-gradient(135deg, rgba(14,27,44,0.04), rgba(184,148,70,0.12));border:1.5px solid #b89446;border-radius:6px;padding:8px 14px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-size:8pt;text-transform:uppercase;letter-spacing:1px;color:#a8853c;font-weight:bold;">Importe Total Propuesto:</div>
                <div style="font-size:8.5pt;color:#334155;font-style:italic;">Son: ${esc(totalLiteral)}</div>
              </div>
              <div style="font-size:14pt;font-weight:bold;color:#0e1b2c;font-family:Georgia,serif;">
                ${fmtMoneda(total, moneda)}
              </div>
            </div>

            <!-- CONDICIONES DE PAGO Y ALCANCES -->
            <div style="border:1px solid #e2e8f0;border-radius:4px;padding:8px 12px;margin-bottom:8px;font-size:8.8pt;line-height:1.45;color:#334155;">
              <div style="margin-bottom:4px;">
                <strong style="color:#0e1b2c;">1. Modalidad y Plan de Pagos:</strong> ${esc(planPago)}
              </div>
              <div style="margin-bottom:4px;">
                <strong style="color:#0e1b2c;">2. Alcance y Exclusiones:</strong> ${esc(exclusiones)}
              </div>
              ${notas ? `<div><strong style="color:#0e1b2c;">3. Compromiso Institucional:</strong> ${esc(notas)}</div>` : ''}
            </div>
          </div>

          <!-- BLOQUE DE FIRMAS -->
          <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:auto;padding-top:12px;border-top:1px solid #cbd5e1;">
            <div style="text-align:center;width:210px;line-height:1.25;font-size:8.5pt;">
              <div style="border-top:1.5px solid #0e1b2c;width:170px;margin:0 auto 4px auto;"></div>
              <strong style="color:#0e1b2c;">DIRECCIÓN JURÍDICA</strong><br>
              <span style="color:#64748b;">Bufete de Abogados LexFive</span><br>
              <span style="color:#a8853c;font-size:7.5pt;letter-spacing:0.5px;">LA PAZ &middot; EL ALTO &middot; BOLIVIA</span>
            </div>
            <div style="text-align:center;width:210px;line-height:1.25;font-size:8.5pt;">
              <div style="border-top:1.5px dashed #94a3b8;width:170px;margin:0 auto 4px auto;"></div>
              <strong style="color:#0e1b2c;">CONFORME Y ACEPTADO</strong><br>
              <span style="color:#64748b;">Cliente / Patrocinado(a)</span><br>
              <span style="color:#94a3b8;font-size:7.5pt;">Firma y C.I.</span>
            </div>
          </div>
        </div>

        ${footHTML}
      </div>
    `;
  };

  const pintarPreview = () => {
    const wrap = $('#cot_preview_wrap');
    if (!wrap) return;
    const docHTML = generarDocumentoHTML();
    wrap.innerHTML = docHTML;

    // Actualizar total en tarjeta
    const total = calcularTotal();
    const mon = ($('#cot_moneda') ? $('#cot_moneda').value : 'BOB');
    const totalEl = $('#cot_total_txt');
    if (totalEl) totalEl.textContent = fmtMoneda(total, mon);
  };

  // Listeners de formulario
  renderItemsInputs();
  pintarPreview();

  // Selector de cliente existente
  const selCli = $('#cot_sel_cliente');
  if (selCli) {
    selCli.onchange = () => {
      const opt = selCli.options[selCli.selectedIndex];
      if (opt && opt.value) {
        $('#cot_nombre').value = opt.dataset.nombre || '';
        $('#cot_telefono').value = opt.dataset.tel || '';
        pintarPreview();
      }
    };
  }

  // Selector de Aranceles
  const selArancel = $('#cot_sel_arancel');
  if (selArancel) {
    selArancel.onchange = () => {
      const opt = selArancel.options[selArancel.selectedIndex];
      if (!opt || !opt.value) return;
      const nombreServicio = opt.dataset.nombre;
      const rawCosto = opt.dataset.costo;
      let parsedMonto = parseFloat(rawCosto);
      if (isNaN(parsedMonto)) parsedMonto = 1000;

      items.push({
        id: nextItemId++,
        concepto: nombreServicio,
        monto: parsedMonto
      });
      renderItemsInputs();
      pintarPreview();
      toast(`Servicio arancelario agregado: ${nombreServicio}`, 'success');
      selArancel.value = '';
    };
  }

  // Agregar ítem manual
  const btnAddItem = $('#cot_btn_add_item');
  if (btnAddItem) {
    btnAddItem.onclick = () => {
      items.push({
        id: nextItemId++,
        concepto: 'Servicio jurídico adicional',
        monto: 500
      });
      renderItemsInputs();
      pintarPreview();
    };
  }

  // Inputs con refresco en vivo
  ['cot_nombre', 'cot_telefono', 'cot_materia', 'cot_moneda', 'cot_validez', 'cot_plan_pago', 'cot_exclusiones', 'cot_notas'].forEach(id => {
    const el = $('#' + id);
    if (el) {
      el.oninput = pintarPreview;
      el.onchange = pintarPreview;
    }
  });

  // Selector de plan de pagos
  const selPlan = $('#cot_sel_plan');
  if (selPlan) {
    selPlan.onchange = () => {
      if (selPlan.value !== 'custom') {
        $('#cot_plan_pago').value = selPlan.value;
      }
      pintarPreview();
    };
  }

  // Botón Guardar PDF / Imprimir (Vectorial 1 hoja Carta limpia)
  const btnImprimir = $('#cot_btn_imprimir');
  if (btnImprimir) {
    btnImprimir.onclick = () => {
      const nombre = ($('#cot_nombre').value || 'Cliente').trim();
      const slug = slugNombre(nombre);
      const tituloDoc = `Propuesta_${codigoCot}_${slug}`;
      const docHTML = generarDocumentoHTML();
      incrementCotCodigo();
      codigoCot = getNextCotCodigo();
      abrirImpresionVectorial(tituloDoc, docHTML);
      toast('Ventana de impresión vectorial generada.', 'success');
    };
  }

  // Botón WhatsApp
  const btnWhatsApp = $('#cot_btn_whatsapp');
  if (btnWhatsApp) {
    btnWhatsApp.onclick = () => {
      const nombre = ($('#cot_nombre').value || '').trim() || 'Estimado/a cliente';
      let tel = ($('#cot_telefono').value || '').replace(/\D/g, '');
      if (tel.length === 8) tel = '591' + tel;

      const materia = $('#cot_materia').value;
      const moneda = $('#cot_moneda').value;
      const total = fmtMoneda(calcularTotal(), moneda);
      const plan = $('#cot_plan_pago').value;
      const validez = $('#cot_validez').value;

      const resumenItems = items.map((it, idx) => `  ${idx + 1}. ${it.concepto}: ${fmtMoneda(it.monto, moneda)}`).join('\n');

      const mensaje = `Estimado/a *${nombre}*:\n\n` +
        `Le saludamos cordialmente de *LexFive Abogados*. Conforme a lo conversado, le compartimos el resumen de la propuesta de servicios profesionales:\n\n` +
        `📋 *Propuesta:* ${codigoCot} — ${materia}\n` +
        `⚖️ *Servicios considerados:*\n${resumenItems}\n\n` +
        `💰 *Total Honorarios:* ${total}\n` +
        `💳 *Forma de pago:* ${plan}\n` +
        `⏳ *Validez:* ${validez}\n\n` +
        `Quedamos atentos a cualquier consulta para dar inicio al patrocinio.\n\n` +
        `*LexFive Abogados*\n` +
        `La Paz / El Alto — Bolivia`;

      const url = `https://wa.me/${tel ? tel : ''}?text=${encodeURIComponent(mensaje)}`;
      window.open(url, '_blank');
      toast('Abriendo WhatsApp con resumen de cotización...', 'success');
    };
  }
}
