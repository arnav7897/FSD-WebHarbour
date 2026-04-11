const prisma = require('../config/db');

const REPORT_TYPES = ['APP', 'REVIEW', 'USER'];
const REPORT_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'FLAGGED'];
const RESOLUTION_DECISIONS = ['APPROVED', 'REJECTED', 'FLAGGED'];

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const makeHttpError = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const parsePositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseDate = (value, fieldLabel) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw makeHttpError(`${fieldLabel} must be a valid date`, 400);
  }
  return date;
};

const normalizeType = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (!REPORT_TYPES.includes(normalized)) {
    throw makeHttpError(`type must be one of: ${REPORT_TYPES.join(', ')}`, 400);
  }
  return normalized;
};

const normalizeStatus = (value, label = 'status') => {
  const normalized = String(value || '').trim().toUpperCase();
  if (!REPORT_STATUSES.includes(normalized)) {
    throw makeHttpError(`${label} must be one of: ${REPORT_STATUSES.join(', ')}`, 400);
  }
  return normalized;
};






const normalizeDecision = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (!RESOLUTION_DECISIONS.includes(normalized)) {
    throw makeHttpError(`decision must be one of: ${RESOLUTION_DECISIONS.join(', ')}`, 400);
  }
  return normalized;
};

const parsePagination = (query = {}) => {
  const page = Math.max(Number(query.page) || DEFAULT_PAGE, 1);
  const limit = Math.min(Math.max(Number(query.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  return { page, limit, skip: (page - 1) * limit };
};

const mapReport = (report) => ({
  id: report.id,
  type: report.type,
  targetId: report.targetId,
  reason: report.reason,
  description: report.description,
  status: report.status,
  moderatorNotes: report.moderatorNotes,
  reporterId: report.reporterId,
  moderatorId: report.moderatorId,
  createdAt: report.createdAt,
  updatedAt: report.updatedAt,
  resolvedAt: report.resolvedAt,
  reporter: report.reporter
    ? {
        id: report.reporter.id,
        name: report.reporter.name,
        email: report.reporter.email,
      }
    : undefined,
  moderator: report.moderator
    ? {
        id: report.moderator.id,
        name: report.moderator.name,
        email: report.moderator.email,
      }
    : undefined,
  app: report.app || undefined,
  user: report.user || undefined,
});

const validateTargetAndSelfReport = async ({ type, targetId, reporterId }) => {
  if (type === 'APP') {
    const app = await prisma.app.findUnique({
      where: { id: targetId },
      include: { developer: { select: { userId: true } } },
    });
    if (!app) throw makeHttpError('Target app not found', 404);
    if (app.developer && app.developer.userId === reporterId) {
      throw makeHttpError('You cannot report your own app', 409);
    }
    return { appId: app.id, relatedAppId: app.id };
  }

  if (type === 'REVIEW') {
    const review = await prisma.review.findUnique({
      where: { id: targetId },
      select: { id: true, userId: true, appId: true },
    });
    if (!review) throw makeHttpError('Target review not found', 404);
    if (review.userId === reporterId) {
      throw makeHttpError('You cannot report your own review', 409);
    }
    return { relatedAppId: review.appId };
  }

  const user = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true },
  });
  if (!user) throw makeHttpError('Target user not found', 404);
  if (user.id === reporterId) {
    throw makeHttpError('You cannot report your own user account', 409);
  }
  return { userId: user.id };
};

