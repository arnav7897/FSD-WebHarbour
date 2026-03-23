const SESSION_KEY = 'webharbour.session';
const UI_KEY = 'webharbour.ui';
const ACTIVITY_KEY = 'webharbour.activity';

const safeRead = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (_error) {
    return fallback;
  }
};

const safeWrite = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const store = {
  getSession() {
    return safeRead(SESSION_KEY, {
      token: null,
      refreshToken: null,
      user: null,
    });
  },
  setSession(session) {
    safeWrite(SESSION_KEY, session);
  },
  clearSession() {
    localStorage.removeItem(SESSION_KEY);
  },
  getUi() {
    return safeRead(UI_KEY, {
      theme: 'light',
      lastSearch: '',
    });
  },
  setUi(ui) {
    safeWrite(UI_KEY, ui);
  },
  getActivity() {
    return safeRead(ACTIVITY_KEY, []);
  },
  pushActivity(entry) {
    const items = safeRead(ACTIVITY_KEY, []);
    items.unshift({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      createdAt: new Date().toISOString(),
      ...entry,
    });
    safeWrite(ACTIVITY_KEY, items.slice(0, 40));
  },
};
