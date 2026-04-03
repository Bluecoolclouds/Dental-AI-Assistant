export function renderChatPage(): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Toothy — ИИ-консультант</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #0f172a;
      --surface: #1e293b;
      --surface2: #273449;
      --border: #334155;
      --primary: #3b82f6;
      --primary-dark: #2563eb;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --user-bubble: #2563eb;
      --ai-bubble: #1e293b;
      --ai-border: #334155;
      --error: #f87171;
      --success: #4ade80;
      --radius: 16px;
      --radius-sm: 8px;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      height: 100dvh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* ── LOGIN SCREEN ── */
    #login-screen {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      gap: 24px;
      padding: 24px;
    }

    .login-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 40px 36px;
      width: 100%;
      max-width: 420px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .login-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 22px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 4px;
    }

    .login-logo span { font-size: 28px; }

    .login-subtitle {
      font-size: 13px;
      color: var(--text-muted);
      margin-top: -12px;
    }

    label {
      font-size: 13px;
      color: var(--text-muted);
      display: block;
      margin-bottom: 6px;
    }

    input[type="text"] {
      width: 100%;
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 10px 14px;
      color: var(--text);
      font-size: 14px;
      outline: none;
      transition: border-color 0.15s;
    }

    input[type="text"]:focus { border-color: var(--primary); }

    .btn {
      background: var(--primary);
      color: #fff;
      border: none;
      border-radius: var(--radius-sm);
      padding: 11px 18px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s, opacity 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .btn:hover { background: var(--primary-dark); }
    .btn:disabled { opacity: 0.5; cursor: default; }

    .btn-ghost {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-muted);
      font-size: 12px;
      padding: 7px 12px;
    }

    .btn-ghost:hover { border-color: var(--text-muted); color: var(--text); }

    .error-msg {
      color: var(--error);
      font-size: 13px;
      text-align: center;
    }

    /* ── CHAT SCREEN ── */
    #chat-screen {
      display: none;
      flex-direction: column;
      flex: 1;
      overflow: hidden;
    }

    /* Header */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      background: var(--surface);
      flex-shrink: 0;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .header-logo { font-size: 20px; }

    .header-title {
      font-size: 15px;
      font-weight: 600;
    }

    .header-user {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 1px;
    }

    .header-actions { display: flex; gap: 8px; }

    /* Messages list */
    #messages {
      flex: 1;
      overflow-y: auto;
      padding: 20px 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      scroll-behavior: smooth;
    }

    #messages::-webkit-scrollbar { width: 4px; }
    #messages::-webkit-scrollbar-track { background: transparent; }
    #messages::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

    .msg-row {
      display: flex;
      gap: 10px;
      max-width: 760px;
      width: 100%;
    }

    .msg-row.user { margin-left: auto; flex-direction: row-reverse; }

    .avatar {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      margin-top: 2px;
    }

    .avatar.ai { background: var(--primary); }
    .avatar.user { background: #475569; }

    .bubble {
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 14px;
      line-height: 1.55;
      max-width: calc(100% - 44px);
      word-break: break-word;
      white-space: pre-wrap;
    }

    .bubble.ai {
      background: var(--ai-bubble);
      border: 1px solid var(--ai-border);
      border-top-left-radius: 4px;
    }

    .bubble.user {
      background: var(--user-bubble);
      border-top-right-radius: 4px;
      color: #fff;
    }

    .msg-time {
      font-size: 10px;
      color: var(--text-muted);
      margin-top: 4px;
      text-align: right;
    }

    .msg-row.user .msg-time { text-align: left; }

    .bubble-wrap { display: flex; flex-direction: column; }

    /* Typing indicator */
    .typing {
      display: flex;
      gap: 4px;
      align-items: center;
      padding: 12px 14px;
    }

    .typing span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--text-muted);
      animation: bounce 1.2s infinite;
    }

    .typing span:nth-child(2) { animation-delay: 0.2s; }
    .typing span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes bounce {
      0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
      40% { transform: translateY(-6px); opacity: 1; }
    }

    /* Empty state */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      flex: 1;
      color: var(--text-muted);
      font-size: 14px;
      text-align: center;
      padding: 40px;
    }

    .empty-state .big { font-size: 42px; }
    .empty-state strong { color: var(--text); font-size: 16px; }

    /* Input area */
    .input-bar {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      padding: 12px 16px;
      border-top: 1px solid var(--border);
      background: var(--surface);
      flex-shrink: 0;
    }

    #msg-input {
      flex: 1;
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 10px 14px;
      color: var(--text);
      font-size: 14px;
      font-family: inherit;
      resize: none;
      outline: none;
      min-height: 42px;
      max-height: 140px;
      overflow-y: auto;
      line-height: 1.5;
      transition: border-color 0.15s;
    }

    #msg-input:focus { border-color: var(--primary); }

    #msg-input::placeholder { color: var(--text-muted); }

    .send-btn {
      width: 42px;
      height: 42px;
      padding: 0;
      border-radius: var(--radius-sm);
      flex-shrink: 0;
    }

    .send-btn svg { display: block; }

    /* Session divider */
    .session-divider {
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--text-muted);
      font-size: 11px;
      margin: 8px 0;
    }

    .session-divider::before, .session-divider::after {
      content: "";
      flex: 1;
      height: 1px;
      background: var(--border);
    }

    /* Toast */
    #toast {
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 10px 18px;
      font-size: 13px;
      color: var(--text);
      opacity: 0;
      transition: opacity 0.2s, transform 0.2s;
      pointer-events: none;
      white-space: nowrap;
      z-index: 100;
    }

    #toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  </style>
