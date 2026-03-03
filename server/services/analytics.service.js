const prisma = require('../config/db');

const makeHttpError = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const parsePositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const sumBy = (items, getter) => items.reduce((acc, item) => acc + getter(item), 0);

const round = (value, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round((Number(value) || 0) * factor) / factor;
};

const aggregateDateCounts = (items, dateField, windowStart) => {
  const counts = new Map();
  for (const item of items) {
    const raw = item[dateField];
    if (!raw) continue;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime()) || date < windowStart) continue;
    const key = date.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }));
};

const getDeveloperProfileId = async (userId) => {
  const profile = await prisma.developerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return profile ? profile.id : null;
};

const getDeveloperOverview = async (userId) => {
  const developerId = await getDeveloperProfileId(userId);
  if (!developerId) {
    return {
      totals: {
        apps: 0,
        downloads: 0,
        favorites: 0,
        reviews: 0,
        averageRating: 0,
      },
      versions: {
        count: 0,
        downloads: 0,
        installs: 0,
      },
      statusBreakdown: {},
    };
  }

  const apps = await prisma.app.findMany({
    where: { developerId },
    select: {
      id: true,
      status: true,
      downloadCount: true,
      favoriteCount: true,
      reviewCount: true,
      averageRating: true,
    },
  });

  const totalDownloads = sumBy(apps, (app) => app.downloadCount || 0);
  const totalFavorites = sumBy(apps, (app) => app.favoriteCount || 0);
  const totalReviews = sumBy(apps, (app) => app.reviewCount || 0);
  const weightedRatingSum = sumBy(apps, (app) => (app.averageRating || 0) * (app.reviewCount || 0));
  const averageRating = totalReviews ? round(weightedRatingSum / totalReviews) : 0;

  const statusBreakdown = apps.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {});

  const versionAgg = await prisma.appVersion.aggregate({
    where: {
      app: {
        developerId,
      },
    },
    _count: { id: true },
    _sum: {
      downloadCount: true,
      installCount: true,
    },
  });

  return {
    totals: {
      apps: apps.length,
      downloads: totalDownloads,
      favorites: totalFavorites,
      reviews: totalReviews,
      averageRating,
    },
    versions: {
      count: versionAgg._count.id || 0,
      downloads: versionAgg._sum.downloadCount || 0,
      installs: versionAgg._sum.installCount || 0,
    },
    statusBreakdown,
  };
};

const getAppAnalytics = async ({ userId, appId }) => {
  const parsedAppId = parsePositiveInt(appId);
  if (!parsedAppId) throw makeHttpError('Invalid app id', 400);

  const app = await prisma.app.findUnique({
    where: { id: parsedAppId },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      downloadCount: true,
      favoriteCount: true,
      reviewCount: true,
      averageRating: true,
      developer: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!app) throw makeHttpError('App not found', 404);
  if (!app.developer || app.developer.userId !== userId) {
    throw makeHttpError('You can only view analytics for your own apps', 403);
  }

  const versions = await prisma.appVersion.findMany({
    where: { appId: app.id },
    select: {
      id: true,
      version: true,
      releaseDate: true,
      downloadCount: true,
      installCount: true,
      isStable: true,
      isPrerelease: true,
    },
    orderBy: [{ releaseDate: 'asc' }, { createdAt: 'asc' }],
  });

  const totalVersionDownloads = sumBy(versions, (version) => version.downloadCount || 0);
  const totalVersionInstalls = sumBy(versions, (version) => version.installCount || 0);
  const adoptionDenominator = totalVersionDownloads || app.downloadCount || 0;

  let cumulative = 0;
  const versionTrends = versions.map((version) => {
    const downloads = version.downloadCount || 0;
    cumulative += downloads;
    const adoptionRate = adoptionDenominator
      ? round((downloads / adoptionDenominator) * 100)
      : 0;

    return {
      id: version.id,
      version: version.version,
      releaseDate: version.releaseDate,
      downloads,
      installs: version.installCount || 0,
      cumulativeDownloads: cumulative,
      adoptionRate,
      isStable: version.isStable,
      isPrerelease: version.isPrerelease,
    };
  });

  const ratingRows = await prisma.review.groupBy({
    by: ['rating'],
    where: { appId: app.id },
    _count: {
      _all: true,
    },
  });

  const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratingRows.forEach((row) => {
    if (ratingBreakdown[row.rating] !== undefined) {
      ratingBreakdown[row.rating] = row._count._all;
    }
  });

  const daysWindow = 90;
  const windowStart = new Date(Date.now() - daysWindow * 24 * 60 * 60 * 1000);

  const [recentDownloads, recentFavorites] = await Promise.all([
    prisma.download.findMany({
      where: {
        appId: app.id,
        downloadedAt: { gte: windowStart },
      },
      select: { downloadedAt: true },
      orderBy: { downloadedAt: 'asc' },
    }),
    prisma.favorite.findMany({
      where: {
        appId: app.id,
        createdAt: { gte: windowStart },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  return {
    app: {
      id: app.id,
      name: app.name,
      slug: app.slug,
      status: app.status,
    },
    totals: {
      downloads: app.downloadCount || 0,
      favorites: app.favoriteCount || 0,
      reviews: app.reviewCount || 0,
      averageRating: round(app.averageRating || 0),
    },
    reviews: {
      count: app.reviewCount || 0,
      averageRating: round(app.averageRating || 0),
      ratingBreakdown,
    },
    versions: {
      totalVersions: versions.length,
      totalDownloads: totalVersionDownloads,
      totalInstalls: totalVersionInstalls,
      trends: versionTrends,
    },
    trends: {
      windowDays: daysWindow,
      dailyDownloads: aggregateDateCounts(recentDownloads, 'downloadedAt', windowStart),
      dailyFavorites: aggregateDateCounts(recentFavorites, 'createdAt', windowStart),
    },
  };
};

module.exports = {
  getDeveloperOverview,
  getAppAnalytics,
};
