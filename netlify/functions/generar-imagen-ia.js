// ============================================================
//  LexFive — Serverless Function: Generación de Imágenes con IA
//  Estética editorial corporativa LexFive (azul marino profundo + dorado).
//  Soporta OpenAI / Gemini y cuenta con fallback automático 100% funcional.
// ============================================================

export async function handler(event, context) {
  // Manejo de CORS preflight
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  let body = {};
  if (event.httpMethod === 'POST') {
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      body = {};
    }
  } else if (event.queryStringParameters) {
    body = event.queryStringParameters;
  }

  const titulo = (body.titulo || 'Bufete de Abogados').trim();
  const descripcion = (body.descripcion || '').trim();
  const contexto = (body.contexto || 'Área legal corporativa de prestigio').trim();

  // Construcción del prompt fotográfico editorial corporativo sobrio LexFive
  const englishConcept = traducirConceptoLegal(titulo);
  const promptEditorial = `Professional architectural corporate editorial photography representing ${englishConcept}. Ultra high end modern law firm interior in Bolivia, prestigious executive boardroom, cinematic lighting with deep midnight navy blue tones (#0b192c) and subtle warm gold accent lighting (#d4af37), dark polished marble and dark oak wood, elegant legal symbolism subtly in bokeh, extremely sharp focus, award-winning architectural digest photography, clean composition, 8k resolution, photorealistic, no text, no letters, no watermark, no words, no signs.`;

  // 1. Intentar con OpenAI DALL-E si existe OPENAI_API_KEY en variables de entorno
  if (process.env.OPENAI_API_KEY) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      const openAiRes = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: promptEditorial,
          n: 1,
          size: '1024x1024',
          response_format: 'b64_json'
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (openAiRes.ok) {
        const json = await openAiRes.json();
        if (json.data && json.data[0] && json.data[0].b64_json) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              proveedor: 'openai-dalle3',
              dataUrl: `data:image/png;base64,${json.data[0].b64_json}`,
              prompt: promptEditorial
            })
          };
        }
      }
    } catch (e) {
      console.warn('OpenAI image generation fallback triggered:', e.message);
    }
  }

  // 2. Fallback automático 100% funcional (Pollinations server-side para evitar CORS)
  try {
    const seed = Date.now() + Math.floor(Math.random() * 10000);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptEditorial)}?width=1024&height=640&nologo=true&seed=${seed}&model=flux`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const imgRes = await fetch(pollinationsUrl, {
      headers: {
        'User-Agent': 'LexFive-ImageService/1.0',
        'Accept': 'image/jpeg,image/png,image/*;q=0.9'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!imgRes.ok) {
      throw new Error(`Pollinations HTTP ${imgRes.status}`);
    }

    const arrayBuf = await imgRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${contentType};base64,${base64}`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        proveedor: 'pollinations-flux',
        dataUrl: dataUrl,
        prompt: promptEditorial
      })
    };
  } catch (error) {
    console.error('Error generando imagen IA:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'No se pudo generar la imagen con IA',
        prompt: promptEditorial
      })
    };
  }
};

function traducirConceptoLegal(titulo) {
  const t = (titulo || '').toLowerCase();
  if (t.includes('laboral') || t.includes('trabaj')) return 'Employment and Labor Law, worker rights, corporate employment compliance';
  if (t.includes('civil') || t.includes('contrat')) return 'Civil Law, contractual agreements, property and commercial litigation';
  if (t.includes('penal') || t.includes('delit')) return 'Criminal Defense and litigation, court trial advocacy, justice scale';
  if (t.includes('familia') || t.includes('divorc')) return 'Family Law, civil family rights, inheritance and mediation';
  if (t.includes('informatic') || t.includes('tecnolog') || t.includes('ciber') || t.includes('sistem')) return 'Cyber Law, LegalTech, IT software contracts, cybersecurity and digital privacy';
  if (t.includes('miner')) return 'Mining Law, environmental regulations, natural resources concession';
  if (t.includes('agrar') || t.includes('tierr')) return 'Agrarian Law, land property rights and rural title regularization';
  if (t.includes('constitucion') || t.includes('ampar')) return 'Constitutional Law, constitutional human rights protection, high court justice';
  if (t.includes('tributar') || t.includes('fiscal') || t.includes('impuest')) return 'Tax Law, corporate fiscal defense and auditing';
  if (t.includes('inmuebl') || t.includes('inmobiliar') || t.includes('notarial')) return 'Real Estate Law, notary deeds, land registry and property development';
  return `${titulo} modern legal practice, prestigious attorneys`;
}
