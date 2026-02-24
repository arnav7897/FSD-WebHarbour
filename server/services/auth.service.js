const crypto = require('crypto');
const prisma = require('../config/db');
const { hashPassword, comparePassword } = require('../utlis/password');
const { signToken } = require('../utlis/jwt');
const { JWT_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN } = require('../config/env');

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
});

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

const registerUser = async ({ name, email, password }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const err = new Error('Email already registered');
    err.status = 409;
    throw err;
  }
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: 'USER',
    },
  });
  return sanitizeUser(user);
};

const issueTokens = async (user) => {
  const token = signToken({ id: user.id, email: user.email, role: user.role });
  const refreshToken = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + refreshTokenLifetimeMs);
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId: user.id,
      expiresAt,
    },
  });
  return { token, refreshToken };
};

const loginUser = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }
  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }
  const tokens = await issueTokens(user);
  return { ...tokens, user: sanitizeUser(user) };
};

const becomeDeveloper = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

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

  const tokens = await issueTokens(updatedUser);
  return { ...tokens, user: sanitizeUser(updatedUser) };
};

const refreshAccessToken = async (refreshToken) => {
  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!stored || stored.revokedAt || stored.expiresAt <= new Date()) {
    const err = new Error('Invalid refresh token');
    err.status = 401;
    throw err;
  }
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });
  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user) {
    const err = new Error('Invalid refresh token');
    err.status = 401;
    throw err;
  }
  const tokens = await issueTokens(user);
  return { ...tokens, user: sanitizeUser(user) };
};

const getUserById = (id) => prisma.user.findUnique({ where: { id } });

module.exports = {
  registerUser,
  loginUser,
  becomeDeveloper,
  refreshAccessToken,
  getUserById,
  JWT_EXPIRES_IN,
};
