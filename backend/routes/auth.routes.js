/**
 * ============================================================
 *  AUTH ROUTES
 *   POST /api/auth/register   -> create account
 *   POST /api/auth/login      -> issue JWT
 *   GET  /api/auth/me         -> current user (protected)
 * ============================================================
 */
const express = require('express');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const { query }       = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router  = express.Router();
const SECRET  = process.env.JWT_SECRET || 'change_me_in_production';
const EXPIRES = process.env.JWT_EXPIRES_IN || '7d';

/* ----------------- helpers ----------------- */
const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    SECRET,
    { expiresIn: EXPIRES }
  );

const sanitize = ({ id, name, email, role, created_at }) =>
  ({ id, name, email, role, created_at });

/* ----------------- POST /register ----------------- */
router.post(
  '/register',
  [
    body('name').trim().isLength({ min: 2, max: 120 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be ≥ 8 chars')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          success: false, code: 'VALIDATION_ERROR',
          errors: errors.array()
        });
      }

      const { name, email, password } = req.body;

      // duplicate email check
      const [existing] = await query('SELECT id FROM users WHERE email = ?', [email]);
      if (existing.length) {
        return res.status(409).json({
          success: false, code: 'EMAIL_TAKEN',
          message: 'An account with that email already exists.'
        });
      }

      const hash = await bcrypt.hash(password, 12);
      const [r]  = await query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES (?, ?, ?, 'customer')`,
        [name, email, hash]
      );

      const [[user]] = await query(
        'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
        [r.insertId]
      );

      return res.status(201).json({
        success: true,
        user:   sanitize(user),
        token:  signToken(user)
      });
    } catch (err) { next(err); }
  }
);

/* ----------------- POST /login ----------------- */
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          success: false, code: 'VALIDATION_ERROR', errors: errors.array()
        });
      }

      const { email, password } = req.body;
      const [rows] = await query(
        'SELECT id, name, email, password_hash, role, created_at FROM users WHERE email = ?',
        [email]
      );
      if (!rows.length) {
        return res.status(401).json({
          success: false, code: 'BAD_CREDENTIALS',
          message: 'Invalid email or password.'
        });
      }

      const user = rows[0];
      const ok   = await bcrypt.compare(password, user.password_hash);
      if (!ok) {
        return res.status(401).json({
          success: false, code: 'BAD_CREDENTIALS',
          message: 'Invalid email or password.'
        });
      }

      return res.json({
        success: true,
        user:    sanitize(user),
        token:   signToken(user)
      });
    } catch (err) { next(err); }
  }
);

/* ----------------- GET /me ----------------- */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length) {
      return res.status(404).json({
        success: false, code: 'NOT_FOUND', message: 'User not found.'
      });
    }
    res.json({ success: true, user: sanitize(rows[0]) });
  } catch (err) { next(err); }
});

module.exports = router;
