import { GoogleGenAI } from '@google/genai';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { query, texto } = JSON.parse(event.body);
    
    if (!texto && !query) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Falta proporcionar texto o consulta.' }) };
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const prompt = `Actúa como un abogado experto analista de jurisprudencia.
Te han proporcionado el siguiente texto legal o extracto de sentencia:
"${texto || '(No se proporcionó texto explícito)'}"

Y la instrucción específica del abogado es:
"${query || 'Analiza este texto, resume los puntos jurídicos más importantes, identifica la ratio decidendi (razón de la decisión) y explica en qué casos futuros aplicaría esta jurisprudencia.'}"

Por favor, realiza un análisis profundo, estructurado y claro basado estrictamente en el texto proporcionado (y tu conocimiento general del derecho si se pide contexto). 
Usa formato Markdown (títulos, negritas, viñetas) para hacer tu respuesta fácil de leer.`;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result: response.text })
    };

  } catch (error) {
    console.error('Error in ai-jurisprudencia:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
