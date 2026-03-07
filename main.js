const PUTER_MODELS = [
    { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', group: 'Claude 4' },
    { id: 'claude-opus-4-6',   label: 'Claude Opus 4.6',   group: 'Claude 4' },
    { id: 'claude-opus-4-5',   label: 'Claude Opus 4.5',   group: 'Claude 4' },
    { id: 'claude-haiku-4-5',  label: 'Claude Haiku 4.5',  group: 'Claude 4' },
    { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', group: 'Claude 4' },
    { id: 'claude-opus-4-1',   label: 'Claude Opus 4.1',   group: 'Claude 4' },
    { id: 'claude-opus-4',     label: 'Claude Opus 4',     group: 'Claude 4' },
    { id: 'claude-sonnet-4',   label: 'Claude Sonnet 4',   group: 'Claude 4' },
    { id: 'claude-3-7-sonnet', label: 'Claude 3.7 Sonnet', group: 'Claude 3' },
    { id: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet', group: 'Claude 3' },
    { id: 'claude-3-haiku',    label: 'Claude 3 Haiku',    group: 'Claude 3' },
];
const GEMINI_MODELS = new Set([
    'gemini-3.1-pro-preview','gemini-3-flash-preview','gemini-3.1-flash-lite-preview',
    'gemini-2.5-pro','gemini-2.5-flash','gemini-2.5-flash-lite'
]);
const IMAGE_GEN_MODELS = new Set([
    'gemini-3-pro-image-preview','gemini-3.1-flash-image-preview','gemini-2.5-flash-image'
]);
const GEMINI3_MODELS    = new Set(['gemini-3.1-pro-preview','gemini-3-flash-preview','gemini-3.1-flash-lite-preview']);
const GEMINI25_THINKING = new Set(['gemini-2.5-pro','gemini-2.5-flash']);
const GEMINI_MODEL_LIST = [
    { id:'gemini-3.1-pro-preview',       label:'Gemini 3.1 Pro',       group:'Gemini 3'   },
    { id:'gemini-3-flash-preview',        label:'Gemini 3 Flash',        group:'Gemini 3'   },
    { id:'gemini-3.1-flash-lite-preview', label:'Gemini 3.1 Flash Lite', group:'Gemini 3'   },
    { id:'gemini-2.5-pro',                label:'Gemini 2.5 Pro',        group:'Gemini 2.5' },
    { id:'gemini-2.5-flash',              label:'Gemini 2.5 Flash',      group:'Gemini 2.5' },
    { id:'gemini-2.5-flash-lite',         label:'Gemini 2.5 Flash Lite', group:'Gemini 2.5' },
    { id:'gemini-3-pro-image-preview',    label:'Gemini 3 Pro Image',    group:'Image Gen'  },
    { id:'gemini-3.1-flash-image-preview',label:'Gemini 3.1 Flash Image',group:'Image Gen'  },
    { id:'gemini-2.5-flash-image',        label:'Gemini 2.5 Flash Image',group:'Image Gen'  },
];
const ALL_MODELS    = [...PUTER_MODELS, ...GEMINI_MODEL_LIST];
const DEFAULT_MODEL = 'claude-sonnet-4-6';
const GEMINI_BASE   = 'https://generativelanguage.googleapis.com/v1beta/models';

const defaultSettings = {
    systemPrompt:   "You are Mousy's AI, a helpful and precise assistant. Format code in markdown code blocks with the language name.",
    textEffect:     'fade-in',
    fontSize:       'md',
    theme:          'dark',
    chatFont:       'Plus Jakarta Sans',
    responseStyle:  'professional',
    emojiLevel:     'none',
    scriptComments: true,
    profileName:    'Player'
};

/* ── STATE ────────────────────────────────────────────────────── */
const savedSettings = (()=>{ try{ return JSON.parse(localStorage.getItem('mousy_settings')||'{}'); }catch{ return {}; } })();
const state = {
    chats:          (()=>{ try{ return JSON.parse(localStorage.getItem('mousy_chats')||'[]'); }catch{ return []; } })(),
    currentId:      null,
    settings:       Object.assign({}, defaultSettings, savedSettings),
    geminiKey:      localStorage.getItem('mousy_gemini_key') || '',
    currentModel:   localStorage.getItem('mousy_model') || DEFAULT_MODEL,
    sending:        false,
    pendingImages:  [],
    searchQuery:    '',
    autoThemeTimer: null
};

/* ── DOM ──────────────────────────────────────────────────────── */
const el = {
    sidebar:             document.getElementById('sidebar'),
    overlay:             document.getElementById('sidebarOverlay'),
    historyList:         document.getElementById('historyList'),
    chatContainer:       document.getElementById('chatContainer'),
    chatInput:           document.getElementById('chatInput'),
    sendBtn:             document.getElementById('sendBtn'),
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
    wipeMemoryBtn:       document.getElementById('wipeMemoryBtn'),
    toastContainer:      document.getElementById('toastContainer'),
    imageInput:          document.getElementById('imageInput'),
    attachBtn:           document.getElementById('attachBtn'),
    imagePreviewBar:     document.getElementById('imagePreviewBar'),
    chatSearch:          document.getElementById('chatSearch'),
    searchClear:         document.getElementById('searchClear'),
    chatModal:           document.getElementById('chatModal'),
    modalTitle:          document.getElementById('modalTitle'),
    modalInput:          document.getElementById('modalInput'),
    modalCancel:         document.getElementById('modalCancel'),
    modalConfirm:        document.getElementById('modalConfirm'),
    modelTrigger:        document.getElementById('modelTrigger'),
    modelTriggerLabel:   document.getElementById('modelTriggerLabel'),
    modelDropdownRoot:   document.getElementById('modelDropdownRoot'),
    modelSearchInput:    document.getElementById('modelSearchInput'),
    modelPanelList:      document.getElementById('modelPanelList'),
    profileNameInput:    document.getElementById('profileNameInput'),
    saveProfileBtn:      document.getElementById('saveProfileBtn'),
    scriptCommentsToggle:document.getElementById('scriptCommentsToggle'),
};

/* ── INIT ─────────────────────────────────────────────────────── */
function init() {
    lucide.createIcons();
    el.systemPromptInput.value = state.settings.systemPrompt;
    el.profileNameInput.value  = state.settings.profileName || 'Player';
    el.geminiKeyInput.value    = state.geminiKey;
    updateKeyBadge();
    applyTheme(state.settings.theme, false);
    applyFontSize(state.settings.fontSize);
    applyChatFont(state.settings.chatFont);
    syncToggle(el.scriptCommentsToggle, state.settings.scriptComments !== false);
    syncSelectUI('responseStyleSelect', state.settings.responseStyle);
    syncSelectUI('emojiLevelSelect',    state.settings.emojiLevel);
    syncSelectUI('themeSelect',         state.settings.theme);
    syncSelectUI('chatFontSelect',      state.settings.chatFont);
    syncSelectUI('fontSizeSelect',      state.settings.fontSize);
    syncSelectUI('effectSelect',        state.settings.textEffect);
    buildModelPanel('');
    setModelTriggerLabel(state.currentModel);
    if (state.chats.length > 0) switchChat(state.chats[0].id);
    else createNewChat();
    bindEvents();
    renderHistory();
}

function buildSystemPrompt() {
    const name     = state.settings.profileName || 'Player';
    const style    = state.settings.responseStyle || 'professional';
    const emoji    = state.settings.emojiLevel || 'none';
    const comments = state.settings.scriptComments !== false;
    const base     = state.settings.systemPrompt || defaultSettings.systemPrompt;
    const styleMap = { professional:'Respond in a professional, clear and concise manner.', friendly:'Respond in a warm, friendly and approachable way.', nerdy:'Respond with enthusiasm, technical depth and nerdy energy.', sincere:'Respond sincerely and thoughtfully with genuine care.' };
    const emojiMap = { none:'Do not use any emojis in your responses.', less:'Use very few emojis, only when truly appropriate.', more:'Feel free to use emojis to make responses expressive and fun.' };
    let p = `${base}\n\nThe user's name is ${name}. Address them by name occasionally.\n${styleMap[style]||''}\n${emojiMap[emoji]||''}`;
    if (!comments) p += '\nWhen writing code, do NOT add comments unless specifically asked.';
    return p.trim();
}

/* ── EVENTS ───────────────────────────────────────────────────── */
function bindEvents() {
    document.getElementById('menuToggle').addEventListener('click', toggleSidebar);
    el.overlay.addEventListener('click', () => { closeSidebarMobile(); closeAllPanels(); });
    el.newChatBtn.addEventListener('click', createNewChat);
    el.sendBtn.addEventListener('click', sendMessage);
    el.chatInput.addEventListener('keydown', e => { if (e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();} });
    el.chatInput.addEventListener('input', () => { el.chatInput.style.height='auto'; el.chatInput.style.height=Math.min(el.chatInput.scrollHeight,160)+'px'; });
    el.chatInput.addEventListener('paste', e => { const items=e.clipboardData?.items; if(!items) return; for(const item of items){if(item.type.startsWith('image/')){const f=item.getAsFile();if(f)addPendingImage(f);}} });
    el.openSettingsBtn.addEventListener('click', () => switchView('settings'));
    el.backToChat.addEventListener('click', () => { switchView('chat'); if(state.currentId) renderMessages(); });
    el.saveGeminiKeyBtn.addEventListener('click', saveGeminiKey);
    el.toggleGeminiKeyBtn.addEventListener('click', () => togglePwField(el.geminiKeyInput, el.toggleGeminiKeyBtn));
    el.saveSystemPromptBtn.addEventListener('click', saveSystemPrompt);
    el.saveProfileBtn.addEventListener('click', () => { state.settings.profileName=el.profileNameInput.value.trim()||'Player'; saveSettings(); showToast('Profile saved.','success'); });
    el.scriptCommentsToggle.addEventListener('click', () => { const next=!(state.settings.scriptComments!==false); state.settings.scriptComments=next; syncToggle(el.scriptCommentsToggle,next); saveSettings(); });
    el.imageInput.addEventListener('change', () => { Array.from(el.imageInput.files).forEach(addPendingImage); el.imageInput.value=''; });
    el.wipeMemoryBtn.addEventListener('click', () => { if(confirm('Delete all chats and settings?')){localStorage.clear();location.reload();} });
    el.chatSearch.addEventListener('input', () => { state.searchQuery=el.chatSearch.value.trim().toLowerCase(); el.searchClear.style.display=state.searchQuery?'flex':'none'; renderHistory(); });
    el.searchClear.addEventListener('click', () => { el.chatSearch.value=''; state.searchQuery=''; el.searchClear.style.display='none'; renderHistory(); });
    el.modalCancel.addEventListener('click', closeModal);
    el.chatModal.addEventListener('click', e => { if(e.target===el.chatModal) closeModal(); });
    el.modelTrigger.addEventListener('click', e => { e.stopPropagation(); const open=el.modelDropdownRoot.classList.toggle('open'); if(open){el.modelSearchInput.value='';buildModelPanel('');setTimeout(()=>el.modelSearchInput.focus(),60);} });
    el.modelSearchInput.addEventListener('input', () => buildModelPanel(el.modelSearchInput.value));
    document.addEventListener('click', e => { if(!el.modelDropdownRoot.contains(e.target)) el.modelDropdownRoot.classList.remove('open'); const active=document.querySelector('.ui-select-wrap.open'); if(active&&!active.contains(e.target)) active.classList.remove('open'); });
    bindSelectUI('responseStyleSelect', val => { state.settings.responseStyle=val; saveSettings(); });
    bindSelectUI('emojiLevelSelect',    val => { state.settings.emojiLevel=val;    saveSettings(); });
    bindSelectUI('themeSelect',         val => { applyTheme(val,true);             saveSettings(); });
    bindSelectUI('chatFontSelect',      val => { applyChatFont(val); state.settings.chatFont=val; saveSettings(); });
    bindSelectUI('fontSizeSelect',      val => { applyFontSize(val); state.settings.fontSize=val; saveSettings(); });
    bindSelectUI('effectSelect',        val => { state.settings.textEffect=val;    saveSettings(); });
}

/* ── SELECT UI ────────────────────────────────────────────────── */
function bindSelectUI(id, onChange) {
    const wrap=document.getElementById(id); if(!wrap) return;
    const trigger=wrap.querySelector('.ui-select-trigger');
    const panel=wrap.querySelector('.ui-select-panel');
    trigger.addEventListener('click', e => { e.stopPropagation(); const wasOpen=wrap.classList.contains('open'); closeAllPanels(); if(!wasOpen) wrap.classList.add('open'); });
    panel.querySelectorAll('.ui-select-option').forEach(opt => { opt.addEventListener('click', () => { panel.querySelectorAll('.ui-select-option').forEach(o=>o.classList.remove('active')); opt.classList.add('active'); wrap.querySelector('.ui-select-value').textContent=opt.textContent; wrap.classList.remove('open'); onChange(opt.dataset.value); }); });
}

function syncSelectUI(id, value) {
    const wrap=document.getElementById(id); if(!wrap) return;
    wrap.querySelectorAll('.ui-select-option').forEach(o => { const m=o.dataset.value===value; o.classList.toggle('active',m); if(m) wrap.querySelector('.ui-select-value').textContent=o.textContent; });
}

function syncToggle(btn, on) { btn.classList.toggle('on', !!on); }
function closeAllPanels() { document.querySelectorAll('.ui-select-wrap.open').forEach(w=>w.classList.remove('open')); el.modelDropdownRoot.classList.remove('open'); }

/* ── MODEL PANEL ──────────────────────────────────────────────── */
function buildModelPanel(query) {
    const q=query.trim().toLowerCase();
    el.modelPanelList.innerHTML='';
    const filtered=q ? ALL_MODELS.filter(m=>m.label.toLowerCase().includes(q)||m.id.toLowerCase().includes(q)) : ALL_MODELS;
    const groups={};
    filtered.forEach(m => { if(!groups[m.group]) groups[m.group]=[]; groups[m.group].push(m); });
    if(filtered.length===0){ const e=document.createElement('div'); e.className='model-empty'; e.textContent='No models found'; el.modelPanelList.appendChild(e); return; }
    Object.entries(groups).forEach(([group,models]) => {
        const h=document.createElement('div'); h.className='model-group-label'; h.textContent=group; el.modelPanelList.appendChild(h);
        models.forEach(m => {
            const item=document.createElement('button');
            item.className='model-item'+(m.id===state.currentModel?' active':'');
            item.textContent=m.label;
            item.addEventListener('click', () => { state.currentModel=m.id; localStorage.setItem('mousy_model',m.id); setModelTriggerLabel(m.id); const chat=state.chats.find(c=>c.id===state.currentId); if(chat){chat.model=m.id;saveChats();} el.modelDropdownRoot.classList.remove('open'); el.modelPanelList.querySelectorAll('.model-item').forEach(i=>i.classList.remove('active')); item.classList.add('active'); });
            el.modelPanelList.appendChild(item);
        });
    });
}

function setModelTriggerLabel(modelId) {
    const found=ALL_MODELS.find(m=>m.id===modelId);
    el.modelTriggerLabel.textContent=found?found.label:modelId;
}

/* ── THEME / FONT / SIZE ──────────────────────────────────────── */
function applyTheme(theme, animate) {
    state.settings.theme=theme;
    let resolved=theme;
    if(theme==='auto'){
        const h=new Date().getHours(); resolved=(h>=7&&h<20)?'light':'dark';
        if(state.autoThemeTimer) clearInterval(state.autoThemeTimer);
        state.autoThemeTimer=setInterval(()=>{ const h2=new Date().getHours(); document.documentElement.setAttribute('data-theme',(h2>=7&&h2<20)?'light':'dark'); },60000);
    } else { if(state.autoThemeTimer){clearInterval(state.autoThemeTimer);state.autoThemeTimer=null;} }
    if(animate){ document.body.classList.add('theme-transitioning'); setTimeout(()=>document.body.classList.remove('theme-transitioning'),500); }
    document.documentElement.setAttribute('data-theme',resolved);
}

function applyFontSize(size) {
    const map    ={sm:'0.82rem',md:'0.93rem',lg:'1.05rem',xl:'1.18rem'};
    const codeMap={sm:'0.78rem',md:'0.88rem',lg:'0.96rem',xl:'1.04rem'};
    document.documentElement.style.setProperty('--msg-font-size', map[size]||'0.93rem');
    document.documentElement.style.setProperty('--code-font-size',codeMap[size]||'0.88rem');
}

function applyChatFont(font) { document.documentElement.style.setProperty('--chat-font',`'${font}', sans-serif`); }

function togglePwField(input, btn) {
    const show=input.type==='password'; input.type=show?'text':'password';
    btn.innerHTML=show?'<i data-lucide="eye-off"></i>':'<i data-lucide="eye"></i>';
    lucide.createIcons();
}

/* ── IMAGES ───────────────────────────────────────────────────── */
function addPendingImage(file) {
    if(!file.type.startsWith('image/')){showToast('Only images are supported.','error');return;}
    if(file.size>10*1024*1024){showToast('Image must be under 10 MB.','error');return;}
    const reader=new FileReader();
    reader.onload=e=>{ const dataUrl=e.target.result,base64=dataUrl.split(',')[1],mimeType=file.type,id=Date.now()+Math.random(); state.pendingImages.push({id,base64,mimeType,dataUrl,name:file.name}); renderImagePreviews(); };
    reader.readAsDataURL(file);
}

function renderImagePreviews() {
    el.imagePreviewBar.innerHTML='';
    if(state.pendingImages.length===0){ el.imagePreviewBar.classList.remove('has-images'); el.attachBtn.classList.remove('has-files'); return; }
    el.imagePreviewBar.classList.add('has-images'); el.attachBtn.classList.add('has-files');
    state.pendingImages.forEach(img => {
        const wrap=document.createElement('div'); wrap.className='preview-thumb-wrap';
        wrap.innerHTML=`<img class="preview-thumb" src="${img.dataUrl}" alt="${esc(img.name)}"><button class="preview-remove" title="Remove">✕</button>`;
        wrap.querySelector('.preview-remove').addEventListener('click',()=>{ state.pendingImages=state.pendingImages.filter(i=>i.id!==img.id); renderImagePreviews(); });
        el.imagePreviewBar.appendChild(wrap);
    });
}

/* ── SIDEBAR / VIEW ───────────────────────────────────────────── */
function toggleSidebar() { el.sidebar.classList.toggle('open'); el.overlay.classList.toggle('active'); }
function closeSidebarMobile() { if(window.innerWidth<=768){el.sidebar.classList.remove('open');el.overlay.classList.remove('active');} }

function switchView(view) {
    const isSett=view==='settings';
    const from=isSett?el.chatView:el.settingsView, to=isSett?el.settingsView:el.chatView;
    from.classList.add('view-leave');
    setTimeout(()=>{ from.classList.remove('active','view-leave'); to.classList.add('active','view-enter'); lucide.createIcons(); setTimeout(()=>to.classList.remove('view-enter'),300); },200);
    closeSidebarMobile();
}

/* ── API KEY ──────────────────────────────────────────────────── */
function saveGeminiKey() {
    const raw=el.geminiKeyInput.value.trim();
    if(!raw){showToast('Enter a key first.','error');return;}
    if(!raw.startsWith('AIza')){showToast('Gemini keys start with AIza.','error');return;}
    if(raw.length<30){showToast('That key looks too short.','error');return;}
    if(/\s/.test(raw)){showToast('Remove spaces from the key.','error');return;}
    state.geminiKey=raw; localStorage.setItem('mousy_gemini_key',raw); updateKeyBadge(); showToast('Gemini key saved.','success');
}

function saveSystemPrompt() {
    const val=el.systemPromptInput.value.trim();
    if(!val){showToast('Prompt cannot be empty.','error');return;}
    state.settings.systemPrompt=val; saveSettings(); showToast('System prompt saved.','success');
}

function updateKeyBadge() {
    const ok=state.geminiKey&&state.geminiKey.startsWith('AIza')&&state.geminiKey.length>=30;
    el.geminiKeyBadge.textContent=ok?'● Active':'● No Key';
    el.geminiKeyBadge.className='key-badge '+(ok?'has-key':'no-key');
}

/* ── CHAT CRUD ────────────────────────────────────────────────── */
function createNewChat() {
    const id=Date.now().toString();
    state.chats.unshift({id,title:'New Chat',messages:[],model:state.currentModel});
    state.currentId=id; saveChats(); renderHistory(); renderMessages(); closeSidebarMobile();
}

function switchChat(id) {
    state.currentId=id;
    const chat=state.chats.find(c=>c.id===id); if(!chat) return;
    if(chat.model){state.currentModel=chat.model;setModelTriggerLabel(chat.model);}
    renderHistory(); renderMessages(); closeSidebarMobile();
}

function renderHistory() {
    el.historyList.innerHTML='';
    const q=state.searchQuery;
    const list=q?state.chats.filter(c=>c.title.toLowerCase().includes(q)):state.chats;
    if(list.length===0){ const e=document.createElement('div'); e.className='history-empty'; e.textContent=q?'No chats found':'No chats yet'; el.historyList.appendChild(e); return; }
    list.forEach((chat,i)=>{
        const wrap=document.createElement('div');
        wrap.className='history-item-wrap'+(chat.id===state.currentId?' active':'');
        wrap.style.animationDelay=`${i*0.022}s`;
        const btn=document.createElement('button'); btn.className='history-item-btn';
        btn.innerHTML=`<i data-lucide="message-circle"></i><span>${esc(chat.title)}</span>`;
        btn.addEventListener('click',()=>switchChat(chat.id));
        const actions=document.createElement('div'); actions.className='history-item-actions';
        const renameBtn=document.createElement('button'); renameBtn.className='history-action-btn'; renameBtn.title='Rename'; renameBtn.innerHTML='<i data-lucide="pencil"></i>';
        renameBtn.addEventListener('click',e=>{e.stopPropagation();showRenameModal(chat);});
        const deleteBtn=document.createElement('button'); deleteBtn.className='history-action-btn history-action-delete'; deleteBtn.title='Delete'; deleteBtn.innerHTML='<i data-lucide="trash-2"></i>';
        deleteBtn.addEventListener('click',e=>{e.stopPropagation();showDeleteModal(chat);});
        actions.appendChild(renameBtn); actions.appendChild(deleteBtn);
        wrap.appendChild(btn); wrap.appendChild(actions); el.historyList.appendChild(wrap);
    });
    lucide.createIcons();
}

function renderMessages() {
    el.chatContainer.innerHTML='';
    const chat=state.chats.find(c=>c.id===state.currentId);
    if(!chat||chat.messages.length===0){
        const empty=document.createElement('div'); empty.className='empty-state';
        empty.innerHTML=`<div class="empty-orb"><div class="orb-ring"></div><div class="orb-ring orb-ring-2"></div><div class="orb-core">✦</div></div><div class="empty-title">Mousy's AI</div><div class="empty-sub">Start a conversation below. Images supported.</div>`;
        el.chatContainer.appendChild(empty); return;
    }
    chat.messages.forEach(msg=>appendMessage(msg.role,msg.content,msg.images||[],false));
    requestAnimationFrame(()=>highlightCode());
    scrollBottom();
}

function getEffectClass() {
    const map={'none':'msg-in','fade-in':'msg-fx-fade','slide-up':'msg-fx-slide-up','scale-in':'msg-fx-scale','blur-in':'msg-fx-blur','glitch':'msg-fx-glitch','bounce':'msg-fx-bounce'};
    return map[state.settings.textEffect]||'msg-fx-fade';
}

function appendMessage(role,content,images=[],animate=true){
    const wrap=document.createElement('div');
    const fx=animate?(role==='user'?'msg-in-right':getEffectClass()):'';
    wrap.className='message-wrap'+(fx?' '+fx:'');
    if(role==='user'){
        let imgHtml='';
        if(images&&images.length>0) imgHtml=`<div class="user-bubble-images">${images.map(img=>`<img class="user-bubble-img" src="data:${img.mimeType};base64,${img.base64}" alt="image">`).join('')}</div>`;
        wrap.innerHTML=imgHtml+(content?`<div class="user-bubble">${esc(content)}</div>`:'');
    } else if(role==='image'){
        wrap.innerHTML=`<div class="ai-label">Mousy's AI</div><div class="generated-image-wrap"><img class="generated-image" src="data:${content.mimeType};base64,${content.data}" alt="generated"><a class="img-download-btn" href="data:${content.mimeType};base64,${content.data}" download="generated.png">↓ Download</a></div>`;
    } else if(role==='error'){
        wrap.innerHTML=`<div class="error-bubble">${esc(content)}</div>`;
    } else {
        wrap.innerHTML=`<div class="ai-label">Mousy's AI</div><div class="message-content">${parseMd(content)}</div>`;
    }
    el.chatContainer.appendChild(wrap);
    return wrap;
}

function showTyping(){
    const wrap=document.createElement('div'); wrap.className='message-wrap msg-in'; wrap.id='typingWrap';
    wrap.innerHTML=`<div class="ai-label">Mousy's AI</div><div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
    el.chatContainer.appendChild(wrap); scrollBottom(); return wrap;
}
function hideTyping(){ const t=document.getElementById('typingWrap'); if(t) t.remove(); }
function setRetryNotice(wrap,msg){ let n=wrap.querySelector('.retry-notice'); if(!n){n=document.createElement('div');n.className='retry-notice';wrap.appendChild(n);} n.textContent=msg; }

/* ── GEMINI ───────────────────────────────────────────────────── */
function buildGeminiContents(messages){
    return messages.filter(m=>m.role!=='image').map(msg=>{
        const role=msg.role==='assistant'?'model':'user'; const parts=[];
        if(msg.images&&msg.images.length>0) msg.images.forEach(img=>parts.push({inlineData:{mimeType:img.mimeType,data:img.base64}}));
        if(msg.content) parts.push({text:msg.content});
        return{role,parts};
    });
}

async function callGemini(messages,model,typingWrap){
    const MAX_RETRIES=3; let attempt=0,delay=5;
    const contents=buildGeminiContents(messages);
    const body={contents,systemInstruction:{parts:[{text:buildSystemPrompt()}]},generationConfig:{}};
    if(GEMINI3_MODELS.has(model))    body.generationConfig.thinkingConfig={thinkingLevel:'HIGH'};
    else if(GEMINI25_THINKING.has(model)) body.generationConfig.thinkingConfig={thinkingBudget:-1};
    while(true){
        const res=await fetch(`${GEMINI_BASE}/${model}:generateContent`,{method:'POST',headers:{'x-goog-api-key':state.geminiKey,'Content-Type':'application/json'},body:JSON.stringify(body)});
        if(res.status===429){
            attempt++;
            const d=await res.json().catch(()=>({}));
            if(d?.error?.status==='RESOURCE_EXHAUSTED'&&d?.error?.message?.toLowerCase().includes('quota')) throw{message:'Your Gemini quota ran out. Check usage at aistudio.google.com.'};
            if(attempt>MAX_RETRIES) throw{message:`Still rate limited after ${MAX_RETRIES} retries. Try again shortly.`};
            setRetryNotice(typingWrap,`Gemini is busy — retrying in ${delay}s (attempt ${attempt}/${MAX_RETRIES})…`);
            await sleep(delay*1000); delay=Math.min(delay*2,30); continue;
        }
        const data=await res.json();
        if(!res.ok){ const s=res.status; let msg=data?.error?.message||'Something went wrong.'; if(s===400) msg=msg.toLowerCase().includes('api key')?"Your Gemini key doesn't look valid. Check Settings.":`Gemini couldn't process that. ${msg}`; else if(s===401||s===403) msg="Your Gemini key doesn't look valid. Check Settings."; else if(s===404) msg=`Model "${model}" not found.`; else if(s>=500) msg='Gemini is having trouble. Try again shortly.'; throw{message:msg}; }
        const candidate=data?.candidates?.[0];
        if(!candidate){ const reason=data?.promptFeedback?.blockReason; throw{message:reason?`Gemini blocked that prompt (${reason}). Try rephrasing.`:'Got an empty response. Try again.'}; }
        const text=candidate.content?.parts?.filter(p=>p.text)?.map(p=>p.text)?.join('')||'';
        if(!text) throw{message:'Got an empty text response. Try again.'};
        return text;
    }
}

async function callGeminiImage(prompt,model){
    const body={contents:[{parts:[{text:prompt}],role:'user'}],generationConfig:{responseModalities:['IMAGE','TEXT']}};
    const res=await fetch(`${GEMINI_BASE}/${model}:generateContent`,{method:'POST',headers:{'x-goog-api-key':state.geminiKey,'Content-Type':'application/json'},body:JSON.stringify(body)});
    const data=await res.json(); if(!res.ok) throw{message:data?.error?.message||'Image generation failed.'};
    const parts=data?.candidates?.[0]?.content?.parts||[];
    const imagePart=parts.find(p=>p.inlineData),textPart=parts.find(p=>p.text);
    if(!imagePart) throw{message:textPart?.text||'No image returned. Try a different prompt.'};
    return{data:imagePart.inlineData.data,mimeType:imagePart.inlineData.mimeType,text:textPart?.text||''};
}

/* ── PUTER ────────────────────────────────────────────────────── */
async function callPuter(messages,model,typingWrap){
    const sysPrompt=buildSystemPrompt();
    const puterMsgs=[
        {role:'system',content:sysPrompt},
        ...messages.filter(m=>m.role!=='image').map(m=>{
            if(m.role==='assistant') return{role:'assistant',content:m.content};
            if(m.images&&m.images.length>0) return{role:'user',content:[...m.images.map(img=>({type:'image_url',image_url:{url:`data:${img.mimeType};base64,${img.base64}`}})),...(m.content?[{type:'text',text:m.content}]:[])]};
            return{role:'user',content:m.content};
        })
    ];
    let full='',attempt=0; const MAX=2;
    while(true){
        try{
            const response=await puter.ai.chat(puterMsgs,{model,stream:true});
            for await(const part of response){ if(part?.text) full+=part.text; }
            break;
        }catch(err){
            const msg=err?.message||String(err);
            if(/overloaded|busy|529|too many|service unavailable/i.test(msg)&&attempt<MAX){
                attempt++; setRetryNotice(typingWrap,`Model is busy — retrying in 5s (attempt ${attempt}/${MAX})…`);
                await sleep(5000); full=''; continue;
            }
            throw{message:`AI error: ${msg}`};
        }
    }
    if(!full) throw{message:'Got an empty response. Try again.'};
    return full;
}

/* ── SEND ─────────────────────────────────────────────────────── */
async function sendMessage(){
    if(state.sending) return;
    const text=el.chatInput.value.trim(),images=[...state.pendingImages],model=state.currentModel;
    if(!text&&images.length===0){showToast('Type a message or attach an image.','error');return;}
    const isPuter=!GEMINI_MODELS.has(model)&&!IMAGE_GEN_MODELS.has(model),isImg=IMAGE_GEN_MODELS.has(model);
    if(!isPuter&&!state.geminiKey){showToast('Add your Gemini API key in Settings.','error');return;}
    const chat=state.chats.find(c=>c.id===state.currentId); if(!chat) return;
    chat.model=model;
    if(chat.messages.length===0) chat.title=text?(text.length>30?text.substring(0,30)+'…':text):`Image${images.length>1?'s':''}`;
    const userMsg={role:'user',content:text,images:images.map(img=>({base64:img.base64,mimeType:img.mimeType}))};
    chat.messages.push(userMsg);
    el.chatInput.value=''; el.chatInput.style.height='auto'; state.pendingImages=[]; renderImagePreviews();
    const existingEmpty=el.chatContainer.querySelector('.empty-state'); if(existingEmpty) existingEmpty.remove();
    appendMessage('user',text,userMsg.images,true);
    const typingWrap=showTyping();
    state.sending=true; el.sendBtn.disabled=true;
    try{
        if(isImg){
            const result=await callGeminiImage(text,model); hideTyping();
            const imgMsg={role:'image',content:{data:result.data,mimeType:result.mimeType}};
            chat.messages.push(imgMsg); appendMessage('image',imgMsg.content,[],true);
            if(result.text){const txtMsg={role:'assistant',content:result.text,images:[]};chat.messages.push(txtMsg);appendMessage('assistant',result.text,[],true);}
        } else {
            const aiText=isPuter?await callPuter(chat.messages,model,typingWrap):await callGemini(chat.messages,model,typingWrap);
            hideTyping();
            chat.messages.push({role:'assistant',content:aiText,images:[]});
            appendMessage('assistant',aiText,[],true);
            requestAnimationFrame(()=>highlightCode());
        }
        saveChats(); renderHistory(); scrollBottom();
    }catch(err){
        hideTyping(); chat.messages.pop();
        appendMessage('error',err.message||'Something went wrong, please try again.',[],true);
        saveChats();
    }finally{ state.sending=false; el.sendBtn.disabled=false; }
}

/* ── PRISM ────────────────────────────────────────────────────── */
function highlightCode(){
    if(typeof Prism==='undefined') return;
    document.querySelectorAll('pre code[class*="language-"]').forEach(block=>{ try{Prism.highlightElement(block);}catch(e){} });
}

/* ── MARKDOWN ─────────────────────────────────────────────────── */
function parseMd(raw){
    const lines=raw.split('\n');
    const segments=[];
    let inCode=false,codeLang='',codeLines=[],textLines=[];

    const flushText=()=>{ if(textLines.length){segments.push({type:'text',content:textLines.join('\n')});textLines=[];} };

    for(let i=0;i<lines.length;i++){
        const line=lines[i];
        const fenceOpen=!inCode&&/^```(\w*)$/.exec(line);
        const fenceClose=inCode&&line.trim()==='```';

        if(fenceOpen){
            flushText(); inCode=true; codeLang=fenceOpen[1]||'text'; codeLines=[];
        } else if(fenceClose){
            const l=codeLang||'text';
            const safe=codeLines.join('\n').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            segments.push({type:'code',lang:l,content:safe});
            inCode=false; codeLang=''; codeLines=[];
        } else if(inCode){
            codeLines.push(line);
        } else {
            textLines.push(line);
        }
    }
    if(inCode&&codeLines.length>0){
        const l=codeLang||'text';
        const safe=codeLines.join('\n').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        segments.push({type:'code',lang:l,content:safe});
    }
    flushText();

    return segments.map(seg=>{
        if(seg.type==='code'){
            return `<div class="code-block"><div class="code-header"><span class="code-lang">${seg.lang.toUpperCase()}</span><button class="copy-btn" onclick="copyCode(this)">Copy</button></div><pre><code class="language-${seg.lang}">${seg.content}</code></pre></div>`;
        }
        let t=seg.content;
        t=t.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');
        t=t.replace(/\*(.*?)\*/g,'<em>$1</em>');
        t=t.replace(/`([^`\n]+)`/g,'<code class="inline-code">$1</code>');
        t=t.replace(/^### (.+)$/gm,'<h3>$1</h3>');
        t=t.replace(/^## (.+)$/gm,'<h2>$1</h2>');
        t=t.replace(/^# (.+)$/gm,'<h1>$1</h1>');
        const subLines=t.split('\n'),processed=[],listBuf=[],olistBuf=[];
        const flushLists=()=>{ if(listBuf.length){processed.push('<ul>'+listBuf.splice(0).join('')+'</ul>');} if(olistBuf.length){processed.push('<ol>'+olistBuf.splice(0).join('')+'</ol>');} };
        for(const sl of subLines){
            const ulM=sl.match(/^[-*] (.+)$/),olM=sl.match(/^\d+\. (.+)$/);
            if(ulM){if(olistBuf.length){processed.push('<ol>'+olistBuf.splice(0).join('')+'</ol>');}listBuf.push(`<li>${ulM[1]}</li>`);}
            else if(olM){if(listBuf.length){processed.push('<ul>'+listBuf.splice(0).join('')+'</ul>');}olistBuf.push(`<li>${olM[1]}</li>`);}
            else{flushLists();processed.push(sl);}
        }
        flushLists();
        let joined=processed.join('\n');
        joined=joined.replace(/\n{3,}/g,'\n\n');
        joined=joined.replace(/\n\n/g,'</p><p>');
        joined=joined.replace(/\n/g,'<br>');
        return `<p>${joined}</p>`;
    }).join('');
}

function esc(str){ return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function copyCode(btn){
    const code=btn.closest('.code-block').querySelector('code').innerText;
    navigator.clipboard.writeText(code).then(()=>{ btn.textContent='Copied'; btn.classList.add('copied'); setTimeout(()=>{btn.textContent='Copy';btn.classList.remove('copied');},2000); });
}

/* ── MODALS ───────────────────────────────────────────────────── */
function showRenameModal(chat){
    el.modalTitle.textContent='Rename Chat'; el.modalInput.style.display='block'; el.modalInput.value=chat.title;
    el.chatModal.classList.add('active'); setTimeout(()=>el.modalInput.focus(),80);
    el.modalConfirm.onclick=()=>{ const t=el.modalInput.value.trim(); if(!t){showToast('Name cannot be empty.','error');return;} chat.title=t;saveChats();renderHistory();closeModal();showToast('Chat renamed.','success'); };
    el.modalInput.onkeydown=e=>{if(e.key==='Enter')el.modalConfirm.click();};
}
function showDeleteModal(chat){
    el.modalTitle.textContent=`Delete "${chat.title}"?`; el.modalInput.style.display='none';
    el.chatModal.classList.add('active');
    el.modalConfirm.onclick=()=>{ state.chats=state.chats.filter(c=>c.id!==chat.id); saveChats(); if(state.currentId===chat.id){if(state.chats.length>0)switchChat(state.chats[0].id);else createNewChat();}else renderHistory(); closeModal();showToast('Chat deleted.','success'); };
}
function closeModal(){ el.chatModal.classList.remove('active'); el.modalConfirm.onclick=null; el.modalInput.onkeydown=null; }

/* ── UTILS ────────────────────────────────────────────────────── */
function scrollBottom(){ requestAnimationFrame(()=>el.chatContainer.scrollTo({top:el.chatContainer.scrollHeight,behavior:'smooth'})); }
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function showToast(msg,type='default'){ const t=document.createElement('div'); t.className=`toast toast-${type}`; t.textContent=msg; el.toastContainer.appendChild(t); setTimeout(()=>{t.classList.add('toast-out');setTimeout(()=>t.remove(),220);},2800); }
function saveChats()   { localStorage.setItem('mousy_chats',   JSON.stringify(state.chats)); }
function saveSettings(){ localStorage.setItem('mousy_settings',JSON.stringify(state.settings)); }

init();
