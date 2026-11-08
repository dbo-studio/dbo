-- DBO Studio demo: `shop` database for SQL Server 2022.
-- FKs (self-reference, composite keys), computed/identity/uniqueidentifier/decimal/date/bit/varbinary columns, indexes,
-- a view, a stored procedure, a scalar function, a trigger and ~25k rows. Applied by docker/mssql/entrypoint.sh on every
-- container start (data is not persisted); re-apply with
--   docker compose -f docker-compose.dev.yml exec -T sample-mssql /opt/mssql-tools18/bin/sqlcmd -I -C -S localhost -U sa -P 'Secret_pass1' -i /seed.sql
IF DB_ID('shop') IS NOT NULL
BEGIN
  ALTER DATABASE shop SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
  DROP DATABASE shop;
END
GO
CREATE DATABASE shop;
GO
USE shop;
GO

CREATE TABLE dbo.categories (
  id        INT IDENTITY(1,1) PRIMARY KEY,
  parent_id INT NULL,
  name      NVARCHAR(80) NOT NULL UNIQUE,
  slug      AS (LOWER(REPLACE(name, ' ', '-'))) PERSISTED,
  CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES dbo.categories (id)
);

CREATE TABLE dbo.customers (
  id         BIGINT IDENTITY(1,1) PRIMARY KEY,
  public_id  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
  email      NVARCHAR(190) NOT NULL UNIQUE,
  full_name  NVARCHAR(120) NOT NULL,
  birth_date DATE NULL,
  is_active  BIT NOT NULL DEFAULT 1,
  balance    DECIMAL(12, 2) NOT NULL DEFAULT 0,
  city       NVARCHAR(60) NULL,
  prefs      NVARCHAR(MAX) NOT NULL DEFAULT N'{}',
  avatar     VARBINARY(MAX) NULL,
  created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE INDEX customers_city ON dbo.customers (city, created_at);

CREATE TABLE dbo.products (
  id           INT IDENTITY(1,1) PRIMARY KEY,
  category_id  INT NOT NULL,
  sku          NVARCHAR(20) NOT NULL UNIQUE,
  name         NVARCHAR(160) NOT NULL,
  description  NVARCHAR(MAX) NULL,
  price        DECIMAL(10, 2) NOT NULL,
  stock        INT NOT NULL DEFAULT 0,
  weight_kg    REAL NULL,
  discontinued BIT NOT NULL DEFAULT 0,
  CONSTRAINT chk_products_price CHECK (price > 0),
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES dbo.categories (id)
);
CREATE INDEX products_category_price ON dbo.products (category_id, price);

CREATE TABLE dbo.orders (
  id          BIGINT IDENTITY(1,1) PRIMARY KEY,
  customer_id BIGINT NOT NULL,
  status      NVARCHAR(12) NOT NULL DEFAULT 'pending',
  placed_at   DATETIME2(0) NOT NULL DEFAULT SYSUTCDATETIME(),
  total       DECIMAL(12, 2) NOT NULL DEFAULT 0,
  CONSTRAINT chk_orders_status CHECK (status IN ('pending', 'paid', 'shipped', 'cancelled')),
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES dbo.customers (id)
);
CREATE INDEX orders_customer ON dbo.orders (customer_id, placed_at);

CREATE TABLE dbo.order_items (
  order_id   BIGINT NOT NULL,
  line_no    INT NOT NULL,
  product_id INT NOT NULL,
  quantity   INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  line_total AS (quantity * unit_price),
  CONSTRAINT pk_order_items PRIMARY KEY (order_id, line_no),
  CONSTRAINT fk_items_order FOREIGN KEY (order_id) REFERENCES dbo.orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES dbo.products (id)
);

GO
CREATE SCHEMA analytics;
GO
CREATE TABLE analytics.page_views (
  id        BIGINT IDENTITY(1,1) PRIMARY KEY,
  path      NVARCHAR(200) NOT NULL,
  viewed_at DATETIME2(0) NOT NULL,
  visitor   UNIQUEIDENTIFIER NOT NULL
);
GO

-- Numbers 1..25000
CREATE TABLE #n (n INT PRIMARY KEY);
INSERT INTO #n
SELECT TOP (25000) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) FROM sys.all_objects a CROSS JOIN sys.all_objects b;

