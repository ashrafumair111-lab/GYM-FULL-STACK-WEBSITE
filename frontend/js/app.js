/* ==========================================================
   app.js
   Bootstrap & small global namespace (App.*).
   ========================================================== */
document.addEventListener('DOMContentLoaded', () => {
  Animate.initReveal();
  Animate.initNavScroll();
  Animate.initParallax();
  Animate.initTyping();
  UI.init();
});

/* tiny global API used by inline onsubmit handlers */
const App = {
  search(e) {
    e.preventDefault();
    const q = document.getElementById('searchInput')?.value.trim();
    if (!q) return false;
    document.getElementById('filterCategory').value = '';
    UI.loadProducts({ search: q });
    document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' });
    return false;
  },
  subscribe(e) {
    e.preventDefault();
    const email = e.target.querySelector('input').value;
    if (!email) return false;
    Animate.toast(`Thanks! ${email} added to the Forge 🏋️`);
    e.target.reset();
    return false;
  }
};
