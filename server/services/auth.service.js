const crypto = require('crypto');
const prisma = require('../config/db');
const { hashPassword, comparePassword } = require('../utlis/password');
const { signToken } = require('../utlis/jwt');
const {
  JWT_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN,
  EMAIL_VERIFICATION_TOKEN_EXPIRES_IN,
  PASSWORD_RESET_TOKEN_EXPIRES_IN,
  AUTH_REQUIRE_EMAIL_VERIFIED,
  AUTH_EXPOSE_DEBUG_TOKENS,
} = require('../config/env');

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  isVerified: user.isVerified,
});

const makeHttpError = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const assertAuthSchemaAvailable = () => {
  if (!prisma.emailVerificationToken || !prisma.passwordResetToken) {
    throw makeHttpError(
      'Auth hardening tables are not available. Run Prisma migration and generate client.',
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
const emailVerificationLifetimeMs = parseDurationToMs(
  EMAIL_VERIFICATION_TOKEN_EXPIRES_IN,
  24 * 60 * 60 * 1000,
);
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

const issueEmailVerificationToken = async (userId) => {
  assertAuthSchemaAvailable();
  const now = new Date();
  await prisma.emailVerificationToken.updateMany({
    where: { userId, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + emailVerificationLifetimeMs);

  await prisma.emailVerificationToken.create({
    data: {
      tokenHash,
      userId,
      expiresAt,
    },
  });

  return { rawToken, expiresAt };
};

const issuePasswordResetToken = async (userId) => {
  assertAuthSchemaAvailable();
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
      isVerified: false,
    },
  });

  const verification = await issueEmailVerificationToken(user.id);

  return {
    user: sanitizeUser(user),
    verificationRequired: true,
    ...buildDebugTokenResponse('verificationToken', verification.rawToken, verification.expiresAt),
  };
};

const loginUser = async ({ email, password, requestMeta }) => {
  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) throw makeHttpError('Invalid credentials', 401);

  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) throw makeHttpError('Invalid credentials', 401);

  if (AUTH_REQUIRE_EMAIL_VERIFIED && !user.isVerified) {
    throw makeHttpError('Email not verified. Please verify your email before login.', 403);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const tokens = await issueTokens(user, requestMeta);
  return { ...tokens, user: sanitizeUser(user) };
};

const becomeDeveloper = async (userId, requestMeta) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw makeHttpError('User not found', 404);

  let updatedUser = user;
  if (user.role === 'USER') {
    updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: 'DEVELOPER' },
    });
  }

  await prisma.developerProfile.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  const tokens = await issueTokens(updatedUser, requestMeta);
  return { ...tokens, user: sanitizeUser(updatedUser) };
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
  if (AUTH_REQUIRE_EMAIL_VERIFIED && !user.isVerified) {
    throw makeHttpError('Email not verified. Please verify your email before login.', 403);
  }

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

const requestEmailVerification = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user || user.isVerified) {
    return { message: 'If the email exists, a verification link has been sent.' };
  }

  const verification = await issueEmailVerificationToken(user.id);
  return {
    message: 'If the email exists, a verification link has been sent.',
    ...buildDebugTokenResponse('verificationToken', verification.rawToken, verification.expiresAt),
  };
};

const verifyEmail = async (token) => {
  assertAuthSchemaAvailable();
  const tokenHash = hashToken(token);

  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: {
      user: true,
    },
  });

  if (!record || record.usedAt || record.expiresAt <= new Date()) {
    throw makeHttpError('Invalid or expired verification token', 401);
  }

  const now = new Date();
  const updatedUser = await prisma.$transaction(async (tx) => {
    await tx.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: now },
    });

    await tx.emailVerificationToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: now },
    });

    return tx.user.update({
      where: { id: record.userId },
      data: {
        isVerified: true,
        emailVerifiedAt: now,
      },
    });
  });

  return sanitizeUser(updatedUser);
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
  assertAuthSchemaAvailable();
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
  becomeDeveloper,
  refreshAccessToken,
  logout,
  logoutAll,
  requestEmailVerification,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  getUserById,
  JWT_EXPIRES_IN,
};