</head>
<body>

<!-- LOGIN -->
<div id="login-screen">
  <div class="login-card">
    <div>
      <div class="login-logo"><span>🦷</span> Toothy</div>
      <p class="login-subtitle">ИИ-консультант стоматолога</p>
    </div>
    <div>
      <label>ID пользователя</label>
      <input id="user-id-input" type="text" placeholder="Вставьте ваш userId" autocomplete="off" />
    </div>
    <button class="btn" id="login-btn" onclick="doLogin()">Войти в чат</button>
    <p class="error-msg" id="login-error"></p>
  </div>
</div>

<!-- CHAT -->
<div id="chat-screen">
  <div class="header">
    <div class="header-left">
      <span class="header-logo">🦷</span>
      <div>
        <div class="header-title">ИИ-консультант</div>
        <div class="header-user" id="header-user-label"></div>
      </div>
    </div>
    <div class="header-actions">
      <button class="btn btn-ghost" onclick="newSession()" title="Новый диалог">+ Новый диалог</button>
      <button class="btn btn-ghost" onclick="doLogout()">Выйти</button>
    </div>
  </div>

  <div id="messages"></div>

  <div class="input-bar">
    <textarea
      id="msg-input"
      placeholder="Спросите стоматолога..."
      rows="1"
      onkeydown="handleKey(event)"
      oninput="autoResize(this)"
    ></textarea>
    <button class="btn send-btn" id="send-btn" onclick="sendMessage()">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
      </svg>
    </button>
  </div>
</div>

<div id="toast"></div>

