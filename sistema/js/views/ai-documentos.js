import { $, content } from '@/utils/dom.js';
import { toast, loading } from '@/utils/ui.js';

export async function renderAiDocumentos() {
  const cont = content();
  cont.innerHTML = `
    <div class="view-header">
      <h2>Análisis de Documentos con IA</h2>
      <p class="cell-sub">Sube un contrato, demanda o documento legal para que Gemini Pro lo analice, extraiga puntos clave y detecte riesgos.</p>
    </div>
    
    <div class="card" style="padding: 24px; max-width: 800px; margin: 20px auto;">
      <div class="field" style="margin-bottom: 20px;">
        <label>1. Selecciona el documento (PDF, Word, TXT, o Imagen)</label>
        <input type="file" id="aiDocFile" accept=".pdf,.doc,.docx,.txt,image/*" style="width:100%; padding:10px; border:1px dashed var(--border,#ccc); border-radius:8px;">
      </div>
      
      <div class="field" style="margin-bottom: 24px;">
        <label>2. ¿Qué tipo de análisis deseas?</label>
        <select id="aiDocType" style="width:100%; padding:10px; border-radius:8px;">
          <option value="riesgos">Análisis de Riesgos y Puntos Clave</option>
          <option value="resumen">Resumen Ejecutivo</option>
        </select>
      </div>

      <div style="text-align:right;">
        <button id="btnAnalizarDoc" class="btn btn--primary">Analizar con Gemini</button>
      </div>
    </div>

    <div id="aiDocResultContainer" style="display:none; max-width: 800px; margin: 20px auto;">
      <h3>Resultado del Análisis</h3>
      <div id="aiDocResult" class="card" style="padding:24px; white-space: pre-wrap; line-height: 1.6; background-color: var(--surface-alt, #f9f9f9);"></div>
    </div>
  `;

  $('#btnAnalizarDoc').onclick = handleAnalyzeDoc;
}

async function handleAnalyzeDoc() {
  const fileInput = $('#aiDocFile');
  if (!fileInput.files || fileInput.files.length === 0) {
    return toast('Por favor selecciona un documento.', 'error');
  }
  
  const file = fileInput.files[0];
  if (file.size > 5 * 1024 * 1024) {
    return toast('El documento es demasiado grande. Máximo 5MB para esta versión.', 'error');
  }

  const analysisType = $('#aiDocType').value;
  const btn = $('#btnAnalizarDoc');
  btn.disabled = true;
  btn.textContent = 'Analizando...';
  
  const resultContainer = $('#aiDocResultContainer');
  const resultText = $('#aiDocResult');
  resultContainer.style.display = 'none';
  resultText.innerHTML = '';
  loading(true, 'Gemini está leyendo y analizando el documento...');

  try {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result;
      
      try {
        const response = await fetch('/.netlify/functions/ai-analyze-doc', {
          method: 'POST',
          body: JSON.stringify({
            documentBase64: base64,
            mimeType: file.type || 'application/octet-stream',
            analysisType: analysisType
          })
        });

        const data = await response.json();
        loading(false);
        
        if (!response.ok) {
          throw new Error(data.error || 'Error en el servidor');
        }

        resultText.textContent = data.analysis;
        resultContainer.style.display = 'block';
        
      } catch (err) {
        loading(false);
        toast('Error al analizar: ' + err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Analizar con Gemini';
      }
    };
    
    reader.readAsDataURL(file);
    
  } catch (err) {
    loading(false);
    btn.disabled = false;
    btn.textContent = 'Analizar con Gemini';
    toast('Error local leyendo el archivo', 'error');
  }
}

