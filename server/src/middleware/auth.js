const jwt = require('jsonwebtoken');
const { Church } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

/**
 * Authentication middleware for JWT tokens.
 * Extracts token from 'Authorization: Bearer <token>' header.
 * Attaches authenticated church instance to req.church and req.churchId.
 */
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Access denied. No authorization header provided.' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ error: 'Access denied. Format must be Bearer <token>.' });
    }

    const token = parts[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token has expired. Please log in again.' });
      }
      return res.status(401).json({ error: 'Invalid token.' });
    }

    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: 'Invalid token payload.' });
    }

    const church = await Church.findByPk(decoded.id);
    if (!church) {
      return res.status(401).json({ error: 'Church account not found.' });
    }

    req.church = church;
    req.churchId = church.id;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Internal server error during authentication.' });
  }
}

/**
 * Optional authentication middleware for public/semi-public endpoints (like Bible lookup & live projector).
 * If a valid Bearer token is provided, attaches req.church and req.churchId; otherwise continues cleanly.
 */
async function optionalAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return next();

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return next();

    const decoded = jwt.verify(parts[1], JWT_SECRET);
    if (decoded && decoded.id) {
      const church = await Church.findByPk(decoded.id);
      if (church) {
        req.church = church;
        req.churchId = church.id;
      }
    }
  } catch (e) {
    // Ignore invalid/expired token on public Bible lookup routes
  }
  next();
}

authMiddleware.optional = optionalAuthMiddleware;
module.exports = authMiddleware;
