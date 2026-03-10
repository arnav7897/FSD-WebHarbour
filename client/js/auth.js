const auth = (() => {
  const ACCESS_KEY = "wh_access";
  const REFRESH_KEY = "wh_refresh";
  let currentUser = null;

  function getAccessToken() {
    return localStorage.getItem(ACCESS_KEY);
  }

  function getRefreshToken() {
    return localStorage.getItem(REFRESH_KEY);
  }

  function setTokens(access, refresh) {
    if (access) localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  }

  function clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    currentUser = null;
  }

  async function login(email, password) {
    const data = await api.post("/auth/login", { email, password });
    const access = data.token || data.accessToken;
    setTokens(access, data.refreshToken);
    await bootstrap();
    return data;
  }

  async function register(payload) {
    return api.post("/auth/register", payload);
  }

  async function bootstrap() {
    try {
      const data = await api.get("/auth/me");
      currentUser = data.user || data;
      return currentUser;
    } catch {
      currentUser = null;
      return null;
    }
  }

  async function refresh() {
    const token = getRefreshToken();
    if (!token) return false;
    try {
      const data = await api.post("/auth/refresh", { refreshToken: token });
      const access = data.token || data.accessToken;
      setTokens(access, data.refreshToken);
      return true;
    } catch {
      clear();
      return false;
    }
  }

  async function logout() {
    const token = getRefreshToken();
    if (token) {
      try { await api.post("/auth/logout", { refreshToken: token }); } catch {}
    }
    clear();
  }

  function isLoggedIn() {
    return Boolean(getAccessToken());
  }

  function getUser() {
    return currentUser;
  }

  function hasRole(role) {
    if (!currentUser || !currentUser.role) return false;
    if (currentUser.role === "ADMIN") return true;
    if (currentUser.role === "DEVELOPER") return role === "DEVELOPER" || role === "USER";
    return role === "USER";
  }

  return {
    login,
    register,
    bootstrap,
    refresh,
    logout,
    isLoggedIn,
    getUser,
    getAccessToken,
    hasRole
  };
})();
