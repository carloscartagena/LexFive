import { $, content } from '@/utils/dom.js';
import { toast, loading } from '@/utils/ui.js';

export async function renderAiJurisprudencia() {
  const cont = content();
  cont.innerHTML = `
    <div class="view-header">
      <h2>Buscador Legal con IA</h2>
      <p class="cell-sub">Realiza consultas jurídicas complejas y Gemini Pro buscará respuestas, fundamentos y jurisprudencia aplicable.</p>
    </div>
    
    <div class="card" style="padding: 24px; max-width: 800px; margin: 20px auto;">
      <div class="field" style="margin-bottom: 20px;">
        <label>1. País / Jurisdicción (Opcional)</label>
        <input type="text" id="aiJuriPais" placeholder="Ej: Bolivia, España, México..." style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border,#ccc);">
      </div>
      
      <div class="field" style="margin-bottom: 24px;">
        <label>2. Describe tu consulta legal detalladamente</label>
        <textarea id="aiJuriQuery" rows="5" placeholder="Ej: ¿Qué jurisprudencia existe sobre despido intempestivo en periodo de prueba con fuero maternal?" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border,#ccc); font-family: inherit; resize: vertical;"></textarea>
      </div>

      <div style="text-align:right;">
        <button id="btnConsultarJuri" class="btn btn--primary">Consultar a Gemini</button>
      </div>
    </div>

    <div id="aiJuriResultContainer" style="display:none; max-width: 800px; margin: 20px auto;">
      <h3>Respuesta y Fundamentos</h3>
      <div id="aiJuriResult" class="card" style="padding:24px; white-space: pre-wrap; line-height: 1.6; background-color: var(--surface-alt, #f9f9f9);"></div>
      <p class="cell-sub" style="margin-top:10px; opacity:0.8;">⚠️ Nota: Esta es una sugerencia generada por IA. Verifica siempre las leyes y sentencias en las fuentes oficiales antes de usarlas en tribunales.</p>
    </div>
  `;

  $('#btnConsultarJuri').onclick = handleConsultJuri;
}

async function handleConsultJuri() {
  const query = $('#aiJuriQuery').value.trim();
  if (!query) {
    return toast('Por favor ingresa una consulta.', 'error');
  }

  const pais = $('#aiJuriPais').value.trim();
  const btn = $('#btnConsultarJuri');
  btn.disabled = true;
  btn.textContent = 'Buscando...';
  
  const resultContainer = $('#aiJuriResultContainer');
  const resultText = $('#aiJuriResult');
  resultContainer.style.display = 'none';
  resultText.innerHTML = '';
  loading(true, 'Gemini está investigando tu consulta...');

  try {
    const response = await fetch('/.netlify/functions/ai-jurisprudencia', {
      method: 'POST',
      body: JSON.stringify({
        query: query,
        pais: pais
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
    btn.textContent = 'Consultar a Gemini';
  }
}

