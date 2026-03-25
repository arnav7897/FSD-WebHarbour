const prisma = require('../config/db');
const path = require('path');
const { buildSignedDownloadUrl } = require('./upload.service');
const { buildDownloadTarget } = require('./storage/file-storage.service');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const APP_STATUSES = ['DRAFT', 'UNDER_REVIEW', 'PUBLISHED', 'REJECTED', 'SUSPENDED', 'DEPRECATED'];
const PLATFORMS = [
  'WINDOWS',
  'MACOS',
  'LINUX',
  'WEB',
  'MOBILE_IOS',
  'MOBILE_ANDROID',
  'CROSS_PLATFORM',
];

const slugify = (input) =>
  String(input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const makeHttpError = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const parsePagination = (query = {}) => {
  const page = Math.max(Number(query.page) || DEFAULT_PAGE, 1);
  const limit = Math.min(Math.max(Number(query.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  return { page, limit, skip: (page - 1) * limit };
};

const parseInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const ensureCategory = async (categoryId) => {
  const parsedCategoryId = parseInteger(categoryId);
  if (!parsedCategoryId) {
    throw makeHttpError('categoryId is required and must be a positive integer', 400);
  }
  const category = await prisma.category.findUnique({ where: { id: parsedCategoryId } });
  if (!category) {
    throw makeHttpError('Category not found', 404);
  }
  return parsedCategoryId;
};

const normalizeTagIds = (tags) => {
  if (tags === undefined) return undefined;
  if (!Array.isArray(tags)) {
    throw makeHttpError('tags must be an array of tag IDs', 400);
  }
  const ids = tags.map((tagId) => parseInteger(tagId)).filter(Boolean);
  if (ids.length !== tags.length) {
    throw makeHttpError('tags must be an array of positive integers', 400);
  }
  return [...new Set(ids)];
};

const normalizeScreenshotUrls = (screenshots) => {
  if (screenshots === undefined) return undefined;
  if (screenshots === null) return [];
  if (!Array.isArray(screenshots)) {
    throw makeHttpError('screenshots must be an array of URLs', 400);
  }
  return screenshots
    .map((url) => String(url || '').trim())
    .filter(Boolean);
};

const ensureTagsExist = async (tagIds = []) => {
  if (!tagIds.length) return;
  const existing = await prisma.tag.findMany({
    where: { id: { in: tagIds } },
    select: { id: true },
  });
  if (existing.length !== tagIds.length) {
    throw makeHttpError('One or more tags do not exist', 404);
  }
};

const ensureUniqueSlug = async (name) => {
  const baseSlug = slugify(name) || 'app';
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.app.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) return slug;
    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }
};

const getOrCreateDeveloperProfile = async (userId) => {
  const existing = await prisma.developerProfile.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.developerProfile.create({ data: { userId } });
};

const mapAppAssetResult = (asset) => ({
  id: asset.id,
  appId: asset.appId,
  assetType: asset.assetType,
  label: asset.label,
  description: asset.description,
  filename: asset.filename,
  mimeType: asset.mimeType,
  byteSize: Number(asset.byteSize || 0),
  downloadPath: `/apps/${asset.appId}/assets/${asset.id}/download`,
  createdAt: asset.createdAt,
});

const mapAppResult = (app) => ({
  id: app.id,
  name: app.name,
  slug: app.slug,
  description: app.description,
  shortDescription: app.shortDescription,
  iconUrl: app.iconUrl,
  bannerUrl: app.bannerUrl,
  screenshots: Array.isArray(app.screenshots) ? app.screenshots : [],
  status: app.status,
  isFree: app.isFree,
  price: app.price,
  discountPrice: app.discountPrice,
  isOnSale: app.isOnSale,
  contentType: app.contentType,
  platforms: app.platforms,
  fileSize: app.fileSize,
  systemRequirements: app.systemRequirements,
  licenseType: app.licenseType,
  ageRating: app.ageRating,
  category: app.category,
  tags: (app.tags || []).map((entry) => entry.tag),
  assets: (app.assets || []).map(mapAppAssetResult),
  developerId: app.developerId,
  downloadCount: app.downloadCount,
  reviewCount: app.reviewCount,
  favoriteCount: app.favoriteCount,
  averageRating: app.averageRating,
  createdAt: app.createdAt,
  updatedAt: app.updatedAt,
  lastUpdatedAt: app.lastUpdatedAt,
  publishedAt: app.publishedAt,
});

const appInclude = {
  category: true,
  tags: {
    include: {
      tag: true,
    },
  },
  assets: {
    orderBy: {
      createdAt: 'desc',
    },
  },
};

const assertOwnership = async (appId, userId) => {
  const app = await prisma.app.findUnique({
    where: { id: appId },
    include: {
      developer: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!app) throw makeHttpError('App not found', 404);
  if (!app.developer || app.developer.userId !== userId) {
    throw makeHttpError('You can only manage your own apps', 403);
  }

  return app;
};

const createApp = async ({ userId, body }) => {
  const { name, description, categoryId, tags = [] } = body || {};

  if (!name || !description) {
    throw makeHttpError('name and description are required', 400);
  }

  const parsedCategoryId = await ensureCategory(categoryId);
  const tagIds = normalizeTagIds(tags) || [];
  await ensureTagsExist(tagIds);

  const profile = await getOrCreateDeveloperProfile(userId);
  const slug = await ensureUniqueSlug(name);

  const created = await prisma.app.create({
    data: {
      name,
      slug,
      description,
      status: 'DRAFT',
      categoryId: parsedCategoryId,
      developerId: profile.id,
      userId,
      platforms: ['WEB'],
      tags: tagIds.length
        ? {
          create: tagIds.map((tagId) => ({ tagId })),
        }
        : undefined,
    },
    include: appInclude,
  });

  return mapAppResult(created);
};

const listApps = async (query = {}, user = null) => {
  const { skip, limit, page } = parsePagination(query);
  const where = {};
  const wantsMine = String(query.mine || '').toLowerCase() === 'true';

  if (query.q) {
    where.OR = [
      { name: { contains: String(query.q), mode: 'insensitive' } },
      { description: { contains: String(query.q), mode: 'insensitive' } },
    ];
  }

  if (query.categoryId) {
    const parsedCategoryId = parseInteger(query.categoryId);
    if (!parsedCategoryId) {
      throw makeHttpError('categoryId must be a positive integer', 400);
    }
    where.categoryId = parsedCategoryId;
  }

  if (wantsMine) {
    if (!user) {
      throw makeHttpError('Authentication required for mine filter', 401);
    }
    if (!['DEVELOPER', 'ADMIN'].includes(user.role)) {
      throw makeHttpError('Only developers can use mine filter', 403);
    }
    where.userId = user.id;
  }

  if (query.status) {
    const normalizedStatus = String(query.status).toUpperCase();
    if (normalizedStatus === 'ALL') {
      if (!wantsMine) {
        throw makeHttpError('status=ALL requires mine=true', 400);
      }
    } else {
      if (!APP_STATUSES.includes(normalizedStatus)) {
        throw makeHttpError(`status must be one of: ${APP_STATUSES.join(', ')}`, 400);
      }
      where.status = normalizedStatus;
    }
  } else if (!wantsMine) {
    where.status = 'PUBLISHED';
  }

  if (query.tagId) {
    const parsedTagId = parseInteger(query.tagId);
    if (!parsedTagId) {
      throw makeHttpError('tagId must be a positive integer', 400);
    }
    where.tags = {
      some: {
        tagId: parsedTagId,
      },
    };
  }

  const [items, total] = await prisma.$transaction([
    prisma.app.findMany({
      where,
      include: appInclude,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.app.count({ where }),
  ]);

  return {
    items: items.map(mapAppResult),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  };
};

const getAppById = async (appId) => {
  const parsedId = parseInteger(appId);
  if (!parsedId) throw makeHttpError('Invalid app id', 400);

  const app = await prisma.app.findUnique({
    where: { id: parsedId },
    include: appInclude,
  });

  if (!app) throw makeHttpError('App not found', 404);
  return mapAppResult(app);
};

const updateApp = async ({ appId, userId, body }) => {
  const parsedId = parseInteger(appId);
  if (!parsedId) throw makeHttpError('Invalid app id', 400);

  await assertOwnership(parsedId, userId);
  const input = body || {};

  const data = {};
  if (input.name !== undefined) {
    if (!String(input.name).trim()) throw makeHttpError('name cannot be empty', 400);
    data.name = String(input.name).trim();
  }
  if (input.description !== undefined) {
    if (!String(input.description).trim()) throw makeHttpError('description cannot be empty', 400);
    data.description = String(input.description).trim();
  }
  if (input.shortDescription !== undefined) {
    const value = String(input.shortDescription || '').trim();
    data.shortDescription = value ? value : null;
  }
  if (input.categoryId !== undefined) {
    data.categoryId = await ensureCategory(input.categoryId);
  }
  if (input.iconUrl !== undefined) {
    data.iconUrl = input.iconUrl ? String(input.iconUrl).trim() : null;
  }
  if (input.bannerUrl !== undefined) {
    data.bannerUrl = input.bannerUrl ? String(input.bannerUrl).trim() : null;
  }

  const screenshotUrls = normalizeScreenshotUrls(input.screenshots);

  const tagIds = normalizeTagIds(input.tags);
  await ensureTagsExist(tagIds || []);

  const updated = await prisma.$transaction(async (tx) => {
    if (tagIds !== undefined) {
      await tx.appTag.deleteMany({ where: { appId: parsedId } });
      if (tagIds.length) {
        await tx.appTag.createMany({
          data: tagIds.map((tagId) => ({ appId: parsedId, tagId })),
        });
      }
    }

    return tx.app.update({
      where: { id: parsedId },
      data: {
        ...data,
        ...(screenshotUrls !== undefined ? { screenshots: screenshotUrls } : {}),
        lastUpdatedAt: new Date(),
      },
      include: appInclude,
    });
  });

  return mapAppResult(updated);
};

const updateAppMedia = async ({
  appId,
  userId,
  iconUrl,
  bannerUrl,
  screenshotUrls,
  screenshotMode = 'append',
}) => {
  const parsedId = parseInteger(appId);
  if (!parsedId) throw makeHttpError('Invalid app id', 400);

  const app = await assertOwnership(parsedId, userId);
  const data = {};

  if (iconUrl !== undefined) {
    data.iconUrl = iconUrl ? String(iconUrl).trim() : null;
  }
  if (bannerUrl !== undefined) {
    data.bannerUrl = bannerUrl ? String(bannerUrl).trim() : null;
  }

  if (screenshotUrls !== undefined) {
    const incoming = Array.isArray(screenshotUrls)
      ? screenshotUrls.map((url) => String(url || '').trim()).filter(Boolean)
      : [];
    if (screenshotMode === 'replace') {
      data.screenshots = incoming;
    } else {
      const existing = Array.isArray(app.screenshots) ? app.screenshots : [];
      const merged = [...existing, ...incoming].filter(Boolean);
      data.screenshots = [...new Set(merged)];
    }
  }

  const updated = await prisma.app.update({
    where: { id: parsedId },
    data: {
      ...data,
      lastUpdatedAt: new Date(),
    },
    include: appInclude,
  });

  return mapAppResult(updated);
};

const publishApp = async ({ appId, userId }) => {
  const parsedId = parseInteger(appId);
  if (!parsedId) throw makeHttpError('Invalid app id', 400);

  await assertOwnership(parsedId, userId);
  throw makeHttpError(
    'Direct publish is disabled. Submit app for review using /apps/:id/submit',
    409,
  );
};

const createAppVersion = async ({ appId, userId, body }) => {
  const parsedAppId = parseInteger(appId);
  if (!parsedAppId) throw makeHttpError('Invalid app id', 400);

  const {
    version,
    changelog,
    downloadUrl,
    downloadPublicId,
    downloadFormat,
    downloadFilename,
    storageProvider,
    storageBucket,
    storageKey,
    storageObjectUrl,
    mimeType,
    fileSize,
    supportedOs,
  } = body || {};
  if (!version || !downloadUrl) {
    throw makeHttpError('version and downloadUrl are required', 400);
  }

  const app = await assertOwnership(parsedAppId, userId);
  const parsePlatformList = (input) => {
    if (!input) return [];
    if (Array.isArray(input)) return input;
    if (typeof input === 'string') {
      return input.split(',').map((part) => part.trim()).filter(Boolean);
    }
    return [];
  };

  const platformInput = parsePlatformList(supportedOs).length ? parsePlatformList(supportedOs) : app.platforms;
  const normalizedSupportedOs = (platformInput || []).map((item) => {
    const upper = String(item || '').toUpperCase().trim();
    if (upper === 'ANDROID') return 'MOBILE_ANDROID';
    if (upper === 'IOS') return 'MOBILE_IOS';
    return upper;
  });

  const invalidPlatform = normalizedSupportedOs.find((value) => !PLATFORMS.includes(value));
  if (invalidPlatform) {
    throw makeHttpError(`supportedOs contains invalid value: ${invalidPlatform}`, 400);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const created = await tx.appVersion.create({
        data: {
          appId: parsedAppId,
          version: String(version),
          changelog: changelog ? String(changelog) : null,
          downloadUrl: String(downloadUrl),
          downloadPublicId: downloadPublicId ? String(downloadPublicId) : null,
          downloadFormat: downloadFormat ? String(downloadFormat) : null,
          downloadFilename: downloadFilename ? String(downloadFilename) : null,
          storageProvider: storageProvider ? String(storageProvider) : null,
          storageBucket: storageBucket ? String(storageBucket) : null,
          storageKey: storageKey ? String(storageKey) : null,
          storageObjectUrl: storageObjectUrl ? String(storageObjectUrl) : null,
          mimeType: mimeType ? String(mimeType) : null,
          fileSize: fileSize ? String(fileSize) : '0 MB',
          supportedOs: normalizedSupportedOs,
        },
      });

      if (changelog) {
        await tx.versionChangeLog.create({
          data: {
            versionId: created.id,
            changeType: 'OTHER',
            title: `Release ${created.version}`,
            description: String(changelog),
            authorId: userId,
            affectedPlatforms: normalizedSupportedOs,
          },
        });
      }

      await tx.versionAnalytics.upsert({
        where: { versionId: created.id },
        update: {},
        create: {
          versionId: created.id,
          appId: parsedAppId,
          date: new Date(),
          period: 'DAILY',
        },
      });

      return created;
    });
  } catch (err) {
    if (err.code === 'P2002') {
      throw makeHttpError('This version already exists for the app', 409);
    }
    throw err;
  }
};

const listAppVersions = async (appId) => {
  const parsedAppId = parseInteger(appId);
  if (!parsedAppId) throw makeHttpError('Invalid app id', 400);

  const app = await prisma.app.findUnique({
    where: { id: parsedAppId },
    select: { id: true },
  });

  if (!app) throw makeHttpError('App not found', 404);

  return prisma.appVersion.findMany({
    where: { appId: parsedAppId },
    orderBy: { releaseDate: 'desc' },
  });
};

const parseCloudinaryUrl = (url) => {
  if (!url) return null;
  try {
    const parsed = new URL(String(url));
    const marker = '/raw/upload/';
    const idx = parsed.pathname.indexOf(marker);
    if (idx === -1) return null;
    let publicPath = parsed.pathname.slice(idx + marker.length);
    publicPath = publicPath.replace(/^v\d+\//, '');
    publicPath = decodeURIComponent(publicPath);
    const ext = path.extname(publicPath);
    const format = ext ? ext.slice(1) : null;
    const publicId = ext ? publicPath.slice(0, -ext.length) : publicPath;
    const filename = publicPath.split('/').pop();
    if (!publicId) return null;
    return { publicId, format, filename };
  } catch {
    return null;
  }
};

const getVersionDownloadInfo = async ({ appId, versionId }) => {
  const parsedAppId = parseInteger(appId);
  if (!parsedAppId) throw makeHttpError('Invalid app id', 400);

  const parsedVersionId = versionId ? parseInteger(versionId) : null;

  const app = await prisma.app.findUnique({
    where: { id: parsedAppId },
    select: { id: true },
  });
  if (!app) throw makeHttpError('App not found', 404);

  const version = parsedVersionId
    ? await prisma.appVersion.findFirst({
      where: { id: parsedVersionId, appId: parsedAppId },
      orderBy: { releaseDate: 'desc' },
    })
    : await prisma.appVersion.findFirst({
      where: { appId: parsedAppId },
      orderBy: [{ releaseDate: 'desc' }, { createdAt: 'desc' }],
    });

  if (!version) {
    throw makeHttpError('No version available for download. Create an app version first.', 400);
  }

  let signedUrl = buildSignedDownloadUrl({
    publicId: version.downloadPublicId,
    format: version.downloadFormat,
    filename: version.downloadFilename,
  });

  if (version.storageProvider && (version.storageKey || version.storageObjectUrl)) {
    try {
      const storageUrl = await buildDownloadTarget({
        storageProvider: version.storageProvider,
        storageBucket: version.storageBucket,
        storageKey: version.storageKey,
        storageObjectUrl: version.storageObjectUrl,
        filename: version.downloadFilename,
        mimeType: version.mimeType,
      });
      if (storageUrl) {
        signedUrl = storageUrl;
      }
    } catch (err) {
      if (!version.downloadUrl && !signedUrl) throw err;
    }
  }

  if (!signedUrl && version.downloadUrl) {
    const parsed = parseCloudinaryUrl(version.downloadUrl);
    if (parsed) {
      signedUrl = buildSignedDownloadUrl({
        publicId: parsed.publicId,
        format: parsed.format,
        filename: parsed.filename,
      });
    }
  }
  const finalUrl = signedUrl || version.downloadUrl;
  if (!finalUrl) {
    throw makeHttpError('No download URL available for this version.', 400);
  }

  return {
    appId: app.id,
    versionId: version.id,
    version: version.version,
    downloadUrl: finalUrl,
  };
};

module.exports = {
  createApp,
  listApps,
  getAppById,
  updateApp,
  updateAppMedia,
  publishApp,
  createAppVersion,
  listAppVersions,
  getVersionDownloadInfo,
};
