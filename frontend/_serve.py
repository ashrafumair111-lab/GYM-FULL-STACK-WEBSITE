"""
RepForge Gym Store - All-in-one server (MySQL backend).
Serves the static front-end AND implements the REST API via MySQL.
Run:  python _serve.py
"""
import http.server, socketserver, json, os, time, urllib.parse, webbrowser
from datetime import datetime
import mysql.connector
import bcrypt

ROOT  = os.path.dirname(os.path.abspath(__file__))
PORT  = int(os.environ.get('PORT', 5500))
os.chdir(ROOT)

# ----------- MySQL -----------
DB_CFG = dict(host='localhost', user='root', password='umair222',
              database='gym_store', autocommit=True, charset='utf8mb4')

def db():
    return mysql.connector.connect(**DB_CFG)

# ----------- Auth helpers -----------
def hash_pw(pw):
    return bcrypt.hashpw((pw or '').encode(), bcrypt.gensalt()).decode()

def check_pw(pw, h):
    try: return bcrypt.checkpw((pw or '').encode(), h.encode())
    except: return False

def sign_token(u):
    import base64
    payload = json.dumps({'id': u['id'], 'email': u['email'],
                          'role': u['role'],
                          'exp': int(time.time()*1000)+7*24*3600*1000})
    return base64.urlsafe_b64encode(payload.encode()).decode().rstrip('=')

def verify_token(auth):
    if not auth or not auth.startswith('Bearer '): return None
    import base64
    try:
        d = auth[7:] + '=='[:4-(len(auth[7:])%4)]
        return json.loads(base64.urlsafe_b64decode(d))
    except: return None

def get_user_id(req):
    me = verify_token(req.headers.get('Authorization'))
    return me['id'] if me else None

def get_user_row(uid):
    if not uid: return None
    cur = db().cursor(dictionary=True)
    cur.execute("SELECT id,name,email,role,created_at FROM users WHERE id=%s",(uid,))
    r = cur.fetchone(); cur.close()
    return r

def safe_float(v):
    if not v or v in ('','undefined','null','None','NaN'): return None
    try: f=float(v); return f if f==f else None
    except: return None

