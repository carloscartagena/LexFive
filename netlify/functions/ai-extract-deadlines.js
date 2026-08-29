export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { texto } = JSON.parse(event.body);
    if (!texto) return { statusCode: 400, body: JSON.stringify({ error: 'Falta texto' }) };

    const prompt = `Analiza el siguiente texto de una actuación/notificación judicial y determina si establece un plazo de tiempo (ej. "3 días", "48 horas") para responder o cumplir algo.
Texto: "${texto}"`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              hay_plazo: { type: 'BOOLEAN', description: 'True si se menciona un plazo en días u horas.' },
              dias_estimados: { type: 'INTEGER', description: 'Número de días del plazo. Si son horas, convertir a días (ej. 48h = 2 días). Si no hay plazo, 0.' },
              justificacion: { type: 'STRING', description: 'Breve explicación de la extracción o "Ninguno detectado".' }
            },
            required: ['hay_plazo', 'dias_estimados', 'justificacion']
          }
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return { statusCode: response.status, body: JSON.stringify({ error: JSON.stringify(data) }) };
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plazos: JSON.parse(text) })
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
