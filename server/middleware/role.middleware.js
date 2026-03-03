const { createHttpError } = require('./error.middleware');

const ROLE_PERMISSIONS = {
  USER: ['USER'],
  DEVELOPER: ['USER', 'DEVELOPER'],
  MODERATOR: ['USER', 'MODERATOR'],
  ADMIN: ['USER', 'DEVELOPER', 'MODERATOR', 'ADMIN'],
};

const requireRole = (...roles) => (req, res, next) => {
  const currentRole = req.user && req.user.role;
  const permissions = ROLE_PERMISSIONS[currentRole] || [];
  const isAllowed = roles.some((requiredRole) => permissions.includes(requiredRole));

  if (!req.user || !isAllowed) {
    return next(createHttpError(403, 'Forbidden', 'FORBIDDEN'));
  }
  return next();
};

module.exports = { requireRole };
