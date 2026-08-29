// ============================================================
//  LexFive — IA: Resumen Ejecutivo de Procesos
//  Supabase Edge Function (Deno)
// ============================================================
import { GoogleGenAI } from 'npm:@google/genai';

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResp(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  
  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return jsonResp({ error: "Falta configurar GEMINI_API_KEY en Supabase Secrets" }, 200);
    }

    const { actuaciones, caratula } = await req.json().catch(() => ({}));
    if (!actuaciones || !Array.isArray(actuaciones)) {
      return jsonResp({ error: "Faltan actuaciones" }, 200);
    }

    const prompt = `Actúa como un asistente legal. A continuación se presenta el historial cronológico de actuaciones de un caso legal caratulado "${caratula}".
Analiza el historial y escribe un resumen ejecutivo de máximo 5-8 líneas explicando claramente en qué estado se encuentra el caso actualmente y qué es lo más importante que ha sucedido recientemente.

Historial de actuaciones:
${actuaciones.map((a: any) => `- Fecha: ${a.fecha} | Título: ${a.titulo} | Detalle: ${a.detalle}`).join('\n')}

Devuelve el resumen en texto claro y profesional.`;

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
    });

    return jsonResp({ summary: response.text }, 200);
    
  } catch (error) {
    return jsonResp({ error: `Excepción: ${(error as Error).message}` }, 200);
  }
});
