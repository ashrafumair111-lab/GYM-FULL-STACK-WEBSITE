/* ==========================================================
   cart.js
   Client-side cart. Persists in localStorage and exposes
   reactive subscriptions so UI can update on change.
   ========================================================== */
const Cart = (() => {
  const KEY = 'rf_cart';
  const listeners = new Set();
  const wishKey   = 'rf_wishlist';

  /* ---------- state ---------- */
  const load = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  };
  const save = (items) => localStorage.setItem(KEY, JSON.stringify(items));

  const loadWish = () => {
    try { return JSON.parse(localStorage.getItem(wishKey)) || []; }
    catch { return []; }
  };
  const saveWish = (ids) => localStorage.setItem(wishKey, JSON.stringify(ids));

  let items  = load();
  let wish   = loadWish();

  /* ---------- helpers ---------- */
  const fmt = (n) => `$${Number(n).toFixed(2)}`;
  const totalItems = () => items.reduce((s, i) => s + i.quantity, 0);
  const subtotal   = () => items.reduce((s, i) => s + i.quantity * i.price, 0);

  const emit = () => listeners.forEach(fn => {
    try { fn({ items, wish, total: totalItems(), subtotal: subtotal() }); }
    catch (e) { console.error(e); }
  });

  /* ---------- public API ---------- */
  return {
    add(product, quantity = 1) {
      const existing = items.find(i => i.id === product.id);
      if (existing) {
        existing.quantity += quantity;
      } else {
        items.push({
          id:       product.id,
          name:     product.name,
          price:    Number(product.price),
          image_url: product.image_url,
          category: product.category,
          quantity: Math.max(1, quantity)
        });
      }
      save(items);
      emit();
    },

    remove(id) {
      items = items.filter(i => i.id !== id);
      save(items);
      emit();
    },

    setQty(id, qty) {
      const it = items.find(i => i.id === id);
      if (!it) return;
      it.quantity = Math.max(1, Math.floor(qty));
      save(items);
      emit();
    },

    clear() {
      items = [];
      save(items);
      emit();
    },

    /* wishlist */
    toggleWish(id) {
      const i = wish.indexOf(id);
      if (i >= 0) wish.splice(i, 1);
      else wish.push(id);
      saveWish(wish);
      emit();
      return i < 0; // returns new state (true=added)
    },

    isWished(id) { return wish.includes(id); },

    /* accessors */
    get items()      { return items; },
    get wishlist()   { return wish;  },
    totalItems,
    subtotal,
    fmt,

    subscribe(fn) {
      listeners.add(fn);
      fn({ items, wish, total: totalItems(), subtotal: subtotal() });
      return () => listeners.delete(fn);
    }
  };
})();
