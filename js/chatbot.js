import { generateContent } from '../sistema/js/ai.js';

(function() {
    'use strict';
    
    // Inyectar HTML del chatbot
    const HTML = `
        <div id="ai-chatbot-container" class="ai-chatbot-closed">
            <div class="ai-chatbot-toggle-wrapper">
                <div class="ai-chatbot-tooltip">¿Qué consulta necesitas?</div>
                <button id="ai-chatbot-toggle" aria-label="Abrir asistente">
                    <svg viewBox="0 0 64 64" class="ai-chatbot-avatar" role="img" aria-label="Asistente LexFive">
                        <defs>
                            <radialGradient id="lexBotBg" cx="35%" cy="35%" r="65%">
                                <stop offset="0%" stop-color="#152b47"/>
                                <stop offset="60%" stop-color="#0a1829"/>
                                <stop offset="100%" stop-color="#040b15"/>
                            </radialGradient>
                            <linearGradient id="lexBotGold" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stop-color="#f5e1a4"/>
                                <stop offset="50%" stop-color="#d4af37"/>
                                <stop offset="100%" stop-color="#aa8222"/>
                            </linearGradient>
                            <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
                                <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#d4af37" flood-opacity="0.35"/>
                            </filter>
                        </defs>
                        <circle cx="32" cy="32" r="31" fill="url(#lexBotBg)" stroke="url(#lexBotGold)" stroke-width="2"/>
                        <circle cx="32" cy="32" r="27.5" fill="none" stroke="url(#lexBotGold)" stroke-width="0.75" stroke-dasharray="2 3" opacity="0.6"/>
                        <g fill="none" stroke="url(#lexBotGold)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" filter="url(#goldGlow)">
                            <path d="M32 16 v26"/>
                            <path d="M19 22 h26"/>
                            <path d="M19 22 l-4 9"/>
                            <path d="M19 22 l4 9"/>
                            <path d="M13.5 31 q5.5 5 11 0"/>
                            <path d="M45 22 l-4 9"/>
                            <path d="M45 22 l4 9"/>
                            <path d="M39.5 31 q5.5 5 11 0"/>
                            <path d="M26 42 h12"/>
                            <path d="M23 45 h18"/>
                        </g>
                        <circle cx="32" cy="14" r="2.2" fill="url(#lexBotGold)"/>
                        <circle cx="19" cy="22" r="1.4" fill="url(#lexBotGold)"/>
                        <circle cx="45" cy="22" r="1.4" fill="url(#lexBotGold)"/>
                        <circle cx="32" cy="22" r="1.6" fill="url(#lexBotGold)"/>
                        <circle cx="21" cy="15" r="1" fill="#f5e1a4" opacity="0.8"/>
                        <circle cx="43" cy="15" r="1" fill="#f5e1a4" opacity="0.8"/>
                    </svg>
                </button>
            </div>
            <div id="ai-chatbot-window">
                <div id="ai-chatbot-header">
                    <h4>Asistente LexFive</h4>
                    <button id="ai-chatbot-close" aria-label="Cerrar">&times;</button>
                </div>
                <div id="ai-chatbot-messages">
                    <div class="ai-msg ai-msg-bot">¡Hola! Soy el asistente virtual de LexFive. ¿En qué puedo ayudarte hoy?</div>
                </div>
                <form id="ai-chatbot-form">
                    <input type="text" id="ai-chatbot-input" placeholder="Escribe tu consulta..." required autocomplete="off">
                    <button type="submit" aria-label="Enviar">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
                    </button>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', HTML);

    const toggle = document.getElementById('ai-chatbot-toggle');
    const close = document.getElementById('ai-chatbot-close');
    const container = document.getElementById('ai-chatbot-container');
    const form = document.getElementById('ai-chatbot-form');
    const input = document.getElementById('ai-chatbot-input');
    const messagesEl = document.getElementById('ai-chatbot-messages');

    // Mantenemos el contexto de la conversacion para Gemini
    let chatHistory = "Eres el asistente legal virtual del bufete LexFive. Responde de forma amable, profesional y concisa. Invita siempre al usuario a contactar por WhatsApp o dejar sus datos si el tema es complejo. Usa formato texto simple.\n\n";

    toggle.addEventListener('click', () => {
        container.classList.remove('ai-chatbot-closed');
        container.classList.add('ai-chatbot-open');
        input.focus();
    });

    close.addEventListener('click', () => {
        container.classList.add('ai-chatbot-closed');
        container.classList.remove('ai-chatbot-open');
    });

    function appendMessage(role, text) {
        const div = document.createElement('div');
        div.className = 'ai-msg ai-msg-' + (role === 'user' ? 'user' : 'bot');
        div.textContent = text;
        messagesEl.appendChild(div);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;

        appendMessage('user', text);
        chatHistory += `Usuario: ${text}\nAsistente: `;
        input.value = '';
        input.disabled = true;

        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'ai-msg ai-msg-bot ai-msg-loading';
        loadingDiv.textContent = 'Escribiendo...';
        messagesEl.appendChild(loadingDiv);
        messagesEl.scrollTop = messagesEl.scrollHeight;

        try {
            // Usamos nuestra nueva integración local con Gemini
            const aiResponseText = await generateContent(chatHistory);
            
            messagesEl.removeChild(loadingDiv);
            appendMessage('model', aiResponseText);
            chatHistory += `${aiResponseText}\n\n`;
            
        } catch (error) {
            messagesEl.removeChild(loadingDiv);
            appendMessage('model', 'Lo siento, ocurrió un error de conexión con la IA. Por favor escríbenos al WhatsApp directo o intenta más tarde.');
            console.error(error);
        } finally {
            input.disabled = false;
            input.focus();
        }
    });

})();
