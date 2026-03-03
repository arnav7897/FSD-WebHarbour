const { verifyToken } = require('../utlis/jwt');
const { createHttpError } = require('./error.middleware');

const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');
  if (type !== 'Bearer' || !token) {
    return next(createHttpError(401, 'Authorization token required', 'AUTH_TOKEN_REQUIRED'));
  }
  try {
    const payload = verifyToken(token);
    req.user = payload;
    return next();
  } catch (err) {
    return next(createHttpError(401, 'Invalid token', 'AUTH_TOKEN_INVALID'));
  }
};

module.exports = authMiddleware;
