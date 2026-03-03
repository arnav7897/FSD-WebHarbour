const {
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
} = require('../services/auth.service');
const { createHttpError } = require('../middleware/error.middleware');

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      throw createHttpError(400, 'name, email, and password are required');
    }

    const result = await registerUser({ name, email, password });
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      throw createHttpError(400, 'email and password are required');
    }

    const { token, refreshToken, user } = await loginUser({
      email,
      password,
      requestMeta: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      },
    });

    return res.json({
      token,
      tokenType: 'Bearer',
      expiresIn: JWT_EXPIRES_IN,
      refreshToken,
      user,
    });
  } catch (err) {
    return next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) {
      throw createHttpError(400, 'refreshToken is required');
    }

    const { token, refreshToken: newRefreshToken, user } = await refreshAccessToken(refreshToken, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });

    return res.json({
      token,
      tokenType: 'Bearer',
      expiresIn: JWT_EXPIRES_IN,
      refreshToken: newRefreshToken,
      user,
    });
  } catch (err) {
    return next(err);
  }
};

const becomeDeveloperHandler = async (req, res, next) => {
  try {
    const { token, refreshToken, user } = await becomeDeveloper(req.user.id, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });

    return res.json({
      token,
      tokenType: 'Bearer',
      expiresIn: JWT_EXPIRES_IN,
      refreshToken,
      user,
    });
  } catch (err) {
    return next(err);
  }
};

const me = async (req, res, next) => {
  try {
    const user = await getUserById(req.user.id);
    if (!user) {
      throw createHttpError(401, 'Invalid token');
    }
    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      emailVerifiedAt: user.emailVerifiedAt,
    });
  } catch (err) {
    return next(err);
  }
};

const logoutHandler = async (req, res, next) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) {
      throw createHttpError(400, 'refreshToken is required');
    }
    const result = await logout(refreshToken);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
};

const logoutAllHandler = async (req, res, next) => {
  try {
    const result = await logoutAll(req.user.id);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
};

const requestEmailVerificationHandler = async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      throw createHttpError(400, 'email is required');
    }
    const result = await requestEmailVerification(email);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
};

const verifyEmailHandler = async (req, res, next) => {
  try {
    const { token } = req.body || {};
    if (!token) {
      throw createHttpError(400, 'token is required');
    }
    const user = await verifyEmail(token);
    return res.json({
      message: 'Email verified successfully',
      user,
    });
  } catch (err) {
    return next(err);
  }
};

const requestPasswordResetHandler = async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      throw createHttpError(400, 'email is required');
    }
    const result = await requestPasswordReset(email);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
};

const resetPasswordHandler = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword) {
      throw createHttpError(400, 'token and newPassword are required');
    }
    const result = await resetPassword({ token, newPassword });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  register,
  login,
  becomeDeveloper: becomeDeveloperHandler,
  refresh,
  me,
  logout: logoutHandler,
  logoutAll: logoutAllHandler,
  requestEmailVerification: requestEmailVerificationHandler,
  verifyEmail: verifyEmailHandler,
  requestPasswordReset: requestPasswordResetHandler,
  resetPassword: resetPasswordHandler,
};
