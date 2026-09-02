// Role-based authorization guard.
// Usage: router.post('/register', authMiddleware, requireRole('donor'), handler)
const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !req.user.role) {
    return res.status(403).json({ success: false, message: 'Access denied. Unable to determine your role.' });
  }
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Access denied. You do not have permission for this action.' });
  }
  next();
};

module.exports = requireRole;