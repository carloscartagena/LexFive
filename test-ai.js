import { GoogleGenAI } from '@google/genai';

console.log(Object.keys(GoogleGenAI));
try {
  const ai = new GoogleGenAI({ apiKey: 'fake' });
  console.log('Instance created:', !!ai);
} catch (e) {
  console.error('Error creating instance:', e);
}
