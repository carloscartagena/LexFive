import { GoogleGenAI, Type } from '@google/genai';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { texto } = JSON.parse(event.body);
    if (!texto) return { statusCode: 400, body: JSON.stringify({ error: 'Falta texto' }) };

    const prompt = `Analiza el siguiente texto de una actuación/notificación judicial y determina si establece un plazo de tiempo (ej. "3 días", "48 horas") para responder o cumplir algo.
Texto: "${texto}"`;

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hay_plazo: { type: Type.BOOLEAN, description: 'True si se menciona un plazo en días u horas.' },
            dias_estimados: { type: Type.INTEGER, description: 'Número de días del plazo. Si son horas, convertir a días (ej. 48h = 2 días). Si no hay plazo, 0.' },
            justificacion: { type: Type.STRING, description: 'Breve explicación de la extracción o "Ninguno detectado".' }
          },
          required: ['hay_plazo', 'dias_estimados', 'justificacion']
        }
      }
    });

    const result = JSON.parse(response.text);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Error en ai-extract-deadlines:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
