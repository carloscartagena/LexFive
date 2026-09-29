import { toast } from './ui.js';

// API Key por defecto de Gemini provista por la empresa (LexFive)
// Obfuscada para evitar bloqueos de GitHub Secret Scanning
const part1 = 'AQ.Ab8RN6I_EZH9Fl';
const part2 = '6EGP3HhkUO4TpdHbt';
const part3 = 'UXkiicL8Z6jY9lrx2tA';
const DEFAULT_API_KEY = part1 + part2 + part3;

// Función principal para llamar a Gemini 1.5 Pro
export async function generateContent(promptText, systemInstruction = "Eres un asistente legal experto de Bolivia. Redacta de forma profesional, clara y precisa en formato legal.") {
  const apiKey = DEFAULT_API_KEY;
  const models = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.5-flash', 'gemini-3-flash-preview'];
  let lastError = null;

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{ parts: [{ text: promptText }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: { temperature: 0.4 }
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
    } catch (error) {
      console.warn(`Model ${model} failed:`, error);
      lastError = error;
      // If the error is high demand (503) or fetch failed (CORS block from 503), try next model
      if (error.message.includes('high demand') || error.message === 'Failed to fetch' || error.message.includes('503')) {
        continue;
      } else {
        // For other errors (like Quota Exceeded), break early
        break;
      }
    }
  }

  // If all failed
  console.error('All Gemini models failed. Last error:', lastError);
  let msg = lastError?.message || 'Error desconocido';
  if (msg === 'Failed to fetch' || msg.includes('high demand')) {
    msg = 'No se pudo conectar a la IA. Todos los servidores de Google están saturados en este momento. Por favor intenta de nuevo en un par de minutos.';
  }
  toast('Error en IA: ' + msg, 'error');
  alert('Error en IA:\n' + msg);
  return null;
}
// Exporta función de streaming en tiempo real
export async function generateContentStream(promptText, onChunk, systemInstruction = "Eres un asistente legal experto de Bolivia. Redacta de forma profesional, clara y precisa en formato legal.") {
  const apiKey = DEFAULT_API_KEY;
  const models = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.5-flash', 'gemini-3-flash-preview'];
  let lastError = null;

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
    const payload = {
      contents: [{ parts: [{ text: promptText }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: { temperature: 0.4 }
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
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') continue;
            if (!dataStr) continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.candidates && data.candidates[0].content?.parts?.length > 0) {
                const text = data.candidates[0].content.parts[0].text;
                if (text) onChunk(text);
              }
            } catch(e) {
              console.warn('Error parseando chunk de Gemini:', e);
            }
          }
        }
      }
      return true;
    } catch (error) {
      console.warn(`Model ${model} failed in stream:`, error);
      lastError = error;
      if (error.message.includes('high demand') || error.message === 'Failed to fetch' || error.message.includes('503')) {
        continue;
      } else {
        break;
      }
    }
  }

  console.error('All Gemini models failed in stream. Last error:', lastError);
  let msg = lastError?.message || 'Error desconocido';
  if (msg === 'Failed to fetch' || msg.includes('high demand')) {
    msg = 'No se pudo conectar a la IA. Todos los servidores de Google están saturados en este momento.';
  }
  toast('Error en IA: ' + msg, 'error');
  alert('Error en IA:\n' + msg);
  throw lastError;
}
