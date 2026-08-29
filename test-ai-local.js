import { handler } from './netlify/functions/ai-chatbot.js';

async function run() {
  process.env.GEMINI_API_KEY = ""; 
  const event = {
    httpMethod: 'POST',
    body: JSON.stringify({ messages: [{ role: 'user', parts: [{ text: "Hola" }] }] })
  };
  
  const result = await handler(event, {});
  console.log(result);
}

run();
