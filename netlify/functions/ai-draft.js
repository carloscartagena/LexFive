export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { tema, contexto, images } = JSON.parse(event.body);
    if (!tema || !contexto) return { statusCode: 400, body: JSON.stringify({ error: 'Faltan datos' }) };

    const prompt = `
Actúa como un abogado experto de Bolivia. Redacta un borrador de memorial judicial o contrato basado en la siguiente solicitud, contexto y, si se proporcionan, las imágenes adjuntas (como documentos de identidad, folios reales, etc.).
El documento debe tener el formato formal legal boliviano. Extrae los datos relevantes de las imágenes proporcionadas (ej. CI, nombres, matrícula) e inclúyelos en el documento.

Solicitud del usuario: ${tema}

Contexto del caso:
- Carátula/Proceso: ${contexto.caratula || 'No especificado'}
- NUREJ: ${contexto.nurej || 'No especificado'}
- Juzgado: ${contexto.juzgado || 'No especificado'}
- Cliente: ${contexto.cliente || 'No especificado'}

Devuelve únicamente el texto del documento en formato Markdown.
    `;

    const parts = [{ text: prompt }];
    
    // Add images if any
    if (images && images.length > 0) {
      images.forEach(img => {
        parts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: img.data
          }
        });
      });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: parts }]
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
      body: JSON.stringify({ draft: text })
    };

  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
