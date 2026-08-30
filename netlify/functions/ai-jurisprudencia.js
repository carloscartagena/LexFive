import { GoogleGenAI } from '@google/genai';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { query, pais } = JSON.parse(event.body);
    
    if (!query) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Falta la consulta' }) };
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const prompt = `Actúa como un investigador legal experto en la jurisdicción de ${pais || 'tu país'}.
El abogado te hace la siguiente consulta jurídica:
"${query}"

Por favor, utiliza tu herramienta de búsqueda en Internet para buscar información RECIENTE y JURISPRUDENCIA OFICIAL exclusivamente en estos dos sitios web:
1. site:jurisprudencia.tsj.bo
2. site:buscador.tcpbolivia.bo

Proporciona:
1. Una respuesta legal fundamentada y estructurada basada en lo que encontraste en esos portales.
2. Referencias a leyes, códigos o artículos que apliquen.
3. Principios jurisprudenciales o doctrina relevante (con número de sentencia si lo encuentras en los sitios).
Asegúrate de indicar claramente que esta es una sugerencia basada en IA y debe ser verificada con las fuentes oficiales.`;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-pro',
      contents: prompt,
      tools: [{ googleSearch: {} }]
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
