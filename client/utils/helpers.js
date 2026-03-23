export const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const debounce = (fn, delay = 320) => {
  let timer = null;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
};

export const formatNumber = (value) => new Intl.NumberFormat('en-US', { notation: 'compact' }).format(Number(value || 0));

export const formatDate = (value) => {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

export const timeAgo = (value) => {
  if (!value) return 'recently';
  const date = new Date(value);
  const diff = date.getTime() - Date.now();
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const units = [
    ['year', 1000 * 60 * 60 * 24 * 365],
    ['month', 1000 * 60 * 60 * 24 * 30],
    ['week', 1000 * 60 * 60 * 24 * 7],
    ['day', 1000 * 60 * 60 * 24],
    ['hour', 1000 * 60 * 60],
    ['minute', 1000 * 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(diff) >= size || unit === 'minute') {
      return formatter.format(Math.round(diff / size), unit);
    }
  }
  return 'just now';
};

export const hashColor = (seed = '') => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['#34d399', '#60a5fa', '#f59e0b', '#fb7185', '#a78bfa', '#22d3ee'];
  return colors[Math.abs(hash) % colors.length];
};

export const initials = (name = '') =>
  String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'WH';

export const qs = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, value);
  });
  const output = search.toString();
  return output ? `?${output}` : '';
};

export const parseHash = () => {
  const raw = window.location.hash || '#/';
  const [pathPart, queryPart] = raw.slice(1).split('?');
  const path = pathPart || '/';
  return {
    path,
    query: Object.fromEntries(new URLSearchParams(queryPart || '')),
  };
};

export const ratingAverage = (reviews = []) => {
  if (!reviews.length) return 0;
  return reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length;
};

export const normalizeAppBundle = (app, reviews = [], versions = []) => {
  const averageRating = ratingAverage(reviews);
  const latestVersion = versions[0] || null;
  return {
    ...app,
    reviews,
    versions,
    reviewCount: reviews.length,
    averageRating,
    latestVersion,
    platforms: latestVersion?.supportedOs || ['WEB'],
    heroTone: hashColor(app.name),
  };
};

export const sortApps = (apps, sort) => {
  const items = [...apps];
  if (sort === 'rating') {
    return items.sort((a, b) => b.averageRating - a.averageRating || b.reviewCount - a.reviewCount);
  }
  if (sort === 'latest') {
    return items.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  }
  return items.sort((a, b) => b.reviewCount - a.reviewCount || new Date(b.createdAt) - new Date(a.createdAt));
};

export const paginate = (items, page = 1, size = 8) => {
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(Number(page) || 1, 1), totalPages);
  return {
    items: items.slice((current - 1) * size, current * size),
    page: current,
    totalPages,
    total: items.length,
  };
};
