const STORAGE = {
  user: "vitek.web.currentUser",
  api: "vitek.web.apiBase",
  settings: "vitek.web.settings",
  read: "vitek.web.readMarkers",
  conversations: "vitek.web.conversations"
};

const phrases = [
  "Проверяем соединение...",
  "Читаем ваши сообщения...",
  "Анализируем переписку...",
  "Сохраняем ваши секреты...",
  "Передаём данные куда надо...",
  "Почти готово..."
];

const defaultSettings = {
  accent: "#745cff",
  compactMode: false,
  enterToSend: true,
  notifications: false,
  sound: true,
  readReceipts: true,
  lastSeen: true,
  autoLock: false,
  apiBase: localStorage.getItem(STORAGE.api) || window.VITEK_CONFIG?.API_BASE || "http://localhost:8081"
};

const state = {
  booted: false,
  authMode: "login",
  user: readJSON(STORAGE.user, null),
  settings: { ...defaultSettings, ...readJSON(STORAGE.settings, {}) },
  view: "chats",
  mobileList: true,
  conversations: readJSON(STORAGE.conversations, []),
  selectedConversation: null,
  messages: [],
  searchResults: [],
  searchQuery: "",
  chatSearch: "",
  chatSearchIndex: 0,
  filter: "all",
  busy: false,
  error: "",
  toast: "",
  stickyDate: "",
  typingHint: false,
  readMarkers: readJSON(STORAGE.read, {})
};

const app = document.getElementById("app");
let pollTimer = null;
let splashTimer = null;
let stickyTimer = null;