# ----------- HANDLER -----------
class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

    def end_headers(self):
        self.send_header('Cache-Control','no-cache')
        super().end_headers()

    def _json(self, code, body):
        def enc(o):
            if hasattr(o, 'isoformat'): return o.isoformat()
            raise TypeError(f"Object of type {o.__class__.__name__} is not JSON serializable")
        d = json.dumps(body, default=enc).encode()
        self.send_response(code)
        self.send_header('Content-Type','application/json')
        self.send_header('Content-Length',len(d))
        self.send_header('Access-Control-Allow-Origin','*')
        self.send_header('Access-Control-Allow-Methods','GET,POST,PATCH,DELETE,OPTIONS')
        self.send_header('Access-Control-Allow-Headers','Content-Type,Authorization')
        self.end_headers()
        self.wfile.write(d)

    def _body(self):
        n = int(self.headers.get('Content-Length',0) or 0)
        if not n: return {}
        try: return json.loads(self.rfile.read(n))
        except: return {}

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin','*')
        self.send_header('Access-Control-Allow-Methods','GET,POST,PATCH,DELETE,OPTIONS')
        self.send_header('Access-Control-Allow-Headers','Content-Type,Authorization')
        self.end_headers()

    def do_GET(self):
        p = urllib.parse.urlparse(self.path).path
        qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        if p.startswith('/api/'): return self._get(p, qs)
        if p == '/': p = '/index.html'
        return super().do_GET()

    def do_POST(self):
        p = urllib.parse.urlparse(self.path).path
        if p.startswith('/api/'): return self._post(p)
        self.send_error(404)

    def do_PATCH(self):
        p = urllib.parse.urlparse(self.path).path
        if p.startswith('/api/'): return self._patch(p)
        self.send_error(404)

    # ======== GET ========
    def _get(self, path, qs):
        con = db(); cur = con.cursor(dictionary=True)

        # --- Products list ---
        if path == '/api/products':
            where, params = [], []
            cat   = (qs.get('category') or [''])[0]
            minp  = safe_float(qs['minPrice'][0]) if 'minPrice' in qs else None
            maxp  = safe_float(qs['maxPrice'][0]) if 'maxPrice' in qs else None
            minr  = safe_float(qs['minRating'][0]) if 'minRating' in qs else None
            search = (qs.get('search') or [''])[0]
            sort   = (qs.get('sort') or ['newest'])[0]
            try: page = max(1, int(qs.get('page',['1'])[0]))
            except: page = 1
            try: limit = min(48, max(1, int(qs.get('limit',['12'])[0])))
            except: limit = 12

            if cat:
                where.append("category=%s"); params.append(cat)
            if minp is not None:
                where.append("price>=%s"); params.append(minp)
            if maxp is not None:
                where.append("price<=%s"); params.append(maxp)
            if minr is not None:
                where.append("rating>=%s"); params.append(minr)
            if search:
                where.append("(name LIKE %s OR description LIKE %s)")
                params += [f'%{search}%', f'%{search}%']

            w = (' WHERE '+(' AND '.join(where))) if where else ''
            sortmap = {'price_asc':'price','price_desc':'price DESC',
                       'name_asc':'name','name_desc':'name DESC',
                       'rating':'rating DESC','newest':'id DESC'}
            order = sortmap.get(sort, 'id DESC')

            cur.execute(f"SELECT COUNT(*) AS c FROM products{w}", params)
            total = cur.fetchone()['c']
            cur.execute(f"SELECT * FROM products{w} ORDER BY {order} LIMIT %s OFFSET %s",
                        params+[limit, (page-1)*limit])
            rows = cur.fetchall()
            cur.close(); con.close()
            for r in rows:
                r['price']=float(r['price']); r['rating']=float(r['rating'])
            return self._json(200,{'success':True,'page':page,
                'pages':max(1,-(-total//limit)),'total':total,'limit':limit,'data':rows})

        # --- Categories ---
        if path == '/api/products/categories':
            cur.execute("SELECT category, COUNT(*) AS count FROM products GROUP BY category")
            rows = cur.fetchall(); cur.close(); con.close()
            return self._json(200,{'success':True,'data':rows})

        # --- Single product ---
        if path.startswith('/api/products/'):
            try: pid=int(path.rsplit('/',1)[-1])
            except: cur.close(); con.close(); return self._json(404,{'success':False,'code':'NOT_FOUND'})
            cur.execute("SELECT * FROM products WHERE id=%s",(pid,))
            r=cur.fetchone(); cur.close(); con.close()
            if not r: return self._json(404,{'success':False,'code':'NOT_FOUND','message':'Product not found'})
            r['price']=float(r['price']); r['rating']=float(r['rating'])
            return self._json(200,{'success':True,'data':r})

        # --- Auth/me ---
        if path == '/api/auth/me':
            uid = get_user_id(self)
            if not uid: cur.close(); con.close(); return self._json(401,{'success':False,'code':'NO_TOKEN'})
            cur.execute("SELECT id,name,email,role,created_at FROM users WHERE id=%s",(uid,))
            u=cur.fetchone(); cur.close(); con.close()
            if not u: return self._json(401,{'success':False,'code':'NO_TOKEN'})
            return self._json(200,{'success':True,'user':u})

        # --- User profile ---
        if path == '/api/users/profile':
            uid = get_user_id(self)
            if not uid: cur.close(); con.close(); return self._json(401,{'success':False,'code':'NO_TOKEN'})
            cur.execute("SELECT id,name,email,role,created_at FROM users WHERE id=%s",(uid,))
            u=cur.fetchone(); cur.close(); con.close()
            if not u: return self._json(401,{'success':False,'code':'NO_TOKEN'})
            return self._json(200,{'success':True,'data':u})

        # --- User orders ---
        if path == '/api/orders':
            uid = get_user_id(self)
            if not uid: cur.close(); con.close(); return self._json(401,{'success':False,'code':'NO_TOKEN'})
            cur.execute("SELECT id,user_id,total_amount,status,shipping_address,created_at FROM orders WHERE user_id=%s ORDER BY created_at DESC",(uid,))
            rows=cur.fetchall(); cur.close(); con.close()
            for r in rows: r['total_amount']=float(r['total_amount'])
            return self._json(200,{'success':True,'data':rows})

        # --- Order summary ---
        if path == '/api/users/orders/summary':
            uid = get_user_id(self)
            if not uid: cur.close(); con.close(); return self._json(401,{'success':False,'code':'NO_TOKEN'})
            cur.execute("SELECT status, COUNT(*) AS total FROM orders WHERE user_id=%s GROUP BY status",(uid,))
            by_status=cur.fetchall()
            cur.execute("SELECT COALESCE(SUM(total_amount),0) AS lt FROM orders WHERE user_id=%s AND status!='cancelled'",(uid,))
            lt=float(cur.fetchone()['lt']); cur.close(); con.close()
            return self._json(200,{'success':True,'data':{'byStatus':by_status,'lifetime':lt}})

        cur.close(); con.close()
        return self._json(404,{'success':False,'code':'NOT_FOUND','message':'Not found: '+path})

    # ======== POST ========
    def _post(self, path):
        b = self._body()

        if path == '/api/auth/register':
            if not b.get('name') or not b.get('email') or not b.get('password'):
                return self._json(422,{'success':False,'code':'VALIDATION','message':'Missing fields'})
            con = db(); cur = con.cursor(dictionary=True)
            cur.execute("SELECT id FROM users WHERE email=%s",(b['email'],))
            if cur.fetchone():
                cur.close(); con.close()
                return self._json(409,{'success':False,'code':'EMAIL_TAKEN','message':'Email already registered'})
            pw_hash = hash_pw(b['password'])
            cur.execute("INSERT INTO users (name,email,password_hash,role) VALUES (%s,%s,%s,'customer')",
                        (b['name'], b['email'], pw_hash))
            con.commit()
            uid = cur.lastrowid
            cur.execute("SELECT id,name,email,role,created_at FROM users WHERE id=%s",(uid,))
            u=cur.fetchone(); cur.close(); con.close()
            return self._json(201,{'success':True,'user':u,'token':sign_token(u)})

        if path == '/api/auth/login':
            con = db(); cur = con.cursor(dictionary=True)
            cur.execute("SELECT id,name,email,role,password_hash,created_at FROM users WHERE email=%s",(b.get('email'),))
            u=cur.fetchone(); cur.close(); con.close()
            if not u or not check_pw(b.get('password'), u['password_hash']):
                return self._json(401,{'success':False,'code':'BAD_CREDENTIALS','message':'Invalid credentials'})
            safe = {k:v for k,v in u.items() if k!='password_hash'}
            return self._json(200,{'success':True,'user':safe,'token':sign_token(u)})

        if path == '/api/orders':
            uid = get_user_id(self)
            if not uid: return self._json(401,{'success':False,'code':'NO_TOKEN','message':'Sign in first.'})
            items = b.get('items') or []
            if not items: return self._json(422,{'success':False,'code':'EMPTY_CART','message':'Cart is empty'})
            con = db(); cur = con.cursor(dictionary=True)
            total = 0; detailed = []
            for it in items:
                pid = int(it.get('product_id',0))
                cur.execute("SELECT id,name,price FROM products WHERE id=%s",(pid,))
                p=cur.fetchone()
                if not p: continue
                qty = max(1, int(it.get('quantity',1)))
                total += float(p['price']) * qty
                detailed.append({'product_id':p['id'],'name':p['name'],'price':float(p['price']),'quantity':qty})
            if not detailed:
                cur.close(); con.close()
                return self._json(422,{'success':False,'code':'EMPTY_CART','message':'No valid products'})
            addr = b.get('shipping_address','')
            cur.execute("INSERT INTO orders (user_id,total_amount,status,shipping_address) VALUES (%s,%s,'pending',%s)",
                        (uid, total, addr))
            oid = cur.lastrowid
            for d in detailed:
                cur.execute("INSERT INTO order_items (order_id,product_id,quantity,price) VALUES (%s,%s,%s,%s)",
                            (oid, d['product_id'], d['quantity'], d['price']))
            con.commit(); cur.close(); con.close()
            return self._json(201,{'success':True,'message':'Order created','data':{'orderId':oid,'total':total,'items':detailed}})

        return self._json(404,{'success':False,'code':'NOT_FOUND'})

    # ======== PATCH ========
    def _patch(self, path):
        b = self._body()
        if path == '/api/users/profile':
            uid = get_user_id(self)
            if not uid: return self._json(401,{'success':False,'code':'NO_TOKEN'})
            con = db(); cur = con.cursor()
            updates, params = [], []
            if b.get('name'):
                updates.append("name=%s"); params.append(b['name'])
            if b.get('email'):
                updates.append("email=%s"); params.append(b['email'])
            if b.get('password'):
                updates.append("password_hash=%s"); params.append(hash_pw(b['password']))
            if updates:
                params.append(uid)
                cur.execute(f"UPDATE users SET {', '.join(updates)} WHERE id=%s", params)
                con.commit()
            cur.close(); con.close()
            return self._json(200,{'success':True,'message':'Profile updated'})

        return self._json(404,{'success':False,'code':'NOT_FOUND'})


# ----------- LAUNCH -----------
print('==================================================')
print('  RepForge Gym Store (MySQL)')
print('  Serving from:', ROOT)
print('  Open:         http://localhost:%d/' % PORT)
print('  Press Ctrl+C to stop')
print('==================================================')
try: webbrowser.open('http://localhost:%d/' % PORT)
except: pass

socketserver.ThreadingTCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(('', PORT), Handler) as httpd:
    try: httpd.serve_forever()
    except KeyboardInterrupt: print('\n[stopped]')