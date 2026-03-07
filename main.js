const GEMINI_MODELS = new Set([
    'gemini-3.1-pro-preview',
    'gemini-3-flash-preview',
    'gemini-3.1-flash-lite-preview',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite'
]);

const IMAGE_GEN_MODELS = new Set([
    'gemini-3-pro-image-preview',
    'gemini-3.1-flash-image-preview',
    'gemini-2.5-flash-image'
]);

const GEMINI3_MODELS = new Set([
    'gemini-3.1-pro-preview',
    'gemini-3-flash-preview',
    'gemini-3.1-flash-lite-preview'
]);

const GEMINI25_THINKING = new Set([
    'gemini-2.5-pro',
    'gemini-2.5-flash'
]);

const DEFAULT_MODEL = 'gemini-3-flash-preview';
const GEMINI_BASE   = 'https://generativelanguage.googleapis.com/v1beta/models';
const OR_BASE       = 'https://openrouter.ai/api/v1/chat/completions';

const state = {
    chats:      JSON.parse(localStorage.getItem('mousy_chats') || '[]'),
    currentId:  null,
    settings:   JSON.parse(localStorage.getItem('mousy_settings') || 'null') || {
        systemPrompt: "You are Mousy's AI, a helpful and precise assistant. Format code in markdown code blocks with the language name.",
        textEffect: 'fade-in',
        fontSize:   'md',
        theme:      'dark'
    },
    geminiKey:    localStorage.getItem('mousy_gemini_key') || '',
    orKey:        localStorage.getItem('mousy_or_key') || '',
    sending:      false,
    pendingImages: [],
    searchQuery:  ''
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
    geminiKeyInput:      document.getElementById('geminiKeyInput'),
    saveGeminiKeyBtn:    document.getElementById('saveGeminiKeyBtn'),
    toggleGeminiKeyBtn:  document.getElementById('toggleGeminiKeyBtn'),
    geminiKeyBadge:      document.getElementById('geminiKeyBadge'),
    orKeyInput:          document.getElementById('orKeyInput'),
    saveOrKeyBtn:        document.getElementById('saveOrKeyBtn'),
    toggleOrKeyBtn:      document.getElementById('toggleOrKeyBtn'),
    orKeyBadge:          document.getElementById('orKeyBadge'),
    wipeMemoryBtn:       document.getElementById('wipeMemoryBtn'),
    toastContainer:      document.getElementById('toastContainer'),
    imageInput:          document.getElementById('imageInput'),
    attachBtn:           document.getElementById('attachBtn'),
    imagePreviewBar:     document.getElementById('imagePreviewBar'),
    themeToggle:         document.getElementById('themeToggle'),
    themeLabel:          document.getElementById('themeLabel'),
    chatSearch:          document.getElementById('chatSearch'),
    searchClear:         document.getElementById('searchClear'),
    effectPills:         document.getElementById('effectPills'),
    sizePills:           document.getElementById('sizePills'),
    chatModal:           document.getElementById('chatModal'),
    modalTitle:          document.getElementById('modalTitle'),
    modalInput:          document.getElementById('modalInput'),
    modalCancel:         document.getElementById('modalCancel'),
    modalConfirm:        document.getElementById('modalConfirm')
};

