import { renderLayout } from './components/layout.js';
import { showToast } from './components/ui.js';
import { renderAppDetailPage } from './pages/app-detail.js';
import { renderAuthPage } from './pages/auth.js';
import { renderDashboardPage, renderDeveloperPage, renderAdminPage } from './pages/dashboard.js';
import { renderHomePage } from './pages/home.js';
import { renderSearchPage } from './pages/search.js';
import { api } from './utils/api.js';
import { parseHash } from './utils/helpers.js';
import { resolveRoute } from './utils/router.js';
import { store } from './utils/store.js';

const state = {
  session: store.getSession(),
  ui: store.getUi(),
  catalog: {
    categories: [],
    tags: [],
  },
  favorites: [],
  favoriteIds: new Set(),
  activity: store.getActivity(),
};

const renderShell = (currentRoute) => {
  const app = document.getElementById('app');
  app.innerHTML = renderLayout({
    user: state.session.user,
    theme: state.ui.theme,
    currentRoute,
  });

  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    state.ui.theme = state.ui.theme === 'light' ? 'dark' : 'light';
    store.setUi(state.ui);
    render();
  });
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    try {
      if (state.session.refreshToken) {
        await api.logout({ refreshToken: state.session.refreshToken });
      }
    } catch (_error) {
      // Best-effort logout; local session is still cleared below.
    }
    store.clearSession();
    state.session = store.getSession();
    state.favorites = [];
    state.favoriteIds = new Set();
    showToast('Signed out', 'success');
    window.location.hash = '#/';
  });

  document.querySelector('[data-global-search]')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get('q');
    window.location.hash = `#/search?q=${encodeURIComponent(query || '')}`;
  });
};

const syncSession = async () => {
  if (!state.session.token) return;
  try {
    const user = await api.me();
    state.session.user = user;
    store.setSession(state.session);
  } catch (_error) {
    store.clearSession();
    state.session = store.getSession();
  }
};

const syncFavorites = async () => {
  if (!state.session.user) {
    state.favorites = [];
    state.favoriteIds = new Set();
    return;
  }
  try {
    state.favorites = await api.favorites();
    state.favoriteIds = new Set(state.favorites.map((entry) => entry.app.id));
  } catch (_error) {
    state.favorites = [];
    state.favoriteIds = new Set();
  }
};

const ctxFactory = (parsed, route) => {
  const myReview = state.currentApp?.reviews?.find((review) => review.userId === state.session.user?.id) || null;
  return {
    route: {
      ...route,
      query: parsed.query,
    },
    session: state.session,
    catalog: state.catalog,
    favorites: state.favorites,
    favoriteIds: state.favoriteIds,
    activity: state.activity,
    myReview,
    addActivity(entry) {
      store.pushActivity(entry);
      state.activity = store.getActivity();
    },
  };
};

const bindGlobalDelegates = () => {
  document.getElementById('page-root')?.addEventListener('click', async (event) => {
    const appTrigger = event.target.closest('[data-open-app]');
    if (appTrigger) {
      window.location.hash = `#/app/${appTrigger.dataset.openApp}`;
      return;
    }
    const favoriteTrigger = event.target.closest('[data-favorite-toggle]');
    if (favoriteTrigger) {
      if (!state.session.user) {
        window.location.hash = '#/login';
        return;
      }
      const appId = Number(favoriteTrigger.dataset.favoriteToggle);
      const nextActive = !state.favoriteIds.has(appId);
      favoriteTrigger.classList.toggle('active', nextActive);
      favoriteTrigger.textContent = nextActive ? 'Saved' : 'Save';
      if (nextActive) state.favoriteIds.add(appId);
      else state.favoriteIds.delete(appId);
      try {
        if (nextActive) await api.addFavorite(appId);
        else await api.removeFavorite(appId);
        state.favorites = await api.favorites().catch(() => state.favorites);
        state.favoriteIds = new Set(state.favorites.map((entry) => entry.app.id));
        showToast(nextActive ? 'Added to favorites' : 'Removed from favorites', 'success');
      } catch (error) {
        if (nextActive) state.favoriteIds.delete(appId);
        else state.favoriteIds.add(appId);
        favoriteTrigger.classList.toggle('active', !nextActive);
        favoriteTrigger.textContent = !nextActive ? 'Saved' : 'Save';
        showToast(error.message, 'error');
      }
    }
  });
};

const render = async () => {
  state.session = store.getSession();
  await syncFavorites();
  const parsed = parseHash();
  const route = resolveRoute(parsed.path);
  renderShell(route.key);
  bindGlobalDelegates();

  const ctx = ctxFactory(parsed, route);
  const pageMap = {
    home: renderHomePage,
    search: renderSearchPage,
    app: async (innerCtx) => {
      state.currentApp = await renderAppDetailPage(innerCtx);
    },
    login: renderAuthPage,
    register: renderAuthPage,
    forgot: renderAuthPage,
    reset: renderAuthPage,
    dashboard: renderDashboardPage,
    developer: renderDeveloperPage,
    admin: renderAdminPage,
  };

  try {
    await pageMap[ctx.route.key](ctx);
  } catch (error) {
    document.getElementById('page-root').innerHTML = `
      <section class="page-section">
        <div class="surface-block">
          <h2>Something blocked the view</h2>
          <p>${error.message}</p>
          <p class="soft-copy">Check that the API is running at <code>${api.base}</code> and that seeded data exists.</p>
        </div>
      </section>
    `;
  }
};

const boot = async () => {
  await syncSession();
  await syncFavorites();
  await render();
  window.addEventListener('hashchange', render);
};

boot();
