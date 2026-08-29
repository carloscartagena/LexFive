import { GoogleGenAI } from '@google/genai';
async function run() {
  try {
    const ai = new GoogleGenAI({ apiKey: 'fake' });
    await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: 'hola' });
  } catch (error) {
    console.log(JSON.stringify({ error: error.message, stack: error.stack }));
  }
}
run();
