const state = {
    chats: JSON.parse(localStorage.getItem('mousy_chats') || '[]'),
    currentId: null,
    settings: JSON.parse(localStorage.getItem('mousy_settings') || 'null') || {
        systemPrompt: "You are Mousy's AI, a helpful and precise assistant. Format code in markdown code blocks with the language name."
    },
    apiKey: localStorage.getItem('mousy_apikey') || '',
    sending: false
};

const el = {
    sidebar:             document.getElementById('sidebar'),
    overlay:             document.getElementById('sidebarOverlay'),
    historyList:         document.getElementById('historyList'),
    chatContainer:       document.getElementById('chatContainer'),
    chatInput:           document.getElementById('chatInput'),
    sendBtn:             document.getElementById('sendBtn'),
    modelSelect:         document.getElementById('modelSelect'),
    newChatBtn:          document.getElementById('newChatBtn'),
    openSettingsBtn:     document.getElementById('openSettingsBtn'),
    backToChat:          document.getElementById('backToChat'),
    chatView:            document.getElementById('chatView'),
    settingsView:        document.getElementById('settingsView'),
    systemPromptInput:   document.getElementById('systemPromptInput'),
    saveSystemPromptBtn: document.getElementById('saveSystemPromptBtn'),
    apiKeyInput:         document.getElementById('apiKeyInput'),
    saveApiKeyBtn:       document.getElementById('saveApiKeyBtn'),
    toggleKeyBtn:        document.getElementById('toggleKeyBtn'),
    keyBadge:            document.getElementById('keyBadge'),
    wipeMemoryBtn:       document.getElementById('wipeMemoryBtn'),
    toastContainer:      document.getElementById('toastContainer')
};

function init() {
    lucide.createIcons();
    el.systemPromptInput.value = state.settings.systemPrompt;
    el.apiKeyInput.value = state.apiKey;
    updateKeyBadge();

    if (state.chats.length > 0) {
        switchChat(state.chats[0].id);
    } else {
        createNewChat();
    }

    bindEvents();
    renderHistory();
}

function bindEvents() {
    document.getElementById('menuToggle').addEventListener('click', toggleSidebar);
    el.overlay.addEventListener('click', toggleSidebar);
    el.newChatBtn.addEventListener('click', createNewChat);
    el.sendBtn.addEventListener('click', sendMessage);

    el.chatInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    el.chatInput.addEventListener('input', () => {
        el.chatInput.style.height = 'auto';
        el.chatInput.style.height = Math.min(el.chatInput.scrollHeight, 160) + 'px';
    });

    el.openSettingsBtn.addEventListener('click', () => switchView('settings'));
    el.backToChat.addEventListener('click', () => switchView('chat'));
    el.saveApiKeyBtn.addEventListener('click', saveApiKey);
    el.saveSystemPromptBtn.addEventListener('click', saveSystemPrompt);

    el.toggleKeyBtn.addEventListener('click', () => {
        const show = el.apiKeyInput.type === 'password';
        el.apiKeyInput.type = show ? 'text' : 'password';
        el.toggleKeyBtn.innerHTML = show
            ? '<i data-lucide="eye-off"></i>'
            : '<i data-lucide="eye"></i>';
        lucide.createIcons();
    });

    el.wipeMemoryBtn.addEventListener('click', () => {
        if (confirm('Delete all chats, settings and API key?')) {
            localStorage.clear();
            location.reload();
        }
    });
}

function toggleSidebar() {
    el.sidebar.classList.toggle('open');
    el.overlay.classList.toggle('active');
}

function switchView(view) {
    const from = view === 'settings' ? el.chatView : el.settingsView;
    const to   = view === 'settings' ? el.settingsView : el.chatView;

    from.classList.add('view-leave');
    setTimeout(() => {
        from.classList.remove('active', 'view-leave');
        to.classList.add('active', 'view-enter');
        lucide.createIcons();
        setTimeout(() => to.classList.remove('view-enter'), 350);
    }, 200);

    if (window.innerWidth <= 768) {
        el.sidebar.classList.remove('open');
        el.overlay.classList.remove('active');
    }
}

function saveApiKey() {
    const raw = el.apiKeyInput.value.trim();
    if (!raw) { showToast('Enter a key first.', 'error'); return; }
    if (!raw.startsWith('sk-')) { showToast('Key must start with sk-', 'error'); return; }
    if (raw.length < 40) { showToast('Key looks too short — check it.', 'error'); return; }
    if (/\s/.test(raw)) { showToast('Key contains spaces — remove them.', 'error'); return; }

    state.apiKey = raw;
    localStorage.setItem('mousy_apikey', raw);
    updateKeyBadge();
    showToast('API key saved.', 'success');
}

