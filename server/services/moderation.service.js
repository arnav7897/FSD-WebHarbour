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

const appInclude = {
  category: {
    select: { id: true, name: true, slug: true },
  },
  tags: {
    include: {
      tag: {
        select: { id: true, name: true, slug: true },
      },
    },
  },
  developer: {
    select: { id: true, userId: true },
  },
};

const mapLifecycleApp = (app) => ({
  id: app.id,
  name: app.name,
  slug: app.slug,
  status: app.status,
  moderation: {
    lastActionAt: app.updatedAt,
  },
  category: app.category,
  tags: (app.tags || []).map((entry) => entry.tag),
  developerId: app.developerId,
  createdAt: app.createdAt,
  updatedAt: app.updatedAt,
  publishedAt: app.publishedAt,
});

const getAppOrThrow = async (appId) => {
  const parsedAppId = parsePositiveInt(appId);
  if (!parsedAppId) throw makeHttpError('Invalid app id', 400);

  const app = await prisma.app.findUnique({
    where: { id: parsedAppId },
    include: appInclude,
  });

  if (!app) throw makeHttpError('App not found', 404);
  return app;
};

const logModerationAction = async ({
  tx,
  appId,
  actorUserId,
  action,
  reason,
  notes,
  fromStatus,
  toStatus,
}) =>
  tx.moderationLog.create({
    data: {
      action,
      entityType: 'app',
      entityId: appId,
      moderatorId: actorUserId,
      appId,
      reason: reason || null,
      notes: notes || null,
      changes: { fromStatus, toStatus },
    },
  });

const assertTransition = (currentStatus, expectedStatus, actionLabel) => {
  if (currentStatus !== expectedStatus) {
    throw makeHttpError(
      `Invalid transition: cannot ${actionLabel} app in ${currentStatus} status`,
      409,
    );
  }
};

const submitAppForReview = async ({ appId, userId }) => {
  const app = await getAppOrThrow(appId);

  if (!app.developer || app.developer.userId !== userId) {
    throw makeHttpError('You can only submit your own apps', 403);
  }

  assertTransition(app.status, 'DRAFT', 'submit');

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.app.update({
      where: { id: app.id },
      data: {
        status: 'UNDER_REVIEW',
        lastUpdatedAt: now,
      },
      include: appInclude,
    });

    await logModerationAction({
      tx,
      appId: app.id,
      actorUserId: userId,
      action: 'submit',
      fromStatus: app.status,
      toStatus: 'UNDER_REVIEW',
      notes: 'Submitted for moderation review',
    });

    return next;
  });

  return mapLifecycleApp(updated);
};

const ADMIN_ACTIONS = {
  approve: {
    from: 'UNDER_REVIEW',
    to: 'PUBLISHED',
    requireMessage: false,
    messageFieldLabel: 'note',
  },
  reject: {
    from: 'UNDER_REVIEW',
    to: 'REJECTED',
    requireMessage: true,
    messageFieldLabel: 'moderation note',
  },
  suspend: {
    from: 'PUBLISHED',
    to: 'SUSPENDED',
    requireMessage: true,
    messageFieldLabel: 'reason',
  },
  unsuspend: {
    from: 'SUSPENDED',
    to: 'PUBLISHED',
    requireMessage: false,
    messageFieldLabel: 'note',
  },
};

const applyAdminAction = async ({ appId, moderatorId, action, message }) => {
  const rule = ADMIN_ACTIONS[action];
  if (!rule) throw makeHttpError('Unsupported moderation action', 400);

  const note = message === undefined || message === null ? '' : String(message).trim();
  if (rule.requireMessage && !note) {
    throw makeHttpError(`${rule.messageFieldLabel} is required`, 400);
  }

  const app = await getAppOrThrow(appId);
  assertTransition(app.status, rule.from, action);

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.app.update({
      where: { id: app.id },
      data: {
        status: rule.to,
        publishedAt: rule.to === 'PUBLISHED' && !app.publishedAt ? now : app.publishedAt,
        lastUpdatedAt: now,
      },
      include: appInclude,
    });

    await logModerationAction({
      tx,
      appId: app.id,
      actorUserId: moderatorId,
      action,
      reason: note || null,
      notes: note || null,
      fromStatus: app.status,
      toStatus: rule.to,
    });

    return next;
  });

  return mapLifecycleApp(updated);
};

const approveApp = ({ appId, moderatorId, note }) =>
  applyAdminAction({ appId, moderatorId, action: 'approve', message: note });

const rejectApp = ({ appId, moderatorId, moderationNote }) =>
  applyAdminAction({
    appId,
    moderatorId,
    action: 'reject',
    message: moderationNote,
  });

const suspendApp = ({ appId, moderatorId, reason }) =>
  applyAdminAction({
    appId,
    moderatorId,
    action: 'suspend',
    message: reason,
  });

const unsuspendApp = ({ appId, moderatorId, note }) =>
  applyAdminAction({
    appId,
    moderatorId,
    action: 'unsuspend',
    message: note,
  });

module.exports = {
  submitAppForReview,
  approveApp,
  rejectApp,
  suspendApp,
  unsuspendApp,
};
