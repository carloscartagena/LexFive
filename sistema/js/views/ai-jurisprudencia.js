import { $, content } from '@/utils/dom.js';
import { toast, loading } from '@/utils/ui.js';

export async function renderAiJurisprudencia() {
  const cont = content();
  cont.innerHTML = `
    <div class="view-header">
      <h2>Búsqueda y Análisis de Jurisprudencia</h2>
      <p class="cell-sub">Encuentra jurisprudencia en los portales oficiales de Bolivia y utiliza nuestra IA para analizar, resumir o extraer puntos clave de las resoluciones.</p>
    </div>
    
    <!-- 1. Enlaces a buscadores oficiales -->
    <div class="card" style="padding: 24px; max-width: 800px; margin: 20px auto;">
      <h3 style="margin-bottom: 16px;">1. Buscadores Oficiales (Bolivia)</h3>
      <p class="cell-sub" style="margin-bottom: 20px;">Busca la jurisprudencia directamente en las fuentes oficiales:</p>
      <div style="display: flex; gap: 16px; flex-wrap: wrap;">
        <a href="https://jurisprudencia.tsj.bo/jurisprudencia" target="_blank" rel="noopener noreferrer" class="btn btn--outline" style="flex: 1; text-align: center; text-decoration: none;">
          🌐 Tribunal Supremo de Justicia (TSJ)
        </a>
        <a href="https://buscador.tcpbolivia.bo/" target="_blank" rel="noopener noreferrer" class="btn btn--outline" style="flex: 1; text-align: center; text-decoration: none;">
          🏛️ Tribunal Constitucional (TCP)
        </a>
      </div>
    </div>

    <!-- 2. Analizador IA -->
    <div class="card" style="padding: 24px; max-width: 800px; margin: 20px auto;">
      <h3 style="margin-bottom: 16px;">2. Asistente de Análisis de Jurisprudencia (IA)</h3>
      <p class="cell-sub" style="margin-bottom: 20px;">Pega el texto de una sentencia o auto supremo que encontraste para que Gemini lo analice por ti.</p>
      
      <div class="field" style="margin-bottom: 20px;">
        <label>Texto de la Resolución / Sentencia</label>
        <textarea id="aiJuriTexto" rows="8" placeholder="Pega aquí el extracto o texto completo de la sentencia..." style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border,#ccc); font-family: inherit; resize: vertical;"></textarea>
      </div>
      
      <div class="field" style="margin-bottom: 24px;">
        <label>Instrucción específica (Opcional)</label>
        <input type="text" id="aiJuriQuery" placeholder="Ej: Resume en 3 puntos la ratio decidendi, o ¿Aplica este caso a despidos indirectos?" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border,#ccc);">
      </div>

      <div style="text-align:right;">
        <button id="btnConsultarJuri" class="btn btn--primary">Analizar con Gemini</button>
      </div>
    </div>

    <div id="aiJuriResultContainer" style="display:none; max-width: 800px; margin: 20px auto;">
      <h3>Resultado del Análisis</h3>
      <div id="aiJuriResult" class="card" style="padding:24px; white-space: pre-wrap; line-height: 1.6; background-color: var(--surface-alt, #f9f9f9);"></div>
      <p class="cell-sub" style="margin-top:10px; opacity:0.8;">⚠️ Nota: Esta es una sugerencia generada por IA. Verifica siempre tu análisis profesional.</p>
    </div>
  `;

  $('#btnConsultarJuri').onclick = handleConsultJuri;
}

async function handleConsultJuri() {
  const texto = $('#aiJuriTexto').value.trim();
  const query = $('#aiJuriQuery').value.trim();
  
  if (!texto && !query) {
    return toast('Por favor ingresa el texto de la sentencia o una consulta.', 'error');
  }

  const btn = $('#btnConsultarJuri');
  btn.disabled = true;
  btn.textContent = 'Analizando...';
  
  const resultContainer = $('#aiJuriResultContainer');
  const resultText = $('#aiJuriResult');
  resultContainer.style.display = 'none';
  resultText.innerHTML = '';
  loading(true, 'Gemini está analizando el texto...');

  try {
    const response = await fetch('/.netlify/functions/ai-jurisprudencia', {
      method: 'POST',
      body: JSON.stringify({
        query: query,
        texto: texto
      })
    });

    const data = await response.json();
    loading(false);
    
    if (!response.ok) {
      throw new Error(data.error || 'Error en el servidor');
    }

    // Convert simple markdown bolding to HTML strong
    let text = data.result || '';
    text = text.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');
    
    resultText.innerHTML = text;
    resultContainer.style.display = 'block';
    
  } catch (err) {
    loading(false);
    toast('Error en la consulta: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Analizar con Gemini';
  }
}

