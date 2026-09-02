// Optional authentication middleware.
// Attaches req.user when a valid Bearer token is present, otherwise continues without it.
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return next();

  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    // Invalid/expired token — treat as unauthenticated for optional endpoints.
  }
  next();
};

module.exports = optionalAuth;