const createReport = async ({ userId, body = {} }) => {
  const { type, targetId, reason, description } = body;

  if (!type || targetId === undefined || targetId === null || !reason) {
    throw makeHttpError('type, targetId, and reason are required', 400);
  }

  const normalizedType = normalizeType(type);
  const parsedTargetId = parsePositiveInt(targetId);
  if (!parsedTargetId) throw makeHttpError('targetId must be a positive integer', 400);

  const trimmedReason = String(reason).trim();
  if (!trimmedReason) throw makeHttpError('reason is required', 400);

  const trimmedDescription =
    description === undefined || description === null ? null : String(description).trim() || null;

  const targetMeta = await validateTargetAndSelfReport({
    type: normalizedType,
    targetId: parsedTargetId,
    reporterId: userId,
  });

  const duplicatePending = await prisma.report.findFirst({
    where: {
      reporterId: userId,
      type: normalizedType,
      targetId: parsedTargetId,
      status: 'PENDING',
    },
    select: { id: true },
  });

  if (duplicatePending) {
    throw makeHttpError('You already have a pending report for this target', 409);
  }

  const created = await prisma.$transaction(async (tx) => {
    const report = await tx.report.create({
      data: {
        type: normalizedType,
        targetId: parsedTargetId,
        reason: trimmedReason,
        description: trimmedDescription,
        reporterId: userId,
        appId: targetMeta.appId || null,
        userId: targetMeta.userId || null,
      },
      include: {
        reporter: {
          select: { id: true, name: true, email: true },
        },
        app: {
          select: { id: true, name: true, slug: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await tx.moderationLog.create({
      data: {
        action: 'report_create',
        entityType: 'report',
        entityId: report.id,
        moderatorId: userId,
        reason: trimmedReason,
        notes: trimmedDescription,
        appId: targetMeta.relatedAppId || targetMeta.appId || null,
        changes: {
          type: normalizedType,
          targetId: parsedTargetId,
          statusFrom: null,
          statusTo: 'PENDING',
        },
      },
    });

    return report;
  });

  return mapReport(created);
};

const listReports = async (query = {}) => {
  const { page, limit, skip } = parsePagination(query);
  const where = {};

  if (query.status) {
    where.status = normalizeStatus(query.status);
  }

  if (query.type) {
    where.type = normalizeType(query.type);
  }

  const from = parseDate(query.from || query.dateFrom, 'from');
  const to = parseDate(query.to || query.dateTo, 'to');
  if (from && to && from > to) {
    throw makeHttpError('from must be earlier than or equal to to', 400);
  }
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) where.createdAt.lte = to;
  }

  const [items, total] = await prisma.$transaction([
    prisma.report.findMany({
      where,
      include: {
        reporter: {
          select: { id: true, name: true, email: true },
        },
        moderator: {
          select: { id: true, name: true, email: true },
        },
        app: {
          select: { id: true, name: true, slug: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.report.count({ where }),
  ]);

  return {
    items: items.map(mapReport),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  };
};

const resolveReport = async ({ reportId, moderatorId, body = {} }) => {
  const parsedReportId = parsePositiveInt(reportId);
  if (!parsedReportId) throw makeHttpError('Invalid report id', 400);

  const { decision, notes } = body;
  if (!decision) throw makeHttpError('decision is required', 400);
  const normalizedDecision = normalizeDecision(decision);
  const normalizedNotes = notes === undefined || notes === null ? null : String(notes).trim() || null;

  const existing = await prisma.report.findUnique({
    where: { id: parsedReportId },
    include: {
      reporter: {
        select: { id: true, name: true, email: true },
      },
      moderator: {
        select: { id: true, name: true, email: true },
      },
      app: {
        select: { id: true, name: true, slug: true },
      },
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!existing) throw makeHttpError('Report not found', 404);
  if (existing.status !== 'PENDING') {
    throw makeHttpError('Only pending reports can be resolved', 409);
  }

  const now = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const report = await tx.report.update({
      where: { id: parsedReportId },
      data: {
        status: normalizedDecision,
        moderatorId,
        moderatorNotes: normalizedNotes,
        resolvedAt: now,
      },
      include: {
        reporter: {
          select: { id: true, name: true, email: true },
        },
        moderator: {
          select: { id: true, name: true, email: true },
        },
        app: {
          select: { id: true, name: true, slug: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await tx.moderationLog.create({
      data: {
        action: 'report_resolve',
        entityType: 'report',
        entityId: parsedReportId,
        moderatorId,
        reason: normalizedDecision,
        notes: normalizedNotes,
        appId: report.appId || null,
        changes: {
          statusFrom: existing.status,
          statusTo: normalizedDecision,
        },
      },
    });

    return report;
  });

  return mapReport(updated);
};

module.exports = {
  createReport,
  listReports,
  resolveReport,
};
