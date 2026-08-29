(function() {
    'use strict';
    
    // Inyectar HTML del chatbot
    const HTML = `
        <div id="ai-chatbot-container" class="ai-chatbot-closed">
            <button id="ai-chatbot-toggle" aria-label="Abrir asistente">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M12 2C6.48 2 2 5.92 2 10.75c0 2.76 1.5 5.22 3.82 6.78l-1.3 3.63a1 1 0 0 0 1.25 1.25l4.23-1.18A11.3 11.3 0 0 0 12 19.5c5.52 0 10-3.92 10-8.75S17.52 2 12 2zm0 15.5c-1.3 0-2.55-.22-3.7-.62a1 1 0 0 0-.74.05l-2.42.67.75-2.07a1 1 0 0 0-.17-.96 7 7 0 0 1-1.72-4.82c0-3.73 3.58-6.75 8-6.75s8 3.02 8 6.75-3.58 6.75-8 6.75z"/></svg>
            </button>
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

    let chatHistory = [];

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
        chatHistory.push({ role: 'user', parts: [{ text }] });
        input.value = '';
        input.disabled = true;

        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'ai-msg ai-msg-bot ai-msg-loading';
        loadingDiv.textContent = 'Escribiendo...';
        messagesEl.appendChild(loadingDiv);
        messagesEl.scrollTop = messagesEl.scrollHeight;

        try {
            const res = await fetch('/.netlify/functions/ai-chatbot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: chatHistory })
            });

            let errorMsg = 'Lo siento, ocurrió un error de conexión. Por favor escríbenos al WhatsApp directo.';
            if (!res.ok) {
                const rawText = await res.text();
                throw new Error('Error ' + res.status + ': ' + rawText);
            }
            
            const data = JSON.parse(await res.text());
            messagesEl.removeChild(loadingDiv);

            if (data.functionCall) {
                // Ejecutar la función en el cliente usando el SDK de Supabase que ya tiene el sitio
                if (window.LexFive && window.LexFive.guardarConsulta) {
                    await window.LexFive.guardarConsulta(data.functionCall.args);
                }
            }

            appendMessage('model', data.text);
            chatHistory.push({ role: 'model', parts: [{ text: data.text }] });
            
        } catch (error) {
            messagesEl.removeChild(loadingDiv);
            appendMessage('model', error.message || 'Lo siento, ocurrió un error de conexión. Por favor escríbenos al WhatsApp directo.');
        } finally {
            input.disabled = false;
            input.focus();
        }
    });

})();
