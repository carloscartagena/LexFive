import { GoogleGenAI } from '@google/genai';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { documentBase64, mimeType, analysisType } = JSON.parse(event.body);
    
    if (!documentBase64 || !mimeType) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Falta el documento' }) };
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    let prompt = '';
    if (analysisType === 'riesgos') {
      prompt = `Actúa como un abogado senior experto. Analiza el siguiente documento legal adjunto. 
Extrae los puntos clave, identifica posibles riesgos legales, cláusulas abusivas, obligaciones ocultas, o plazos críticos.
Responde de manera estructurada con viñetas, usando lenguaje claro y profesional.`;
    } else if (analysisType === 'resumen') {
      prompt = `Actúa como un asistente legal. Lee el documento legal adjunto y proporciona un resumen ejecutivo claro y conciso de su contenido y propósito.`;
    } else {
      prompt = `Analiza detalladamente este documento legal.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-pro',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: documentBase64.split(',')[1] || documentBase64, // Handle if data:mime;base64, is prepended
                mimeType: mimeType
              }
            }
          ]
        }
      ]
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysis: response.text })
    };

  } catch (error) {
    console.error('Error analyzing document:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
