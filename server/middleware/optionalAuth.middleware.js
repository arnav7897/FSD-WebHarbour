const { verifyToken } = require('../utlis/jwt');
const { createHttpError } = require('./error.middleware');

const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');

  if (!type || !token) {
    return next();
  }

  if (type !== 'Bearer') {
    return next(createHttpError(401, 'Invalid authorization type', 'AUTH_TOKEN_INVALID'));
  }

  try {
    req.user = verifyToken(token);
    return next();
  } catch (err) {
    return next(createHttpError(401, 'Invalid token', 'AUTH_TOKEN_INVALID'));
  }
};

module.exports = optionalAuth;
