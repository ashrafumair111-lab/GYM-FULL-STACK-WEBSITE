import json, time, hashlib, base64
from datetime import datetime
from django.http import JsonResponse, HttpResponse, FileResponse
from django.db import connection, IntegrityError
from django.views.decorators.csrf import csrf_exempt
from pathlib import Path
import bcrypt

BASE_DIR = Path(__file__).resolve().parent.parent

# ─── Auth helpers ───
def hash_pw(pw):
    return bcrypt.hashpw((pw or '').encode(), bcrypt.gensalt()).decode()

def check_pw(pw, h):
    try: return bcrypt.checkpw((pw or '').encode(), h.encode())
    except: return False

def sign_token(u):
    payload = json.dumps({'id': u['id'], 'email': u['email'],
                          'role': u['role'],
                          'exp': int(time.time()*1000)+7*24*3600*1000})
    return base64.urlsafe_b64encode(payload.encode()).decode().rstrip('=')

def verify_token(auth):
    if not auth or not auth.startswith('Bearer '): return None
    try:
        d = auth[7:] + '=='[:4-(len(auth[7:])%4)]
        return json.loads(base64.urlsafe_b64decode(d))
    except: return None

def get_user_id(request):
    m = verify_token(request.META.get('HTTP_AUTHORIZATION'))
    return m['id'] if m else None

def rows_to_list(cursor):
    cols = [c[0] for c in cursor.description]
    return [dict(zip(cols, row)) for row in cursor.fetchall()]

def safe_float(v):
    if not v or v in ('','undefined','null','None','NaN'): return None
    try: f=float(v); return f if f==f else None
    except: return None

