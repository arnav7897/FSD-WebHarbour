const crypto = require('crypto');
const prisma = require('../config/db');
const { hashPassword, comparePassword } = require('../utlis/password');
const { signToken } = require('../utlis/jwt');
const {
  JWT_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN,
  PASSWORD_RESET_TOKEN_EXPIRES_IN,
  AUTH_EXPOSE_DEBUG_TOKENS,
} = require('../config/env');

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
});

const makeHttpError = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const assertPasswordResetSchemaAvailable = () => {
  if (!prisma.passwordResetToken) {
    throw makeHttpError(
      'Password reset tables are not available. Run Prisma migration and generate client.',
      500,
    );
  }
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const parseDurationToMs = (value, fallbackMs) => {
  if (!value || typeof value !== 'string') return fallbackMs;
  const match = value.trim().match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return amount * multipliers[unit];
};

const refreshTokenLifetimeMs = parseDurationToMs(REFRESH_TOKEN_EXPIRES_IN, 7 * 24 * 60 * 60 * 1000);
const passwordResetLifetimeMs = parseDurationToMs(
  PASSWORD_RESET_TOKEN_EXPIRES_IN,
  15 * 60 * 1000,
);

const issueTokens = async (user, requestMeta = {}) => {
  const token = signToken({ id: user.id, email: user.email, role: user.role });
  const refreshToken = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + refreshTokenLifetimeMs);

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId: user.id,
      expiresAt,
      userAgent: requestMeta.userAgent ? String(requestMeta.userAgent) : null,
      ipAddress: requestMeta.ipAddress ? String(requestMeta.ipAddress) : null,
    },
  });

  return { token, refreshToken };
};

const buildDebugTokenResponse = (fieldName, rawToken, expiresAt) => {
  if (!AUTH_EXPOSE_DEBUG_TOKENS) return {};
  return {
    [fieldName]: rawToken,
    [`${fieldName}ExpiresAt`]: expiresAt,
  };
};

const issuePasswordResetToken = async (userId) => {
  assertPasswordResetSchemaAvailable();
  const now = new Date();
  await prisma.passwordResetToken.updateMany({
    where: { userId, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + passwordResetLifetimeMs);

  await prisma.passwordResetToken.create({
    data: {
      tokenHash,
      userId,
      expiresAt,
    },
  });

  return { rawToken, expiresAt };
};

const registerUser = async ({ name, email, password }) => {
  const normalizedEmail = normalizeEmail(email);
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    throw makeHttpError('Email already registered', 409);
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash,
      role: 'USER',
    },
  });

  return {
    user: sanitizeUser(user),
  };
};

const loginUser = async ({ email, password, requestMeta }) => {
  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) throw makeHttpError('Invalid credentials', 401);

  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) throw makeHttpError('Invalid credentials', 401);

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const tokens = await issueTokens(user, requestMeta);
  return { ...tokens, user: sanitizeUser(user) };
};

const requestDeveloperAccess = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw makeHttpError('User not found', 404);

  if (user.role === 'DEVELOPER' || user.role === 'ADMIN') {
    return { status: 'APPROVED', user: sanitizeUser(user) };
  }

  const existing = await prisma.developerProfile.findUnique({ where: { userId } });
  if (existing && existing.isVerified) {
    return {
      status: 'APPROVED',
      user: sanitizeUser(user),
      verifiedAt: existing.verifiedAt,
    };
  }

  if (existing && existing.verificationRequestedAt) {
    return {
      status: 'PENDING',
      requestedAt: existing.verificationRequestedAt,
    };
  }

  const now = new Date();
  const profile = await prisma.developerProfile.upsert({
    where: { userId },
    update: { verificationRequestedAt: now, isVerified: false, verifiedAt: null },
    create: { userId, verificationRequestedAt: now, isVerified: false },
  });

  return {
    status: 'PENDING',
    requestedAt: profile.verificationRequestedAt,
  };
};

const getDeveloperRequestStatus = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw makeHttpError('User not found', 404);

  if (user.role === 'DEVELOPER' || user.role === 'ADMIN') {
    return { status: 'APPROVED', user: sanitizeUser(user) };
  }

  const profile = await prisma.developerProfile.findUnique({ where: { userId } });
  if (profile && profile.isVerified) {
    return { status: 'APPROVED', verifiedAt: profile.verifiedAt };
  }
  if (profile && profile.verificationRequestedAt) {
    return { status: 'PENDING', requestedAt: profile.verificationRequestedAt };
  }
  return { status: 'NONE' };
};