function init() {
    lucide.createIcons();

    el.systemPromptInput.value = state.settings.systemPrompt;
    el.geminiKeyInput.value    = state.geminiKey;
    el.orKeyInput.value        = state.orKey;

    updateKeyBadge();
    updateOrKeyBadge();

    applyTheme(state.settings.theme || 'dark', false);
    applyFontSize(state.settings.fontSize || 'md');
    syncPills(el.effectPills, state.settings.textEffect || 'fade-in');
    syncPills(el.sizePills, state.settings.fontSize || 'md');

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
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    el.chatInput.addEventListener('input', () => {
        el.chatInput.style.height = 'auto';
        el.chatInput.style.height = Math.min(el.chatInput.scrollHeight, 160) + 'px';
    });
    el.chatInput.addEventListener('paste', e => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) addPendingImage(file);
            }
        }
    });

    el.openSettingsBtn.addEventListener('click', () => switchView('settings'));
    el.backToChat.addEventListener('click', () => {
        switchView('chat');
        if (state.currentId) renderMessages();
    });

    el.saveGeminiKeyBtn.addEventListener('click', saveGeminiKey);
    el.saveOrKeyBtn.addEventListener('click', saveOrKey);
    el.saveSystemPromptBtn.addEventListener('click', saveSystemPrompt);

    el.toggleGeminiKeyBtn.addEventListener('click', () => togglePwField(el.geminiKeyInput, el.toggleGeminiKeyBtn));
    el.toggleOrKeyBtn.addEventListener('click',     () => togglePwField(el.orKeyInput, el.toggleOrKeyBtn));

    el.imageInput.addEventListener('change', () => {
        Array.from(el.imageInput.files).forEach(addPendingImage);
        el.imageInput.value = '';
    });

    el.wipeMemoryBtn.addEventListener('click', () => {
        if (confirm('Delete all chats, settings and API keys?')) {
            localStorage.clear();
            location.reload();
        }
    });

    el.themeToggle.addEventListener('click', () => {
        applyTheme(state.settings.theme === 'dark' ? 'light' : 'dark', true);
    });

    el.chatSearch.addEventListener('input', () => {
        state.searchQuery = el.chatSearch.value.trim().toLowerCase();
        el.searchClear.style.display = state.searchQuery ? 'flex' : 'none';
        renderHistory();
    });
    el.searchClear.addEventListener('click', () => {
        el.chatSearch.value = '';
        state.searchQuery = '';
        el.searchClear.style.display = 'none';
        renderHistory();
    });

    el.modelSelect.addEventListener('change', () => {
        const chat = state.chats.find(c => c.id === state.currentId);
        if (chat) { chat.model = el.modelSelect.value; saveChats(); }
    });

    el.modalCancel.addEventListener('click', closeModal);
    el.chatModal.addEventListener('click', e => { if (e.target === el.chatModal) closeModal(); });

    bindPillGroup(el.effectPills, val => {
        state.settings.textEffect = val;
        saveSettings();
    });
    bindPillGroup(el.sizePills, val => {
        state.settings.fontSize = val;
        applyFontSize(val);
        saveSettings();
    });
}

function bindPillGroup(container, onChange) {
    container.querySelectorAll('.pill-option').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.pill-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            onChange(btn.dataset.value);
        });
    });
}

function syncPills(container, activeVal) {
    container.querySelectorAll('.pill-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === activeVal);
    });
}

function togglePwField(input, btn) {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.innerHTML = show ? '<i data-lucide="eye-off"></i>' : '<i data-lucide="eye"></i>';
    lucide.createIcons();
}

function applyTheme(theme, animate) {
    state.settings.theme = theme;

    if (animate) {
        document.body.classList.add('theme-transitioning');
        setTimeout(() => document.body.classList.remove('theme-transitioning'), 400);
    }

    document.documentElement.setAttribute('data-theme', theme);

    const isDark = theme === 'dark';
    el.themeLabel.textContent = isDark ? 'Light Mode' : 'Dark Mode';
    const icon = el.themeToggle.querySelector('i');
    if (icon) { icon.setAttribute('data-lucide', isDark ? 'sun' : 'moon'); }
    lucide.createIcons();

    saveSettings();
}

function applyFontSize(size) {
    const map = { sm: '0.82rem', md: '0.93rem', lg: '1.05rem', xl: '1.18rem' };
    document.documentElement.style.setProperty('--msg-font-size', map[size] || '0.93rem');
}

function addPendingImage(file) {
    if (!file.type.startsWith('image/')) { showToast('Only images are supported.', 'error'); return; }
    if (file.size > 10 * 1024 * 1024)   { showToast('Image must be under 10 MB.', 'error'); return; }
    const reader = new FileReader();
    reader.onload = e => {
        const dataUrl  = e.target.result;
        const base64   = dataUrl.split(',')[1];
        const mimeType = file.type;
        const id       = Date.now() + Math.random();
        state.pendingImages.push({ id, base64, mimeType, dataUrl, name: file.name });
        renderImagePreviews();
    };
    reader.readAsDataURL(file);
}

