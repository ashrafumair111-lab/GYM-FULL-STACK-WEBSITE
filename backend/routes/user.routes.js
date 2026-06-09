/**
 * ============================================================
 *  USER ROUTES
 *   GET   /api/users/profile        -> my profile       (auth)
 *   PATCH /api/users/profile        -> update profile   (auth)
 *   GET   /api/users/orders/summary -> mini dashboard   (auth)
 * ============================================================
 */
const express = require('express');
const bcrypt  = require('bcrypt');
const { query } = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/* ---------- GET /profile ---------- */
router.get('/profile', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length) {
      return res.status(401).json({
        success: false, code: 'INVALID_TOKEN', message: 'User not found. Please sign in again.'
      });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

/* ---------- PATCH /profile ---------- */
router.patch('/profile', requireAuth, async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const updates = [];
    const params  = [];

    if (name)  { updates.push('name = ?');  params.push(name);  }
    if (email) { updates.push('email = ?'); params.push(email); }
    if (password) {
      const hash = await bcrypt.hash(password, 12);
      updates.push('password_hash = ?');
      params.push(hash);
    }
    if (!updates.length) {
      return res.status(422).json({
        success: false, code: 'NO_CHANGES', message: 'No fields to update.'
      });
    }
    params.push(req.user.id);

    await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    res.json({ success: true, message: 'Profile updated.' });
  } catch (err) { next(err); }
});

/* ---------- GET /orders/summary ---------- */
router.get('/orders/summary', requireAuth, async (req, res, next) => {
  try {
    const [counts] = await query(
      `SELECT status, COUNT(*) AS total
       FROM orders WHERE user_id = ? GROUP BY status`,
      [req.user.id]
    );
    const [totals] = await query(
      `SELECT COALESCE(SUM(total_amount), 0) AS lifetime
       FROM orders WHERE user_id = ? AND status <> 'cancelled'`,
      [req.user.id]
    );
    res.json({
      success: true,
      data: {
        byStatus: counts,
        lifetime: Number(totals[0].lifetime)
      }
    });
  } catch (err) { next(err); }
});

module.exports = router;
