import { GoogleGenAI } from '@google/genai';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { tema, contexto } = JSON.parse(event.body);
    if (!tema || !contexto) return { statusCode: 400, body: JSON.stringify({ error: 'Faltan datos' }) };

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const prompt = `
Actúa como un abogado experto de Bolivia. Redacta un borrador de memorial judicial basado en la siguiente solicitud y contexto.
El documento debe tener el formato formal legal boliviano. (Encabezado al juez, suma, generales de ley, petitorio, fecha).

Solicitud del usuario: ${tema}

Contexto del caso:
- Carátula/Proceso: ${contexto.caratula || 'No especificado'}
- NUREJ: ${contexto.nurej || 'No especificado'}
- Juzgado: ${contexto.juzgado || 'No especificado'}
- Cliente: ${contexto.cliente || 'No especificado'}

Devuelve únicamente el texto del memorial en formato Markdown.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draft: response.text })
    };

  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
