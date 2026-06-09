import mysql.connector
import bcrypt

conn = mysql.connector.connect(host='localhost', user='root', password='umair222')
cur = conn.cursor()

# Create database
cur.execute("CREATE DATABASE IF NOT EXISTS gym_store CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
cur.execute("USE gym_store")

# Drop tables in order
cur.execute("SET FOREIGN_KEY_CHECKS=0")
for t in ['order_items', 'orders', 'products', 'users']:
    cur.execute(f"DROP TABLE IF EXISTS `{t}`")
cur.execute("SET FOREIGN_KEY_CHECKS=1")

# Create users table
cur.execute("""
CREATE TABLE `users` (
  `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name`          VARCHAR(120)  NOT NULL,
  `email`         VARCHAR(190)  NOT NULL UNIQUE,
  `password_hash` VARCHAR(255)  NOT NULL,
  `role`          ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  `created_at`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
""")

# Create products table
cur.execute("""
CREATE TABLE `products` (
  `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name`          VARCHAR(180)  NOT NULL,
  `description`   TEXT          NOT NULL,
  `price`         DECIMAL(10,2) NOT NULL,
  `stock_quantity` INT          NOT NULL DEFAULT 0,
  `image_url`     VARCHAR(500)  NOT NULL DEFAULT '',
  `category`      ENUM('equipment','apparel','supplements','accessories') NOT NULL,
  `rating`        DECIMAL(3,2)  NOT NULL DEFAULT 0.00,
  `created_at`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_products_category` (`category`),
  INDEX `idx_products_price`    (`price`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
""")

# Create orders table
cur.execute("""
CREATE TABLE `orders` (
  `id`           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id`      INT UNSIGNED NOT NULL,
  `total_amount` DECIMAL(10,2) NOT NULL,
  `status`       ENUM('pending','processing','shipped','delivered','cancelled') NOT NULL DEFAULT 'pending',
  `shipping_address` VARCHAR(500) NOT NULL DEFAULT '',
  `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
""")

# Create order_items table
cur.execute("""
CREATE TABLE `order_items` (
  `id`         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `order_id`   INT UNSIGNED NOT NULL,
  `product_id` INT UNSIGNED NOT NULL,
  `quantity`   INT          NOT NULL,
  `price`      DECIMAL(10,2) NOT NULL,
  CONSTRAINT `fk_oi_order`   FOREIGN KEY (`order_id`)   REFERENCES `orders`(`id`)   ON DELETE CASCADE,
  CONSTRAINT `fk_oi_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
""")

# Seed admin user
admin_hash = bcrypt.hashpw(b'Admin@123', bcrypt.gensalt()).decode()
cur.execute(
    "INSERT INTO `users` (`name`,`email`,`password_hash`,`role`) VALUES (%s,%s,%s,%s)",
    ('Admin User', 'admin@gymstore.com', admin_hash, 'admin')
)

# Seed products
products = [
    ('Adjustable Dumbbell Set', 'Cast-iron adjustable dumbbells 5-50 lbs. Sold in pairs.', 249.99, 40, '', 'equipment', 4.8),
    ('Commercial Treadmill Pro', '3.5 CHP motor, 22x60" belt, 15% incline, 12 mph max.', 1499.00, 12, '', 'equipment', 4.7),
    ('Performance Tank Top', 'Moisture-wicking tank, breathable mesh panels, reflective accents.', 29.99, 200, '', 'apparel', 4.5),
    ('Compression Joggers', 'Slim-fit compression joggers with zip pockets and tapered ankles.', 59.50, 150, '', 'apparel', 4.6),
    ('Whey Protein Isolate', '24g protein per serving, chocolate flavor, 2kg tub.', 54.99, 300, '', 'supplements', 4.9),
    ('Pre-Workout Ignite', '200mg caffeine, beta-alanine, citrulline malate, fruit punch.', 34.50, 250, '', 'supplements', 4.6),
    ('Lifting Belt - Pro', 'Full-grain leather, 10mm thickness, single prong buckle.', 44.99, 80, '', 'accessories', 4.7),
    ('Gym Duffel Bag 50L', 'Water-resistant, ventilated shoe pocket, 50 liters.', 39.00, 120, '', 'accessories', 4.4),
]

cur.executemany(
    "INSERT INTO `products` (`name`,`description`,`price`,`stock_quantity`,`image_url`,`category`,`rating`) VALUES (%s,%s,%s,%s,%s,%s,%s)",
    products
)

conn.commit()
print(f"Done! Admin user created. {len(products)} products inserted.")
print("Admin login: admin@gymstore.com / Admin@123")

# Verify users table
cur.execute("SELECT id, name, email, role, created_at FROM users")
for row in cur.fetchall():
    print(f"  User: id={row[0]}, name={row[1]}, email={row[2]}, role={row[3]}")

cur.close()
conn.close()