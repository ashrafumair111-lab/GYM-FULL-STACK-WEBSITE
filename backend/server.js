/**
 * ===========================================================
 *  GYM STORE — MAIN API SERVER
 *  Entry point. Loads env, mounts routers, starts Express.
 * ===========================================================
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express        = require('express');
const cors           = require('cors');
const helmet         = require('helmet');
const rateLimit      = require('express-rate-limit');
const path           = require('path');

const authRoutes     = require('./routes/auth.routes');
const productRoutes  = require('./routes/product.routes');
const orderRoutes    = require('./routes/order.routes');
const userRoutes     = require('./routes/user.routes');
const errorHandler   = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 5000;

/* ---------- security & utilities ---------- */
app.use(helmet({
  contentSecurityPolicy: false, // disabled to allow inline scripts during dev
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

/* ---------- static front-end ---------- */
app.use(express.static(path.join(__dirname, '..', 'frontend')));

/* ---------- API routes ---------- */
app.use('/api/auth',    authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/users',    userRoutes);

app.get('/api/health', (_, res) =>
  res.json({ status: 'ok', service: 'gym-store-api', time: new Date().toISOString() })
);

/* ---------- SPA fallback ---------- */
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

/* ---------- global error handler ---------- */
app.use(errorHandler);

/* ---------- start ---------- */
app.listen(PORT, () => {
  console.log(`\n🏋  Gym Store API running  →  http://localhost:${PORT}\n`);
});

module.exports = app;
