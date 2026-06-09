/**
 * ============================================================
 *  PRODUCT ROUTES
 *   GET  /api/products           -> list with filtering/sorting
 *   GET  /api/products/:id       -> single product
 *   GET  /api/products/categories -> list of categories
 *   POST /api/products           -> create (admin)
 * ============================================================
 */
const express = require('express');
const { query } = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

/* ---------- whitelist for ORDER BY to prevent SQL injection ---------- */
const SORT_WHITELIST = {
  price_asc:  'price ASC',
  price_desc: 'price DESC',
  name_asc:   'name ASC',
  name_desc:  'name DESC',
  rating:     'rating DESC',
  newest:     'created_at DESC'
};

/* ---------- GET / (filter / sort / paginate) ---------- */
router.get('/', async (req, res, next) => {
  try {
    const {
      category, minPrice, maxPrice, minRating,
      search, sort, page = 1, limit = 12
    } = req.query;

    const where  = [];
    const params = [];

    if (category) {
      where.push('category = ?');
      params.push(category);
    }
    if (minPrice) {
      where.push('price >= ?');
      params.push(Number(minPrice));
    }
    if (maxPrice) {
      where.push('price <= ?');
      params.push(Number(maxPrice));
    }
    if (minRating) {
      where.push('rating >= ?');
      params.push(Number(minRating));
    }
    if (search) {
      where.push('(name LIKE ? OR description LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term);
    }

    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const orderSQL = SORT_WHITELIST[sort] || SORT_WHITELIST.newest;

    const pageNum  = Math.max(1, parseInt(page, 10)  || 1);
    const pageSize = Math.min(48, Math.max(1, parseInt(limit, 10) || 12));
    const offset   = (pageNum - 1) * pageSize;

    const [rows] = await query(
      `SELECT id, name, description, price, stock_quantity, image_url, category, rating
       FROM products
       ${whereSQL}
       ORDER BY ${orderSQL}
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const [[{ total }]] = await query(
      `SELECT COUNT(*) AS total FROM products ${whereSQL}`,
      params
    );

    res.json({
      success: true,
      page:    pageNum,
      pages:   Math.ceil(total / pageSize),
      total,
      limit:   pageSize,
      data:    rows
    });
  } catch (err) { next(err); }
});

/* ---------- GET /categories ---------- */
router.get('/categories', async (_, res, next) => {
  try {
    const [rows] = await query(
      `SELECT category, COUNT(*) AS count
       FROM products GROUP BY category`
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

/* ---------- GET /:id ---------- */
router.get('/:id', async (req, res, next) => {
  try {
    const [rows] = await query(
      'SELECT * FROM products WHERE id = ?',
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({
        success: false, code: 'NOT_FOUND', message: 'Product not found.'
      });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) { next(err); }
});

/* ---------- POST /  (admin only) ---------- */
router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { name, description, price, stock_quantity, image_url, category, rating = 0 } = req.body;
    if (!name || !description || !price || !image_url || !category) {
      return res.status(422).json({
        success: false, code: 'VALIDATION_ERROR',
        message: 'Missing required fields.'
      });
    }
    const [r] = await query(
      `INSERT INTO products (name, description, price, stock_quantity, image_url, category, rating)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, description, price, stock_quantity || 0, image_url, category, rating]
    );
    res.status(201).json({ success: true, id: r.insertId });
  } catch (err) { next(err); }
});

module.exports = router;