<script>
  let userId = null;
  let isLoading = false;

  // ── LOGIN ──
  document.getElementById('user-id-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });

  async function doLogin() {
    const input = document.getElementById('user-id-input');
    const id = input.value.trim();
    const errEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');
    if (!id) { errEl.textContent = 'Введите userId'; return; }
    errEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Проверка…';
    try {
      const res = await fetch('/api/profile/' + encodeURIComponent(id));
      if (res.status === 404) {
        errEl.textContent = 'Пользователь не найден';
        btn.disabled = false;
        btn.textContent = 'Войти в чат';
        return;
      }
      userId = id;
      document.getElementById('header-user-label').textContent = 'ID: ' + id.slice(0, 8) + '…';
      document.getElementById('login-screen').style.display = 'none';
      document.getElementById('chat-screen').style.display = 'flex';
      await loadHistory();
    } catch (e) {
      errEl.textContent = 'Ошибка подключения';
    }
    btn.disabled = false;
    btn.textContent = 'Войти в чат';
  }

  function doLogout() {
    userId = null;
    document.getElementById('messages').innerHTML = '';
    document.getElementById('user-id-input').value = '';
    document.getElementById('chat-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
  }

  // ── HISTORY ──
  async function loadHistory() {
    const messagesEl = document.getElementById('messages');
    messagesEl.innerHTML = '';
    try {
      const res = await fetch('/api/chat/history/' + encodeURIComponent(userId));
      if (!res.ok) throw new Error();
      const data = await res.json();
      const msgs = data.messages || [];
      if (msgs.length === 0) {
        showEmpty();
        return;
      }
      for (const m of msgs) {
        appendBubble(m.role, m.content, m.createdAt);
      }
      scrollBottom();
    } catch {
      showEmpty();
    }
  }

  function showEmpty() {
    const messagesEl = document.getElementById('messages');
    messagesEl.innerHTML = \`
      <div class="empty-state">
        <div class="big">🦷</div>
        <strong>Чем могу помочь?</strong>
        <span>Задайте любой вопрос о здоровье зубов, лечении или уходе</span>
      </div>
    \`;
  }

  // ── SEND ──
  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }

  async function sendMessage() {
    if (isLoading) return;
    const input = document.getElementById('msg-input');
    const text = input.value.trim();
    if (!text) return;

    const emptyState = document.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

    input.value = '';
    input.style.height = 'auto';

    appendBubble('user', text);
    scrollBottom();

    const typingEl = appendTyping();
    scrollBottom();
    isLoading = true;
    document.getElementById('send-btn').disabled = true;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, userId }),
      });
      const data = await res.json();
      typingEl.remove();
      if (res.status === 429) {
        showToast('Достигнут дневной лимит сообщений');
      } else if (!res.ok || data.error) {
        appendBubble('assistant', data.response || data.error || 'Произошла ошибка. Попробуйте снова.');
      } else {
        appendBubble('assistant', data.response);
      }
      scrollBottom();
    } catch (e) {
      typingEl.remove();
      appendBubble('assistant', 'Ошибка соединения. Проверьте подключение к интернету.');
      scrollBottom();
    } finally {
      isLoading = false;
      document.getElementById('send-btn').disabled = false;
    }
  }

  // ── NEW SESSION ──
  async function newSession() {
    if (!confirm('Начать новый диалог? Текущая история сохранится в архиве.')) return;
    try {
      await fetch('/api/chat/session/' + encodeURIComponent(userId), { method: 'POST' });
      showToast('Новый диалог начат');
      const divider = document.createElement('div');
      divider.className = 'session-divider';
      divider.textContent = '— Новый диалог —';
      document.getElementById('messages').appendChild(divider);
      scrollBottom();
    } catch {
      showToast('Ошибка при создании нового диалога');
    }
  }

  // ── UI HELPERS ──
  function appendBubble(role, text, timestamp) {
    const isUser = role === 'user';
    const messagesEl = document.getElementById('messages');
    const row = document.createElement('div');
    row.className = 'msg-row ' + (isUser ? 'user' : 'ai');

    const timeStr = timestamp
      ? new Date(timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      : new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    row.innerHTML = \`
      <div class="avatar \${isUser ? 'user' : 'ai'}">\${isUser ? '👤' : '🦷'}</div>
      <div class="bubble-wrap">
        <div class="bubble \${isUser ? 'user' : 'ai'}">\${escapeHtml(text)}</div>
        <div class="msg-time">\${timeStr}</div>
      </div>
    \`;
    messagesEl.appendChild(row);
    return row;
  }

  function appendTyping() {
    const messagesEl = document.getElementById('messages');
    const row = document.createElement('div');
    row.className = 'msg-row ai';
    row.innerHTML = \`
      <div class="avatar ai">🦷</div>
      <div class="bubble ai">
        <div class="typing"><span></span><span></span><span></span></div>
      </div>
    \`;
    messagesEl.appendChild(row);
    return row;
  }

  function scrollBottom() {
    const el = document.getElementById('messages');
    el.scrollTop = el.scrollHeight;
  }

  function showToast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3000);
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
</script>
</body>
</html>`;
}
