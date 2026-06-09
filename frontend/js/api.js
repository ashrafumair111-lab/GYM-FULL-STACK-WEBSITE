/* ==========================================================
   api.js
   Lightweight fetch wrapper connecting to the live backend.
   All data goes to MySQL via the Python server.
   ========================================================== */
const API = (() => {
  const BASE = '/api';

  const getToken = () => localStorage.getItem('rf_token') || null;
  const setToken = (t)  => t ? localStorage.setItem('rf_token', t) : localStorage.removeItem('rf_token');
  const getUser  = () => {
    try { return JSON.parse(localStorage.getItem('rf_user') || 'null'); }
    catch { return null; }
  };
  const setUser  = (u)  => u ? localStorage.setItem('rf_user', JSON.stringify(u)) : localStorage.removeItem('rf_user');

  /* ---------- core request (ALWAYS goes to the real backend) ---------- */
  const request = async (path, { method = 'GET', body, headers = {} } = {}) => {
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        ...headers
      }
    };
    if (body !== undefined) opts.body = JSON.stringify(body);

    const res = await fetch(`${BASE}${path}`, opts);
    const ct  = res.headers.get('content-type') || '';

    // Handle 401 Unauthorized — clear stale tokens (e.g. from old demo mode)
    if (res.status === 401) {
      setToken(null);
      setUser(null);
    }

    const data = ct.includes('application/json') ? await res.json() : await res.text();
    if (!res.ok) {
      const err = new Error((data && data.message) || res.statusText);
      err.status = res.status;
      err.code   = (data && data.code) || 'API_ERROR';
      err.data   = data;
      throw err;
    }
    return data;
  };

  return {
    auth: {
      me:        ()        => request('/auth/me'),
      register:  (payload) => request('/auth/register', { method: 'POST', body: payload }),
      login:     (payload) => request('/auth/login',    { method: 'POST', body: payload }),
    },
    products: {
      list: (params = {}) => {
        const clean = {};
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') clean[k] = v;
        });
        const qs = new URLSearchParams(clean).toString();
        return request(`/products${qs ? '?' + qs : ''}`);
      },
      get:   (id) => request(`/products/${id}`),
      categories: () => request('/products/categories'),
    },
    orders: {
      create: (payload) => request('/orders', { method: 'POST', body: payload }),
      list:   ()        => request('/orders'),
      get:    (id)      => request(`/orders/${id}`),
    },
    users: {
      profile:   () => request('/users/profile'),
      update:    (p) => request('/users/profile', { method: 'PATCH', body: p }),
      summary:   () => request('/users/orders/summary'),
    },
    getToken, setToken, getUser, setUser,
    isLoggedIn: () => !!getToken(),
    logout:     () => { setToken(null); setUser(null); },
    isDemo:     () => false
  };
})();