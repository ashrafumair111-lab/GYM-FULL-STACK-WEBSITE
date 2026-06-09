# 🏋️ RepForge — Full-Stack Gym Equipment Store

A production-ready e-commerce platform for premium gym equipment, apparel, supplements and accessories. Built with **Node.js/Express**, **MySQL**, and a custom vanilla JavaScript frontend with inline SVG artwork.

![RepForge](https://img.shields.io/badge/RepForge-Premium_Gym_Store-ccff00?style=for-the-badge&labelColor=121212)
![Node](https://img.shields.io/badge/Node.js-24-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?style=for-the-badge&logo=express)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?style=for-the-badge&logo=mysql&logoColor=white)

---

## 📸 Features

| Feature | Description |
|---------|-------------|
| 🎨 **Inline SVG Art** | All product & category images are embedded SVGs — zero external dependencies |
| 🔐 **JWT Authentication** | Secure login/register with bcrypt password hashing |
| 🛒 **Shopping Cart** | Real-time cart drawer with fly-to-cart animation |
| ⚡ **Product Catalog** | Category, price range, rating filters + 6 sort modes |
| 👤 **User Dashboard** | Order history, lifetime spend, profile management |
| 📦 **Checkout Flow** | Multi-step checkout (Address → Payment → Confirm) |
| 📱 **Responsive Design** | Mobile-first CSS with CSS Grid & custom properties |
| ✨ **Animations** | Parallax hero, typing effect, scroll reveal, toast notifications |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+ ([download](https://nodejs.org))
- **MySQL** 8+ ([download](https://dev.mysql.com/downloads/mysql/))

### 1. Clone the repository
```bash
git clone https://github.com/ashrafumair111-lab/GYM-FULL-STACK-WEBSITE.git
cd GYM-FULL-STACK-WEBSITE
```

### 2. Install dependencies
```bash
cd backend
npm install
```

### 3. Set up MySQL database
```bash
# Login to MySQL and create the database
mysql -u root -p
```
```sql
CREATE DATABASE gym_store CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Seed the database
```bash
cd ..
python init_db.py
```

### 5. Configure environment
The `.env` file in `backend/` is pre-configured for local development:
```
PORT=5500
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=gym_store
JWT_SECRET=your_secret_key
```

### 6. Start the server
```bash
node backend/server.js
```

### 7. Open in browser
```
http://localhost:5500
```

---

## 📁 Project Structure

```
├── backend/                  # Node.js/Express REST API
│   ├── config/
│   │   ├── db.js             # MySQL connection pool
│   │   └── env.example       # Environment template
│   ├── middleware/
│   │   ├── auth.js           # JWT authentication middleware
│   │   └── errorHandler.js   # Global error handler
│   ├── routes/
│   │   ├── auth.routes.js    # Login / Register / Me
│   │   ├── product.routes.js # Products CRUD + filtering
│   │   ├── order.routes.js   # Order creation & history
│   │   └── user.routes.js    # User profile management
│   ├── server.js             # Express app entry point
│   ├── package.json
│   └── .env                  # Environment config (not committed)
│
├── frontend/                 # Static vanilla JS frontend
│   ├── css/
│   │   ├── variables.css     # CSS custom properties
│   │   ├── base.css          # Reset & typography
│   │   ├── components.css    # Cards, buttons, modals
│   │   ├── layout.css        # Grid & section layout
│   │   ├── animations.css    # Keyframes & transitions
│   │   └── responsive.css    # Mobile breakpoints
│   ├── js/
│   │   ├── api.js            # Fetch wrapper (MySQL backend)
│   │   ├── cart.js           # Cart state management
│   │   ├── ui.js             # DOM rendering & events
│   │   ├── animations.js     # Scroll reveal, parallax, typing
│   │   ├── app.js            # Bootstrap & global namespace
│   │   ├── svg-art.js        # Inline SVG image generator
│   │   └── demo-data.js      # Fallback demo data
│   └── index.html            # Single-page application
│
├── backend/db_schema.sql     # MySQL table definitions
├── init_db.py                # Database seeder (Python)
├── start.bat                 # Windows one-click launcher
└── README.md
```

---

## 🔌 API Endpoints

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/products` | List products (filter, sort, paginate) |
| `GET` | `/api/products/:id` | Get single product |
| `GET` | `/api/products/categories` | Category counts |

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Login → JWT token |
| `GET` | `/api/auth/me` | Current user (🔒 Bearer token) |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/orders` | Place order (🔒) |
| `GET` | `/api/orders` | User's order history (🔒) |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users/profile` | Profile info (🔒) |
| `PATCH` | `/api/users/profile` | Update profile (🔒) |
| `GET` | `/api/users/orders/summary` | Order stats (🔒) |

> 🔒 = Requires `Authorization: Bearer <token>` header

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js v24 |
| **Framework** | Express.js 4 |
| **Database** | MySQL 8 |
| **Auth** | JWT + bcrypt |
| **Frontend** | Vanilla JS (ES6 modules) |
| **Styling** | Custom CSS (no framework) |
| **Art** | Inline SVG |
| **Security** | Helmet + Rate Limiting |

---

## 🔑 Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@gymstore.com | Admin@123 |

---

## 🌐 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5500` | Server port |
| `DB_HOST` | `localhost` | MySQL host |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | `root` | MySQL username |
| `DB_PASSWORD` | | MySQL password |
| `DB_NAME` | `gym_store` | Database name |
| `JWT_SECRET` | | Secret key for JWT signing |
| `JWT_EXPIRES_IN` | `7d` | Token expiration |
| `CORS_ORIGIN` | `*` | Allowed origins |

---

## 📝 License

MIT License — feel free to use this project for learning or commercial purposes.

---

**Built with 💪 & code by [Ashraf Umair](https://github.com/ashrafumair111-lab)**