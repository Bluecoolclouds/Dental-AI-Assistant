export interface ChatUser {
  id: string;
  email: string | null;
  name: string | null;
  createdAt: Date | null;
}

export function renderChatLoginPage(error?: string): string {
  const errorHtml = error
    ? `<p style="color:#f87171;font-size:13px;text-align:center;margin-top:-8px">${error}</p>`
    : "";
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Toothy — ИИ-чат</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#0f172a;color:#f1f5f9;height:100dvh;display:flex;align-items:center;justify-content:center}
    .card{background:#1e293b;border:1px solid #334155;border-radius:16px;padding:40px 36px;width:100%;max-width:380px;display:flex;flex-direction:column;gap:20px}
    .logo{display:flex;align-items:center;gap:10px;font-size:22px;font-weight:700}
    .logo span{font-size:28px}
    .sub{font-size:13px;color:#94a3b8;margin-top:-12px}
    label{font-size:13px;color:#94a3b8;display:block;margin-bottom:6px}
    input{width:100%;background:#273449;border:1px solid #334155;border-radius:8px;padding:10px 14px;color:#f1f5f9;font-size:14px;outline:none}
    input:focus{border-color:#3b82f6}
    .btn{background:#3b82f6;color:#fff;border:none;border-radius:8px;padding:11px 18px;font-size:14px;font-weight:600;cursor:pointer;width:100%}
    .btn:hover{background:#2563eb}
  </style>
</head>
<body>
  <div class="card">
    <div>
      <div class="logo"><span>🦷</span>Toothy</div>
      <p class="sub">Административный чат с ИИ</p>
    </div>
    <form method="get" action="/chat" style="display:flex;flex-direction:column;gap:16px">
      <div>
        <label>Ключ доступа</label>
        <input type="password" name="key" placeholder="Admin key" autofocus autocomplete="off"/>
      </div>
      ${errorHtml}
      <button class="btn" type="submit">Войти</button>
    </form>
  </div>
</body>
</html>`;
}

export function renderChatPage(users: ChatUser[], adminKey: string): string {
  const usersJson = JSON.stringify(users);
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Toothy — ИИ-консультант</title>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --bg:#0f172a;--surface:#1e293b;--surface2:#273449;--border:#334155;
      --primary:#3b82f6;--primary-dark:#2563eb;
      --text:#f1f5f9;--muted:#94a3b8;
      --user-bubble:#2563eb;--ai-bubble:#1e293b;
      --error:#f87171;--radius:16px;--radius-sm:8px
    }
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--text);height:100dvh;display:flex;overflow:hidden}

    /* SIDEBAR */
    .sidebar{width:260px;flex-shrink:0;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden}
    .sidebar-header{padding:16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;flex-shrink:0}
    .sidebar-logo{font-size:20px}
    .sidebar-title{font-size:15px;font-weight:700}
    .sidebar-sub{font-size:11px;color:var(--muted)}
    .sidebar-search{padding:10px 12px;border-bottom:1px solid var(--border);flex-shrink:0}
    .sidebar-search input{width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:7px 10px;color:var(--text);font-size:13px;outline:none}
    .sidebar-search input:focus{border-color:var(--primary)}
    .user-list{flex:1;overflow-y:auto;padding:6px}
    .user-list::-webkit-scrollbar{width:3px}
    .user-list::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
    .user-item{padding:10px 12px;border-radius:var(--radius-sm);cursor:pointer;display:flex;flex-direction:column;gap:2px;border:1px solid transparent;margin-bottom:2px;transition:background 0.12s}
    .user-item:hover{background:var(--surface2)}
    .user-item.active{background:var(--surface2);border-color:var(--primary)}
    .user-name{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .user-email{font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .user-id{font-size:10px;color:#475569;font-family:monospace}
    .sidebar-logout{padding:12px;border-top:1px solid var(--border);flex-shrink:0}
    .btn-ghost{background:transparent;border:1px solid var(--border);color:var(--muted);font-size:12px;padding:7px 12px;border-radius:var(--radius-sm);cursor:pointer;width:100%}
    .btn-ghost:hover{border-color:var(--muted);color:var(--text)}

    /* CHAT AREA */
    .chat-area{flex:1;display:flex;flex-direction:column;overflow:hidden}
    .chat-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--border);background:var(--surface);flex-shrink:0;min-height:57px}
    .chat-header-info{display:flex;flex-direction:column;gap:2px}
    .chat-header-name{font-size:15px;font-weight:600}
    .chat-header-meta{font-size:11px;color:var(--muted);font-family:monospace}
    .chat-header-empty{font-size:14px;color:var(--muted)}
    .btn-new{background:transparent;border:1px solid var(--border);color:var(--muted);font-size:12px;padding:6px 12px;border-radius:var(--radius-sm);cursor:pointer}
    .btn-new:hover{color:var(--text);border-color:var(--muted)}

    /* MESSAGES */
    #messages{flex:1;overflow-y:auto;padding:20px 16px;display:flex;flex-direction:column;gap:12px;scroll-behavior:smooth}
    #messages::-webkit-scrollbar{width:4px}
    #messages::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px}
    .msg-row{display:flex;gap:10px;max-width:720px;width:100%}
    .msg-row.user{margin-left:auto;flex-direction:row-reverse}
    .avatar{width:30px;height:30px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:14px;margin-top:2px}
    .avatar.ai{background:var(--primary)}
    .avatar.user{background:#475569}
    .bubble-wrap{display:flex;flex-direction:column;max-width:calc(100% - 44px)}
    .bubble{padding:10px 14px;border-radius:14px;font-size:14px;line-height:1.55;word-break:break-word;white-space:pre-wrap}
    .bubble.ai{background:var(--ai-bubble);border:1px solid var(--border);border-top-left-radius:4px}
    .bubble.user{background:var(--user-bubble);border-top-right-radius:4px;color:#fff}
    .msg-time{font-size:10px;color:var(--muted);margin-top:4px}
    .msg-row.user .msg-time{text-align:right}
    .typing{display:flex;gap:4px;align-items:center;padding:12px 14px}
    .typing span{width:6px;height:6px;border-radius:50%;background:var(--muted);animation:bounce 1.2s infinite}
    .typing span:nth-child(2){animation-delay:.2s}
    .typing span:nth-child(3){animation-delay:.4s}
    @keyframes bounce{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-6px);opacity:1}}
    .empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;flex:1;color:var(--muted);font-size:14px;text-align:center;padding:40px}
    .empty-state .big{font-size:42px}
    .empty-state strong{color:var(--text);font-size:16px}
    .session-div{display:flex;align-items:center;gap:10px;color:var(--muted);font-size:11px;margin:4px 0}
    .session-div::before,.session-div::after{content:"";flex:1;height:1px;background:var(--border)}
    .no-user-placeholder{display:flex;align-items:center;justify-content:center;flex:1;color:var(--muted);font-size:14px}

    /* INPUT */
    .input-bar{display:flex;align-items:flex-end;gap:8px;padding:12px 16px;border-top:1px solid var(--border);background:var(--surface);flex-shrink:0}
    #msg-input{flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 14px;color:var(--text);font-size:14px;font-family:inherit;resize:none;outline:none;min-height:42px;max-height:140px;overflow-y:auto;line-height:1.5;transition:border-color .15s}
    #msg-input:focus{border-color:var(--primary)}
    #msg-input::placeholder{color:var(--muted)}
    #msg-input:disabled{opacity:.5}
    .send-btn{width:42px;height:42px;padding:0;border-radius:var(--radius-sm);background:var(--primary);border:none;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s}
    .send-btn:hover{background:var(--primary-dark)}
    .send-btn:disabled{opacity:.5;cursor:default}

    /* Toast */
    #toast{position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 18px;font-size:13px;opacity:0;transition:opacity .2s,transform .2s;pointer-events:none;white-space:nowrap;z-index:100}
    #toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
  </style>
</head>
<body>

<div class="sidebar">
  <div class="sidebar-header">
    <span class="sidebar-logo">🦷</span>
    <div>
      <div class="sidebar-title">Toothy</div>
      <div class="sidebar-sub">Чат с ИИ-консультантом</div>
    </div>
  </div>
  <div class="sidebar-search">
    <input type="text" id="search-input" placeholder="Поиск пользователя…" oninput="filterUsers(this.value)" />
  </div>
  <div style="padding:6px 6px 0">
    <div class="user-item" id="ui-__admin__" data-uid="__admin__" style="background:#1e3a5f;border-color:#2563eb" onclick="selectUser('__admin__')">
      <div class="user-name" style="color:#60a5fa">🤖 Тест ИИ (Админ)</div>
      <div class="user-email">Прямой чат без пользователя</div>
    </div>
  </div>
  <div class="user-list" id="user-list"></div>
  <div class="sidebar-logout">
    <button class="btn-ghost" onclick="location.href='/chat'">Выйти</button>
  </div>
</div>

<div class="chat-area">
  <div class="chat-header" id="chat-header">
    <span class="chat-header-empty">Выберите пользователя</span>
  </div>

  <div id="chat-body" style="display:flex;flex-direction:column;flex:1;overflow:hidden">
    <div class="no-user-placeholder" id="no-user-placeholder">← Выберите пользователя из списка</div>
    <div id="messages" style="display:none"></div>
    <div class="input-bar" id="input-bar" style="display:none">
      <textarea id="msg-input" placeholder="Сообщение…" rows="1" onkeydown="handleKey(event)" oninput="autoResize(this)" disabled></textarea>
      <button class="btn send-btn" id="send-btn" onclick="sendMessage()" disabled>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>
  </div>
</div>

<div id="toast"></div>

<script>
  const ALL_USERS = ${usersJson};
  const USERS_MAP = new Map(ALL_USERS.map(u => [u.id, u]));

  let currentUserId = null;
  let isLoading = false;
  const ADMIN_ID = '__admin__';

  // ── INIT ──
  renderUserList(ALL_USERS);

  function renderUserList(list) {
    const el = document.getElementById('user-list');
    if (list.length === 0) {
      el.innerHTML = '<p style="color:#94a3b8;font-size:13px;text-align:center;padding:20px">Пользователи не найдены</p>';
      return;
    }
    el.innerHTML = list.map(u => {
      const name = u.name || 'Без имени';
      const email = u.email || '';
      const shortId = u.id.slice(0, 8) + '…';
      const isActive = u.id === currentUserId ? ' active' : '';
      return \`<div class="user-item\${isActive}" id="ui-\${escHtml(u.id)}" data-uid="\${escHtml(u.id)}">
        <div class="user-name">\${escHtml(name)}</div>
        \${email ? \`<div class="user-email">\${escHtml(email)}</div>\` : ''}
        <div class="user-id">\${escHtml(shortId)}</div>
      </div>\`;
    }).join('');
    el.querySelectorAll('.user-item').forEach(item => {
      item.addEventListener('click', () => selectUser(item.dataset.uid));
    });
  }

  function filterUsers(q) {
    const lower = q.toLowerCase();
    const filtered = ALL_USERS.filter(u =>
      (u.name || '').toLowerCase().includes(lower) ||
      (u.email || '').toLowerCase().includes(lower) ||
      u.id.toLowerCase().includes(lower)
    );
    renderUserList(filtered);
  }

  async function selectUser(id) {
    document.querySelectorAll('.user-item').forEach(el => el.classList.remove('active'));
    const activeEl = document.getElementById('ui-' + id);
    if (activeEl) activeEl.classList.add('active');

    currentUserId = id;

    const header = document.getElementById('chat-header');
    const isAdmin = id === ADMIN_ID;

    if (isAdmin) {
      header.innerHTML = \`
        <div class="chat-header-info">
          <div class="chat-header-name" style="color:#60a5fa">🤖 Тест ИИ — Режим администратора</div>
          <div class="chat-header-meta">Прямой чат · история не сохраняется</div>
        </div>
        <button class="btn-new" onclick="clearAdminChat()">Очистить чат</button>
      \`;
    } else {
      const u = USERS_MAP.get(id);
      if (!u) return;
      header.innerHTML = \`
        <div class="chat-header-info">
          <div class="chat-header-name">\${escHtml(u.name || 'Без имени')}</div>
          <div class="chat-header-meta">\${u.email ? escHtml(u.email) + ' · ' : ''}\${u.id}</div>
        </div>
        <button class="btn-new" onclick="newSession()">+ Новый диалог</button>
      \`;
    }

    document.getElementById('no-user-placeholder').style.display = 'none';
    document.getElementById('messages').style.display = 'flex';
    document.getElementById('input-bar').style.display = 'flex';
    document.getElementById('msg-input').disabled = false;
    document.getElementById('send-btn').disabled = false;
    document.getElementById('msg-input').focus();

    if (isAdmin) {
      showEmpty();
    } else {
      await loadHistory(id);
    }
  }

  // ── HISTORY ──
  async function loadHistory(uid) {
    const messagesEl = document.getElementById('messages');
    messagesEl.innerHTML = '';
    try {
      const res = await fetch('/api/chat/history/' + encodeURIComponent(uid));
      if (!res.ok) throw new Error();
      const data = await res.json();
      const msgs = data.messages || [];
      if (msgs.length === 0) { showEmpty(); return; }
      for (const m of msgs) appendBubble(m.role, m.content, m.createdAt);
      scrollBottom();
    } catch { showEmpty(); }
  }

  function showEmpty() {
    const el = document.getElementById('messages');
    el.innerHTML = \`<div class="empty-state"><div class="big">🦷</div><strong>Нет сообщений</strong><span>Напишите первое сообщение</span></div>\`;
  }

  // ── SEND ──
  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }

  async function sendMessage() {
    if (isLoading || !currentUserId) return;
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
    input.disabled = true;

    const isAdmin = currentUserId === ADMIN_ID;
    const body = isAdmin
      ? { message: text }
      : { message: text, userId: currentUserId };

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      typingEl.remove();
      if (res.status === 429) {
        showToast('Достигнут дневной лимит сообщений');
        appendBubble('assistant', data.response || 'Лимит сообщений исчерпан.');
      } else if (!res.ok || data.error) {
        appendBubble('assistant', data.response || data.error || 'Произошла ошибка.');
      } else {
        appendBubble('assistant', data.response);
      }
      scrollBottom();
    } catch {
      typingEl.remove();
      appendBubble('assistant', 'Ошибка соединения.');
      scrollBottom();
    } finally {
      isLoading = false;
      document.getElementById('send-btn').disabled = false;
      input.disabled = false;
      input.focus();
    }
  }

  // ── ADMIN CLEAR ──
  function clearAdminChat() {
    const el = document.getElementById('messages');
    el.innerHTML = '';
    showEmpty();
    showToast('Чат очищен');
  }

  // ── NEW SESSION ──
  async function newSession() {
    if (!currentUserId || currentUserId === ADMIN_ID) return;
    if (!confirm('Начать новый диалог? Текущая история будет архивирована.')) return;
    try {
      await fetch('/api/chat/session/' + encodeURIComponent(currentUserId), { method: 'POST' });
      const div = document.createElement('div');
      div.className = 'session-div';
      div.textContent = '— Новый диалог —';
      document.getElementById('messages').appendChild(div);
      scrollBottom();
      showToast('Новый диалог начат');
    } catch { showToast('Ошибка при создании диалога'); }
  }

  // ── UI HELPERS ──
  function appendBubble(role, text, timestamp) {
    const isUser = role === 'user';
    const el = document.getElementById('messages');
    const row = document.createElement('div');
    row.className = 'msg-row ' + (isUser ? 'user' : 'ai');
    const t = timestamp
      ? new Date(timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      : new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    row.innerHTML = \`
      <div class="avatar \${isUser ? 'user' : 'ai'}">\${isUser ? '👤' : '🦷'}</div>
      <div class="bubble-wrap">
        <div class="bubble \${isUser ? 'user' : 'ai'}">\${escHtml(text)}</div>
        <div class="msg-time">\${t}</div>
      </div>\`;
    el.appendChild(row);
    return row;
  }

  function appendTyping() {
    const el = document.getElementById('messages');
    const row = document.createElement('div');
    row.className = 'msg-row ai';
    row.innerHTML = \`<div class="avatar ai">🦷</div><div class="bubble ai"><div class="typing"><span></span><span></span><span></span></div></div>\`;
    el.appendChild(row);
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

  function escHtml(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
</script>
</body>
</html>`;
}
