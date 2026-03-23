const prisma = require('../config/db');

const DEFAULT_LIMITS = {
  recommended: 6,
  charts: 3,
  updates: 6,
};

const MAX_LIMIT = 24;
const SIGNAL_LOOKBACK = 50;

const appInclude = {
  category: true,
  tags: {
    include: {
      tag: true,
    },
  },
};

const mapAppResult = (app) => ({
  id: app.id,
  name: app.name,
  slug: app.slug,
  description: app.description,
  status: app.status,
  category: app.category,
  tags: (app.tags || []).map((entry) => entry.tag),
  developerId: app.developerId,
  createdAt: app.createdAt,
  updatedAt: app.updatedAt,
  publishedAt: app.publishedAt,
});

const parseLimit = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const normalized = Math.floor(parsed);
  if (normalized < 0) return fallback;
  return Math.min(normalized, MAX_LIMIT);
};

const buildBaseWhere = (excludeIds = []) => ({
  status: 'PUBLISHED',
  ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
});

const TRENDING_ORDER = [
  { downloadCount: 'desc' },
  { favoriteCount: 'desc' },
  { averageRating: 'desc' },
  { reviewCount: 'desc' },
  { publishedAt: 'desc' },
  { createdAt: 'desc' },
];

const NEW_ORDER = [
  { publishedAt: 'desc' },
  { createdAt: 'desc' },
];

const fetchApps = async ({ where, orderBy, take }) =>
  prisma.app.findMany({
    where,
    include: appInclude,
    orderBy,
    take,
  });

const getTrendingApps = async ({ limit, excludeIds = [] }) => {
  if (!limit) return [];
  return fetchApps({
    where: buildBaseWhere(excludeIds),
    orderBy: TRENDING_ORDER,
    take: limit,
  });
};

const getNewAndUpdatedApps = async ({ limit, excludeIds = [] }) => {
  if (!limit) return [];
  return fetchApps({
    where: buildBaseWhere(excludeIds),
    orderBy: NEW_ORDER,
    take: limit,
  });
};

const getUserSignals = async (userId) => {
  if (!userId) {
    return {
      topCategories: [],
      topTags: [],
      excludeIds: [],
    };
  }

  const [favorites, downloads] = await Promise.all([
    prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: SIGNAL_LOOKBACK,
      select: {
        appId: true,
        app: {
          select: {
            categoryId: true,
            tags: { select: { tagId: true } },
          },
        },
      },
    }),
    prisma.download.findMany({
      where: { userId },
      orderBy: { downloadedAt: 'desc' },
      take: SIGNAL_LOOKBACK,
      select: {
        appId: true,
        app: {
          select: {
            categoryId: true,
            tags: { select: { tagId: true } },
          },
        },
      },
    }),
  ]);

  const categoryCounts = new Map();
  const tagCounts = new Map();
  const excludeIds = new Set();

  const ingest = (entry) => {
    if (!entry?.app) return;
    excludeIds.add(entry.appId);
    if (entry.app.categoryId) {
      categoryCounts.set(
        entry.app.categoryId,
        (categoryCounts.get(entry.app.categoryId) || 0) + 1,
      );
    }
    (entry.app.tags || []).forEach((tag) => {
      if (!tag?.tagId) return;
      tagCounts.set(tag.tagId, (tagCounts.get(tag.tagId) || 0) + 1);
    });
  };

  favorites.forEach(ingest);
  downloads.forEach(ingest);

  const topCategories = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id);

  const topTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  return {
    topCategories,
    topTags,
    excludeIds: Array.from(excludeIds),
  };
};

const getRecommendedApps = async ({ userId, limit }) => {
  if (!limit) return [];

  const { topCategories, topTags, excludeIds } = await getUserSignals(userId);
  const hasSignals = topCategories.length || topTags.length;

  if (!hasSignals) {
    return getTrendingApps({ limit });
  }

  const where = buildBaseWhere(excludeIds);
  const orConditions = [];
  if (topCategories.length) {
    orConditions.push({ categoryId: { in: topCategories } });
  }
  if (topTags.length) {
    orConditions.push({ tags: { some: { tagId: { in: topTags } } } });
  }
  if (orConditions.length) {
    where.OR = orConditions;
  }

  const personalized = await fetchApps({
    where,
    orderBy: TRENDING_ORDER,
    take: limit,
  });

  if (personalized.length >= limit) {
    return personalized;
  }

  const remaining = limit - personalized.length;
  const fallback = await getTrendingApps({
    limit: remaining,
    excludeIds: [...excludeIds, ...personalized.map((app) => app.id)],
  });

  return [...personalized, ...fallback];
};

const getHomeRecommendations = async ({ user, query = {} }) => {
  const recommendedLimit = parseLimit(query.recommendedLimit, DEFAULT_LIMITS.recommended);
  const chartLimit = parseLimit(query.chartLimit, DEFAULT_LIMITS.charts);
  const updateLimit = parseLimit(query.updateLimit, DEFAULT_LIMITS.updates);

  const [recommended, charts, updates] = await Promise.all([
    getRecommendedApps({ userId: user?.id, limit: recommendedLimit }),
    getTrendingApps({ limit: chartLimit }),
    getNewAndUpdatedApps({ limit: updateLimit }),
  ]);

  return {
    recommended: recommended.map(mapAppResult),
    charts: charts.map(mapAppResult),
    updates: updates.map(mapAppResult),
  };
};

module.exports = {
  getHomeRecommendations,
};
