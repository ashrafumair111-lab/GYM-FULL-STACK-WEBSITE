/* ==========================================================
   demo-data.js
   Embedded sample data so the site works WITHOUT a backend.
   Uses window.RF_ART inline SVGs as image sources so the site
   has ZERO external network dependencies.
   ========================================================== */
const _art = (window.RF_ART && window.RF_ART.products) || {};

window.RF_DEMO_PRODUCTS = [
  {
    id: 1,
    name: 'Adjustable Dumbbell Set',
    description: 'Cast-iron adjustable dumbbells 5-50 lbs. Sold in pairs. Quick-twist locking system, knurled steel handles, and a compact footprint ideal for home gyms.',
    price: 249.99, stock_quantity: 40,
    image_url: _art[1] || '',
    category: 'equipment', rating: 4.8
  },
  {
    id: 2,
    name: 'Commercial Treadmill Pro',
    description: '3.5 CHP motor, 22x60" belt, 15% incline, 12 mph max. Cushioned deck reduces joint impact by 30%.',
    price: 1499.00, stock_quantity: 12,
    image_url: _art[2] || '',
    category: 'equipment', rating: 4.7
  },
  {
    id: 3,
    name: 'Performance Tank Top',
    description: 'Moisture-wicking tank, breathable mesh panels, reflective accents for night runs.',
    price: 29.99, stock_quantity: 200,
    image_url: _art[3] || '',
    category: 'apparel', rating: 4.5
  },
  {
    id: 4,
    name: 'Compression Joggers',
    description: 'Slim-fit compression joggers with zip pockets and tapered ankles. Four-way stretch fabric.',
    price: 59.50, stock_quantity: 150,
    image_url: _art[4] || '',
    category: 'apparel', rating: 4.6
  },
  {
    id: 5,
    name: 'Whey Protein Isolate',
    description: '24g protein per serving, chocolate flavor, 2kg tub. 30 servings per container.',
    price: 54.99, stock_quantity: 300,
    image_url: _art[5] || '',
    category: 'supplements', rating: 4.9
  },
  {
    id: 6,
    name: 'Pre-Workout Ignite',
    description: '200mg caffeine, beta-alanine, citrulline malate, fruit punch. 40 servings per tub.',
    price: 34.50, stock_quantity: 250,
    image_url: _art[6] || '',
    category: 'supplements', rating: 4.6
  },
  {
    id: 7,
    name: 'Lifting Belt - Pro',
    description: 'Full-grain leather, 10mm thickness, single prong buckle. Provides lumbar support for heavy lifts.',
    price: 44.99, stock_quantity: 80,
    image_url: _art[7] || '',
    category: 'accessories', rating: 4.7
  },
  {
    id: 8,
    name: 'Gym Duffel Bag 50L',
    description: 'Water-resistant, ventilated shoe pocket, 50 liters, padded shoulder strap. Perfect for the daily grind.',
    price: 39.00, stock_quantity: 120,
    image_url: _art[8] || '',
    category: 'accessories', rating: 4.4
  }
];
