// ============================================================
//  LexFive — IA: Extracción de Plazos
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

    const { texto } = await req.json().catch(() => ({}));
    if (!texto) {
      return jsonResp({ error: "Falta texto" }, 200);
    }

    const prompt = `Analiza el siguiente texto de una actuación/notificación judicial y determina si establece un plazo de tiempo (ej. "3 días", "48 horas") para responder o cumplir algo.
Texto: "${texto}"`;

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            hay_plazo: { type: "BOOLEAN", description: "True si se menciona un plazo en días u horas." },
            dias_estimados: { type: "INTEGER", description: "Número de días del plazo. Si son horas, convertir a días (ej. 48h = 2 días). Si no hay plazo, 0." },
            justificacion: { type: "STRING", description: 'Breve explicación de la extracción o "Ninguno detectado".' }
          },
          required: ["hay_plazo", "dias_estimados", "justificacion"]
        }
      }
    });

    return jsonResp({ plazos: JSON.parse(response.text || "{}") }, 200);
    
  } catch (error) {
    return jsonResp({ error: `Excepción: ${(error as Error).message}` }, 200);
  }
});
