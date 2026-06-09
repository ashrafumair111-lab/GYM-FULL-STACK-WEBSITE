/**
 * ==========================================================
 *  RepForge — Single-File Standalone Server
 * ==========================================================
 *  Zero-dependency Node.js server. Serves the static front-end
 *  AND implements the full REST API in-process. No MySQL, no
 *  npm install, no external services required.
 *
 *  Just run:   node serve.js
 *  Then open:  http://localhost:5500
 * ==========================================================
 */
const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const PORT = process.env.PORT || 5500;

/* -------------------------------------------------------
   IN-MEMORY DATA STORE
   ------------------------------------------------------- */
const products = [
  { id:1, name:'Adjustable Dumbbell Set', description:'Cast-iron adjustable dumbbells 5-50 lbs. Sold in pairs. Quick-twist locking system, knurled steel handles, and a compact footprint ideal for home gyms.', price:249.99, stock_quantity:40, image_url:'', category:'equipment', rating:4.8 },
  { id:2, name:'Commercial Treadmill Pro', description:'3.5 CHP motor, 22x60" belt, 15% incline, 12 mph max. Cushioned deck reduces joint impact by 30%.', price:1499.00, stock_quantity:12, image_url:'', category:'equipment', rating:4.7 },
  { id:3, name:'Performance Tank Top',     description:'Moisture-wicking tank, breathable mesh panels, reflective accents for night runs.', price:29.99, stock_quantity:200, image_url:'', category:'apparel', rating:4.5 },
  { id:4, name:'Compression Joggers',      description:'Slim-fit compression joggers with zip pockets and tapered ankles. Four-way stretch fabric.', price:59.50, stock_quantity:150, image_url:'', category:'apparel', rating:4.6 },
  { id:5, name:'Whey Protein Isolate',     description:'24g protein per serving, chocolate flavor, 2kg tub. 30 servings per container.', price:54.99, stock_quantity:300, image_url:'', category:'supplements', rating:4.9 },
  { id:6, name:'Pre-Workout Ignite',       description:'200mg caffeine, beta-alanine, citrulline malate, fruit punch. 40 servings per tub.', price:34.50, stock_quantity:250, image_url:'', category:'supplements', rating:4.6 },
  { id:7, name:'Lifting Belt - Pro',       description:'Full-grain leather, 10mm thickness, single prong buckle. Provides lumbar support for heavy lifts.', price:44.99, stock_quantity:80, image_url:'', category:'accessories', rating:4.7 },
  { id:8, name:'Gym Duffel Bag 50L',       description:'Water-resistant, ventilated shoe pocket, 50 liters, padded shoulder strap. Perfect for the daily grind.', price:39.00, stock_quantity:120, image_url:'', category:'accessories', rating:4.4 }
];
const users  = []; // {id, name, email, password_hash, role, created_at}
const orders = []; // {id, user_id, total_amount, status, shipping_address, created_at, items:[]}
const wish   = {}; // userId -> [productId]

const signToken = (u) =>
  Buffer.from(JSON.stringify({ id:u.id, email:u.email, role:u.role, exp: Date.now() + 7*24*60*60*1000 }))
    .toString('base64url');

const verifyToken = (auth) => {
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try { return JSON.parse(Buffer.from(auth.slice(7), 'base64url').toString('utf8')); }
  catch { return null; }
};

const requireAuth = (req, res) => {
  const u = verifyToken(req.headers.authorization);
  if (!u) { res.writeHead(401, {'Content-Type':'application/json'}); res.end('{"success":false,"code":"NO_TOKEN","message":"Sign in first."}'); return null; }
  return u;
};

/* -------------------------------------------------------
   HELPERS
   ------------------------------------------------------- */
const sendJSON = (res, code, body) => {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  });
  res.end(JSON.stringify(body));
};

const readBody = (req) => new Promise((resolve) => {
  let d = '';
  req.on('data', c => d += c);
  req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch { resolve({}); } });
});