function renderImagePreviews() {
    el.imagePreviewBar.innerHTML = '';
    if (state.pendingImages.length === 0) {
        el.imagePreviewBar.classList.remove('has-images');
        el.attachBtn.classList.remove('has-files');
        return;
    }
    el.imagePreviewBar.classList.add('has-images');
    el.attachBtn.classList.add('has-files');
    state.pendingImages.forEach(img => {
        const wrap = document.createElement('div');
        wrap.className = 'preview-thumb-wrap';
        wrap.innerHTML = `<img class="preview-thumb" src="${img.dataUrl}" alt="${esc(img.name)}">
            <button class="preview-remove" title="Remove">✕</button>`;
        wrap.querySelector('.preview-remove').addEventListener('click', () => {
            state.pendingImages = state.pendingImages.filter(i => i.id !== img.id);
            renderImagePreviews();
        });
        el.imagePreviewBar.appendChild(wrap);
    });
}

function toggleSidebar() {
    el.sidebar.classList.toggle('open');
    el.overlay.classList.toggle('active');
}

function closeSidebarMobile() {
    if (window.innerWidth <= 768) {
        el.sidebar.classList.remove('open');
        el.overlay.classList.remove('active');
    }
}

function switchView(view) {
    const isSettings = view === 'settings';
    const from = isSettings ? el.chatView    : el.settingsView;
    const to   = isSettings ? el.settingsView : el.chatView;

    from.classList.add('view-leave');
    setTimeout(() => {
        from.classList.remove('active', 'view-leave');
        to.classList.add('active', 'view-enter');
        lucide.createIcons();
        setTimeout(() => to.classList.remove('view-enter'), 300);
    }, 200);

    closeSidebarMobile();
}

function saveGeminiKey() {
    const raw = el.geminiKeyInput.value.trim();
    if (!raw)                    { showToast('Enter a key first.', 'error'); return; }
    if (!raw.startsWith('AIza')) { showToast('Gemini keys start with AIza.', 'error'); return; }
    if (raw.length < 30)         { showToast('That key looks too short.', 'error'); return; }
    if (/\s/.test(raw))          { showToast('Remove spaces from the key.', 'error'); return; }
    state.geminiKey = raw;
    localStorage.setItem('mousy_gemini_key', raw);
    updateKeyBadge();
    showToast('Gemini key saved.', 'success');
}

function saveOrKey() {
    const raw = el.orKeyInput.value.trim();
    if (!raw) { showToast('Enter a key first.', 'error'); return; }
    state.orKey = raw;
    localStorage.setItem('mousy_or_key', raw);
    updateOrKeyBadge();
    showToast('OpenRouter key saved.', 'success');
}

function saveSystemPrompt() {
    const val = el.systemPromptInput.value.trim();
    if (!val) { showToast('Prompt cannot be empty.', 'error'); return; }
    state.settings.systemPrompt = val;
    saveSettings();
    showToast('System prompt saved.', 'success');
}

function updateKeyBadge() {
    const ok = state.geminiKey && state.geminiKey.startsWith('AIza') && state.geminiKey.length >= 30;
    el.geminiKeyBadge.textContent = ok ? '● Active' : '● No Key';
    el.geminiKeyBadge.className   = 'key-badge ' + (ok ? 'has-key' : 'no-key');
}

function updateOrKeyBadge() {
    const ok = state.orKey && state.orKey.length > 8;
    el.orKeyBadge.textContent = ok ? '● Active' : '● No Key';
    el.orKeyBadge.className   = 'key-badge ' + (ok ? 'has-key' : 'no-key');
}

function createNewChat() {
    const id    = Date.now().toString();
    const model = el.modelSelect.value || DEFAULT_MODEL;
    state.chats.unshift({ id, title: 'New Chat', messages: [], model });
    state.currentId = id;
    saveChats();
    renderHistory();
    renderMessages();
    closeSidebarMobile();
}

function switchChat(id) {
    state.currentId = id;
    const chat = state.chats.find(c => c.id === id);
    if (!chat) return;
    el.modelSelect.value = chat.model || DEFAULT_MODEL;
    if (!el.modelSelect.value) el.modelSelect.value = DEFAULT_MODEL;
    renderHistory();
    renderMessages();
    closeSidebarMobile();
}

