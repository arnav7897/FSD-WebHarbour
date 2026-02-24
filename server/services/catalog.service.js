const prisma = require('../config/db');

const makeHttpError = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const slugify = (input) =>
  String(input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

const parsePositiveInt = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const uniqueSlug = async (model, base) => {
  const safeBase = slugify(base) || model;
  let candidate = safeBase;
  let i = 1;
  // Keep trying until a unique slug is found.
  // This keeps create APIs idempotent for same names in concurrent scenarios.
  // Database unique constraint remains the source of truth.
  // This is a best-effort pre-check to improve UX.
  // If race happens, caller handles P2002 conflict.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const exists =
      model === 'category'
        ? await prisma.category.findUnique({ where: { slug: candidate }, select: { id: true } })
        : await prisma.tag.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!exists) return candidate;
    i += 1;
    candidate = `${safeBase}-${i}`;
  }
};

const listCategories = async () =>
  prisma.category.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      iconUrl: true,
      parentId: true,
      order: true,
      isActive: true,
    },
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
  });

const createCategory = async (body = {}) => {
  const { name, slug, description, iconUrl, parentId, order, isActive } = body;
  if (!name || !String(name).trim()) {
    throw makeHttpError('name is required', 400);
  }

  const parsedParentId = parentId === undefined || parentId === null ? null : parsePositiveInt(parentId);
  if (parentId !== undefined && parentId !== null && !parsedParentId) {
    throw makeHttpError('parentId must be a positive integer', 400);
  }

  if (parsedParentId) {
    const parent = await prisma.category.findUnique({ where: { id: parsedParentId }, select: { id: true } });
    if (!parent) throw makeHttpError('parent category not found', 404);
  }

  const parsedOrder = order === undefined ? 0 : Number(order);
  if (!Number.isInteger(parsedOrder) || parsedOrder < 0) {
    throw makeHttpError('order must be a non-negative integer', 400);
  }

  const slugValue = slug && String(slug).trim() ? slugify(slug) : await uniqueSlug('category', name);

  try {
    return await prisma.category.create({
      data: {
        name: String(name).trim(),
        slug: slugValue,
        description: description ? String(description).trim() : null,
        iconUrl: iconUrl ? String(iconUrl).trim() : null,
        parentId: parsedParentId,
        order: parsedOrder,
        isActive: isActive === undefined ? true : Boolean(isActive),
      },
    });
  } catch (err) {
    if (err.code === 'P2002') throw makeHttpError('category name or slug already exists', 409);
    throw err;
  }
};

const listTags = async () =>
  prisma.tag.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      color: true,
      isFeatured: true,
    },
    orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }],
  });

const createTag = async (body = {}) => {
  const { name, slug, description, color, isFeatured } = body;
  if (!name || !String(name).trim()) throw makeHttpError('name is required', 400);

  const slugValue = slug && String(slug).trim() ? slugify(slug) : await uniqueSlug('tag', name);

  try {
    return await prisma.tag.create({
      data: {
        name: String(name).trim(),
        slug: slugValue,
        description: description ? String(description).trim() : null,
        color: color ? String(color).trim() : null,
        isFeatured: isFeatured === undefined ? false : Boolean(isFeatured),
      },
    });
  } catch (err) {
    if (err.code === 'P2002') throw makeHttpError('tag name or slug already exists', 409);
    throw err;
  }
};

module.exports = {
  listCategories,
  createCategory,
  listTags,
  createTag,
};
