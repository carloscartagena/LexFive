// ============================================================
//  LexFive — Vista CALCULADORA DE ARANCELES
// ============================================================
import { esc } from '@/utils/util.js';
import { ICON } from '@/utils/icons.js';
import { $, content } from '@/utils/dom.js';
import { ARANCELES, getAllAranceles } from '@/utils/aranceles.js';

export async function renderAranceles() {
  const allAranceles = getAllAranceles();

  // HTML inicial de la vista
  let html = `
    <div class="header-actions">
      <h2>Calculadora de Aranceles (Mínimos)</h2>
    </div>
    
    <div class="card" style="margin-bottom: 24px;">
      <p class="cell-sub" style="margin-bottom: 16px;">
        Esta herramienta permite buscar rápidamente los costos mínimos sugeridos por el Ministerio para diversos procesos legales.
      </p>
      
      <div class="search-bar" style="margin-bottom: 20px;">
        <input type="text" id="buscarArancel" placeholder="Buscar proceso o categoría (ej. Divorcio, Penal)..." class="input" style="width: 100%; max-width: 400px;">
      </div>
      
      <div id="arancelesLista">
        <!-- Contenido generado dinámicamente -->
      </div>
    </div>
  `;

  content(html);

  const inputBuscar = $('#buscarArancel');
  const contenedorLista = $('#arancelesLista');

  // Función para renderizar la lista basada en un filtro
  const renderLista = (filtro = '') => {
    const f = filtro.toLowerCase();
    
    // Agrupar por categoría después de filtrar
    const agrupado = {};
    for (const item of allAranceles) {
      if (item.proceso.toLowerCase().includes(f) || item.categoria.toLowerCase().includes(f)) {
        if (!agrupado[item.categoria]) agrupado[item.categoria] = [];
        agrupado[item.categoria].push(item);
      }
    }

    if (Object.keys(agrupado).length === 0) {
      contenedorLista.innerHTML = `<div class="empty-state">${ICON.buscar || ''}<p>No se encontraron aranceles que coincidan con la búsqueda.</p></div>`;
      return;
    }

    let out = '';
    for (const [cat, procesos] of Object.entries(agrupado)) {
      out += `
        <h3 style="margin-top: 24px; margin-bottom: 12px; color: var(--navy); border-bottom: 1px solid var(--border); padding-bottom: 6px;">${esc(cat)}</h3>
        <div class="table-wrap">
          <table class="data">
            <thead>
              <tr>
                <th style="width: 70%;">Proceso / Trámite</th>
                <th style="text-align: right;">Costo Base (Bs.)</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      for (const p of procesos) {
        out += `
          <tr>
            <td><strong>${esc(p.proceso)}</strong></td>
            <td style="text-align: right; font-weight: 600; color: var(--primary);">
              ${typeof p.costo_bs === 'number' ? 'Bs. ' + p.costo_bs.toLocaleString('es-BO') : esc(p.costo_bs)}
            </td>
          </tr>
        `;
      }
      
      out += `
            </tbody>
          </table>
        </div>
      `;
    }
    
    contenedorLista.innerHTML = out;
  };

  // Escuchar eventos de búsqueda
  inputBuscar.addEventListener('input', (e) => {
    renderLista(e.target.value);
  });

  // Render inicial
  renderLista();
}
