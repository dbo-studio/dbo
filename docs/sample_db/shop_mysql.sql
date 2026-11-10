-- DBO Studio demo: `shop` database for MySQL 8.
-- Rich sample for manual testing: FKs, composite keys, generated columns, JSON, fulltext/spatial indexes,
-- views, a stored procedure + function, triggers, a partitioned table and ~40k rows. Runs on first container
-- start; re-apply with
--   docker compose -f docker-compose.dev.yml exec -T sample-mysql mysql -uroot -psecret < docs/sample_db/shop_mysql.sql

DROP DATABASE IF EXISTS shop;
CREATE DATABASE shop CHARACTER SET utf8mb4;
GRANT ALL ON shop.* TO 'default'@'%';
USE shop;

SET SESSION cte_max_recursion_depth = 25000;

CREATE TABLE categories (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  parent_id  INT NULL,
  name       VARCHAR(80) NOT NULL UNIQUE,
  slug       VARCHAR(80) GENERATED ALWAYS AS (LOWER(REPLACE(name, ' ', '-'))) STORED,
  CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories (id) ON DELETE SET NULL
) COMMENT = 'Self-referencing category tree';

CREATE TABLE customers (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  email       VARCHAR(190) NOT NULL UNIQUE,
  full_name   VARCHAR(120) NOT NULL,
  birth_date  DATE NULL,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  balance     DECIMAL(12, 2) UNSIGNED NOT NULL DEFAULT 0,
  tags        JSON NOT NULL,
  city        VARCHAR(60) NULL,
  last_ip     VARBINARY(16) NULL,
  avatar      MEDIUMBLOB NULL,
  location    POINT NOT NULL SRID 4326,
  prefs       JSON NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY customers_city (city, created_at),
  SPATIAL KEY customers_location (location)
);

CREATE TABLE products (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  category_id   INT NOT NULL,
  sku           VARCHAR(20) NOT NULL UNIQUE,
  name          VARCHAR(160) NOT NULL,
  description   TEXT NULL,
  price         DECIMAL(10, 2) NOT NULL,
  stock         INT NOT NULL DEFAULT 0,
  weight_kg     FLOAT NULL,
  attrs         JSON NOT NULL,
  color         VARCHAR(20) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(attrs, '$.color'))) VIRTUAL,
  discontinued  TINYINT(1) NOT NULL DEFAULT 0,
  KEY products_category_price (category_id, price),
  FULLTEXT KEY products_search (name, description),
  CONSTRAINT chk_products_price CHECK (price > 0),
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories (id)
);

CREATE TABLE orders (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  customer_id  BIGINT NOT NULL,
  status       ENUM('pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded') NOT NULL DEFAULT 'pending',
  placed_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  shipped_at   DATETIME NULL,
  total        DECIMAL(12, 2) NOT NULL DEFAULT 0,
  note         VARCHAR(255) NULL,
  KEY orders_customer_placed (customer_id, placed_at),
  KEY orders_status (status),
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
);

