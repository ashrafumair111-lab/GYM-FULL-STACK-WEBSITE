/* ==========================================================
   svg-art.js
   Beautiful, colorful inline SVG illustrations for every
   product, category, and the hero — no external image
   dependencies at all. Each SVG is data-URL encoded so
   it works in <img src>, background-image, and lazy-loading
   contexts with zero network calls.
   ========================================================== */
(function () {
  const enc = (svg) => 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);

  /* ---------------- HERO BACKDROP (atmospheric) ---------------- */
  const hero = enc(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
  <defs>
    <radialGradient id="rg" cx="30%" cy="40%" r="80%">
      <stop offset="0%"  stop-color="#ccff00" stop-opacity=".25"/>
      <stop offset="40%" stop-color="#0b0b0d" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="1"/>
    </radialGradient>
    <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"  stop-color="#ff5733" stop-opacity=".4"/>
      <stop offset="50%" stop-color="#ccff00" stop-opacity=".15"/>
      <stop offset="100%" stop-color="#0b0b0d" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="#0b0b0d"/>
  <rect width="1920" height="1080" fill="url(#lg)"/>
  <g opacity=".12" stroke="#ccff00" stroke-width="1.5" fill="none">
    <path d="M0 720 Q480 540 960 720 T1920 720"/>
    <path d="M0 800 Q480 620 960 800 T1920 800"/>
    <path d="M0 880 Q480 700 960 880 T1920 880"/>
  </g>
  <g opacity=".35">
    <circle cx="1280" cy="380" r="180" fill="url(#rg)"/>
    <circle cx="350" cy="820" r="240" fill="url(#rg)"/>
  </g>
  <g opacity=".7">
    <rect x="1480" y="120" width="40" height="180" fill="#ccff00" rx="6" transform="rotate(20 1500 210)"/>
    <rect x="1500" y="80"  width="40" height="220" fill="#ff5733" rx="6" transform="rotate(20 1520 190)"/>
  </g>
  <g transform="translate(820 460)" opacity=".9">
    <rect x="0" y="0" width="280" height="280" rx="32" fill="#1a1a1d" stroke="#ccff00" stroke-width="2"/>
    <text x="140" y="170" text-anchor="middle" fill="#ccff00" font-family="sans-serif" font-weight="800" font-size="180">RF</text>
  </g>
</svg>`);

  /* ---------------- CATEGORY / PRODUCT ART ---------------- */
  const art = (title, accent, emoji) => enc(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"  stop-color="${accent}" stop-opacity=".55"/>
      <stop offset="100%" stop-color="#0b0b0d" stop-opacity=".85"/>
    </linearGradient>
    <radialGradient id="r" cx="50%" cy="50%" r="60%">
      <stop offset="0%"  stop-color="${accent}" stop-opacity=".35"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="600" height="450" fill="url(#g)"/>
  <rect width="600" height="450" fill="url(#r)"/>
  <g opacity=".15" stroke="#ffffff" stroke-width="1" fill="none">
    <line x1="0"   y1="100" x2="600" y2="100"/>
    <line x1="0"   y1="200" x2="600" y2="200"/>
    <line x1="0"   y1="300" x2="600" y2="300"/>
    <line x1="0"   y1="400" x2="600" y2="400"/>
    <line x1="100" y1="0"   x2="100" y2="450"/>
    <line x1="200" y1="0"   x2="200" y2="450"/>
    <line x1="300" y1="0"   x2="300" y2="450"/>
    <line x1="400" y1="0"   x2="400" y2="450"/>
    <line x1="500" y1="0"   x2="500" y2="450"/>
  </g>
  <g transform="translate(300 225)">
    <circle r="130" fill="rgba(0,0,0,.4)" stroke="${accent}" stroke-width="3"/>
    <text y="40" text-anchor="middle" font-size="160">${emoji}</text>
  </g>
  <text x="30" y="420" fill="#ffffff" font-family="sans-serif" font-weight="800" font-size="34" letter-spacing="2">${title.toUpperCase()}</text>
</svg>`);

  const products = {
    1: art('Adjustable Dumbbell Set',  '#ccff00', '🏋'),
    2: art('Commercial Treadmill Pro', '#ff5733', '🏃'),
    3: art('Performance Tank Top',     '#76ff03', '👕'),
    4: art('Compression Joggers',      '#ff9100', '👖'),
    5: art('Whey Protein Isolate',     '#ccff00', '🥤'),
    6: art('Pre-Workout Ignite',       '#ff5733', '⚡'),
    7: art('Lifting Belt - Pro',       '#ccff00', '🛡'),
    8: art('Gym Duffel Bag 50L',       '#76ff03', '🎒')
  };

  const categories = {
    equipment:   art('Equipment',   '#ccff00', '🏋'),
    apparel:     art('Apparel',     '#ff5733', '👕'),
    supplements: art('Supplements', '#76ff03', '🥤'),
    accessories: art('Accessories', '#ff9100', '🎒')
  };

  // expose
  window.RF_ART = { hero, products, categories };
})();
