import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

// Inicializar Supabase (se necesita la Service Role Key para saltar RLS en el backend)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Inicializar SDK de Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Variables de WhatsApp
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'lexfive_seguro_2026';

const SYSTEM_INSTRUCTION = `Eres el asistente virtual por WhatsApp del bufete de abogados LexFive en El Alto, Bolivia. 
Tu objetivo es responder dudas legales básicas de manera muy amable y profesional.
PRINCIPAL OBJETIVO: Debes tratar de captar los datos del cliente potencial (nombre, teléfono y su consulta) para que los abogados lo contacten. 
Si el usuario te proporciona sus datos y quiere una consulta, utiliza la herramienta 'guardar_consulta' para registrar sus datos en el sistema de LexFive.
No des asesoría legal definitiva, siempre recomienda hablar con un abogado de LexFive.
Recuerda que estás hablando por WhatsApp, así que sé conciso, usa emojis ocasionalmente, y mantén un tono conversacional.`;

const guardarConsultaTool = {
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
};

export const handler = async (event, context) => {
  // 1. VERIFICACIÓN DEL WEBHOOK (WhatsApp enviará un GET cuando configures el webhook en Meta)
  if (event.httpMethod === 'GET') {
    const queryParams = event.queryStringParameters;
    if (queryParams) {
      const mode = queryParams['hub.mode'];
      const token = queryParams['hub.verify_token'];
      const challenge = queryParams['hub.challenge'];
      
      if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
        return { statusCode: 200, body: challenge };
      }
      return { statusCode: 403, body: 'Forbidden' };
    }
    return { statusCode: 200, body: 'Webhook is running' };
  }

  // 2. RECEPCIÓN DE MENSAJES (WhatsApp envía un POST cuando alguien escribe)
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body);

      // Verificar que es un evento de WhatsApp
      if (body.object !== 'whatsapp_business_account') {
        return { statusCode: 404, body: 'Not Found' };
      }

      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;

      // Si no hay mensajes (ej. recibos de lectura), devolvemos 200 OK para que WhatsApp no reintente
      if (!messages || messages.length === 0) {
        return { statusCode: 200, body: 'EVENT_RECEIVED' };
      }

      const message = messages[0];
      const phoneNumberId = value.metadata.phone_number_id;
      const from = message.from; // Número de teléfono del cliente
      const msgBody = message.text?.body;

      if (!msgBody) {
        return { statusCode: 200, body: 'EVENT_RECEIVED' }; // Ignorar imágenes/audios por ahora
      }

      // a) Recuperar historial de sesión
      let { data: session } = await supabase
        .from('whatsapp_sessions')
        .select('*')
        .eq('phone_number', from)
        .single();

      let chatHistory = [];
      if (session && session.history) {
        chatHistory = session.history;
      }

      // b) Añadir mensaje actual al historial
      chatHistory.push({ role: 'user', parts: [{ text: msgBody }] });

      // Si el historial es muy largo, nos quedamos con los últimos 20 mensajes para no saturar tokens
      if (chatHistory.length > 20) {
        chatHistory = chatHistory.slice(chatHistory.length - 20);
      }

      // c) Llamar a Gemini
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: chatHistory,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: [guardarConsultaTool] }]
        }
      });

      let aiResponseText = response.text || '';
      let functionCallArgs = null;

      // Verificar si llamó a la herramienta
      if (response.functionCalls && response.functionCalls.length > 0) {
        const funcCall = response.functionCalls[0];
        if (funcCall.name === 'guardar_consulta') {
          functionCallArgs = funcCall.args;
          
          // d) Guardar la consulta real en Supabase
          const { error: dbError } = await supabase
            .from('consultas')
            .insert({
              nombre: functionCallArgs.nombre,
              email: 'whatsapp@lexfive.app', // placeholder
              telefono: from, // Usar el número real de WhatsApp
              mensaje: functionCallArgs.mensaje,
              estado: 'pendiente'
            });
            
          if (dbError) {
            console.error('Error insertando consulta:', dbError);
          } else {
            aiResponseText = "¡Perfecto! Ya he registrado tus datos y tu consulta en el sistema de LexFive. Un abogado del bufete se comunicará contigo pronto. ¿Hay algo más en lo que pueda ayudarte mientras tanto?";
          }
        }
      }

      // e) Actualizar historial con la respuesta del bot
      chatHistory.push({ role: 'model', parts: [{ text: aiResponseText }] });
      
      if (session) {
        await supabase
          .from('whatsapp_sessions')
          .update({ history: chatHistory, updated_at: new Date().toISOString() })
          .eq('id', session.id);
      } else {
        await supabase
          .from('whatsapp_sessions')
          .insert({ phone_number: from, history: chatHistory });
      }

      // f) Enviar respuesta a WhatsApp Cloud API
      if (WHATSAPP_TOKEN && WHATSAPP_PHONE_ID) {
        await fetch(`https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: from,
            type: 'text',
            text: { body: aiResponseText }
          })
        });
      } else {
        console.warn('Faltan WHATSAPP_TOKEN o WHATSAPP_PHONE_ID, no se pudo enviar el mensaje. Respuesta AI:', aiResponseText);
      }

      // Meta requiere un 200 OK rápido
      return { statusCode: 200, body: 'EVENT_RECEIVED' };

    } catch (error) {
      console.error('Error procesando webhook de WhatsApp:', error);
      return { statusCode: 500, body: 'Error procesando solicitud' };
    }
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};