function icon(name) {
  const icons = {
    chats: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    user: '<path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/>',
    settings: '<path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    attach: '<path d="m21.4 11.6-8.9 8.9a6 6 0 0 1-8.5-8.5l9.7-9.7a4 4 0 0 1 5.7 5.7l-9.7 9.7a2 2 0 1 1-2.8-2.8l8.9-8.9"/>',
    smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01"/><path d="M15 9h.01"/>',
    more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><rect width="14" height="14" x="2" y="2" rx="2"/>',
    check: '<path d="m20 6-11 11-5-5"/>',
    chevrons: '<path d="m17 6-7 7-3-3"/><path d="m22 6-7 7-3-3"/>'
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.more}</svg>`;
}

function render() {
  applyTheme();
  if (!state.booted) {
    renderSplash();
    return;
  }
  if (!state.user) {
    renderAuth();
    return;
  }
  renderMessenger();
}

function renderSplash() {
  app.innerHTML = `
    <main class="app-shell">
      <section class="splash">
        <div class="splash-inner">
          <img class="splash-logo" src="./assets/VitekFullLogo.png" alt="Vitëk" />
          <div class="splash-card glass">
            <div class="splash-lines" id="splashLines">
              ${phrases.map((phrase, index) => `<div class="splash-line ${index === 0 ? "active" : ""}" data-index="${index}">${index === 0 ? "▶" : ""}<span>${phrase}</span></div>`).join("")}
            </div>
          </div>
          <div class="splash-progress">
            <div class="progress-track"><div class="progress-fill" id="progressFill"></div></div>
            <div class="splash-caption" id="progressCaption">Загрузка... 0%</div>
          </div>
        </div>
        <div class="privacy-joke">🔒 Конфиденциальность — это не про нас</div>
      </section>
    </main>
  `;

  let step = 0;
  const total = phrases.length + 2;
  clearInterval(splashTimer);
  splashTimer = setInterval(() => {
    step += 1;
    const active = Math.min(step, phrases.length - 1);
    document.querySelectorAll(".splash-line").forEach((line, index) => {
      line.classList.toggle("active", index === active);
      line.innerHTML = `${index === active ? "▶" : ""}<span>${phrases[index]}</span>`;
      line.style.transform = `translateY(${-Math.max(0, active - 2) * 34}px)`;
    });
    const progress = Math.min(100, Math.round((step / total) * 100));
    document.getElementById("progressFill").style.width = `${progress}%`;
    document.getElementById("progressCaption").textContent = `Загрузка... ${progress}%`;
    if (step >= total) {
      clearInterval(splashTimer);
      state.booted = true;
      refreshAfterBoot();
    }
  }, 760);
}

async function refreshAfterBoot() {
  render();
  if (state.user) {
    await refreshConversations();
    startPolling();
  }
}

function renderAuth() {
  app.innerHTML = `
    <main class="app-shell">
      <section class="auth-layout">
        <div class="auth-card glass">
          <div class="brand">
            <img class="brand-icon" src="./assets/VitekIcon.png" alt="Vitëk" />
            <h1 class="brand-title">Vitëk</h1>
            <p class="brand-subtitle">Самый честный мессенджер.</p>
          </div>
          <div class="segmented">
            <button class="${state.authMode === "login" ? "active" : ""}" data-auth-mode="login">Вход</button>
            <button class="${state.authMode === "register" ? "active" : ""}" data-auth-mode="register">Регистрация</button>
          </div>
          <form class="form" id="authForm">
            ${state.authMode === "register" ? `
              <label class="field"><span>Имя</span><input class="input" name="fullName" autocomplete="name" placeholder="Артём" required /></label>
              <label class="field"><span>Username</span><input class="input" name="username" autocomplete="username" placeholder="artem" required /></label>
            ` : ""}
            <label class="field"><span>Почта</span><input class="input" name="email" type="email" autocomplete="email" placeholder="you@example.com" required /></label>
            <label class="field"><span>Пароль</span><input class="input" name="password" type="password" autocomplete="${state.authMode === "login" ? "current-password" : "new-password"}" placeholder="Минимум 8 символов" required /></label>
            <label class="field"><span>API сервер</span><input class="input" name="apiBase" value="${escapeAttr(state.settings.apiBase)}" placeholder="http://localhost:8081" /></label>
            ${state.error ? `<div class="error-box">${escapeHTML(state.error)}</div>` : ""}
            <button class="primary-btn" type="submit" ${state.busy ? "disabled" : ""}>${state.busy ? "Подключаемся..." : state.authMode === "login" ? "Войти" : "Создать аккаунт"}</button>
            <div class="info-box">Локально: сначала запусти backend, затем эту web-страницу. Для телефона укажи IP-адрес Mac вместо localhost.</div>
          </form>
        </div>
      </section>
      ${renderToast()}
    </main>
  `;

  document.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.authMode = button.dataset.authMode;
      state.error = "";
      render();
    });
  });
  document.getElementById("authForm").addEventListener("submit", submitAuth);
}

function renderMessenger() {
  app.innerHTML = `
    <main class="app-shell">
      <section class="messenger">
        ${renderNav()}
        ${renderSidebar()}
        <section class="workspace ${state.mobileList ? "mobile-hidden" : ""}">
          ${state.view === "chats" ? renderChatWorkspace() : ""}
          ${state.view === "search" ? renderSearchWorkspace() : ""}
          ${state.view === "profile" ? renderProfileWorkspace() : ""}
          ${state.view === "settings" ? renderSettingsWorkspace() : ""}
        </section>
      </section>
      ${renderMobileTabs()}
      ${renderToast()}
    </main>
  `;
  bindMessengerEvents();
}

function renderNav() {
  const items = [
    ["chats", "chats", "Чаты"],
    ["search", "search", "Поиск"],
    ["profile", "user", "Профиль"],
    ["settings", "settings", "Настройки"]
  ];
  return `
    <nav class="nav">
      <div class="traffic"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></div>
      <img class="nav-logo" src="./assets/VitekIcon.png" alt="Vitëk" />
      ${items.map(([view, iconName, label]) => `
        <button class="nav-item ${state.view === view ? "active" : ""}" data-view="${view}" title="${label}">
          ${icon(iconName)}<span>${label}</span>
        </button>
      `).join("")}
      <div class="nav-bottom">
        <div class="mini-user">
          ${avatarHTML(state.user)}
          <span>${escapeHTML(shortName(state.user.fullName))}</span>
          <span class="online-dot" title="Онлайн"></span>
        </div>
      </div>
    </nav>
  `;
}

function renderSidebar() {
  if (state.view === "search") {
    return `
      <aside class="sidebar ${state.mobileList ? "mobile-visible" : ""}">
        <div class="sidebar-head">
          <div class="search-box">${icon("search")}<input id="globalSearch" value="${escapeAttr(state.searchQuery)}" placeholder="Username..." autocomplete="off" /></div>
          <button class="primary-btn" id="runSearch">Найти пользователя</button>
          ${state.error ? `<div class="error-box">${escapeHTML(state.error)}</div>` : ""}
        </div>
        <div class="search-results">
          ${state.searchResults.length ? state.searchResults.map(renderSearchResult).join("") : `<div class="empty-card glass"><h2>Поиск по username</h2><p>Введи username без @ и начни новый чат.</p></div>`}
        </div>
      </aside>
    `;
  }

  const unreadTotal = state.conversations.reduce((sum, conversation) => sum + unreadCount(conversation), 0);
  const visible = filteredConversations();
  return `
    <aside class="sidebar ${state.mobileList ? "mobile-visible" : ""}">
      <div class="sidebar-head">
        <div class="search-box">${icon("search")}<input id="chatListSearch" value="${escapeAttr(state.searchQuery)}" placeholder="Поиск" autocomplete="off" /></div>
        <div class="filters">
          <button class="filter-btn ${state.filter === "all" ? "active" : ""}" data-filter="all">Все</button>
          <button class="filter-btn ${state.filter === "unread" ? "active" : ""}" data-filter="unread">Непрочитанные ${unreadTotal ? `<span class="badge">${unreadTotal}</span>` : ""}</button>
        </div>
      </div>
      <div class="chat-list">
        ${visible.length ? visible.map(renderConversationCard).join("") : `<div class="empty-card glass"><h2>Пока тихо</h2><p>Найди пользователя по username и начни переписку.</p></div>`}
      </div>
    </aside>
  `;
}

function renderConversationCard(conversation) {
  const unread = unreadCount(conversation);
  const active = state.selectedConversation?.id === conversation.id;
  return `
    <button class="chat-card ${active ? "active" : ""}" data-conversation="${conversation.id}">
      ${avatarHTML(conversation.participant)}
      <div class="chat-main">
        <div class="row"><span class="name">${escapeHTML(conversation.participant.fullName)}</span><span class="time">${formatShortTime(conversation.updatedAt)}</span></div>
        <div class="preview">${escapeHTML(conversation.lastPreview || "Нет сообщений")}</div>
      </div>
      <div>${unread ? `<span class="badge">${unread}</span>` : ""}</div>
    </button>
  `;
}

function renderSearchResult(user) {
  return `
    <button class="result-card" data-user="${user.id}">
      ${avatarHTML(user)}
      <div class="result-main">
        <div class="name">${escapeHTML(user.fullName)}</div>
        <div class="subtle">@${escapeHTML(user.username)}</div>
      </div>
      <span class="badge">+</span>
    </button>
  `;
}

function renderChatWorkspace() {
  if (!state.selectedConversation) {
    return `
      <div class="empty-state">
        <div class="empty-card glass">
          <img src="./assets/VitekIcon.png" alt="Vitëk" />
          <h2>Выбери чат</h2>
          <p>Или открой поиск, найди человека по username и начни переписку.</p>
        </div>
      </div>
    `;
  }
  const peer = state.selectedConversation.participant;
  return `
    <section class="chat-view">
      <header class="chat-header">
        <div class="peer">
          <button class="icon-btn mobile-back" id="mobileBack" title="Назад">${icon("back")}</button>
          ${avatarHTML(peer)}
          <div class="peer-meta">
            <div class="name">${escapeHTML(peer.fullName)}</div>
            <div class="subtle">${state.settings.lastSeen ? "онлайн" : "статус скрыт"} · @${escapeHTML(peer.username)}</div>
          </div>
        </div>
        <div class="header-tools">
          <div class="chat-search">${icon("search")}<input id="messageSearch" value="${escapeAttr(state.chatSearch)}" placeholder="Поиск в чате" />${searchCountLabel()}</div>
          <button class="icon-btn" id="prevMatch" title="Предыдущее">↑</button>
          <button class="icon-btn" id="nextMatch" title="Следующее">↓</button>
        </div>
      </header>
      <div class="messages-wrap" id="messagesWrap">
        <div class="sticky-date ${state.stickyDate ? "show" : ""}" id="stickyDate">${escapeHTML(state.stickyDate)}</div>
        ${renderMessages()}
      </div>
      <footer class="composer">
        <input id="imageInput" type="file" accept="image/*" hidden />
        <button class="icon-btn" id="attachImage" title="Прикрепить изображение">${icon("attach")}</button>
        <textarea id="messageInput" placeholder="Сообщение..." rows="1"></textarea>
        <button class="icon-btn emoji-btn" id="emojiButton" title="Добавить эмодзи">${icon("smile")}</button>
        <button class="send-btn" id="sendMessage" title="Отправить">${icon("send")}</button>
      </footer>
    </section>
  `;
}

function renderMessages() {
  if (!state.messages.length) {
    return `<div class="empty-state"><div class="empty-card glass"><h2>История пуста</h2><p>Напиши первым. Это будет выглядеть почти ответственно.</p></div></div>`;
  }

  let lastDay = "";
  return state.messages.map((message) => {
    const day = dayKey(message.createdAt);
    const divider = day !== lastDay ? `<div class="date-divider" data-date="${formatDate(message.createdAt)}">${formatDate(message.createdAt)}</div>` : "";
    lastDay = day;
    const isMe = message.senderID === state.user.id;
    const content = message.kind === "image"
      ? `<img class="bubble-image" src="${escapeAttr(message.payload)}" alt="Изображение" />`
      : `<div class="bubble-text">${highlight(escapeHTML(message.payload || "Не удалось расшифровать"), state.chatSearch)}</div>`;
    return `
      ${divider}
      <div class="message-row ${isMe ? "me" : ""}" data-date="${formatDate(message.createdAt)}" data-message-id="${message.id}">
        <div class="bubble">
          ${content}
          <div class="bubble-meta"><span>${formatTime(message.createdAt)}</span><span>${isMe ? messageStatus(message) : ""}</span></div>
        </div>
      </div>
    `;
  }).join("");
}

function renderSearchWorkspace() {
  return `
    <section class="panel-view">
      <header class="panel-header">
        <h1>Поиск</h1>
        <p class="subtle">Найди человека по username, открой профиль и начни чат.</p>
      </header>
      <div class="panel-content">
        <div class="settings-grid">
          <div class="settings-card glass">
            <h2>Быстрый поиск</h2>
            <div class="form">
              <label class="field"><span>Username</span><input class="input" id="searchPageInput" value="${escapeAttr(state.searchQuery)}" placeholder="например, artem" /></label>
              <button class="primary-btn" id="searchPageButton">Найти</button>
            </div>
          </div>
          <div class="settings-card glass">
            <h2>Результаты</h2>
            ${state.searchResults.length ? state.searchResults.map(renderSearchResult).join("") : `<p class="subtle">Результаты появятся здесь.</p>`}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderProfileWorkspace() {
  return `
    <section class="panel-view">
      <header class="panel-header">
        <h1>Профиль</h1>
        <p class="subtle">Так тебя видят другие пользователи Vitëk.</p>
      </header>
      <div class="panel-content">
        <div class="settings-grid">
          <div class="settings-card glass">
            <div class="profile-hero">
              ${avatarHTML(state.user)}
              <div>
                <h2>${escapeHTML(state.user.fullName)}</h2>
                <p class="subtle">@${escapeHTML(state.user.username)}</p>
                <div class="avatar-actions">
                  <input id="avatarInput" type="file" accept="image/*" hidden />
                  <button class="secondary-btn" id="changeAvatar">Сменить фото</button>
                  <button class="secondary-btn" id="copyUsername">${icon("copy")} @${escapeHTML(state.user.username)}</button>
                </div>
              </div>
            </div>
            <div class="info-box">Онлайн · Аккаунт создан ${formatDate(state.user.createdAt)}</div>
          </div>
          <form class="settings-card glass form" id="profileForm">
            <h2>Данные аккаунта</h2>
            <label class="field"><span>Имя</span><input class="input" name="fullName" value="${escapeAttr(state.user.fullName)}" required /></label>
            <label class="field"><span>Username</span><input class="input" name="username" value="${escapeAttr(state.user.username)}" required /></label>
            <label class="field"><span>Почта</span><input class="input" type="email" name="email" value="${escapeAttr(state.user.email)}" required /></label>
            <button class="primary-btn" type="submit">Сохранить профиль</button>
          </form>
        </div>
      </div>
    </section>
  `;
}

function renderSettingsWorkspace() {
  return `
    <section class="panel-view">
      <header class="panel-header">
        <h1>Настройки</h1>
        <p class="subtle">Поведение, приватность, внешний вид и подключение к серверу.</p>
      </header>
      <div class="panel-content">
        <div class="settings-grid">
          <div class="settings-card glass form">
            <h2>Подключение</h2>
            <label class="field"><span>API сервер</span><input class="input" id="apiBaseInput" value="${escapeAttr(state.settings.apiBase)}" /></label>
            <button class="secondary-btn" id="checkServer">Проверить соединение</button>
            <button class="primary-btn" id="saveApi">Сохранить адрес</button>
          </div>
          <div class="settings-card glass">
            <h2>Внешний вид</h2>
            <div class="accent-swatches">
              ${["#745cff", "#2f6bff", "#00b8a9", "#ff6b4a", "#ff4fa3"].map((color) => `<button class="swatch ${state.settings.accent === color ? "active" : ""}" data-accent="${color}" style="background:${color}" title="${color}"></button>`).join("")}
            </div>
            ${toggleRow("compactMode", "Компактный список чатов", "Больше переписок помещается на экране.")}
          </div>
          <div class="settings-card glass">
            <h2>Поведение</h2>
            ${toggleRow("enterToSend", "Enter отправляет сообщение", "Shift + Enter переносит строку.")}
            ${toggleRow("notifications", "Уведомления браузера", "Для будущих входящих сообщений.")}
            ${toggleRow("sound", "Звук отправки", "Мягкий отклик при отправке.")}
          </div>
          <div class="settings-card glass">
            <h2>Приватность</h2>
            ${toggleRow("readReceipts", "Показывать прочтение", "Две выделенные галочки для прочитанных.")}
            ${toggleRow("lastSeen", "Показывать онлайн", "Отображать твой статус в интерфейсе.")}
            ${toggleRow("autoLock", "Автоблокировка", "Пока сохраняется как настройка браузера.")}
            <button class="danger-btn" id="logoutButton">Выйти из аккаунта</button>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderMobileTabs() {
  return `
    <nav class="mobile-tabbar">
      ${[
        ["chats", "Чаты"],
        ["search", "Поиск"],
        ["profile", "Профиль"],
        ["settings", "Настройки"]
      ].map(([view, label]) => `<button class="${state.view === view ? "active" : ""}" data-view="${view}">${label}</button>`).join("")}
    </nav>
  `;
}

function renderToast() {
  const message = state.toast || state.error;
  if (!message) return "";
  return `<div class="toast">${escapeHTML(message)}</div>`;
}

function bindMessengerEvents() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      state.mobileList = state.view === "chats" && !state.selectedConversation;
      state.error = "";
      render();
    });
  });

  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      render();
    });
  });

  document.querySelectorAll("[data-conversation]").forEach((button) => {
    button.addEventListener("click", async () => {
      const conversation = state.conversations.find((item) => item.id === button.dataset.conversation);
      if (conversation) {
        await selectConversation(conversation);
      }
    });
  });

  document.querySelectorAll("[data-user]").forEach((button) => {
    button.addEventListener("click", () => openConversationWithUser(button.dataset.user));
  });

  const globalSearch = document.getElementById("globalSearch");
  if (globalSearch) {
    globalSearch.addEventListener("input", (event) => {
      state.searchQuery = event.target.value;
    });
    globalSearch.addEventListener("keydown", (event) => {
      if (event.key === "Enter") runUserSearch();
    });
  }

  const chatListSearch = document.getElementById("chatListSearch");
  if (chatListSearch) {
    chatListSearch.addEventListener("input", (event) => {
      state.searchQuery = event.target.value;
      render();
    });
  }

  document.getElementById("runSearch")?.addEventListener("click", runUserSearch);
  document.getElementById("searchPageButton")?.addEventListener("click", () => {
    state.searchQuery = document.getElementById("searchPageInput").value;
    runUserSearch();
  });

  document.getElementById("mobileBack")?.addEventListener("click", () => {
    state.mobileList = true;
    render();
  });

  const messageInput = document.getElementById("messageInput");
  if (messageInput) {
    messageInput.addEventListener("input", () => {
      state.typingHint = Boolean(messageInput.value.trim());
      autoGrow(messageInput);
    });
    messageInput.addEventListener("keydown", (event) => {
      if (state.settings.enterToSend && event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendCurrentMessage();
      }
    });
  }

  document.getElementById("sendMessage")?.addEventListener("click", sendCurrentMessage);
  document.getElementById("emojiButton")?.addEventListener("click", () => {
    const input = document.getElementById("messageInput");
    input.value += input.value ? " 🙂" : "🙂";
    input.focus();
    autoGrow(input);
  });
  document.getElementById("attachImage")?.addEventListener("click", () => document.getElementById("imageInput").click());
  document.getElementById("imageInput")?.addEventListener("change", sendImageFile);

  const messagesWrap = document.getElementById("messagesWrap");
  if (messagesWrap) {
    messagesWrap.addEventListener("scroll", updateStickyDate);
    requestAnimationFrame(() => {
      messagesWrap.scrollTop = messagesWrap.scrollHeight;
      updateStickyDate();
    });
  }

  const messageSearch = document.getElementById("messageSearch");
  if (messageSearch) {
    messageSearch.addEventListener("input", (event) => {
      state.chatSearch = event.target.value;
      state.chatSearchIndex = 0;
      render();
      scrollToMatch();
    });
  }
  document.getElementById("nextMatch")?.addEventListener("click", () => shiftMatch(1));
  document.getElementById("prevMatch")?.addEventListener("click", () => shiftMatch(-1));

  document.getElementById("profileForm")?.addEventListener("submit", saveProfile);
  document.getElementById("changeAvatar")?.addEventListener("click", () => document.getElementById("avatarInput").click());
  document.getElementById("avatarInput")?.addEventListener("change", updateAvatar);
  document.getElementById("copyUsername")?.addEventListener("click", copyUsername);

  document.querySelectorAll("[data-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.toggle;
      state.settings[key] = !state.settings[key];
      saveSettings();
      render();
    });
  });

  document.querySelectorAll("[data-accent]").forEach((button) => {
    button.addEventListener("click", () => {
      state.settings.accent = button.dataset.accent;
      saveSettings();
      render();
    });
  });

  document.getElementById("saveApi")?.addEventListener("click", () => {
    state.settings.apiBase = normalizeAPI(document.getElementById("apiBaseInput").value);
    saveSettings();
    toast("Адрес сервера сохранён");
    render();
  });
  document.getElementById("checkServer")?.addEventListener("click", checkServer);
  document.getElementById("logoutButton")?.addEventListener("click", logout);
}

async function submitAuth(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  state.busy = true;
  state.error = "";
  state.settings.apiBase = normalizeAPI(form.get("apiBase"));
  saveSettings();
  render();

  try {
    const payload = {
      email: form.get("email"),
      password: form.get("password")
    };
    if (state.authMode === "register") {
      payload.fullName = form.get("fullName");
      payload.username = form.get("username");
      payload.publicKeyBase64 = randomBase64(32);
    }
    const user = await api(state.authMode === "register" ? "/auth/register" : "/auth/login", {
      method: "POST",
      body: payload
    });
    state.user = normalizeUser(user);
    localStorage.setItem(STORAGE.user, JSON.stringify(state.user));
    state.view = "chats";
    state.mobileList = true;
    await refreshConversations();
    startPolling();
  } catch (error) {
    state.error = friendlyError(error);
  } finally {
    state.busy = false;
    render();
  }
}

async function refreshConversations() {
  if (!state.user) return;
  try {
    const conversations = await api(`/users/${state.user.id}/conversations`);
    state.conversations = conversations.map(normalizeConversation);
    localStorage.setItem(STORAGE.conversations, JSON.stringify(state.conversations));
    if (state.selectedConversation) {
      const refreshed = state.conversations.find((item) => item.id === state.selectedConversation.id);
      if (refreshed) state.selectedConversation = refreshed;
    }
  } catch (error) {
    state.error = friendlyError(error);
  }
}

async function selectConversation(conversation) {
  state.selectedConversation = conversation;
  state.mobileList = false;
  markRead(conversation.id);
  render();
  await loadMessages();
}

async function loadMessages() {
  if (!state.selectedConversation) return;
  try {
    const encrypted = await api(`/threads/${state.selectedConversation.id}/messages`);
    const messages = [];
    for (const message of encrypted) {
      messages.push(await normalizeMessage(message));
    }
    state.messages = messages;
    markRead(state.selectedConversation.id);
  } catch (error) {
    state.error = friendlyError(error);
  }
  render();
}

async function runUserSearch() {
  const query = state.searchQuery.trim().replace(/^@/, "").toLowerCase();
  if (!query) {
    state.searchResults = [];
    render();
    return;
  }
  try {
    const users = await api(`/users/search?q=${encodeURIComponent(query)}&excluding=${encodeURIComponent(state.user.id)}`);
    state.searchResults = users.map(normalizeUser);
    state.error = users.length ? "" : "Пользователь не найден";
  } catch (error) {
    state.searchResults = state.conversations
      .map((conversation) => conversation.participant)
      .filter((user) => user.username.includes(query) || user.fullName.toLowerCase().includes(query));
    state.error = state.searchResults.length ? "" : friendlyError(error);
  }
  render();
}

async function openConversationWithUser(userID) {
  const user = state.searchResults.find((item) => item.id === userID);
  if (!user) return;
  const id = threadID(state.user.id, user.id);
  const existing = state.conversations.find((item) => item.id === id);
  const conversation = existing || {
    id,
    participant: user,
    updatedAt: new Date().toISOString(),
    lastPreview: "Нет сообщений"
  };
  if (!existing) {
    state.conversations = [conversation, ...state.conversations];
    localStorage.setItem(STORAGE.conversations, JSON.stringify(state.conversations));
  }
  state.view = "chats";
  await selectConversation(conversation);
}

async function sendCurrentMessage() {
  const input = document.getElementById("messageInput");
  const text = input?.value.trim();
  if (!text || !state.selectedConversation) return;
  input.value = "";
  state.typingHint = false;
  await sendPayload("text", text);
}

async function sendImageFile(event) {
  const file = event.target.files?.[0];
  if (!file || !state.selectedConversation) return;
  const dataURL = await readFileAsDataURL(file);
  await sendPayload("image", dataURL);
  event.target.value = "";
}

async function sendPayload(kind, payload) {
  try {
    const encryptedBody = await encryptPayload(state.selectedConversation.id, payload);
    await api("/messages", {
      method: "POST",
      body: {
        senderID: state.user.id,
        recipientID: state.selectedConversation.participant.id,
        kind,
        encryptedBody
      }
    });
    await refreshConversations();
    await loadMessages();
  } catch (error) {
    state.error = friendlyError(error);
    render();
  }
}

async function saveProfile(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    const updated = await api(`/users/${state.user.id}`, {
      method: "PATCH",
      body: {
        email: form.get("email"),
        fullName: form.get("fullName"),
        username: form.get("username"),
        avatarData: state.user.avatarData || null
      }
    });
    state.user = normalizeUser(updated);
    localStorage.setItem(STORAGE.user, JSON.stringify(state.user));
    toast("Профиль обновлён");
    await refreshConversations();
  } catch (error) {
    state.error = friendlyError(error);
  }
  render();
}

async function updateAvatar(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const avatarData = await resizeImage(file, 512);
  try {
    const updated = await api(`/users/${state.user.id}`, {
      method: "PATCH",
      body: {
        email: state.user.email,
        fullName: state.user.fullName,
        username: state.user.username,
        avatarData: avatarData.split(",")[1]
      }
    });
    state.user = normalizeUser(updated);
    localStorage.setItem(STORAGE.user, JSON.stringify(state.user));
    toast("Аватар обновлён");
  } catch (error) {
    state.error = friendlyError(error);
  }
  render();
}

async function checkServer() {
  state.settings.apiBase = normalizeAPI(document.getElementById("apiBaseInput").value);
  saveSettings();
  try {
    const health = await api("/health");
    toast(`Сервер работает. Пользователей: ${health.users}, сообщений: ${health.messages}`);
  } catch (error) {
    state.error = friendlyError(error);
  }
  render();
}

function logout() {
  stopPolling();
  localStorage.removeItem(STORAGE.user);
  state.user = null;
  state.conversations = [];
  state.selectedConversation = null;
  state.messages = [];
  state.searchResults = [];
  state.error = "";
  render();
}

async function api(path, options = {}) {
  const base = normalizeAPI(state.settings.apiBase);
  const response = await fetch(`${base}${path}`, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "serverUnavailable");
  }
  return data;
}

async function encryptPayload(thread, payload) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await threadKey(thread);
  const encoded = new TextEncoder().encode(payload);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded));
  const packed = new Uint8Array(iv.length + cipher.length);
  packed.set(iv, 0);
  packed.set(cipher, iv.length);
  return bytesToBase64(packed);
}

async function decryptPayload(thread, encryptedBody) {
  try {
    const packed = base64ToBytes(encryptedBody);
    const iv = packed.slice(0, 12);
    const cipher = packed.slice(12);
    const key = await threadKey(thread);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
    return new TextDecoder().decode(plain);
  } catch {
    return "";
  }
}

async function threadKey(thread) {
  const source = new TextEncoder().encode(`vitek-web-local:${thread}`);
  const hash = await crypto.subtle.digest("SHA-256", source);
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function normalizeMessage(message) {
  return {
    id: message.id,
    threadID: message.threadID,
    senderID: message.senderID,
    recipientID: message.recipientID,
    kind: message.kind,
    payload: await decryptPayload(message.threadID, message.encryptedBody),
    createdAt: message.createdAt,
    deliveredAt: message.deliveredAt
  };
}

function normalizeUser(user) {
  return {
    ...user,
    username: String(user.username || "").toLowerCase(),
    avatarData: user.avatarData || null
  };
}

function normalizeConversation(conversation) {
  return {
    ...conversation,
    participant: normalizeUser(conversation.participant)
  };
}

function filteredConversations() {
  const query = state.searchQuery.trim().toLowerCase();
  return state.conversations.filter((conversation) => {
    const participant = conversation.participant;
    const matchesQuery = !query
      || participant.fullName.toLowerCase().includes(query)
      || participant.username.toLowerCase().includes(query);
    const matchesFilter = state.filter === "all" || unreadCount(conversation) > 0;
    return matchesQuery && matchesFilter;
  });
}

function unreadCount(conversation) {
  const readAt = state.readMarkers[conversation.id] || "";
  if (!conversation.updatedAt || conversation.updatedAt <= readAt) return 0;
  if (state.selectedConversation?.id === conversation.id) return 0;
  return 1;
}

function markRead(thread) {
  state.readMarkers[thread] = new Date().toISOString();
  localStorage.setItem(STORAGE.read, JSON.stringify(state.readMarkers));
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(async () => {
    await refreshConversations();
    if (state.selectedConversation) await loadMessages();
  }, 5000);
}

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

function saveSettings() {
  state.settings.apiBase = normalizeAPI(state.settings.apiBase);
  localStorage.setItem(STORAGE.settings, JSON.stringify(state.settings));
  localStorage.setItem(STORAGE.api, state.settings.apiBase);
}

function toggleRow(key, title, description) {
  return `
    <div class="toggle-row">
      <div><strong>${title}</strong><div class="subtle">${description}</div></div>
      <button class="switch ${state.settings[key] ? "on" : ""}" data-toggle="${key}" aria-label="${title}"></button>
    </div>
  `;
}

function avatarHTML(user) {
  const image = user?.avatarData ? `data:image/jpeg;base64,${user.avatarData}` : "";
  const initials = (user?.fullName || user?.username || "V").trim().slice(0, 1).toUpperCase();
  return `<div class="avatar">${image ? `<img src="${escapeAttr(image)}" alt="" />` : escapeHTML(initials)}</div>`;
}

function messageStatus(message) {
  if (!state.settings.readReceipts) return icon("check");
  return message.deliveredAt ? icon("chevrons") : icon("check");
}

function searchCountLabel() {
  const count = matchMessages().length;
  return count ? `<span class="badge">${state.chatSearchIndex + 1}/${count}</span>` : "";
}

function matchMessages() {
  const query = state.chatSearch.trim().toLowerCase();
  if (!query) return [];
  return state.messages.filter((message) => (message.payload || "").toLowerCase().includes(query));
}

function shiftMatch(delta) {
  const matches = matchMessages();
  if (!matches.length) return;
  state.chatSearchIndex = (state.chatSearchIndex + delta + matches.length) % matches.length;
  scrollToMatch();
  render();
}

function scrollToMatch() {
  const matches = matchMessages();
  if (!matches.length) return;
  const target = document.querySelector(`[data-message-id="${matches[state.chatSearchIndex].id}"]`);
  target?.scrollIntoView({ block: "center", behavior: "smooth" });
}

function highlight(html, query) {
  const clean = query.trim();
  if (!clean) return html;
  const escaped = escapeRegExp(escapeHTML(clean));
  return html.replace(new RegExp(`(${escaped})`, "gi"), "<mark>$1</mark>");
}

function updateStickyDate() {
  const wrap = document.getElementById("messagesWrap");
  if (!wrap) return;
  const rows = [...wrap.querySelectorAll(".message-row")];
  const current = rows.findLast ? rows.findLast((row) => row.offsetTop - wrap.scrollTop < 96) : rows.reverse().find((row) => row.offsetTop - wrap.scrollTop < 96);
  const nextDate = current?.dataset.date || state.stickyDate || "";
  state.stickyDate = nextDate;
  const sticky = document.getElementById("stickyDate");
  if (sticky) {
    sticky.textContent = nextDate;
    sticky.classList.add("show");
  }
  clearTimeout(stickyTimer);
  stickyTimer = setTimeout(() => sticky?.classList.remove("show"), 1400);
}

function formatDate(value) {
  const date = new Date(value);
  const now = new Date();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (dayKey(date) === dayKey(now)) return "Сегодня";
  if (dayKey(date) === dayKey(yesterday)) return "Вчера";
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function formatTime(value) {
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function formatShortTime(value) {
  const date = new Date(value);
  const now = new Date();
  if (dayKey(date) === dayKey(now)) return formatTime(date);
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" }).format(date);
}

function dayKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  return [date.getFullYear(), date.getMonth(), date.getDate()].join("-");
}

function threadID(first, second) {
  return [first, second].sort().join(":");
}

function normalizeAPI(value) {
  const trimmed = String(value || "").trim().replace(/\/+$/, "");
  if (!trimmed) return "http://localhost:8081";
  return /^https?:\/\//.test(trimmed) ? trimmed : `http://${trimmed}`;
}

function friendlyError(error) {
  const code = error?.message || String(error);
  const map = {
    badCredentials: "Неверная почта или пароль.",
    emailTaken: "Эта почта уже занята.",
    invalidEmail: "Проверь формат почты.",
    invalidName: "Укажи имя.",
    invalidPassword: "Пароль должен быть не короче 8 символов.",
    invalidUsername: "Username: 3-24 символа, латиница, цифры, точка или подчёркивание.",
    serverUnavailable: "Сервер недоступен. Проверь адрес API и запущен ли backend.",
    usernameTaken: "Этот username уже занят.",
    userNotFound: "Пользователь не найден."
  };
  return map[code] || "Что-то пошло не так. Проверь сервер и попробуй ещё раз.";
}

function toast(message) {
  state.toast = message;
  state.error = "";
  setTimeout(() => {
    state.toast = "";
  }, 2200);
}

function copyUsername() {
  navigator.clipboard?.writeText(`@${state.user.username}`);
  toast("Username скопирован");
}

function autoGrow(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = `${Math.min(textarea.scrollHeight, 138)}px`;
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function resizeImage(file, maxSize) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.84));
    };
    image.onerror = reject;
    image.src = URL.createObjectURL(file);
  });
}

function randomBase64(length) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return bytesToBase64(bytes);
}

function bytesToBase64(bytes) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary = atob(base64 || "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function readJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHTML(value);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function shortName(value) {
  return String(value || "Я").split(" ")[0];
}

function applyTheme() {
  document.documentElement.style.setProperty("--accent", state.settings.accent);
}

window.addEventListener("online", () => refreshConversations());
window.addEventListener("beforeunload", stopPolling);

render();
