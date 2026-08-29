// ============================================================
//  LexFive — IA: Extracción de Plazos
//  Supabase Edge Function (Deno)
// ============================================================

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
      return jsonResp({ error: "Falta configurar GEMINI_API_KEY en Supabase Secrets" }, 500);
    }

    const { texto } = await req.json().catch(() => ({}));
    if (!texto) {
      return jsonResp({ error: "Falta texto" }, 400);
    }

    const prompt = `Analiza el siguiente texto de una actuación/notificación judicial y determina si establece un plazo de tiempo (ej. "3 días", "48 horas") para responder o cumplir algo.
Texto: "${texto}"`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
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
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return jsonResp({ error: JSON.stringify(data) }, response.status);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    
    return jsonResp({ plazos: JSON.parse(text) });
    
  } catch (error) {
    return jsonResp({ error: (error as Error).message }, 500);
  }
});
