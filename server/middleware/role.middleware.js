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
    return res.status(403).json({ message: 'Forbidden' });
  }
  return next();
};

module.exports = { requireRole };