function renderHistory() {
    el.historyList.innerHTML = '';
    const q = state.searchQuery;
    const list = q ? state.chats.filter(c => c.title.toLowerCase().includes(q)) : state.chats;

    if (list.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'history-empty';
        empty.textContent = q ? 'No chats found' : 'No chats yet';
        el.historyList.appendChild(empty);
        return;
    }

    list.forEach((chat, i) => {
        const wrap = document.createElement('div');
        wrap.className = 'history-item-wrap' + (chat.id === state.currentId ? ' active' : '');
        wrap.style.animationDelay = `${i * 0.022}s`;

        const btn = document.createElement('button');
        btn.className = 'history-item-btn';
        btn.innerHTML = `<i data-lucide="message-circle"></i><span>${esc(chat.title)}</span>`;
        btn.addEventListener('click', () => switchChat(chat.id));

        const actions = document.createElement('div');
        actions.className = 'history-item-actions';

        const renameBtn = document.createElement('button');
        renameBtn.className = 'history-action-btn';
        renameBtn.title = 'Rename';
        renameBtn.innerHTML = '<i data-lucide="pencil"></i>';
        renameBtn.addEventListener('click', e => { e.stopPropagation(); showRenameModal(chat); });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'history-action-btn history-action-delete';
        deleteBtn.title = 'Delete';
        deleteBtn.innerHTML = '<i data-lucide="trash-2"></i>';
        deleteBtn.addEventListener('click', e => { e.stopPropagation(); showDeleteModal(chat); });

        actions.appendChild(renameBtn);
        actions.appendChild(deleteBtn);
        wrap.appendChild(btn);
        wrap.appendChild(actions);
        el.historyList.appendChild(wrap);
    });

    lucide.createIcons();
}

function renderMessages() {
    el.chatContainer.innerHTML = '';
    const chat = state.chats.find(c => c.id === state.currentId);

    if (!chat || chat.messages.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        const hasKey = (state.geminiKey && state.geminiKey.startsWith('AIza')) || (state.orKey && state.orKey.length > 8);
        empty.innerHTML = `
            <div class="empty-orb">
                <div class="orb-ring"></div>
                <div class="orb-ring orb-ring-2"></div>
                <div class="orb-core">✦</div>
            </div>
            <div class="empty-title">Mousy's AI</div>
            <div class="empty-sub">${hasKey ? 'Start a conversation below. Images supported.' : 'Save an API key in Settings to begin.'}</div>`;
        el.chatContainer.appendChild(empty);
        return;
    }

    chat.messages.forEach(msg => appendMessage(msg.role, msg.content, msg.images || [], false));
    if (window.Prism) Prism.highlightAll();
    scrollBottom();
}

function getEffectClass() {
    const fx = state.settings.textEffect || 'fade-in';
    const map = {
        'none':    'msg-in',
        'fade-in': 'msg-fx-fade',
        'slide-up':'msg-fx-slide-up',
        'scale-in':'msg-fx-scale',
        'blur-in': 'msg-fx-blur',
        'glitch':  'msg-fx-glitch',
        'bounce':  'msg-fx-bounce'
    };
    return map[fx] || 'msg-fx-fade';
}

function appendMessage(role, content, images = [], animate = true) {
    const wrap = document.createElement('div');
    const fx   = animate ? (role === 'user' ? 'msg-in-right' : getEffectClass()) : '';
    wrap.className = 'message-wrap' + (fx ? ' ' + fx : '');

    if (role === 'user') {
        let imgHtml = '';
        if (images && images.length > 0) {
            imgHtml = `<div class="user-bubble-images">${images.map(img =>
                `<img class="user-bubble-img" src="data:${img.mimeType};base64,${img.base64}" alt="image">`
            ).join('')}</div>`;
        }
        wrap.innerHTML = `${imgHtml}<div class="user-bubble">${esc(content)}</div>`;

    } else if (role === 'image') {
        wrap.innerHTML = `<div class="ai-label">Mousy's AI</div>
            <div class="generated-image-wrap">
                <img class="generated-image" src="data:${content.mimeType};base64,${content.data}" alt="generated">
                <a class="img-download-btn" href="data:${content.mimeType};base64,${content.data}" download="generated.png">
                    ↓ Download
                </a>
            </div>`;

    } else if (role === 'error') {
        wrap.innerHTML = `<div class="error-bubble">${esc(content)}</div>`;

    } else {
        wrap.innerHTML = `<div class="ai-label">Mousy's AI</div>
            <div class="message-content">${parseMd(content)}</div>`;
    }

    el.chatContainer.appendChild(wrap);
    return wrap;
}

