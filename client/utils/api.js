import { qs, normalizeAppBundle } from './helpers.js';
import { store } from './store.js';

const API_BASE = window.localStorage.getItem('webharbour.apiBase') || 'http://localhost:4000';

const makeHeaders = (isJson = true) => {
  const session = store.getSession();
  const headers = {};
  if (isJson) headers['Content-Type'] = 'application/json';
  if (session.token) headers.Authorization = `Bearer ${session.token}`;
  return headers;
};

const parseResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    const error = new Error(body?.error?.message || body?.message || 'Something went wrong');
    error.status = response.status;
    error.code = body?.error?.code || 'REQUEST_FAILED';
    error.body = body;
    throw error;
  }
  return body;
};

const refreshSession = async () => {
  const session = store.getSession();
  if (!session.refreshToken) {
    store.clearSession();
    return null;
  }
  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  });
  const body = await parseResponse(response);
  const next = {
    token: body.token,
    refreshToken: body.refreshToken,
    user: body.user,
  };
  store.setSession(next);
  return next;
};

export const request = async (path, options = {}, retry = true) => {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || 'GET',
    headers: {
      ...makeHeaders(!isFormData),
      ...(options.headers || {}),
    },
    body: isFormData ? options.body : options.body ? JSON.stringify(options.body) : undefined,
  });

  try {
    return await parseResponse(response);
  } catch (error) {
    if (retry && error.status === 401 && store.getSession().refreshToken) {
      try {
        await refreshSession();
        return await request(path, options, false);
      } catch (_refreshError) {
        store.clearSession();
      }
    }
    throw error;
  }
};

const enrichApp = async (app) => {
  const [reviews, versions] = await Promise.all([
    request(`/apps/${app.id}/reviews`).catch(() => []),
    request(`/apps/${app.id}/versions`).catch(() => []),
  ]);
  return normalizeAppBundle(app, reviews, versions);
};

export const api = {
  base: API_BASE,
  request,
  getCatalog: async () => {
    const [categories, tags] = await Promise.all([request('/categories'), request('/tags')]);
    return { categories, tags };
  },
  listApps: async (params = {}, enrich = true) => {
    const result = await request(`/apps${qs(params)}`);
    if (!enrich) return result;
    const items = await Promise.all(result.items.map(enrichApp));
    return { ...result, items };
  },
  getAppBundle: async (id) => {
    const [app, reviews, versions] = await Promise.all([
      request(`/apps/${id}`),
      request(`/apps/${id}/reviews`),
      request(`/apps/${id}/versions`),
    ]);
    return normalizeAppBundle(app, reviews, versions);
  },
  login: (body) => request('/auth/login', { method: 'POST', body }),
  register: (body) => request('/auth/register', { method: 'POST', body }),
  me: () => request('/auth/me'),
  forgotPassword: (body) => request('/auth/password-reset/request', { method: 'POST', body }),
  resetPassword: (body) => request('/auth/password-reset/confirm', { method: 'POST', body }),
  logout: (body) => request('/auth/logout', { method: 'POST', body }),
  developerStatus: () => request('/auth/developer-status'),
  becomeDeveloper: () => request('/auth/become-developer', { method: 'POST' }),
  favorites: () => request('/users/me/favorites'),
  addFavorite: (id) => request(`/apps/${id}/favorite`, { method: 'POST' }),
  removeFavorite: (id) => request(`/apps/${id}/favorite`, { method: 'DELETE' }),
  downloadApp: (id, body = {}) => request(`/apps/${id}/download`, { method: 'POST', body }),
  createReview: (appId, body) => request(`/apps/${appId}/reviews`, { method: 'POST', body }),
  updateReview: (appId, reviewId, body) => request(`/apps/${appId}/reviews/${reviewId}`, { method: 'PATCH', body }),
  deleteReview: (appId, reviewId) => request(`/apps/${appId}/reviews/${reviewId}`, { method: 'DELETE' }),
  report: (body) => request('/reports', { method: 'POST', body }),
  createApp: (body) => request('/apps', { method: 'POST', body }),
  updateApp: (id, body) => request(`/apps/${id}`, { method: 'PATCH', body }),
  submitApp: (id) => request(`/apps/${id}/submit`, { method: 'POST' }),
  addVersion: (id, body) => request(`/apps/${id}/versions`, { method: 'POST', body }),
  uploadVersion: (id, body) => request(`/apps/${id}/versions/upload`, { method: 'POST', body }),
  developerOverview: () => request('/developer/analytics/overview'),
  developerAppAnalytics: (id) => request(`/developer/analytics/apps/${id}`),
  listReports: (params = {}) => request(`/admin/reports${qs(params)}`),
  resolveReport: (id, body) => request(`/admin/reports/${id}/resolve`, { method: 'PATCH', body }),
  listDeveloperRequests: (params = {}) => request(`/admin/developers/requests${qs(params)}`),
  approveDeveloper: (id) => request(`/admin/developers/${id}/approve`, { method: 'PATCH' }),
  rejectDeveloper: (id) => request(`/admin/developers/${id}/reject`, { method: 'PATCH' }),
  approveApp: (id, body = {}) => request(`/admin/apps/${id}/approve`, { method: 'PATCH', body }),
  rejectApp: (id, body) => request(`/admin/apps/${id}/reject`, { method: 'PATCH', body }),
  suspendApp: (id, body) => request(`/admin/apps/${id}/suspend`, { method: 'PATCH', body }),
  unsuspendApp: (id, body = {}) => request(`/admin/apps/${id}/unsuspend`, { method: 'PATCH', body }),
  createCategory: (body) => request('/categories', { method: 'POST', body }),
  createTag: (body) => request('/tags', { method: 'POST', body }),
};