CREATE TABLE order_items (
  order_id    BIGINT NOT NULL,
  line_no     SMALLINT NOT NULL,
  product_id  INT NOT NULL,
  qty         INT NOT NULL,
  unit_price  DECIMAL(10, 2) NOT NULL,
  line_total  DECIMAL(12, 2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  PRIMARY KEY (order_id, line_no),
  CONSTRAINT chk_items_qty CHECK (qty > 0),
  CONSTRAINT fk_items_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES products (id)
);

CREATE TABLE reviews (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  product_id   INT NOT NULL,
  customer_id  BIGINT NOT NULL,
  rating       TINYINT NOT NULL,
  title        VARCHAR(120) NULL,
  body         TEXT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY reviews_product_customer (product_id, customer_id),
  CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT fk_reviews_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_customer FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
);

-- Partitioned by year (partitioning tables cannot have foreign keys)
CREATE TABLE events (
  id           BIGINT AUTO_INCREMENT,
  occurred_at  DATETIME NOT NULL,
  kind         VARCHAR(20) NOT NULL,
  customer_id  BIGINT NULL,
  payload      JSON NULL,
  PRIMARY KEY (id, occurred_at),
  KEY events_kind_time (kind, occurred_at)
) PARTITION BY RANGE COLUMNS (occurred_at) (
  PARTITION p2025 VALUES LESS THAN ('2026-01-01'),
  PARTITION p2026 VALUES LESS THAN ('2027-01-01'),
  PARTITION pmax VALUES LESS THAN (MAXVALUE)
);

CREATE TABLE audit_log (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  table_name  VARCHAR(40) NOT NULL,
  op          VARCHAR(10) NOT NULL,
  row_id      VARCHAR(40) NULL,
  at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Data ------------------------------------------------------------------------------------------------
INSERT INTO categories (name, parent_id) VALUES
  ('Electronics', NULL), ('Books', NULL), ('Home', NULL), ('Toys', NULL), ('Garden', NULL),
  ('Laptops', 1), ('Phones', 1), ('Fiction', 2), ('Science', 2), ('Kitchen', 3), ('Furniture', 3);

INSERT INTO customers (email, full_name, birth_date, is_active, balance, tags, city, last_ip, location, prefs, created_at)
WITH RECURSIVE n (g) AS (SELECT 1 UNION ALL SELECT g + 1 FROM n WHERE g < 2000)
SELECT CONCAT('user', g, '@example.com'),
       CONCAT('Customer ', g),
       DATE_ADD('1950-01-01', INTERVAL (g * 37 MOD 20000) DAY),
       g MOD 9 <> 0,
       ROUND((g * 13 MOD 5000) + (g MOD 100) / 100, 2),
       JSON_ARRAY(ELT(1 + g MOD 5, 'vip', 'newsletter', 'beta', 'staff', 'wholesale'), ELT(1 + (g + 1) MOD 5, 'vip', 'newsletter', 'beta', 'staff', 'wholesale')),
       ELT(1 + g MOD 6, 'Tehran', 'Berlin', 'London', 'Tokyo', 'Paris', 'Toronto'),
       INET6_ATON(CONCAT('10.', g MOD 250, '.', g MOD 200, '.', g MOD 250)),
       ST_SRID(POINT(g MOD 360 - 180, g MOD 170 - 85), 4326),
       JSON_OBJECT('theme', IF(g MOD 2 = 0, 'dark', 'light'), 'lang', ELT(1 + g MOD 4, 'en', 'fa', 'de', 'ja'), 'notify', JSON_OBJECT('email', g MOD 3 <> 0, 'sms', g MOD 5 = 0)),
       DATE_SUB(NOW(), INTERVAL (g MOD 900) DAY)
FROM n;

INSERT INTO products (category_id, sku, name, description, price, stock, weight_kg, attrs, discontinued)
WITH RECURSIVE n (g) AS (SELECT 1 UNION ALL SELECT g + 1 FROM n WHERE g < 500)
SELECT 1 + g MOD 11,
       CONCAT('SKU-', LPAD(g, 5, '0')),
       CONCAT(ELT(1 + g MOD 6, 'Aurora', 'Nimbus', 'Vertex', 'Orbit', 'Pixel', 'Summit'), ' ', ELT(1 + g MOD 8, 'Lamp', 'Chair', 'Book', 'Phone', 'Laptop', 'Mug', 'Robot', 'Spade'), ' ', g),
       CONCAT('A ', ELT(1 + g MOD 5, 'durable', 'lightweight', 'classic', 'modern', 'compact'), ' item number ', g),
       5 + g * 7 MOD 995 + 0.99,
       g * 17 MOD 150,
       ROUND((g MOD 50) / 4),
       JSON_OBJECT('color', ELT(1 + g MOD 5, 'red', 'blue', 'green', 'black', 'white'), 'warranty_months', 6 * (1 + g MOD 4)),
       g MOD 23 = 0
FROM n;

INSERT INTO orders (customer_id, status, placed_at, shipped_at, note)
WITH RECURSIVE n (g) AS (SELECT 1 UNION ALL SELECT g + 1 FROM n WHERE g < 8000)
SELECT 1 + g * 7 MOD 2000,
       ELT(1 + g MOD 7, 'pending', 'paid', 'shipped', 'delivered', 'delivered', 'cancelled', 'refunded'),
       DATE_SUB(NOW(), INTERVAL (g MOD 365) * 24 + (g MOD 24) HOUR),
       IF(g MOD 7 IN (2, 3, 4), DATE_SUB(NOW(), INTERVAL (g MOD 360) DAY), NULL),
       IF(g MOD 11 = 0, 'gift wrap', NULL)
FROM n;

INSERT INTO order_items (order_id, line_no, product_id, qty, unit_price)
WITH RECURSIVE l (n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM l WHERE n < 4)
SELECT o.id, l.n, p.id, 1 + (o.id + l.n) MOD 4, p.price
FROM orders o
JOIN l ON l.n <= 1 + o.id MOD 4
JOIN products p ON p.id = 1 + ((o.id * 31 + l.n * 17) MOD 500);

UPDATE orders o JOIN (SELECT order_id, SUM(line_total) t FROM order_items GROUP BY order_id) s ON s.order_id = o.id SET o.total = s.t;

INSERT IGNORE INTO reviews (product_id, customer_id, rating, title, body, created_at)
WITH RECURSIVE n (g) AS (SELECT 1 UNION ALL SELECT g + 1 FROM n WHERE g < 3000)
SELECT 1 + g MOD 500, 1 + (g * 13) MOD 2000, 1 + g MOD 5,
       ELT(1 + g MOD 5, 'Great', 'Okay', 'Not for me', 'Love it', 'Broke quickly'),
       CONCAT('Review text number ', g),
       DATE_SUB(NOW(), INTERVAL (g MOD 400) DAY)
FROM n;

INSERT INTO events (occurred_at, kind, customer_id, payload)
WITH RECURSIVE n (g) AS (SELECT 1 UNION ALL SELECT g + 1 FROM n WHERE g < 20000)
SELECT TIMESTAMPADD(SECOND, g * 211 MOD 40000000, '2025-06-01'),
       ELT(1 + g MOD 5, 'pageview', 'click', 'signup', 'purchase', 'error'),
       IF(g MOD 4 = 0, NULL, 1 + g MOD 2000),
       JSON_OBJECT('path', ELT(1 + g MOD 4, '/', '/products', '/cart', '/checkout'), 'ms', g MOD 3000)
FROM n;

-- Routines, triggers, views -------------------------------------------------------------------------------
DELIMITER //
CREATE FUNCTION customer_lifetime_value(cid BIGINT) RETURNS DECIMAL(14, 2) READS SQL DATA
BEGIN
  RETURN (SELECT COALESCE(SUM(total), 0) FROM orders WHERE customer_id = cid AND status NOT IN ('cancelled', 'refunded'));
END //

CREATE PROCEDURE restock(IN pid INT, IN amount INT)
BEGIN
  UPDATE products SET stock = stock + amount WHERE id = pid;
  SELECT id, sku, stock FROM products WHERE id = pid;
END //

CREATE TRIGGER orders_after_insert AFTER INSERT ON orders FOR EACH ROW
  INSERT INTO audit_log (table_name, op, row_id) VALUES ('orders', 'INSERT', NEW.id) //
CREATE TRIGGER orders_after_update AFTER UPDATE ON orders FOR EACH ROW
  INSERT INTO audit_log (table_name, op, row_id) VALUES ('orders', 'UPDATE', NEW.id) //
CREATE TRIGGER orders_after_delete AFTER DELETE ON orders FOR EACH ROW
  INSERT INTO audit_log (table_name, op, row_id) VALUES ('orders', 'DELETE', OLD.id) //
DELIMITER ;

CREATE VIEW customer_summary AS
SELECT c.id, c.full_name, c.email, COUNT(o.id) AS orders, COALESCE(SUM(o.total), 0) AS spent
FROM customers c LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.full_name, c.email;

CREATE VIEW daily_sales AS
SELECT DATE(placed_at) AS day, COUNT(*) AS orders, SUM(total) AS revenue
FROM orders WHERE status NOT IN ('cancelled', 'refunded')
GROUP BY DATE(placed_at);

ANALYZE TABLE customers, products, orders, order_items, reviews, events;
