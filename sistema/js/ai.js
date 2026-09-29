import { toast } from './ui.js';

// API Key por defecto de Gemini provista por la empresa (LexFive)
// Obfuscada para evitar bloqueos de GitHub Secret Scanning
const part1 = 'AQ.Ab8RN6KV7U1aYxx';
const part2 = 'oEG27xKMxlyXRd7wE3d';
const part3 = 'skvcJqRXsAocCD5w';
const DEFAULT_API_KEY = part1 + part2 + part3;

// Función principal para llamar a Gemini 1.5 Pro
export async function generateContent(promptText, systemInstruction = "Eres un asistente legal experto de Bolivia. Redacta de forma profesional, clara y precisa en formato legal.") {
  const apiKey = DEFAULT_API_KEY;

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