function saveSystemPrompt() {
    const val = el.systemPromptInput.value.trim();
    if (!val) { showToast('Prompt cannot be empty.', 'error'); return; }
    state.settings.systemPrompt = val;
    saveSettings();
    showToast('System prompt saved.', 'success');
}

function updateKeyBadge() {
    const valid = state.apiKey && state.apiKey.startsWith('sk-') && state.apiKey.length >= 40;
    el.keyBadge.textContent = valid ? '● Active' : '● No Key';
    el.keyBadge.className = 'key-badge ' + (valid ? 'has-key' : 'no-key');
}

function createNewChat() {
    const id = Date.now().toString();
    state.chats.unshift({ id, title: 'New Chat', messages: [], model: el.modelSelect.value });
    state.currentId = id;
    saveChats();
    renderHistory();
    renderMessages();
    el.modelSelect.disabled = false;
    if (window.innerWidth <= 768) {
        el.sidebar.classList.remove('open');
        el.overlay.classList.remove('active');
    }
}

function switchChat(id) {
    state.currentId = id;
    const chat = state.chats.find(c => c.id === id);
    if (!chat) return;
    el.modelSelect.value = chat.model || 'gpt-4o';
    el.modelSelect.disabled = chat.messages.length > 0;
    renderHistory();
    renderMessages();
    if (window.innerWidth <= 768) {
        el.sidebar.classList.remove('open');
        el.overlay.classList.remove('active');
    }
}

function renderHistory() {
    el.historyList.innerHTML = '';
    state.chats.forEach((chat, i) => {
        const btn = document.createElement('button');
        btn.className = 'history-item' + (chat.id === state.currentId ? ' active' : '');
        btn.innerHTML = `<i data-lucide="message-circle"></i><span>${esc(chat.title)}</span>`;
        btn.style.animationDelay = `${i * 0.025}s`;
        btn.addEventListener('click', () => switchChat(chat.id));
        el.historyList.appendChild(btn);
    });
    lucide.createIcons();
}

function renderMessages() {
    el.chatContainer.innerHTML = '';
    const chat = state.chats.find(c => c.id === state.currentId);

    if (!chat || chat.messages.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.innerHTML = `
            <div class="empty-orb">
                <div class="orb-ring"></div>
                <div class="orb-ring orb-ring-2"></div>
                <div class="orb-core">✦</div>
            </div>
            <div class="empty-title">Mousy's AI</div>
            <div class="empty-sub">${state.apiKey ? 'Start a conversation below.' : 'Go to Settings and save your API key first.'}</div>
        `;
        el.chatContainer.appendChild(empty);
        return;
    }

    chat.messages.forEach(msg => appendMessage(msg.role, msg.content, false));
    if (window.Prism) Prism.highlightAll();
    scrollBottom();
}

function appendMessage(role, content, animate = true) {
    const wrap = document.createElement('div');
    wrap.className = 'message-wrap' + (animate ? (' ' + (role === 'user' ? 'msg-in-right' : 'msg-in')) : '');

    if (role === 'user') {
        wrap.innerHTML = `<div class="user-bubble">${esc(content)}</div>`;
    } else if (role === 'error') {
        wrap.innerHTML = `<div class="error-bubble">${esc(content)}</div>`;
    } else {
        wrap.innerHTML = `<div class="ai-label">Mousy's AI</div><div class="message-content">${parseMd(content)}</div>`;
    }

    el.chatContainer.appendChild(wrap);
    return wrap;
}

