/* ==========================================================
   animations.js
   Cross-cutting animation utilities: IntersectionObserver
   reveal, navbar scroll, parallax, typing, "fly to cart".
   ========================================================== */
const Animate = (() => {

  /* ---------- reveal on scroll ---------- */
  const initReveal = () => {
    const items = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      items.forEach(i => i.classList.add('in-view'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in-view');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(i => io.observe(i));
  };

  /* ---------- navbar scrolled state ---------- */
  const initNavScroll = () => {
    const nav = document.getElementById('navbar');
    if (!nav) return;
    const onScroll = () => {
      nav.classList.toggle('scrolled', window.scrollY > 30);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  };

  /* ---------- hero parallax ---------- */
  const initParallax = () => {
    const bg = document.querySelector('[data-parallax]');
    if (!bg) return;
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          bg.style.transform = `translate3d(0, ${window.scrollY * 0.25}px, 0)`;
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  };

  /* ---------- typing effect ---------- */
  const initTyping = () => {
    const lines = document.querySelectorAll('[data-typing]');
    lines.forEach((el, idx) => {
      const full = el.dataset.typing;
      el.textContent = '';
      let i = 0;
      setTimeout(() => {
        const id = setInterval(() => {
          el.textContent = full.slice(0, ++i);
          if (i >= full.length) {
            clearInterval(id);
            el.classList.add('done');
          }
        }, 90);
      }, idx * 700);
    });
  };

  /* ---------- fly to cart animation ---------- */
  const flyToCart = (originEl) => {
    const fly = document.getElementById('cartFly');
    const cart = document.getElementById('cartBtn');
    if (!fly || !cart || !originEl) return;

    const r1 = originEl.getBoundingClientRect();
    const r2 = cart.getBoundingClientRect();
    fly.style.top  = `${r1.top + r1.height/2}px`;
    fly.style.left = `${r1.left + r1.width/2}px`;
    fly.classList.remove('go');
    void fly.offsetWidth;                  // restart animation
    fly.style.transform = 'translate(-50%, -50%) scale(.5)';

    requestAnimationFrame(() => {
      const dx = r2.left - r1.left;
      const dy = r2.top  - r1.top;
      fly.style.transition = 'transform 900ms cubic-bezier(.2,.8,.2,1), opacity 900ms';
      fly.style.transform  = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.6)`;
      fly.style.opacity    = '0';
      setTimeout(() => {
        fly.style.transition = '';
        fly.style.opacity = '';
        fly.style.transform = '';
      }, 950);
    });
  };

  /* ---------- toast ---------- */
  let toastTimer;
  const toast = (msg) => {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
  };

  return { initReveal, initNavScroll, initParallax, initTyping, flyToCart, toast };
})();
