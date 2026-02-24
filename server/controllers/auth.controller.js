const {
  registerUser,
  loginUser,
  becomeDeveloper,
  refreshAccessToken,
  getUserById,
  JWT_EXPIRES_IN,
} = require('../services/auth.service');

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email, and password are required' });
    }
    const user = await registerUser({ name, email, password });
    return res.status(201).json(user);
  } catch (err) {
    return next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }
    const { token, refreshToken, user } = await loginUser({ email, password });
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
      return res.status(400).json({ message: 'refreshToken is required' });
    }
    const { token, refreshToken: newRefreshToken, user } = await refreshAccessToken(refreshToken);
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
    const { token, refreshToken, user } = await becomeDeveloper(req.user.id);
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
      return res.status(401).json({ message: 'Invalid token' });
    }
    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
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
};