function showTyping() {
    const wrap = document.createElement('div');
    wrap.className = 'message-wrap msg-in';
    wrap.id = 'typingWrap';
    wrap.innerHTML = `<div class="ai-label">Mousy's AI</div>
        <div class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>`;
    el.chatContainer.appendChild(wrap);
    scrollBottom();
    return wrap;
}

function hideTyping() {
    const t = document.getElementById('typingWrap');
    if (t) t.remove();
}

function setRetryNotice(wrap, attempt, delaySec) {
    let n = wrap.querySelector('.retry-notice');
    if (!n) { n = document.createElement('div'); n.className = 'retry-notice'; wrap.appendChild(n); }
    n.textContent = `Rate limited — retrying in ${delaySec}s (attempt ${attempt}/3)…`;
}

function buildGeminiContents(messages) {
    return messages.map(msg => {
        const role  = msg.role === 'assistant' ? 'model' : 'user';
        const parts = [];
        if (msg.images && msg.images.length > 0) {
            msg.images.forEach(img => parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } }));
        }
        if (msg.content) parts.push({ text: msg.content });
        return { role, parts };
    });
}

async function callGemini(messages, model, typingWrap) {
    const MAX_RETRIES = 3;
    let attempt = 0;
    let delay   = 8;

    const contents = buildGeminiContents(messages);
    const body = {
        contents,
        systemInstruction: { parts: [{ text: state.settings.systemPrompt }] },
        generationConfig: {}
    };

    if (GEMINI3_MODELS.has(model)) {
        body.generationConfig.thinkingConfig = { thinkingLevel: 'HIGH' };
    } else if (GEMINI25_THINKING.has(model)) {
        body.generationConfig.thinkingConfig = { thinkingBudget: -1 };
    }

    while (true) {
        const res = await fetch(`${GEMINI_BASE}/${model}:generateContent`, {
            method: 'POST',
            headers: { 'x-goog-api-key': state.geminiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (res.status === 429) {
            attempt++;
            const d429 = await res.json().catch(() => ({}));
            const isQuota = d429?.error?.status === 'RESOURCE_EXHAUSTED' &&
                d429?.error?.message?.toLowerCase().includes('quota');
            if (isQuota) throw { message: 'Your Gemini quota ran out. Check usage at aistudio.google.com.' };
            if (attempt > MAX_RETRIES) throw { message: `Still rate limited after ${MAX_RETRIES} retries. Try again shortly.` };
            setRetryNotice(typingWrap, attempt, delay);
            await sleep(delay * 1000);
            delay = Math.min(delay * 2, 60);
            continue;
        }

        const data = await res.json();

        if (!res.ok) {
            const s   = res.status;
            let   msg = data?.error?.message || 'Something went wrong.';
            if (s === 400) {
                msg = msg.toLowerCase().includes('api key')
                    ? 'Your Gemini key doesn\'t look valid. Check Settings.'
                    : `Gemini couldn't process that. ${msg}`;
            } else if (s === 401 || s === 403) {
                msg = 'Your Gemini key doesn\'t look valid. Check Settings.';
            } else if (s === 404) {
                msg = `Model "${model}" not found. Try a different model.`;
            } else if (s >= 500) {
                msg = 'Gemini is having trouble on their end. Try again shortly.';
            }
            throw { message: msg };
        }

        const candidate = data?.candidates?.[0];
        if (!candidate) {
            const reason = data?.promptFeedback?.blockReason;
            throw { message: reason
                ? `Gemini blocked that prompt (${reason}). Try rephrasing.`
                : 'Got an empty response. Try again.' };
        }

        const text = candidate.content?.parts?.filter(p => p.text)?.map(p => p.text)?.join('') || '';
        if (!text) throw { message: 'Got an empty text response. Try again.' };
        return text;
    }
}

async function callGeminiImage(prompt, model) {
    const body = {
        contents: [{ parts: [{ text: prompt }], role: 'user' }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] }
    };

    const res = await fetch(`${GEMINI_BASE}/${model}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': state.geminiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    const data = await res.json();
    if (!res.ok) throw { message: data?.error?.message || 'Image generation failed.' };

    const parts     = data?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find(p => p.inlineData);
    const textPart  = parts.find(p => p.text);

    if (!imagePart) throw { message: textPart?.text || 'No image returned. Try a different prompt.' };

    return { data: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType, text: textPart?.text || '' };
}

async function callOpenRouter(messages, model, typingWrap) {
    const systemMsg  = { role: 'system', content: state.settings.systemPrompt };
    const allMessages = [systemMsg, ...messages.map(m => {
        if (m.role === 'assistant') return { role: 'assistant', content: m.content };
        if (m.images && m.images.length > 0) {
            return {
                role: 'user',
                content: [
                    ...m.images.map(img => ({
                        type: 'image_url',
                        image_url: { url: `data:${img.mimeType};base64,${img.base64}` }
                    })),
                    ...(m.content ? [{ type: 'text', text: m.content }] : [])
                ]
            };
        }
        return { role: 'user', content: m.content };
    })];

    const res = await fetch(OR_BASE, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${state.orKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://mousysai.app',
            'X-Title': "Mousy's AI"
        },
        body: JSON.stringify({ model, messages: allMessages, stream: true, max_tokens: 4096 })
    });

    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw { message: errData?.error?.message || `OpenRouter error (${res.status}).` };
    }

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let   full    = '';
    let   buf     = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop();

        for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const chunk = line.slice(6).trim();
            if (chunk === '[DONE]') break;
            if (!chunk || chunk.startsWith(':')) continue;
            try {
                const json    = JSON.parse(chunk);
                const content = json.choices?.[0]?.delta?.content;
                if (content) full += content;
            } catch {}
        }
    }

    if (!full) throw { message: 'Got an empty response from OpenRouter.' };
    return full;
}

async function sendMessage() {
    if (state.sending) return;

    const text   = el.chatInput.value.trim();
    const images = [...state.pendingImages];
    const model  = el.modelSelect.value;

    if (!text && images.length === 0) { showToast('Type a message or attach an image.', 'error'); return; }

    const isOR    = model.startsWith('or:');
    const isImg   = IMAGE_GEN_MODELS.has(model);
    const orModel = isOR ? model.slice(3) : null;

    if (!isOR && !state.geminiKey) { showToast('Add your Gemini API key in Settings.', 'error'); return; }
    if (isOR  && !state.orKey)     { showToast('Add your OpenRouter API key in Settings.', 'error'); return; }

    const chat = state.chats.find(c => c.id === state.currentId);
    if (!chat) return;

    chat.model = model;
    if (chat.messages.length === 0) {
        chat.title = text
            ? (text.length > 30 ? text.substring(0, 30) + '…' : text)
            : `Image${images.length > 1 ? 's' : ''}`;
    }

    const userMsg = {
        role: 'user',
        content: text,
        images: images.map(img => ({ base64: img.base64, mimeType: img.mimeType }))
    };
    chat.messages.push(userMsg);

    el.chatInput.value = '';
    el.chatInput.style.height = 'auto';
    state.pendingImages = [];
    renderImagePreviews();

    const existingEmpty = el.chatContainer.querySelector('.empty-state');
    if (existingEmpty) existingEmpty.remove();

    appendMessage('user', text, userMsg.images, true);
    const typingWrap = showTyping();

    state.sending       = true;
    el.sendBtn.disabled = true;

    try {
        if (isImg) {
            const result = await callGeminiImage(text, model);
            hideTyping();
            const imgMsg = { role: 'image', content: { data: result.data, mimeType: result.mimeType } };
            chat.messages.push(imgMsg);
            appendMessage('image', imgMsg.content, [], true);
            if (result.text) {
                const txtMsg = { role: 'assistant', content: result.text, images: [] };
                chat.messages.push(txtMsg);
                appendMessage('assistant', result.text, [], true);
            }
        } else {
            const aiText = isOR
                ? await callOpenRouter(chat.messages, orModel, typingWrap)
                : await callGemini(chat.messages, model, typingWrap);
            hideTyping();
            chat.messages.push({ role: 'assistant', content: aiText, images: [] });
            appendMessage('assistant', aiText, [], true);
            if (window.Prism) Prism.highlightAll();
        }

        saveChats();
        renderHistory();
        scrollBottom();

    } catch (err) {
        hideTyping();
        chat.messages.pop();
        appendMessage('error', err.message || 'Something went wrong, please try again.', [], true);
        saveChats();
    } finally {
        state.sending       = false;
        el.sendBtn.disabled = false;
    }
}

function parseMd(text) {
    return text
        .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
            const l    = lang || 'text';
            const safe = code.trim()
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            return `<div class="code-block-container">
                <div class="code-header">
                    <span>${l.toUpperCase()}</span>
                    <button class="copy-btn" onclick="copyCode(this)">Copy</button>
                </div>
                <pre><code class="language-${l}">${safe}</code></pre>
            </div>`;
        })
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code style="background:var(--bg-card);padding:1px 6px;border-radius:5px;font-family:JetBrains Mono,monospace;font-size:0.82em;color:var(--text-main)">$1</code>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm,  '<h2>$1</h2>')
        .replace(/^# (.+)$/gm,   '<h1>$1</h1>')
        .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g, '<ul>$1</ul>')
        .replace(/^\d+\. (.+)$/gm, '<oli>$1</oli>')
        .replace(/(<oli>[\s\S]*?<\/oli>)(?!\s*<oli>)/g, m =>
            '<ol>' + m.replace(/<oli>/g, '<li>').replace(/<\/oli>/g, '</li>') + '</ol>')
        .replace(/\n\n+/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/^/, '<p>')
        .replace(/$/, '</p>');
}

function esc(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function copyCode(btn) {
    const code = btn.closest('.code-block-container').querySelector('code').innerText;
    navigator.clipboard.writeText(code).then(() => {
        btn.textContent = 'Copied';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
    });
}

function showRenameModal(chat) {
    el.modalTitle.textContent    = 'Rename Chat';
    el.modalInput.style.display  = 'block';
    el.modalInput.value          = chat.title;
    el.chatModal.classList.add('active');
    setTimeout(() => el.modalInput.focus(), 80);

    el.modalConfirm.onclick = () => {
        const t = el.modalInput.value.trim();
        if (!t) { showToast('Name cannot be empty.', 'error'); return; }
        chat.title = t;
        saveChats();
        renderHistory();
        closeModal();
        showToast('Chat renamed.', 'success');
    };
    el.modalInput.onkeydown = e => { if (e.key === 'Enter') el.modalConfirm.click(); };
}

function showDeleteModal(chat) {
    el.modalTitle.textContent   = `Delete "${chat.title}"?`;
    el.modalInput.style.display = 'none';
    el.chatModal.classList.add('active');

    el.modalConfirm.onclick = () => {
        state.chats = state.chats.filter(c => c.id !== chat.id);
        saveChats();
        if (state.currentId === chat.id) {
            if (state.chats.length > 0) switchChat(state.chats[0].id);
            else createNewChat();
        } else {
            renderHistory();
        }
        closeModal();
        showToast('Chat deleted.', 'success');
    };
}

function closeModal() {
    el.chatModal.classList.remove('active');
    el.modalConfirm.onclick = null;
    el.modalInput.onkeydown = null;
}

function scrollBottom() {
    requestAnimationFrame(() => {
        el.chatContainer.scrollTo({ top: el.chatContainer.scrollHeight, behavior: 'smooth' });
    });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function showToast(msg, type = 'default') {
    const t = document.createElement('div');
    t.className  = `toast toast-${type}`;
    t.textContent = msg;
    el.toastContainer.appendChild(t);
    setTimeout(() => {
        t.classList.add('toast-out');
        setTimeout(() => t.remove(), 220);
    }, 2800);
}

function saveChats()    { localStorage.setItem('mousy_chats',    JSON.stringify(state.chats)); }
function saveSettings() { localStorage.setItem('mousy_settings', JSON.stringify(state.settings)); }

init();
