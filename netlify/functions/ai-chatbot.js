import { GoogleGenAI } from '@google/genai';

export const handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { messages } = JSON.parse(event.body);
    if (!messages || !Array.isArray(messages)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid messages array' }) };
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // The SDK requires messages to be formatted for chat
    const chat = ai.chats.create({
      model: 'gemini-1.5-flash',
      config: {
        systemInstruction: "Eres el asistente virtual del bufete de abogados LexFive en El Alto, Bolivia. Tu objetivo es responder dudas legales básicas amablemente, pero principalmente debes tratar de captar los datos del cliente potencial (nombre, teléfono y su consulta) para que los abogados lo contacten. Si el usuario te proporciona sus datos y quiere una consulta, utiliza la herramienta guardar_consulta para registrar sus datos. No des asesoría legal definitiva, siempre recomienda hablar con un abogado de LexFive.",
        tools: [{
          functionDeclarations: [{
            name: 'guardar_consulta',
            description: 'Guarda los datos de un cliente potencial en la base de datos de consultas de LexFive.',
            parameters: {
              type: 'OBJECT',
              properties: {
                nombre: { type: 'STRING', description: 'Nombre completo del cliente.' },
                telefono: { type: 'STRING', description: 'Número de teléfono o WhatsApp.' },
                mensaje: { type: 'STRING', description: 'Resumen del problema legal.' },
                area: { type: 'STRING', description: 'Área legal (ej. Laboral, Civil, Penal, Familia)' }
              },
              required: ['nombre', 'telefono', 'mensaje']
            }
          }]
        }]
      }
    });

    // We replay the history to the chat except the last one, which we send as the new message
    // Actually the `@google/genai` chat needs to be initialized with history.
    const history = messages.slice(0, -1).map(m => ({
      role: m.role,
      parts: [{ text: m.parts[0].text }]
    }));
    
    // Create chat with history
    const chatWithHistory = ai.chats.create({
      model: 'gemini-1.5-flash',
      config: {
        systemInstruction: "Eres el asistente virtual del bufete de abogados LexFive en El Alto, Bolivia. Tu objetivo es responder dudas legales básicas amablemente, pero principalmente debes tratar de captar los datos del cliente potencial (nombre, teléfono y su consulta) para que los abogados lo contacten. Si el usuario te proporciona sus datos y quiere una consulta, utiliza la herramienta guardar_consulta para registrar sus datos. No des asesoría legal definitiva, siempre recomienda hablar con un abogado de LexFive.",
        tools: [{
          functionDeclarations: [{
            name: 'guardar_consulta',
            description: 'Guarda los datos de un cliente potencial en la base de datos de consultas de LexFive.',
            parameters: {
              type: 'OBJECT',
              properties: {
                nombre: { type: 'STRING', description: 'Nombre completo del cliente.' },
                telefono: { type: 'STRING', description: 'Número de teléfono o WhatsApp.' },
                mensaje: { type: 'STRING', description: 'Resumen del problema legal.' },
                area: { type: 'STRING', description: 'Área legal (ej. Laboral, Civil, Penal, Familia)' }
              },
              required: ['nombre', 'telefono', 'mensaje']
            }
          }]
        }]
      },
      history: history
    });

    const lastMessage = messages[messages.length - 1].parts[0].text;
    const response = await chatWithHistory.sendMessage({ message: lastMessage });

    let aiText = response.text || '';
    let functionCall = null;
    
    // Check if the response includes a function call
    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      if (call.name === 'guardar_consulta') {
        functionCall = {
          name: call.name,
          args: call.args
        };
        aiText = "¡Gracias! He registrado tus datos y tu consulta. Un abogado de LexFive se pondrá en contacto contigo muy pronto.";
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: aiText,
        functionCall: functionCall
      })
    };

  } catch (error) {
    console.error('Error en ai-chatbot:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

