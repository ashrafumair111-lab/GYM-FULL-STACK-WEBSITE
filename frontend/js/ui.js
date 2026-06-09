/* ==========================================================
   ui.js
   UI rendering and event wiring. Depends on API & Cart.
   ========================================================== */
const UI = (() => {
  const $  = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => [...p.querySelectorAll(s)];

  /* =====================================================
     PRODUCT GRID
     ===================================================== */
  const state = {
    page: 1, sort: 'newest', category: '',
    minPrice: 0, maxPrice: 2000, minRating: 0, search: ''
  };

  const renderCard = (p) => {
    const wished = Cart.isWished(p.id) ? 'active' : '';
    return `
      <article class="product-card" data-id="${p.id}">
        <div class="product-img" style="background-image:url('${p.image_url}')">
          <span class="product-tag">${p.category}</span>
          <button class="wish-btn ${wished}" data-wish aria-label="Add to wishlist">
            <svg viewBox="0 0 24 24" width="18" height="18"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0 0-7.8z" fill="currentColor"/></svg>
          </button>
        </div>
        <div class="product-body">
          <h3 class="product-name">${p.name}</h3>
          <div class="product-meta">
            <span class="product-price">${Cart.fmt(p.price)}</span>
            <span class="product-rating">★ ${Number(p.rating).toFixed(1)}</span>
          </div>
          <div class="product-actions">
            <button class="btn btn-ghost" data-quickview>Quick view</button>
            <button class="btn btn-primary" data-add>
              <svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
              Add
            </button>
          </div>
        </div>
      </article>
    `;
  };

  const renderSkeleton = (n) =>
    Array.from({ length: n }, () => '<div class="skeleton-card"></div>').join('');

  const renderCategories = () => {
    const grid = document.getElementById('catGrid');
    if (!grid) return;
    const art = (window.RF_ART && window.RF_ART.categories) || {};
    const cats = [
      { id: 'equipment',   title: 'Equipment',   sub: 'Dumbbells · Racks · Cardio' },
      { id: 'apparel',     title: 'Apparel',     sub: 'Tanks · Joggers · Shorts' },
      { id: 'supplements', title: 'Supplements', sub: 'Whey · Pre-Workout · Creatine' },
      { id: 'accessories', title: 'Accessories', sub: 'Belts · Gloves · Bags' }
    ];
    grid.innerHTML = cats.map(c => `
      <a class="cat-card reveal" href="#" data-cat="${c.id}">
        <div class="cat-img" style="background-image:url('${art[c.id] || ''}')"></div>
        <div class="cat-meta"><h3>${c.title}</h3><span>${c.sub}</span></div>
      </a>
    `).join('');
    if (window.Animate && Animate.initReveal) Animate.initReveal();
  };

  const applyHeroArt = () => {
    const art = window.RF_ART && window.RF_ART.hero;
    const hero = document.getElementById('heroBg');
    if (art && hero) hero.style.backgroundImage = `url('${art}')`;
  };


  const loadProducts = async (override = {}) => {
    const grid = $('#productGrid');
    if (!grid) return;
    grid.innerHTML = renderSkeleton(8);
    const params = {
      page: state.page, limit: 12, sort: state.sort,
      category: override.category ?? state.category,
      minPrice: (override.minPrice ?? state.minPrice) || undefined,
      maxPrice: (override.maxPrice ?? state.maxPrice) || undefined,
      minRating: (override.minRating ?? state.minRating) || undefined,
      search: (override.search ?? state.search) || undefined
    };
    try {
      const res = await API.products.list(params);
      if (!res.data.length) {
        grid.innerHTML = '<p class="empty" style="grid-column:1/-1">No products match your filters.</p>';
        return;
      }
      grid.innerHTML = res.data.map(renderCard).join('');
    } catch (err) {
      grid.innerHTML = `<p class="empty" style="grid-column:1/-1">Failed to load products: ${err.message}</p>`;
    }
  };

  /* =====================================================
     CART DRAWER
     ===================================================== */
  const renderCart = (s) => {
    const cartItems = $('#cartItems');
    const subtotal  = $('#cartSubtotal');
    const count     = $('#cartCount');
    const wishCount = $('#wishlistCount');
    if (!cartItems) return;

    if (!s.items.length) {
      cartItems.innerHTML = '<p class="empty">Your cart is empty.</p>';
    } else {
      cartItems.innerHTML = s.items.map(it => `
        <div class="cart-item" data-id="${it.id}">
          <img src="${it.image_url}" alt="" loading="lazy" />
          <div>
            <h4>${it.name}</h4>
            <div class="muted" style="font-size:12px">${Cart.fmt(it.price)}</div>
            <div class="ci-meta">
              <div class="qty">
                <button data-qty="-1">−</button>
                <input type="number" value="${it.quantity}" min="1" max="99" />
                <button data-qty="+1">+</button>
              </div>
            </div>
          </div>
          <div>
            <strong>${Cart.fmt(it.price * it.quantity)}</strong><br/>
            <button class="icon-btn" data-remove aria-label="Remove">
              <svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 6l12 12M6 18L18 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          </div>
        </div>
      `).join('');
    }
    if (subtotal)  subtotal.textContent  = Cart.fmt(s.subtotal);
    if (count)     count.textContent     = s.total;
    if (wishCount) wishCount.textContent = s.wish.length;

    if (count) {
      count.classList.remove('pulse');
      void count.offsetWidth;
      count.classList.add('pulse');
    }
  };

  const openCart  = () => $('#cartDrawer')?.classList.add('open');
  const closeCart = () => $('#cartDrawer')?.classList.remove('open');

  /* =====================================================
     QUICK VIEW
     ===================================================== */
  let currentProduct = null;

  const openQuickView = async (id) => {
    const modal = $('#quickView');
    if (!modal) return;
    try {
      const { data: p } = await API.products.get(id);
      currentProduct = p;
      $('#qvImage').src             = p.image_url;
      $('#qvImage').alt             = p.name;
      $('#qvCategory').textContent  = p.category;
      $('#qv-title').textContent    = p.name;
      $('#qvRating').textContent    = '★ ' + Number(p.rating).toFixed(1);
      $('#qvPrice').textContent     = Cart.fmt(p.price);
      $('#qvDescription').textContent = p.description;
      $('#qvQty').value = 1;
      $('#qvWish').classList.toggle('active', Cart.isWished(p.id));
      modal.classList.add('open');
    } catch (e) { Animate.toast(e.message); }
  };

  const closeModal = (id) => $('#' + id)?.classList.remove('open');

  /* =====================================================
     AUTH
     ===================================================== */
  let authMode = 'login';
  const openAuth = (mode) => {
    mode = mode || 'login';
    authMode = mode;
    $('#authTitle').textContent  = mode === 'login' ? 'Sign In' : 'Create Account';
    $('#authToggle').textContent = mode === 'login' ? 'New here?' : 'Already have an account?';
    $('#authSwitch').textContent = mode === 'login' ? 'Create an account' : 'Sign in';
    $$('#authForm [data-when]').forEach(el => {
      el.style.display = mode === 'register' ? 'flex' : 'none';
      el.querySelector('input')?.toggleAttribute('required', mode === 'register');
    });
    $('#authModal').classList.add('open');
  };

  /* =====================================================
     CHECKOUT
     ===================================================== */
  const openCheckout = () => {
    if (!Cart.items.length) { Animate.toast('Your cart is empty'); return; }
    if (!API.isLoggedIn()) { Animate.toast('Please sign in to checkout'); openAuth('login'); return; }
    renderOrderSummary();
    $('#checkoutModal').classList.add('open');
  };

  const renderOrderSummary = () => {
    const sum = $('#orderSummary');
    if (!sum) return;
    const rows = Cart.items.map(it => `
      <div class="sum-row"><span>${it.name} × ${it.quantity}</span><strong>${Cart.fmt(it.price * it.quantity)}</strong></div>
    `).join('');
    sum.innerHTML = rows + `
      <div class="sum-row sum-total"><span>Total</span><strong>${Cart.fmt(Cart.subtotal())}</strong></div>
    `;
  };

  const goToStep = (n) => {
    $$('#checkoutForm fieldset').forEach(f => f.hidden = (+f.dataset.pane) !== n);
    $$('#checkoutForm .checkout-steps li').forEach(li => {
      const s = +li.dataset.step;
      li.classList.toggle('active', s === n);
      li.classList.toggle('done',   s <  n);
    });
  };

  /* =====================================================
     DASHBOARD
     ===================================================== */
  const openDashboard = async () => {
    if (!API.isLoggedIn()) { openAuth('login'); return; }
    try {
      const { data: profile } = await API.users.profile();
      const { data: orders }   = await API.orders.list();
      const { data: summary }  = await API.users.summary();

      $('#dashOrders').textContent   = orders.length;
      $('#dashLifetime').textContent = Cart.fmt(summary.lifetime);
      $('#dashStatus').textContent   = orders.length ? orders[0].status : '—';

      const list = $('#dashOrdersList');
      if (!orders.length) {
        list.innerHTML = '<p class="empty">No orders yet. Start shopping!</p>';
      } else {
        list.innerHTML = orders.slice(0, 5).map(o => `
          <div class="dash-order">
            <span><strong>#${o.id}</strong> · ${Cart.fmt(o.total_amount)} · ${new Date(o.created_at).toLocaleDateString()}</span>
            <span class="order-status ${o.status}">${o.status}</span>
            <span class="muted">${(o.shipping_address || '').slice(0, 18)}…</span>
          </div>
        `).join('');
      }
      const f = $('#profileForm');
      f.elements.name.value  = profile.name;
      f.elements.email.value = profile.email;
      f.elements.password.value = '';
      $('#dashboard').classList.add('open');
    } catch (e) { Animate.toast(e.message); }
  };

  /* =====================================================
     EVENT WIRING
     ===================================================== */
  const wireEvents = () => {
    /* NAV */
    $('#cartBtn')    ?.addEventListener('click', openCart);
    $('#closeCart')  ?.addEventListener('click', closeCart);
    $('#profileBtn') ?.addEventListener('click', openDashboard);
    $('#wishlistBtn')?.addEventListener('click', () => Animate.toast('Wishlist coming soon'));

    /* DROPDOWN */
    const drop = $('.dropdown');
    if (drop) {
      drop.querySelector('button').addEventListener('click', (e) => {
        e.stopPropagation();
        drop.classList.toggle('open');
      });
      document.addEventListener('click', () => drop.classList.remove('open'));
    }
    $$('[data-cat]').forEach(a => a.addEventListener('click', (e) => {
      e.preventDefault();
      state.category = a.dataset.cat;
      $('#filterCategory').value = state.category;
      state.page = 1;
      loadProducts();
      $('#catalog').scrollIntoView({ behavior: 'smooth' });
    }));

    /* FILTERS */
    $('#filterCategory')?.addEventListener('change', (e) => { state.category = e.target.value; state.page = 1; loadProducts(); });
    $('#filterSort')?.addEventListener('change',     (e) => { state.sort = e.target.value;     state.page = 1; loadProducts(); });
    $('#filterPrice')?.addEventListener('input',  (e) => {
      const v = +e.target.value;
      $('#priceLabel').textContent = '$' + v;
      state.maxPrice = v;
    });
    let priceT;
    $('#filterPrice')?.addEventListener('change', () => { state.page = 1; clearTimeout(priceT); priceT = setTimeout(loadProducts, 200); });
    $('#filterRating')?.addEventListener('input',  (e) => {
      const v = +e.target.value;
      $('#ratingLabel').textContent = v + '★';
      state.minRating = v;
    });
    let ratingT;
    $('#filterRating')?.addEventListener('change', () => { state.page = 1; clearTimeout(ratingT); ratingT = setTimeout(loadProducts, 200); });
    $('#resetFilters')?.addEventListener('click', () => {
      state.category = ''; state.sort = 'newest';
      state.maxPrice = 2000; state.minRating = 0; state.search = '';
      $('#filterCategory').value = '';
      $('#filterSort').value     = 'newest';
      $('#filterPrice').value    = 2000;
      $('#priceLabel').textContent = '$2000';
      $('#filterRating').value   = 0;
      $('#ratingLabel').textContent = '0★';
      $('#searchInput').value    = '';
      state.page = 1;
      loadProducts();
    });

    /* PRODUCT GRID */
    $('#productGrid')?.addEventListener('click', async (e) => {
      const card = e.target.closest('.product-card');
      if (!card) return;
      const id = +card.dataset.id;
      if (e.target.closest('[data-wish]')) {
        const btn = e.target.closest('[data-wish]');
        const added = Cart.toggleWish(id);
        btn.classList.toggle('active', added);
        Animate.toast(added ? 'Added to wishlist ♥' : 'Removed from wishlist');
        return;
      }
      if (e.target.closest('[data-quickview]')) { openQuickView(id); return; }
      if (e.target.closest('[data-add]')) {
        try {
          const { data: p } = await API.products.get(id);
          Cart.add(p, 1);
          Animate.flyToCart(e.target.closest('[data-add]'));
          Animate.toast('Added "' + p.name + '" to cart');
        } catch (err) { Animate.toast(err.message); }
      }
    });

    /* CART DRAWER */
    $('#cartItems')?.addEventListener('click', (e) => {
      const item = e.target.closest('.cart-item');
      if (!item) return;
      const id = +item.dataset.id;
      if (e.target.closest('[data-remove]')) Cart.remove(id);
      if (e.target.closest('[data-qty]')) {
        const inc = +e.target.dataset.qty;
        const it  = Cart.items.find(i => i.id === id);
        if (it) Cart.setQty(id, it.quantity + inc);
      }
    });
    $('#cartItems')?.addEventListener('change', (e) => {
      if (e.target.matches('input[type=number]')) {
        const item = e.target.closest('.cart-item');
        Cart.setQty(+item.dataset.id, +e.target.value);
      }
    });
    $('#goCheckout')?.addEventListener('click', openCheckout);

    /* QUICK VIEW */
    $('#quickView')?.addEventListener('click', (e) => {
      if (e.target.matches('[data-close]') || e.target === e.currentTarget) closeModal('quickView');
    });
    $$('#quickView [data-qty]').forEach(b => b.addEventListener('click', () => {
      const input = $('#qvQty');
      input.value = Math.max(1, +input.value + +b.dataset.qty);
    }));
    $('#qvAdd')?.addEventListener('click', () => {
      if (!currentProduct) return;
      const qty = +$('#qvQty').value;
      Cart.add(currentProduct, qty);
      Animate.flyToCart($('#qvAdd'));
      Animate.toast('Added ' + qty + ' × "' + currentProduct.name + '" to cart');
      closeModal('quickView');
    });
    $('#qvWish')?.addEventListener('click', () => {
      if (!currentProduct) return;
      const added = Cart.toggleWish(currentProduct.id);
      $('#qvWish').classList.toggle('active', added);
      Animate.toast(added ? 'Added to wishlist ♥' : 'Removed from wishlist');
    });

    /* AUTH */
    $('#authSwitch')?.addEventListener('click', (e) => {
      e.preventDefault();
      openAuth(authMode === 'login' ? 'register' : 'login');
    });
    $$('[data-close]').forEach(el => el.addEventListener('click', (e) => {
      const m = e.target.closest('.modal');
      if (m) m.classList.remove('open');
    }));
    $('#authForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      try {
        const endpoint = authMode === 'login' ? 'login' : 'register';
        const res = await API.auth[endpoint](data);
        API.setToken(res.token);
        API.setUser(res.user);
        Animate.toast('Welcome, ' + res.user.name + '!');
        $('#authModal').classList.remove('open');
      } catch (err) { Animate.toast(err.message); }
    });

    /* CHECKOUT step navigation */
    $$('#checkoutForm [data-next]').forEach(b => b.addEventListener('click', () => {
      const target = +b.dataset.next;
      const cur = b.closest('fieldset');
      if (!cur.checkValidity()) { cur.reportValidity(); return; }
      if (target === 3) renderOrderSummary();
      goToStep(target);
    }));
    $$('#checkoutForm [data-prev]').forEach(b => b.addEventListener('click', () => goToStep(+b.dataset.prev)));

    /* CHECKOUT submit */
    $('#checkoutForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      const address = data.shipping_address + ', ' + data.city + ' ' + data.zip + ' (' + data.full_name + ')';
      try {
        const res = await API.orders.create({
          items: Cart.items.map(i => ({ product_id: i.id, quantity: i.quantity })),
          shipping_address: address
        });
        Animate.toast('Order #' + res.data.orderId + ' placed!');
        Cart.clear();
        $('#checkoutModal').classList.remove('open');
        goToStep(1);
        e.target.reset();
        loadProducts();
      } catch (err) { Animate.toast(err.message); }
    });

    /* DASHBOARD profile form */
    $('#profileForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      if (!data.password) delete data.password;
      try {
        await API.users.update(data);
        if (data.name) {
          const u = API.getUser(); u.name = data.name; API.setUser(u);
        }
        Animate.toast('Profile updated');
      } catch (err) { Animate.toast(err.message); }
    });
    $('#logoutBtn')?.addEventListener('click', () => {
      API.logout();
      $('#dashboard').classList.remove('open');
      Animate.toast('Logged out');
    });

    /* ESC closes any open modal */
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        $$('.modal.open').forEach(m => m.classList.remove('open'));
        $('#cartDrawer')?.classList.remove('open');
      }
    });
  };

  const init = () => {
    applyHeroArt();
    renderCategories();
    wireEvents();
    Cart.subscribe(renderCart);
    loadProducts();
  };

  return { init, openAuth, openQuickView, openCheckout, openDashboard, loadProducts };
})();
