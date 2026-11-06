const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Church } = require('../models');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const JWT_EXPIRES_IN = '7d';

/**
 * Helper to generate JWT token for a church
 */
function generateToken(church) {
  return jwt.sign(
    {
      id: church.id,
      email: church.email,
      name: church.name
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * POST /api/auth/register
 * Register a new church
 */
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Church name is required'),
    body('email').trim().isEmail().withMessage('A valid email address is required').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
    body('pastorName').optional({ checkFalsy: true }).trim(),
    body('phone').optional({ checkFalsy: true }).trim(),
    body('country').optional({ checkFalsy: true }).trim(),
    body('state').optional({ checkFalsy: true }).trim(),
    body('address').optional({ checkFalsy: true }).trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email, pastorName, phone, country, state, address, password } = req.body;

      // Check if church already exists
      const existing = await Church.findOne({ where: { email: email.toLowerCase() } });
      if (existing) {
        return res.status(400).json({ error: 'A church with this email address already exists.' });
      }

      // Hash password with bcryptjs salt rounds 12
      const passwordHash = await bcrypt.hash(password, 12);

      const church = await Church.create({
        name,
        email: email.toLowerCase(),
        pastorName: pastorName || null,
        phone: phone || null,
        country: country || null,
        state: state || null,
        address: address || null,
        passwordHash,
        selectedTranslation: 'KJV',
        brandingConfig: {
          primaryColor: '#1e40af',
          secondaryColor: '#3b82f6',
          backgroundColor: '#0f172a',
          textColor: '#ffffff',
          template: 'classic',
          displayDuration: 15,
          fontSize: 'large'
        }
      });

      const token = generateToken(church);

      return res.status(201).json({
        token,
        church: church.toJSON()
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ error: 'Server error during registration. Please try again.' });
    }
  }
);

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post(
  '/login',
  [
    body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      const church = await Church.findOne({ where: { email: email.toLowerCase() } });
      if (!church) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const isValid = await church.validatePassword(password);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const token = generateToken(church);

      return res.status(200).json({
        token,
        church: church.toJSON()
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Server error during login. Please try again.' });
    }
  }
);

/**
 * GET /api/auth/me
 * Get current church profile (authenticated)
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    return res.status(200).json({
      church: req.church.toJSON()
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Server error retrieving church profile.' });
  }
});

module.exports = router;
