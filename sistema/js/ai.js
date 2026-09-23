import { $ } from './dom.js';
import { toast, openModal, closeModal } from './ui.js';

const STORAGE_KEY = 'lexfive_gemini_key';

// Muestra el modal para configurar la API Key de Gemini
export function showAIConfigModal() {
  const currentKey = localStorage.getItem(STORAGE_KEY) || '';
  const body = `
    <p class="form-help" style="margin-bottom:15px; color:var(--tx-mute);">Para utilizar la Inteligencia Artificial (Gemini Pro), necesitas ingresar tu API Key. Esta clave se guardará de forma segura en este navegador.</p>
    <div class="form-group">
      <label>Google Gemini API Key</label>
      <input type="password" id="aiKeyInput" class="input" value="${currentKey}" placeholder="AIzaSy...">
    </div>
  `;
  openModal('Configuración de IA (Gemini)', body, [
    { label: 'Cancelar', class: 'btn--ghost', onClick: closeModal },
    { label: 'Guardar', class: 'btn--primary', onClick: () => {
      const val = $('#aiKeyInput').value.trim();
      if (val) {
        localStorage.setItem(STORAGE_KEY, val);
        toast('API Key de Gemini guardada correctamente.', 'success');
        closeModal();
      } else {
        localStorage.removeItem(STORAGE_KEY);
        toast('API Key eliminada.', 'info');
        closeModal();
      }
    }}
  ]);
}

// Obtiene la API Key. Si no existe, pide al usuario configurarla.
export function getApiKey() {
  const key = localStorage.getItem(STORAGE_KEY);
  if (!key) {
    showAIConfigModal();
    return null;
  }
  return key;
}

// Función principal para llamar a Gemini 1.5 Pro
export async function generateContent(promptText, systemInstruction = "Eres un asistente legal experto de Bolivia. Redacta de forma profesional, clara y precisa en formato legal.") {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{ parts: [{ text: promptText }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
    generationConfig: {
      temperature: 0.4
    }
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error?.message || 'Error en la API de Gemini');
    }
    
    const data = await res.json();
    if (data.candidates && data.candidates.length > 0) {
      return data.candidates[0].content.parts[0].text;
    }
    return null;
  } catch (error) {
    console.error('Gemini API Error:', error);
    toast('Error en IA: ' + error.message, 'error');
    return null;
  }
}