const sendFile = (res, fp) => {
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not Found'); return; }
    const ext = path.extname(fp).toLowerCase();
    const type = {
      '.html':'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js':  'application/javascript; charset=utf-8',
      '.json':'application/json',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.ico': 'image/x-icon',
      '.txt': 'text/plain; charset=utf-8'
    }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
    res.end(data);
  });
};

/* -------------------------------------------------------
   ROUTER
   ------------------------------------------------------- */
const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') { res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  }); return res.end(); }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  /* -------- API -------- */
  if (path.startsWith('/api/')) return handleAPI(req, res, url);

  /* -------- STATIC -------- */
  let p = path === '/' ? '/index.html' : path;
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }
  sendFile(res, fp);
});

async function handleAPI(req, res, url) {
  const p = url.pathname;
  const m = req.method;
  const b = await readBody(req);

  /* AUTH */
  if (p === '/api/auth/register' && m === 'POST') {
    if (!b.name || !b.email || !b.password) return sendJSON(res, 422, { success:false, code:'VALIDATION', message:'Missing fields' });
    if (users.find(u => u.email === b.email)) return sendJSON(res, 409, { success:false, code:'EMAIL_TAKEN', message:'Email already registered' });
    const user = { id: Date.now(), name: b.name, email: b.email, role:'customer', created_at: new Date().toISOString() };
    user.password_hash = crypto.createHash('sha256').update(b.password).digest('hex');
    users.push(user);
    const { password_hash, ...safe } = user;
    return sendJSON(res, 201, { success:true, user: safe, token: signToken(user) });
  }
  if (p === '/api/auth/login' && m === 'POST') {
    const u = users.find(x => x.email === b.email && x.password_hash === crypto.createHash('sha256').update(b.password || '').digest('hex'));
    if (!u) return sendJSON(res, 401, { success:false, code:'BAD_CREDENTIALS', message:'Invalid email or password' });
    const { password_hash, ...safe } = u;
    return sendJSON(res, 200, { success:true, user: safe, token: signToken(u) });
  }
  if (p === '/api/auth/me' && m === 'GET') {
    const me = requireAuth(req, res); if (!me) return;
    const u = users.find(x => x.id === me.id);
    if (!u) return sendJSON(res, 404, { success:false, code:'NOT_FOUND', message:'User not found' });
    const { password_hash, ...safe } = u;
    return sendJSON(res, 200, { success:true, user: safe });
  }

  /* PRODUCTS */
  if (p === '/api/products/categories' && m === 'GET') {
    const cats = {};
    products.forEach(x => cats[x.category] = (cats[x.category] || 0) + 1);
    return sendJSON(res, 200, { success:true, data: Object.entries(cats).map(([category,count]) => ({ category, count })) });
  }
  if (p.startsWith('/api/products/') && m === 'GET') {
    const id = +p.split('/').pop();
    const prod = products.find(x => x.id === id);
    if (!prod) return sendJSON(res, 404, { success:false, code:'NOT_FOUND', message:'Product not found' });
    return sendJSON(res, 200, { success:true, data: prod });
  }
  if (p === '/api/products' && m === 'GET') {
    let out = products.slice();
    const cat  = url.searchParams.get('category');
    const min  = parseFloat(url.searchParams.get('minPrice'));
    const max  = parseFloat(url.searchParams.get('maxPrice'));
    const minR = parseFloat(url.searchParams.get('minRating'));
    const q    = (url.searchParams.get('search') || '').toLowerCase();
    const sort = url.searchParams.get('sort') || 'newest';
    const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1);
    const limit= Math.min(48, parseInt(url.searchParams.get('limit')) || 12);

    if (cat) out = out.filter(p => p.category === cat);
    if (!isNaN(min)) out = out.filter(p => p.price >= min);
    if (!isNaN(max)) out = out.filter(p => p.price <= max);
    if (!isNaN(minR)) out = out.filter(p => p.rating >= minR);
    if (q) out = out.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));

    const sortMap = {
      price_asc:  (a,b) => a.price - b.price,
      price_desc: (a,b) => b.price - a.price,
      name_asc:   (a,b) => a.name.localeCompare(b.name),
      name_desc:  (a,b) => b.name.localeCompare(a.name),
      rating:     (a,b) => b.rating - a.rating,
      newest:     (a,b) => b.id - a.id
    };
    out.sort(sortMap[sort] || sortMap.newest);

    const total = out.length;
    const start = (page - 1) * limit;
    return sendJSON(res, 200, { success:true, page, pages: Math.ceil(total/limit), total, limit, data: out.slice(start, start+limit) });
  }

  /* ORDERS */
  if (p === '/api/orders' && m === 'POST') {
    const me = requireAuth(req, res); if (!me) return;
    if (!Array.isArray(b.items) || !b.items.length) return sendJSON(res, 422, { success:false, code:'EMPTY_CART', message:'Cart is empty' });
    let total = 0;
    const items = b.items.map(it => {
      const prod = products.find(p => p.id === +it.product_id);
      if (!prod) return null;
      const qty = Math.max(1, +it.quantity || 1);
      total += prod.price * qty;
      return { product_id: prod.id, name: prod.name, price: prod.price, quantity: qty };
    }).filter(Boolean);
    const order = {
      id: Date.now(),
      user_id: me.id,
      total_amount: total,
      status: 'pending',
      shipping_address: b.shipping_address || '',
      created_at: new Date().toISOString(),
      items
    };
    orders.unshift(order);
    return sendJSON(res, 201, { success:true, message:'Order created', data: { orderId: order.id, total, items: order.items } });
  }
  if (p === '/api/orders' && m === 'GET') {
    const me = requireAuth(req, res); if (!me) return;
    return sendJSON(res, 200, { success:true, data: orders.filter(o => o.user_id === me.id).map(({items, ...o}) => o) });
  }

  /* USERS */
  if (p === '/api/users/profile' && m === 'GET') {
    const me = requireAuth(req, res); if (!me) return;
    const u = users.find(x => x.id === me.id);
    if (!u) return sendJSON(res, 404, { success:false, code:'NOT_FOUND', message:'User not found' });
    const { password_hash, ...safe } = u;
    return sendJSON(res, 200, { success:true, data: safe });
  }
  if (p === '/api/users/profile' && m === 'PATCH') {
    const me = requireAuth(req, res); if (!me) return;
    const u = users.find(x => x.id === me.id);
    if (!u) return sendJSON(res, 404, { success:false, code:'NOT_FOUND', message:'User not found' });
    if (b.name)  u.name  = b.name;
    if (b.email) u.email = b.email;
    if (b.password) u.password_hash = crypto.createHash('sha256').update(b.password).digest('hex');
    return sendJSON(res, 200, { success:true, message:'Profile updated' });
  }
  if (p === '/api/users/orders/summary' && m === 'GET') {
    const me = requireAuth(req, res); if (!me) return;
    const mine = orders.filter(o => o.user_id === me.id);
    const byStatus = {};
    mine.forEach(o => { byStatus[o.status] = (byStatus[o.status]||0)+1; });
    const lifetime = mine.filter(o => o.status !== 'cancelled').reduce((s,o) => s + o.total_amount, 0);
    return sendJSON(res, 200, { success:true, data: { byStatus: Object.entries(byStatus).map(([status,total])=>({status,total})), lifetime } });
  }

  // 404
  sendJSON(res, 404, { success:false, code:'NOT_FOUND', message:'Endpoint not found: ' + p });
}

server.listen(PORT, () => {
  console.log('==================================================');
  console.log('  RepForge Gym Store');
  console.log('  Server running on  http://localhost:' + PORT);
  console.log('  Press Ctrl+C to stop');
  console.log('==================================================');
  try {
    const open = require('child_process').exec;
    open('start "" "http://localhost:' + PORT + '/"');
  } catch (e) {}
});