const listDeveloperRequests = async ({ status, page = 1, limit = 20 } = {}) => {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const skip = (safePage - 1) * safeLimit;
  const normalizedStatus = status ? String(status).toUpperCase() : 'PENDING';

  const where = {};
  if (normalizedStatus === 'APPROVED') {
    where.isVerified = true;
  } else {
    where.isVerified = false;
    where.verificationRequestedAt = { not: null };
  }

  const [items, total] = await prisma.$transaction([
    prisma.developerProfile.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true, createdAt: true },
        },
      },
      orderBy: { verificationRequestedAt: 'desc' },
      skip,
      take: safeLimit,
    }),
    prisma.developerProfile.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(Math.ceil(total / safeLimit), 1),
    },
  };
};

const approveDeveloperRequest = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw makeHttpError('User not found', 404);
  if (user.role === 'ADMIN') {
    return { status: 'APPROVED', user: sanitizeUser(user) };
  }

  const now = new Date();
  const updatedUser = user.role === 'DEVELOPER'
    ? user
    : await prisma.user.update({
        where: { id: userId },
        data: { role: 'DEVELOPER' },
      });

  const existing = await prisma.developerProfile.findUnique({ where: { userId } });
  if (existing) {
    await prisma.developerProfile.update({
      where: { userId },
      data: {
        isVerified: true,
        verifiedAt: now,
        verificationRequestedAt: existing.verificationRequestedAt || now,
      },
    });
  } else {
    await prisma.developerProfile.create({
      data: { userId, isVerified: true, verifiedAt: now, verificationRequestedAt: now },
    });
  }

  return { status: 'APPROVED', user: sanitizeUser(updatedUser), verifiedAt: now };
};

const rejectDeveloperRequest = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw makeHttpError('User not found', 404);
  if (user.role === 'DEVELOPER') {
    throw makeHttpError('User is already a developer', 409);
  }

  await prisma.developerProfile.updateMany({
    where: { userId },
    data: { isVerified: false, verifiedAt: null, verificationRequestedAt: null },
  });

  return { status: 'REJECTED' };
};

const refreshAccessToken = async (refreshToken, requestMeta) => {
  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.revokedAt || stored.expiresAt <= new Date()) {
    throw makeHttpError('Invalid refresh token', 401);
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user) throw makeHttpError('Invalid refresh token', 401);
  const tokens = await issueTokens(user, requestMeta);
  return { ...tokens, user: sanitizeUser(user) };
};

const logout = async (refreshToken) => {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return { message: 'Logged out successfully' };
};

const logoutAll = async (userId) => {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return { message: 'Logged out from all sessions' };
};

const requestPasswordReset = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    return { message: 'If the email exists, a password reset link has been sent.' };
  }

  const reset = await issuePasswordResetToken(user.id);
  return {
    message: 'If the email exists, a password reset link has been sent.',
    ...buildDebugTokenResponse('resetToken', reset.rawToken, reset.expiresAt),
  };
};

const resetPassword = async ({ token, newPassword }) => {
  assertPasswordResetSchemaAvailable();
  if (!newPassword || String(newPassword).length < 6) {
    throw makeHttpError('newPassword must be at least 6 characters', 400);
  }

  const tokenHash = hashToken(token);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, usedAt: true, expiresAt: true },
  });

  if (!record || record.usedAt || record.expiresAt <= new Date()) {
    throw makeHttpError('Invalid or expired reset token', 401);
  }

  const passwordHash = await hashPassword(String(newPassword));
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: now },
    });

    await tx.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: now },
    });

    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });

    await tx.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: now },
    });
  });

  return { message: 'Password reset successful. Please login again.' };
};

const getUserById = (id) => prisma.user.findUnique({ where: { id } });

module.exports = {
  registerUser,
  loginUser,
  requestDeveloperAccess,
  getDeveloperRequestStatus,
  listDeveloperRequests,
  approveDeveloperRequest,
  rejectDeveloperRequest,
  refreshAccessToken,
  logout,
  logoutAll,
  requestPasswordReset,
  resetPassword,
  getUserById,
  JWT_EXPIRES_IN,
};
