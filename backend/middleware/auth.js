/**
 * JWT authentication middleware.
 * Reads "Authorization: Bearer <token>", validates it,
 * and attaches the decoded user to req.user.
 */
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'change_me_in_production';

const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      code:    'NO_TOKEN',
      message: 'Authentication token missing.'
    });
  }

  try {
    const payload = jwt.verify(token, SECRET);
    req.user = payload;            // { id, email, role }
    return next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      code:    'INVALID_TOKEN',
      message: 'Invalid or expired token.'
    });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      code:    'FORBIDDEN',
      message: 'Admin privileges required.'
    });
  }
  next();
};

module.exports = { requireAuth, requireAdmin };
