// ============================================================
//  LexFive — IA: Resumen Ejecutivo de Procesos
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

    const { actuaciones, caratula } = await req.json().catch(() => ({}));
    if (!actuaciones || !Array.isArray(actuaciones)) {
      return jsonResp({ error: "Faltan actuaciones" }, 400);
    }

    const prompt = `Actúa como un asistente legal. A continuación se presenta el historial cronológico de actuaciones de un caso legal caratulado "${caratula}".
Analiza el historial y escribe un resumen ejecutivo de máximo 5-8 líneas explicando claramente en qué estado se encuentra el caso actualmente y qué es lo más importante que ha sucedido recientemente.

Historial de actuaciones:
${actuaciones.map((a: any) => `- Fecha: ${a.fecha} | Título: ${a.titulo} | Detalle: ${a.detalle}`).join('\n')}

Devuelve el resumen en texto claro y profesional.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return jsonResp({ error: JSON.stringify(data) }, response.status);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return jsonResp({ summary: text });
    
  } catch (error) {
    return jsonResp({ error: (error as Error).message }, 500);
  }
});