INSERT INTO dbo.categories (parent_id, name) VALUES (NULL, N'Electronics'), (NULL, N'Home'), (NULL, N'Books'), (NULL, N'Toys');
INSERT INTO dbo.categories (parent_id, name) VALUES (1, N'Phones'), (1, N'Laptops'), (2, N'Kitchen'), (2, N'Garden'), (3, N'Fiction'), (3, N'Science');

INSERT INTO dbo.customers (email, full_name, birth_date, is_active, balance, city, prefs)
SELECT CONCAT('user', n, '@example.com'), CONCAT(N'Customer ', n), DATEADD(DAY, -(7000 + n % 9000), CAST('2026-01-01' AS DATE)),
       CASE WHEN n % 7 = 0 THEN 0 ELSE 1 END, (n % 500) * 1.25,
       CHOOSE(n % 5 + 1, N'Berlin', N'Tehran', N'Austin', N'Osaka', NULL),
       CONCAT(N'{"theme":"', IIF(n % 2 = 0, 'dark', 'light'), N'","n":', n, N'}')
FROM #n WHERE n <= 2000;

INSERT INTO dbo.products (category_id, sku, name, description, price, stock, weight_kg, discontinued)
SELECT 5 + n % 6, CONCAT('SKU-', RIGHT(CONCAT('00000', n), 5)), CONCAT(N'Product ', n), IIF(n % 3 = 0, NULL, CONCAT(N'Description of product ', n)),
       5 + (n % 200) * 1.5, n % 100, IIF(n % 4 = 0, NULL, 0.1 + (n % 30) / 10.0), IIF(n % 50 = 0, 1, 0)
FROM #n WHERE n <= 500;

INSERT INTO dbo.orders (customer_id, status, placed_at, total)
SELECT 1 + n % 2000, CHOOSE(n % 4 + 1, 'pending', 'paid', 'shipped', 'cancelled'), DATEADD(MINUTE, -n * 37, SYSUTCDATETIME()), 0
FROM #n WHERE n <= 8000;

INSERT INTO dbo.order_items (order_id, line_no, product_id, quantity, unit_price)
SELECT o.n, l.n, 1 + (o.n * 7 + l.n * 13) % 500, 1 + (o.n + l.n) % 5, p.price
FROM #n o JOIN #n l ON l.n <= 1 + o.n % 3 JOIN dbo.products p ON p.id = 1 + (o.n * 7 + l.n * 13) % 500
WHERE o.n <= 8000;

UPDATE o SET total = t.s FROM dbo.orders o JOIN (SELECT order_id, SUM(line_total) s FROM dbo.order_items GROUP BY order_id) t ON t.order_id = o.id;

INSERT INTO analytics.page_views (path, viewed_at, visitor)
SELECT CONCAT('/p/', n % 40), DATEADD(SECOND, -n * 11, SYSUTCDATETIME()), NEWID() FROM #n WHERE n <= 5000;
DROP TABLE #n;
GO

CREATE VIEW dbo.customer_totals AS
SELECT c.id, c.full_name, COUNT(o.id) AS orders, COALESCE(SUM(o.total), 0) AS spent
FROM dbo.customers c LEFT JOIN dbo.orders o ON o.customer_id = c.id
GROUP BY c.id, c.full_name;
GO
CREATE FUNCTION dbo.order_count(@customer BIGINT) RETURNS INT AS
BEGIN
  RETURN (SELECT COUNT(*) FROM dbo.orders WHERE customer_id = @customer);
END;
GO
CREATE PROCEDURE dbo.top_customers @limit INT = 5 AS
BEGIN
  SELECT TOP (@limit) * FROM dbo.customer_totals ORDER BY spent DESC;
END;
GO
CREATE TRIGGER dbo.trg_orders_cancel ON dbo.orders AFTER UPDATE AS
BEGIN
  SET NOCOUNT ON;
  UPDATE o SET total = 0 FROM dbo.orders o JOIN inserted i ON i.id = o.id WHERE i.status = 'cancelled' AND i.total <> 0;
END;
GO
