/**
 * ============================================================
 *  ORDER ROUTES
 *   POST /api/orders                -> create order from cart (auth)
 *   GET  /api/orders                -> list my orders       (auth)
 *   GET  /api/orders/:id            -> order details        (auth)
 * ============================================================
 */
const express = require('express');
const { withTransaction } = require('../config/db');
const { requireAuth }      = require('../middleware/auth');

const router = express.Router();

/* ---------- POST / ---------- */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { items, shipping_address } = req.body;

    /* ---- basic validation ---- */
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(422).json({
        success: false, code: 'EMPTY_CART',
        message: 'Cart is empty.'
      });
    }
    if (!shipping_address || shipping_address.length < 10) {
      return res.status(422).json({
        success: false, code: 'BAD_ADDRESS',
        message: 'Valid shipping address required.'
      });
    }

    /* ---- run inside a transaction ---- */
    const result = await withTransaction(async (conn) => {
      let total = 0;
      const detailed = [];

      for (const item of items) {
        const pid = Number(item.product_id);
        const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));

        // SELECT ... FOR UPDATE locks the row, preventing oversell
        const [rows] = await conn.execute(
          'SELECT id, name, price, stock_quantity FROM products WHERE id = ? FOR UPDATE',
          [pid]
        );
        if (!rows.length) {
          const e = new Error(`Product ${pid} not found`);
          e.status = 404; e.code = 'PRODUCT_NOT_FOUND';
          throw e;
        }
        const product = rows[0];
        if (product.stock_quantity < qty) {
          const e = new Error(`Insufficient stock for "${product.name}"`);
          e.status = 409; e.code = 'OUT_OF_STOCK';
          throw e;
        }

        // decrement stock
        await conn.execute(
          'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?',
          [qty, pid]
        );

        const line = qty * Number(product.price);
        total += line;
        detailed.push({
          product_id: pid,
          quantity:   qty,
          price:      Number(product.price),
          name:       product.name
        });
      }

      // create order header
      const [orderRes] = await conn.execute(
        `INSERT INTO orders (user_id, total_amount, status, shipping_address)
         VALUES (?, ?, 'pending', ?)`,
        [req.user.id, total, shipping_address]
      );
      const orderId = orderRes.insertId;

      // create order items
      for (const d of detailed) {
        await conn.execute(
          `INSERT INTO order_items (order_id, product_id, quantity, price)
           VALUES (?, ?, ?, ?)`,
          [orderId, d.product_id, d.quantity, d.price]
        );
      }

      return { orderId, total, items: detailed };
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully.',
      data:    result
    });
  } catch (err) { next(err); }
});

/* ---------- GET / ---------- */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await require('../config/db').query(
      `SELECT id, total_amount, status, shipping_address, created_at
       FROM orders WHERE user_id = ? ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

/* ---------- GET /:id ---------- */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const [orderRows] = await require('../config/db').query(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!orderRows.length) {
      return res.status(404).json({
        success: false, code: 'NOT_FOUND', message: 'Order not found.'
      });
    }
    const [items] = await require('../config/db').query(
      `SELECT oi.id, oi.product_id, p.name, p.image_url, oi.quantity, oi.price
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?`,
      [req.params.id]
    );
    res.json({
      success: true,
      data: { ...orderRows[0], items }
    });
  } catch (err) { next(err); }
});

module.exports = router;
