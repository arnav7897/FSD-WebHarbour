const api = (() => {
  const base = () => CONFIG.API_BASE_URL.replace(/\/$/, "");

  async function request(path, options = {}, retry = true) {
    const headers = options.headers || {};
    const token = auth.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${base()}${path}`, { ...options, headers });
    if (res.status === 401 && retry) {
      const refreshed = await auth.refresh();
      if (refreshed) return request(path, options, false);
    }

    const text = await res.text();
    const data = text ? safeJson(text) : null;
    if (!res.ok) throw normalizeError(res.status, data);
    return data;
  }

  function safeJson(text) {
    try { return JSON.parse(text); } catch { return { raw: text }; }
  }

  function normalizeError(status, data) {
    if (data && data.error) {
      return { status, ...data.error };
    }
    return { status, code: "UNKNOWN", message: "Request failed" };
  }

  const get = (path) => request(path);
  const post = (path, body) => request(path, { method: "POST", body: JSON.stringify(body || {}) });
  const postForm = (path, formData) => request(path, { method: "POST", body: formData });
  const patch = (path, body) => request(path, { method: "PATCH", body: JSON.stringify(body || {}) });
  const del = (path) => request(path, { method: "DELETE" });

  return { get, post, postForm, patch, del };
})();
