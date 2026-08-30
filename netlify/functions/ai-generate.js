export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { tipoDocumento, datos } = JSON.parse(event.body);
    if (!tipoDocumento || !datos) return { statusCode: 400, body: JSON.stringify({ error: 'Faltan datos' }) };

    let prompt = '';

    if (tipoDocumento === 'certificado') {
      prompt = `
Actúa como el departamento de Recursos Humanos o Director del Bufete de Abogados LexFive (Bolivia).
Redacta el cuerpo de un certificado formal (${datos.tipo || 'certificado'}) para la siguiente persona, utilizando los siguientes datos:
- Nombre: ${datos.nombre || 'No especificado'}
- Cédula de Identidad: ${datos.ci || 'No especificada'}
- Cargo o Calidad: ${datos.cargo || 'No especificado'}
- Período: ${datos.periodo || 'No especificado'}
- Universidad: ${datos.universidad || 'No especificada'}
- Carrera: ${datos.carrera || 'No especificada'}
- Horas de práctica: ${datos.horas || 'No especificadas'}
- Dirigido a: ${datos.destinatario || 'A quien corresponda'}

Instrucciones:
1. El texto debe ser formal, elocuente y resaltar el buen desempeño, la ética, responsabilidad y conocimientos legales adquiridos.
2. No incluyas saludos iniciales ni fechas/firmas finales, SOLO el cuerpo o párrafos del certificado (es para insertarlo en el medio de la hoja membretada).
3. Devuelve únicamente el texto plano final (sin markdown, ni asteriscos). Usa saltos de línea donde corresponda.
      `;
    } else if (tipoDocumento === 'credencial') {
      prompt = `
Actúa como el equipo legal del Bufete de Abogados LexFive (Bolivia).
Redacta la "Base legal de representación" (un párrafo legal) para el reverso de la credencial institucional de un miembro del bufete, basándote en el siguiente cargo:
- Cargo del portador: ${datos.cargo || 'Miembro del bufete'}

Instrucciones:
1. El texto debe facultar al portador, de manera formal, para realizar los actos propios de su cargo ante autoridades públicas y privadas, estrados judiciales e instituciones administrativas.
2. Cita la normativa boliviana vigente aplicable (por ejemplo, Art. 8 núm. 1 de la Ley 387 del Ejercicio de la Abogacía, Arts. 84, 100, 101 del Código Procesal Civil Ley 439, u otros pertinentes según el cargo).
3. Si el cargo es "Procurador", "Estudiante" o "Pasante", la facultad es de entregar, examinar, solicitar, hacer seguimiento y recoger documentación bajo patrocinio de un abogado.
4. Si el cargo es "Abogado" o similar, la facultad incluye patrocinio y representación plena.
5. El texto debe terminar con la palabra "Certifico."
6. Devuelve únicamente el texto plano final (sin markdown, ni comillas extra).
      `;
    } else {
      return { statusCode: 400, body: JSON.stringify({ error: 'Tipo de documento no válido' }) };
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
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
      body: JSON.stringify({ text: text.trim() })
    };

  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
