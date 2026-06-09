-- ==========================================================
--  GYM STORE - MYSQL DATABASE INITIALIZATION SCHEMA
--  Author: Senior Full-Stack Engineering Team
--  Notes : Run this script once to bootstrap the database.
-- ==========================================================

CREATE DATABASE IF NOT EXISTS `gym_store`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `gym_store`;

-- ----------------------------------------------------------
--  USERS  (customers + admin accounts)
-- ----------------------------------------------------------
DROP TABLE IF EXISTS `order_items`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name`          VARCHAR(120)  NOT NULL,
  `email`         VARCHAR(190)  NOT NULL UNIQUE,
  `password_hash` VARCHAR(255)  NOT NULL,
  `role`          ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  `created_at`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
--  PRODUCTS
-- ----------------------------------------------------------
CREATE TABLE `products` (
  `id`            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name`          VARCHAR(180)  NOT NULL,
  `description`   TEXT          NOT NULL,
  `price`         DECIMAL(10,2) NOT NULL,
  `stock_quantity` INT          NOT NULL DEFAULT 0,
  `image_url`     VARCHAR(500)  NOT NULL,
  `category`      ENUM('equipment','apparel','supplements','accessories') NOT NULL,
  `rating`        DECIMAL(3,2)  NOT NULL DEFAULT 0.00,
  `created_at`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_products_category` (`category`),
  INDEX `idx_products_price`    (`price`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
--  ORDERS
-- ----------------------------------------------------------
CREATE TABLE `orders` (
  `id`           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id`      INT UNSIGNED NOT NULL,
  `total_amount` DECIMAL(10,2) NOT NULL,
  `status`       ENUM('pending','processing','shipped','delivered','cancelled') NOT NULL DEFAULT 'pending',
  `shipping_address` VARCHAR(500) NOT NULL,
  `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_orders_user`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
--  ORDER ITEMS
-- ----------------------------------------------------------
CREATE TABLE `order_items` (
  `id`         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `order_id`   INT UNSIGNED NOT NULL,
  `product_id` INT UNSIGNED NOT NULL,
  `quantity`   INT          NOT NULL,
  `price`      DECIMAL(10,2) NOT NULL,
  CONSTRAINT `fk_oi_order`
    FOREIGN KEY (`order_id`)   REFERENCES `orders`(`id`)   ON DELETE CASCADE,
  CONSTRAINT `fk_oi_product`
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
--  SEED DATA (sample products)
--  NOTE: passwords must be hashed through the API.
--        The seed user below has password  "Admin@123"
--        (bcrypt hash generated server-side).
-- ----------------------------------------------------------
INSERT INTO `users` (`name`,`email`,`password_hash`,`role`) VALUES
('Admin User','admin@gymstore.com','$2b$10$REPLACE_WITH_REAL_BCRYPT_HASH','admin');

INSERT INTO `products`
(`name`,`description`,`price`,`stock_quantity`,`image_url`,`category`,`rating`) VALUES
('Adjustable Dumbbell Set','Cast-iron adjustable dumbbells 5-50 lbs. Sold in pairs.',249.99,40,
 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800','equipment',4.8),

('Commercial Treadmill Pro','3.5 CHP motor, 22x60" belt, 15% incline.',1499.00,12,
 'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=800','equipment',4.7),

('Performance Tank Top','Moisture-wicking tank, breathable mesh panels.',29.99,200,
 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800','apparel',4.5),

('Compression Joggers','Slim-fit compression joggers with zip pockets.',59.50,150,
 'https://images.unsplash.com/photo-1552902865-b72c031ac5ea?w=800','apparel',4.6),

('Whey Protein Isolate','24g protein per serving, chocolate flavor, 2kg.',54.99,300,
 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=800','supplements',4.9),

('Pre-Workout Ignite','200mg caffeine, beta-alanine, citrulline malate, fruit punch.',34.50,250,
 'https://images.unsplash.com/photo-1622484212850-eb596e48b4d4?w=800','supplements',4.6),

('Lifting Belt - Pro','Full-grain leather, 10mm thickness, single prong buckle.',44.99,80,
 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800','accessories',4.7),

('Gym Duffel Bag 50L','Water-resistant, ventilated shoe pocket, 50 liters.',39.00,120,
 'https://images.unsplash.com/photo-1622445275576-721325763afe?w=800','accessories',4.4);
