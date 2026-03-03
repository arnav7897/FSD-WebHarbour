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

const ensureAppExists = async (appId) => {
  const parsedAppId = parsePositiveInt(appId);
  if (!parsedAppId) throw makeHttpError('Invalid app id', 400);

  const app = await prisma.app.findUnique({
    where: { id: parsedAppId },
    select: {
      id: true,
      status: true,
      developerId: true,
      favoriteCount: true,
    },
  });

  if (!app) throw makeHttpError('App not found', 404);
  return app;
};

const resolveVersionForDownload = async ({ appId, versionId }) => {
  const parsedVersionId = parsePositiveInt(versionId);
  if (versionId !== undefined && versionId !== null && !parsedVersionId) {
    throw makeHttpError('versionId must be a positive integer', 400);
  }

  if (parsedVersionId) {
    const version = await prisma.appVersion.findFirst({
      where: { id: parsedVersionId, appId },
      select: { id: true },
    });
    if (!version) throw makeHttpError('Version not found for this app', 404);
    return version.id;
  }

  const latestVersion = await prisma.appVersion.findFirst({
    where: { appId },
    orderBy: [{ releaseDate: 'desc' }, { createdAt: 'desc' }],
    select: { id: true },
  });

  if (!latestVersion) {
    throw makeHttpError('No version available for download. Create an app version first.', 400);
  }

  return latestVersion.id;
};

const createDownloadRecord = async ({ appId, userId, body = {}, requestMeta = {} }) => {
  const app = await ensureAppExists(appId);
  const resolvedVersionId = await resolveVersionForDownload({
    appId: app.id,
    versionId: body.versionId,
  });

  const ipAddress =
    requestMeta.ipAddress === undefined || requestMeta.ipAddress === null
      ? null
      : String(requestMeta.ipAddress);
  const userAgent =
    requestMeta.userAgent === undefined || requestMeta.userAgent === null
      ? null
      : String(requestMeta.userAgent);

  const now = new Date();

  const created = await prisma.$transaction(async (tx) => {
    const download = await tx.download.create({
      data: {
        userId,
        appId: app.id,
        versionId: resolvedVersionId,
        ipAddress,
        userAgent,
        downloadMethod: 'api',
        downloadedAt: now,
      },
    });

    await tx.app.update({
      where: { id: app.id },
      data: {
        downloadCount: { increment: 1 },
        lastUpdatedAt: now,
      },
    });

    await tx.appVersion.update({
      where: { id: resolvedVersionId },
      data: {
        downloadCount: { increment: 1 },
        installCount: { increment: 1 },
      },
    });

    if (app.developerId) {
      await tx.developerProfile.update({
        where: { id: app.developerId },
        data: {
          totalDownloads: { increment: 1 },
        },
      });
    }

    return download;
  });

  return {
    id: created.id,
    appId: created.appId,
    versionId: created.versionId,
    userId: created.userId,
    downloadedAt: created.downloadedAt,
  };
};

const addFavorite = async ({ appId, userId }) => {
  const app = await ensureAppExists(appId);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const favorite = await tx.favorite.create({
        data: {
          userId,
          appId: app.id,
        },
      });

      await tx.app.update({
        where: { id: app.id },
        data: {
          favoriteCount: { increment: 1 },
        },
      });

      return favorite;
    });

    return {
      id: created.id,
      userId: created.userId,
      appId: created.appId,
      createdAt: created.createdAt,
    };
  } catch (err) {
    if (err.code === 'P2002') {
      throw makeHttpError('App already in favorites', 409);
    }
    throw err;
  }
};

const removeFavorite = async ({ appId, userId }) => {
  const app = await ensureAppExists(appId);

  const existing = await prisma.favorite.findUnique({
    where: {
      userId_appId: {
        userId,
        appId: app.id,
      },
    },
    select: { id: true },
  });

  if (!existing) {
    return { message: 'Favorite removed', removed: false };
  }

  await prisma.$transaction(async (tx) => {
    await tx.favorite.delete({
      where: { id: existing.id },
    });

    if (app.favoriteCount > 0) {
      await tx.app.update({
        where: { id: app.id },
        data: {
          favoriteCount: { decrement: 1 },
        },
      });
    }
  });

  return { message: 'Favorite removed', removed: true };
};

const listMyFavorites = async (userId) => {
  const favorites = await prisma.favorite.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      app: {
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          shortDescription: true,
          iconUrl: true,
          status: true,
          favoriteCount: true,
          averageRating: true,
          downloadCount: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  return favorites.map((entry) => ({
    favoriteId: entry.id,
    favoritedAt: entry.createdAt,
    app: entry.app,
  }));
};

module.exports = {
  createDownloadRecord,
  addFavorite,
  removeFavorite,
  listMyFavorites,
};
