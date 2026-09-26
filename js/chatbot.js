import { generateContent } from './sistema/js/ai.js';

(function() {
    'use strict';
    
    // Inyectar HTML del chatbot
    const HTML = `
        <div id="ai-chatbot-container" class="ai-chatbot-closed">
            <div class="ai-chatbot-toggle-wrapper">
                <div class="ai-chatbot-tooltip">¿Qué consulta necesitas?</div>
                <button id="ai-chatbot-toggle" aria-label="Abrir asistente">
                    <img src="assets/lex-bot.jpg" alt="Lex Bot" class="ai-chatbot-avatar" onerror="this.src='https://ui-avatars.com/api/?name=Lex&background=041230&color=fff'">
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
