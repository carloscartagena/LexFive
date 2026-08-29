export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { actuaciones, caratula } = JSON.parse(event.body);
    if (!actuaciones || !Array.isArray(actuaciones)) return { statusCode: 400, body: JSON.stringify({ error: 'Faltan actuaciones' }) };

    const prompt = `
Actúa como un asistente legal. A continuación se presenta el historial cronológico de actuaciones de un caso legal caratulado "${caratula}".
Analiza el historial y escribe un resumen ejecutivo de máximo 5-8 líneas explicando claramente en qué estado se encuentra el caso actualmente y qué es lo más importante que ha sucedido recientemente.

Historial de actuaciones:
${actuaciones.map(a => `- Fecha: ${a.fecha} | Título: ${a.titulo} | Detalle: ${a.detalle}`).join('\n')}

Devuelve el resumen en texto claro y profesional.
    `;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return { statusCode: response.status, body: JSON.stringify({ error: JSON.stringify(data) }) };
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary: text })
    };

  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
