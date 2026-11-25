// ============================================================
//  LexFive — Serverless Function: Generación de Imágenes con IA
//  Motor de imágenes de 3 niveles:
//    Nivel 1: IA Generativa con claves (Gemini Imagen 3 / Gemini 2.0 / OpenAI DALL-E)
//    Nivel 2: Fotografía Editorial Real seleccionada por IA (Openverse / Wikimedia Commons)
//    Nivel 3: Respaldo Editorial local en Canvas en el cliente
//  CERO errores 402. Sin Pollinations a menos que exista process.env.POLLINATIONS_API_KEY.
// ============================================================

export async function handler(event, context) {
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
  const variante = Math.abs(parseInt(body.variante, 10)) || Math.floor(Math.random() * 1000);

  const englishConcept = traducirConceptoLegal(titulo);
  const promptEditorial = `Professional architectural corporate editorial photography representing ${englishConcept}. Ultra high end modern law firm interior in Bolivia, prestigious executive boardroom, cinematic lighting with deep midnight navy blue tones (#0b192c) and subtle warm gold accent lighting (#d4af37), dark polished marble and dark oak wood, elegant legal symbolism subtly in bokeh, extremely sharp focus, award-winning architectural digest photography, clean composition, 8k resolution, photorealistic, no text, no letters, no watermark, no words, no signs.`;

  // ============================================================
  // NIVEL 1 — IA Generativa con claves configuradas en process.env
  // ============================================================

  // 1.1. Gemini API (Imagen 3 / Gemini 2.0 Flash Exp)
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (geminiKey) {
    // 1.1.A. Imagen 3 REST
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const imagenRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: promptEditorial }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '16:9',
            outputMimeType: 'image/jpeg'
          }
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (imagenRes.ok) {
        const json = await imagenRes.json();
        const b64 = json.predictions?.[0]?.bytesBase64Encoded;
        if (b64) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              ok: true,
              success: true,
              proveedor: 'gemini-imagen3',
              origen: 'gemini-ia',
              dataUrl: `data:image/jpeg;base64,${b64}`,
              titulo
            })
          };
        }
      }
    } catch (e) {
      console.warn('Gemini Imagen-3 generation skipped/failed:', e.message);
    }

    // 1.1.B. Gemini 2.0 Flash Exp Multimodal
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const gemRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Generate image: ${promptEditorial}` }] }],
          generationConfig: { responseModalities: ['IMAGE', 'TEXT'] }
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (gemRes.ok) {
        const json = await gemRes.json();
        const part = json.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (part && part.inlineData?.data) {
          const mime = part.inlineData.mimeType || 'image/jpeg';
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              ok: true,
              success: true,
              proveedor: 'gemini-2.0-flash-exp',
              origen: 'gemini-ia',
              dataUrl: `data:${mime};base64,${part.inlineData.data}`,
              titulo
            })
          };
        }
      }
    } catch (e) {
      console.warn('Gemini 2.0 multimodal generation skipped/failed:', e.message);
    }
  }

  // 1.2. OpenAI DALL-E si existe OPENAI_API_KEY
  if (process.env.OPENAI_API_KEY) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
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
              ok: true,
              success: true,
              proveedor: 'openai-dalle3',
              origen: 'openai-ia',
              dataUrl: `data:image/png;base64,${json.data[0].b64_json}`,
              titulo
            })
          };
        }
      }
    } catch (e) {
      console.warn('OpenAI generation skipped/failed:', e.message);
    }
  }

  // 1.3. Pollinations: NUNCA se llama sin clave configurada en process.env.POLLINATIONS_API_KEY
  if (process.env.POLLINATIONS_API_KEY) {
    try {
      const seed = Date.now() + variante;
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptEditorial)}?width=1200&height=675&nologo=true&seed=${seed}&model=flux&key=${encodeURIComponent(process.env.POLLINATIONS_API_KEY)}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const imgRes = await fetch(pollinationsUrl, {
        headers: { 'User-Agent': 'LexFiveLegalTech/1.0' },
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (imgRes.ok) {
        const buf = Buffer.from(await imgRes.arrayBuffer());
        const mime = imgRes.headers.get('content-type') || 'image/jpeg';
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            ok: true,
            success: true,
            proveedor: 'pollinations-authenticated',
            origen: 'pollinations-ia',
            dataUrl: `data:${mime};base64,${buf.toString('base64')}`,
            titulo
          })
        };
      }
    } catch (e) {
      console.warn('Authenticated Pollinations skipped/failed:', e.message);
    }
  }

  // ============================================================
  // NIVEL 2 — Fotografía Editorial Real seleccionada por IA
  // (100% gratuita, sin API Key, cero 402)
  // ============================================================

  // 2.1. Obtener 2 consultas cortas en inglés de fotografía editorial
  let queries = await obtenerConsultasFotograficas({ titulo, descripcion, contexto, geminiKey });
  if (!queries || !queries.length) {
    queries = ['courthouse justice gavel law', 'modern law office boardroom'];
  }

  // 2.2. Intentar Openverse API (Creative Commons, alta resolución)
  for (const q of queries) {
    try {
      const openverseUrl = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&aspect_ratio=wide&page_size=12&mature=false`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const ovRes = await fetch(openverseUrl, {
        headers: {
          'User-Agent': 'LexFiveLegalTech/1.0',
          'Accept': 'application/json'
        },
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (ovRes.ok) {
        const ovJson = await ovRes.json();
        const results = (ovJson.results || []).filter(item => {
          if (!item || !item.url) return false;
          const u = item.url.toLowerCase();
          if (u.endsWith('.svg') || u.includes('.svg?')) return false;
          if (item.width && item.width < 600) return false;
          return true;
        });

        if (results.length > 0) {
          const elegido = results[variante % results.length];
          const downloadRes = await descargarImagenComoDataUrl(elegido.url);
          if (downloadRes) {
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                ok: true,
                success: true,
                proveedor: 'openverse-editorial',
                origen: 'fotografia-editorial-ia',
                dataUrl: downloadRes.dataUrl,
                credito: elegido.creator ? `Foto: ${elegido.creator} via Openverse (${elegido.license || 'CC'})` : 'Fotografía Openverse CC',
                titulo
              })
            };
          }
        }
      }
    } catch (ovErr) {
      console.warn('Openverse query failed for query:', q, ovErr.message);
    }
  }

  // 2.3. Si Openverse falla, consultar Wikimedia Commons API
  for (const q of queries) {
    try {
      const wikiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=12&gsrsearch=${encodeURIComponent(q)}+filetype:bitmap&prop=imageinfo&iiprop=url|mime|size&iiurlwidth=1200&format=json`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const wikiRes = await fetch(wikiUrl, {
        headers: {
          'User-Agent': 'LexFiveLegalTech/1.0',
          'Accept': 'application/json'
        },
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (wikiRes.ok) {
        const wikiJson = await wikiRes.json();
        const pagesObj = wikiJson.query?.pages || {};
        const pages = Object.values(pagesObj).filter(p => {
          const ii = p.imageinfo?.[0];
          if (!ii) return false;
          const mime = (ii.mime || '').toLowerCase();
          const isBitmap = mime === 'image/jpeg' || mime === 'image/png' || mime === 'image/webp';
          const isLandscape = !ii.width || !ii.height || ii.width >= ii.height;
          return isBitmap && isLandscape;
        });

        if (pages.length > 0) {
          const pageElegida = pages[variante % pages.length];
          const ii = pageElegida.imageinfo[0];
          const targetUrl = ii.thumburl || ii.url;
          const downloadRes = await descargarImagenComoDataUrl(targetUrl);
          if (downloadRes) {
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                ok: true,
                success: true,
                proveedor: 'wikimedia-editorial',
                origen: 'fotografia-editorial-ia',
                dataUrl: downloadRes.dataUrl,
                credito: `Wikimedia Commons (${pageElegida.title || 'Legal Photography'})`,
                titulo
              })
            };
          }
        }
      }
    } catch (wikiErr) {
      console.warn('Wikimedia query failed for query:', q, wikiErr.message);
    }
  }

  // ============================================================
  // NIVEL 3 — Señal para que el cliente active su Canvas Editorial HD
  // ============================================================
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      ok: false,
      success: false,
      needClientFallback: true,
      mensaje: 'Red externa no disponible. Activando Generador Editorial HD local en Canvas.',
      titulo
    })
  };
}

// Descarga segura en servidor evitando CORS del cliente
async function descargarImagenComoDataUrl(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'LexFiveLegalTech/1.0',
        'Accept': 'image/jpeg,image/png,image/webp,image/*;q=0.9'
      },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const contentType = (res.headers.get('content-type') || 'image/jpeg').split(';')[0];
    if (!contentType.startsWith('image/')) return null;

    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);

    // Validar tamaño: mínimo 10 KB, máximo 8 MB
    if (buffer.length < 10 * 1024 || buffer.length > 8 * 1024 * 1024) return null;

    const base64 = buffer.toString('base64');
    return {
      dataUrl: `data:${contentType};base64,${base64}`,
      size: buffer.length
    };
  } catch (e) {
    console.warn('Error descargando imagen externa:', e.message);
    return null;
  }
}

// Genera consultas en inglés usando IA o diccionario temático boliviano/internacional
async function obtenerConsultasFotograficas({ titulo, descripcion, contexto, geminiKey }) {
  // 1. Intento con Gemini si hay clave
  if (geminiKey) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const prompt = `Based on the legal topic "${titulo}" (${contexto || descripcion}), output strictly a JSON array with 2 short English photo search queries (2-4 words each) suitable for high quality legal/corporate/editorial photography (e.g. ["courthouse justice gavel", "modern law office"]). Return only valid JSON array.`;

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2 }
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (res.ok) {
        const json = await res.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const match = text.match(/\[[\s\S]*?\]/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map(s => String(s).replace(/[^a-zA-Z0-9\s]/g, '').trim()).filter(Boolean);
          }
        }
      }
    } catch (e) {
      console.warn('Gemini query translation skipped/failed:', e.message);
    }
  }

  // 2. Diccionario temático local de respaldo en español
  const t = (titulo + ' ' + (contexto || '') + ' ' + (descripcion || '')).toLowerCase();

  if (t.includes('laboral') || t.includes('trabaj')) {
    return ['employment labor workplace agreement', 'corporate office meeting hr'];
  }
  if (t.includes('civil') || t.includes('contrat')) {
    return ['courthouse justice gavel law', 'contract agreement document signing'];
  }
  if (t.includes('penal') || t.includes('delit') || t.includes('defensa')) {
    return ['courtroom trial justice gavel', 'criminal defense courthouse law books'];
  }
  if (t.includes('familia') || t.includes('divorc') || t.includes('menor') || t.includes('herencia')) {
    return ['family legal consultation mediation', 'civil law office agreement handshake'];
  }
  if (t.includes('sistem') || t.includes('informatic') || t.includes('ciber') || t.includes('software') || t.includes('tecnolog')) {
    return ['cybersecurity server datacenter technology', 'software engineer computer laptop tech'];
  }
  if (t.includes('tributar') || t.includes('fiscal') || t.includes('impuest') || t.includes('contab')) {
    return ['tax accounting corporate finance audit', 'financial calculations corporate desk'];
  }
  if (t.includes('administrativ') || t.includes('publico') || t.includes('gobierno')) {
    return ['government administration building architecture', 'official notary law certificate documents'];
  }
  if (t.includes('empresa') || t.includes('societar') || t.includes('corporativ') || t.includes('comercial')) {
    return ['modern corporate skyscraper boardroom', 'business executives boardroom meeting'];
  }
  if (t.includes('constitucion') || t.includes('amparo') || t.includes('derechos')) {
    return ['supreme court column architecture justice', 'constitution law book gavel scale'];
  }
  if (t.includes('inmuebl') || t.includes('inmobiliar') || t.includes('propiedad') || t.includes('notar')) {
    return ['architectural building blueprint estate', 'notary legal deed stamp signature'];
  }
  if (t.includes('miner') || t.includes('recurs')) {
    return ['mining industry landscape equipment', 'natural resources geological technology'];
  }
  if (t.includes('agrar') || t.includes('tierr') || t.includes('campo')) {
    return ['agricultural landscape farming field property', 'rural estate title deeds property'];
  }

  return ['courthouse justice scale gavel', 'modern law office boardroom'];
}

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
