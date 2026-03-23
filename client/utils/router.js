export const routeMatchers = [
  { key: 'home', pattern: /^\/$/ },
  { key: 'search', pattern: /^\/search$/ },
  { key: 'app', pattern: /^\/app\/(\d+)$/ },
  { key: 'login', pattern: /^\/login$/ },
  { key: 'register', pattern: /^\/register$/ },
  { key: 'forgot', pattern: /^\/forgot$/ },
  { key: 'reset', pattern: /^\/reset$/ },
  { key: 'dashboard', pattern: /^\/dashboard$/ },
  { key: 'developer', pattern: /^\/developer$/ },
  { key: 'admin', pattern: /^\/admin$/ },
];

export const resolveRoute = (path) => {
  for (const route of routeMatchers) {
    const match = path.match(route.pattern);
    if (match) {
      return {
        key: route.key,
        params: match.slice(1),
      };
    }
  }
  return {
    key: 'home',
    params: [],
  };
};

export const navigate = (to) => {
  window.location.hash = to.startsWith('#') ? to : `#${to}`;
};
