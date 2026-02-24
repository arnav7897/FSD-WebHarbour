const prisma = require('../config/db');

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

const appInclude = {
  category: true,
  tags: {
    include: {
      tag: true,
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

const listApps = async (query = {}) => {
  const { skip, limit, page } = parsePagination(query);
  const where = {};

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

  if (query.status) {
    const normalizedStatus = String(query.status).toUpperCase();
    if (!APP_STATUSES.includes(normalizedStatus)) {
      throw makeHttpError(`status must be one of: ${APP_STATUSES.join(', ')}`, 400);
    }
    where.status = normalizedStatus;
  } else {
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
  if (input.categoryId !== undefined) {
    data.categoryId = await ensureCategory(input.categoryId);
  }

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
        lastUpdatedAt: new Date(),
      },
      include: appInclude,
    });
  });

  return mapAppResult(updated);
};

const publishApp = async ({ appId, userId }) => {
  const parsedId = parseInteger(appId);
  if (!parsedId) throw makeHttpError('Invalid app id', 400);

  const ownedApp = await assertOwnership(parsedId, userId);

  if (ownedApp.status === 'PUBLISHED') {
    throw makeHttpError('App is already published', 409);
  }

  const published = await prisma.app.update({
    where: { id: parsedId },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date(),
      lastUpdatedAt: new Date(),
    },
    include: appInclude,
  });

  return mapAppResult(published);
};

const createAppVersion = async ({ appId, userId, body }) => {
  const parsedAppId = parseInteger(appId);
  if (!parsedAppId) throw makeHttpError('Invalid app id', 400);

  const { version, changelog, downloadUrl, fileSize, supportedOs } = body || {};
  if (!version || !downloadUrl) {
    throw makeHttpError('version and downloadUrl are required', 400);
  }

  const app = await assertOwnership(parsedAppId, userId);
  const normalizedSupportedOs = Array.isArray(supportedOs) && supportedOs.length
    ? supportedOs.map((item) => String(item).toUpperCase())
    : app.platforms;

  const invalidPlatform = normalizedSupportedOs.find((value) => !PLATFORMS.includes(value));
  if (invalidPlatform) {
    throw makeHttpError(`supportedOs contains invalid value: ${invalidPlatform}`, 400);
  }

  try {
    return await prisma.appVersion.create({
      data: {
        appId: parsedAppId,
        version: String(version),
        changelog: changelog ? String(changelog) : null,
        downloadUrl: String(downloadUrl),
        fileSize: fileSize ? String(fileSize) : '0 MB',
        supportedOs: normalizedSupportedOs,
      },
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

module.exports = {
  createApp,
  listApps,
  getAppById,
  updateApp,
  publishApp,
  createAppVersion,
  listAppVersions,
};