function showTyping() {
    const wrap = document.createElement('div');
    wrap.className = 'message-wrap msg-in';
    wrap.id = 'typingWrap';
    wrap.innerHTML = `
        <div class="ai-label">Mousy's AI</div>
        <div class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;
    el.chatContainer.appendChild(wrap);
    scrollBottom();
    return wrap;
}

function hideTyping() {
    const t = document.getElementById('typingWrap');
    if (t) t.remove();
}

function updateRetryNotice(wrap, attempt, delay) {
    let notice = wrap.querySelector('.retry-notice');
    if (!notice) {
        notice = document.createElement('div');
        notice.className = 'retry-notice';
        wrap.appendChild(notice);
    }
    notice.textContent = `Rate limited — retrying in ${delay}s (attempt ${attempt})…`;
}

function parseMd(text) {
    const escaped = text
        .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
            const l = lang || 'lua';
            const safe = code.trim().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            return `<div class="code-block-container"><div class="code-header"><span>${l.toUpperCase()}</span><button class="copy-btn" onclick="copyCode(this)">Copy</button></div><pre><code class="language-${l}">${safe}</code></pre></div>`;
        })
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code style="background:#181818;padding:1px 6px;border-radius:5px;font-family:JetBrains Mono,monospace;font-size:0.83em">$1</code>')
        .replace(/\n\n+/g, '</p><p>')
        .replace(/\n/g, '<br>');
    return `<p>${escaped}</p>`;
}

function esc(str) {
    return String(str)
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;');
}

async function callResponsesAPI(inputMessages, model, retryWrap = null) {
    const MAX_RETRIES = 3;
    let attempt = 0;
    let delay = 8;

    while (true) {
        const res = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${state.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                instructions: state.settings.systemPrompt,
                input: inputMessages,
                store: false
            })
        });

        if (res.status === 429) {
            attempt++;
            if (attempt > MAX_RETRIES) {
                const data = await res.json().catch(() => ({}));
                const isQuota = data?.error?.code === 'insufficient_quota';
                throw {
                    status: 429,
                    quota: isQuota,
                    message: isQuota
                        ? 'Quota exceeded — check your OpenAI billing.'
                        : `Rate limit hit after ${MAX_RETRIES} retries. Wait a moment then try again.`
                };
            }

            if (retryWrap) updateRetryNotice(retryWrap, attempt, delay);

            await new Promise(r => setTimeout(r, delay * 1000));
            delay = Math.min(delay * 2, 60);
            continue;
        }

        const data = await res.json();

        if (!res.ok) {
            const code = res.status;
            let msg = data?.error?.message || 'Unknown error.';
            if (code === 401) msg = 'Invalid API key — check Settings.';
            else if (code === 403) msg = 'Access denied — check your OpenAI account.';
            else if (code === 400) msg = `Bad request: ${msg}`;
            else if (code === 404) msg = 'Model not found — try a different model.';
            else if (code >= 500)  msg = 'OpenAI server error — try again shortly.';
            throw { status: code, message: msg };
        }

        const outputItem = data?.output?.find(o => o.type === 'message');
        const textContent = outputItem?.content?.find(c => c.type === 'output_text');
        if (!textContent?.text) throw { status: 0, message: 'Empty response from API. Try again.' };

        return textContent.text;
    }
}

async function sendMessage() {
    if (state.sending) return;

    const text = el.chatInput.value.trim();
    if (!text) { showToast('Type a message first.', 'error'); return; }

    if (!state.apiKey) { showToast('No API key — go to Settings and save one.', 'error'); return; }
    if (!state.apiKey.startsWith('sk-')) { showToast('Invalid API key — check Settings.', 'error'); return; }
    if (state.apiKey.length < 40) { showToast('API key looks wrong — check Settings.', 'error'); return; }

    const chat = state.chats.find(c => c.id === state.currentId);
    if (!chat) return;

    if (chat.messages.length === 0) {
        chat.title = text.length > 30 ? text.substring(0, 30) + '…' : text;
        chat.model = el.modelSelect.value;
        el.modelSelect.disabled = true;
        renderHistory();
    }

    chat.messages.push({ role: 'user', content: text });
    el.chatInput.value = '';
    el.chatInput.style.height = 'auto';

    const existingEmpty = el.chatContainer.querySelector('.empty-state');
    if (existingEmpty) existingEmpty.remove();

    appendMessage('user', text, true);
    const typingWrap = showTyping();

    state.sending = true;
    el.sendBtn.disabled = true;

    try {
        const inputMessages = chat.messages.map(m => ({ role: m.role, content: m.content }));
        const aiText = await callResponsesAPI(inputMessages, chat.model, typingWrap);

        hideTyping();
        chat.messages.push({ role: 'assistant', content: aiText });
        appendMessage('assistant', aiText, true);
        if (window.Prism) Prism.highlightAll();
        saveChats();
        scrollBottom();

    } catch (err) {
        hideTyping();
        chat.messages.pop();
        appendMessage('error', err.message || 'Something went wrong.', true);
        saveChats();
    } finally {
        state.sending = false;
        el.sendBtn.disabled = false;
    }
}

function copyCode(btn) {
    const code = btn.closest('.code-block-container').querySelector('code').innerText;
    navigator.clipboard.writeText(code).then(() => {
        btn.textContent = 'Copied';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
    });
}

function scrollBottom() {
    requestAnimationFrame(() => {
        el.chatContainer.scrollTo({ top: el.chatContainer.scrollHeight, behavior: 'smooth' });
    });
}

function showToast(msg, type = 'default') {
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    el.toastContainer.appendChild(t);
    setTimeout(() => {
        t.classList.add('toast-out');
        setTimeout(() => t.remove(), 240);
    }, 2800);
}

function saveChats()    { localStorage.setItem('mousy_chats', JSON.stringify(state.chats)); }
function saveSettings() { localStorage.setItem('mousy_settings', JSON.stringify(state.settings)); }

init();