# ─── Main API handler ───
@csrf_exempt
def api(request, path=''):
    full_path = '/' + path if path else request.path_info
    method = request.method

    with connection.cursor() as cur:
        # ── Static file serving (all non-/api/ paths) ──
        if not full_path.startswith('/api/'):
            return serve_static(request, full_path)

        # Strip /api/ prefix
        route = full_path[5:]  # e.g. 'products' or 'products/5'
        base = route.split('?')[0].rstrip('/')

        # ── GET /api/products ──
        if base == 'products' and method == 'GET':
            where, params = [], []
            cat = request.GET.get('category', '')
            minp = safe_float(request.GET.get('minPrice'))
            maxp = safe_float(request.GET.get('maxPrice'))
            minr = safe_float(request.GET.get('minRating'))
            search = request.GET.get('search', '')
            sort = request.GET.get('sort', 'newest')
            try: page = max(1, int(request.GET.get('page', 1)))
            except: page = 1
            try: limit = min(48, max(1, int(request.GET.get('limit', 12))))
            except: limit = 12

            if cat: where.append("category=%s"); params.append(cat)
            if minp is not None: where.append("price>=%s"); params.append(minp)
            if maxp is not None: where.append("price<=%s"); params.append(maxp)
            if minr is not None: where.append("rating>=%s"); params.append(minr)
            if search: where.append("(name LIKE %s OR description LIKE %s)"); params += [f'%{search}%', f'%{search}%']

            w = (' WHERE '+' AND '.join(where)) if where else ''
            sortmap = {'price_asc':'price','price_desc':'price DESC',
                       'name_asc':'name','name_desc':'name DESC',
                       'rating':'rating DESC','newest':'id DESC'}
            order = sortmap.get(sort, 'id DESC')

            cur.execute(f"SELECT COUNT(*) FROM products{w}", params)
            total = cur.fetchone()[0]
            cur.execute(f"SELECT * FROM products{w} ORDER BY {order} LIMIT %s OFFSET %s",
                        params+[limit, (page-1)*limit])
            rows = rows_to_list(cur)
            for r in rows:
                r['price'] = float(r['price'])
                r['rating'] = float(r['rating'])
            return json_response({'success':True,'page':page,
                'pages':max(1,-(-total//limit)),'total':total,'limit':limit,'data':rows})

        # ── GET /api/products/categories ──
        if base == 'products/categories' and method == 'GET':
            cur.execute("SELECT category, COUNT(*) AS count FROM products GROUP BY category")
            rows = rows_to_list(cur)
            return json_response({'success':True,'data':rows})

        # ── GET /api/products/<id> ──
        if base.startswith('products/') and method == 'GET':
            try: pid = int(base.split('/')[1])
            except: return json_response({'success':False,'code':'NOT_FOUND'}, 404)
            cur.execute("SELECT * FROM products WHERE id=%s", (pid,))
            r = cur.fetchone()
            if not r: return json_response({'success':False,'message':'Not found'}, 404)
            cols = [c[0] for c in cur.description]
            d = dict(zip(cols, r))
            d['price'] = float(d['price']); d['rating'] = float(d['rating'])
            return json_response({'success':True,'data':d})

        # ── POST /api/auth/register ──
        if base == 'auth/register' and method == 'POST':
            body = json.loads(request.body)
            if not body.get('name') or not body.get('email') or not body.get('password'):
                return json_response({'success':False,'code':'VALIDATION','message':'Missing fields'}, 422)
            try:
                pw_hash = hash_pw(body['password'])
                cur.execute("INSERT INTO users (name,email,password_hash,role) VALUES (%s,%s,%s,'customer')",
                            (body['name'], body['email'], pw_hash))
                uid = cur.lastrowid
                cur.execute("SELECT id,name,email,role,created_at FROM users WHERE id=%s", (uid,))
                u = cur.fetchone()
                cols = [c[0] for c in cur.description]
                user = dict(zip(cols, u))
                return json_response({'success':True,'user':user,'token':sign_token(user)}, 201)
            except IntegrityError:
                return json_response({'success':False,'code':'EMAIL_TAKEN','message':'Email already registered'}, 409)

        # ── POST /api/auth/login ──
        if base == 'auth/login' and method == 'POST':
            body = json.loads(request.body)
            cur.execute("SELECT id,name,email,role,password_hash,created_at FROM users WHERE email=%s", (body.get('email'),))
            r = cur.fetchone()
            if not r: return json_response({'success':False,'code':'BAD_CREDENTIALS','message':'Invalid credentials'}, 401)
            cols = [c[0] for c in cur.description]
            u = dict(zip(cols, r))
            if not check_pw(body.get('password'), u['password_hash']):
                return json_response({'success':False,'code':'BAD_CREDENTIALS','message':'Invalid credentials'}, 401)
            safe = {k:v for k,v in u.items() if k!='password_hash'}
            safe['created_at'] = str(safe['created_at'])
            return json_response({'success':True,'user':safe,'token':sign_token(safe)})

        # ── GET /api/auth/me ──
        if base == 'auth/me' and method == 'GET':
            uid = get_user_id(request)
            if not uid: return json_response({'success':False,'code':'NO_TOKEN'}, 401)
            cur.execute("SELECT id,name,email,role,created_at FROM users WHERE id=%s", (uid,))
            r = cur.fetchone()
            if not r: return json_response({'success':False,'code':'NO_TOKEN'}, 401)
            cols = [c[0] for c in cur.description]
            u = dict(zip(cols, r))
            u['created_at'] = str(u['created_at'])
            return json_response({'success':True,'user':u})

        # ── GET /api/users/profile ──
        if base == 'users/profile' and method == 'GET':
            uid = get_user_id(request)
            if not uid: return json_response({'success':False,'code':'NO_TOKEN'}, 401)
            cur.execute("SELECT id,name,email,role,created_at FROM users WHERE id=%s", (uid,))
            r = cur.fetchone()
            if not r: return json_response({'success':False,'code':'NO_TOKEN'}, 401)
            cols = [c[0] for c in cur.description]
            u = dict(zip(cols, r))
            u['created_at'] = str(u['created_at'])
            return json_response({'success':True,'data':u})

        # ── PATCH /api/users/profile ──
        if base == 'users/profile' and method == 'PATCH':
            uid = get_user_id(request)
            if not uid: return json_response({'success':False,'code':'NO_TOKEN'}, 401)
            body = json.loads(request.body)
            updates, params = [], []
            if body.get('name'): updates.append("name=%s"); params.append(body['name'])
            if body.get('email'): updates.append("email=%s"); params.append(body['email'])
            if body.get('password'): updates.append("password_hash=%s"); params.append(hash_pw(body['password']))
            if updates:
                params.append(uid)
                cur.execute(f"UPDATE users SET {', '.join(updates)} WHERE id=%s", params)
            return json_response({'success':True,'message':'Profile updated'})

        # ── GET /api/orders ──
        if base == 'orders' and method == 'GET':
            uid = get_user_id(request)
            if not uid: return json_response({'success':False,'code':'NO_TOKEN'}, 401)
            cur.execute("SELECT id,user_id,total_amount,status,shipping_address,created_at FROM orders WHERE user_id=%s ORDER BY created_at DESC", (uid,))
            rows = rows_to_list(cur)
            for r in rows:
                r['total_amount'] = float(r['total_amount'])
                r['created_at'] = str(r['created_at'])
            return json_response({'success':True,'data':rows})

        # ── POST /api/orders ──
        if base == 'orders' and method == 'POST':
            uid = get_user_id(request)
            if not uid: return json_response({'success':False,'code':'NO_TOKEN'}, 401)
            body = json.loads(request.body)
            items = body.get('items') or []
            if not items: return json_response({'success':False,'code':'EMPTY_CART','message':'Cart is empty'}, 422)
            total = 0; detailed = []
            for it in items:
                pid = int(it.get('product_id',0))
                cur.execute("SELECT id,name,price FROM products WHERE id=%s", (pid,))
                p = cur.fetchone()
                if not p: continue
                qty = max(1, int(it.get('quantity',1)))
                total += float(p[2]) * qty
                detailed.append({'product_id':p[0],'name':p[1],'price':float(p[2]),'quantity':qty})
            if not detailed:
                return json_response({'success':False,'code':'EMPTY_CART','message':'No valid products'}, 422)
            addr = body.get('shipping_address','')
            cur.execute("INSERT INTO orders (user_id,total_amount,status,shipping_address) VALUES (%s,%s,'pending',%s)",
                        (uid, total, addr))
            oid = cur.lastrowid
            for d in detailed:
                cur.execute("INSERT INTO order_items (order_id,product_id,quantity,price) VALUES (%s,%s,%s,%s)",
                            (oid, d['product_id'], d['quantity'], d['price']))
            return json_response({'success':True,'message':'Order created','data':{'orderId':oid,'total':float(total),'items':detailed}}, 201)

        # ── GET /api/users/orders/summary ──
        if base == 'users/orders/summary' and method == 'GET':
            uid = get_user_id(request)
            if not uid: return json_response({'success':False,'code':'NO_TOKEN'}, 401)
            cur.execute("SELECT status, COUNT(*) AS total FROM orders WHERE user_id=%s GROUP BY status", (uid,))
            by_status = rows_to_list(cur)
            cur.execute("SELECT COALESCE(SUM(total_amount),0) AS lt FROM orders WHERE user_id=%s AND status!='cancelled'", (uid,))
            lt = float(cur.fetchone()[0])
            return json_response({'success':True,'data':{'byStatus':by_status,'lifetime':lt}})

    return json_response({'success':False,'code':'NOT_FOUND','message':'Endpoint not found'}, 404)


def json_response(data, status=200):
    return JsonResponse(data, status=status)

def serve_static(request, path):
    if path == '/':
        path = '/index.html'
    filepath = BASE_DIR / 'frontend' / path.lstrip('/')
    if filepath.exists() and filepath.is_file():
        return FileResponse(open(filepath, 'rb'))
    return HttpResponse('Not Found', status=404)