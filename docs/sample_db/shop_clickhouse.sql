-- DBO Studio demo: `shop` database for ClickHouse 24+.
-- MergeTree tables (partition/order keys), Nullable/LowCardinality/Array/Map/DateTime64/Decimal/UUID/Enum columns,
-- a materialized view, a dictionary-free analytics table and ~50k rows. Applied on first container start; re-apply with
--   docker compose -f docker-compose.dev.yml exec -T sample-clickhouse clickhouse-client --multiquery < docs/sample_db/shop_clickhouse.sql
DROP DATABASE IF EXISTS shop;
CREATE DATABASE shop;

CREATE TABLE shop.categories (
  id        UInt32,
  parent_id Nullable(UInt32),
  name      String
) ENGINE = MergeTree ORDER BY id COMMENT 'Category tree';

CREATE TABLE shop.customers (
  id         UInt64,
  public_id  UUID DEFAULT generateUUIDv4(),
  email      String,
  full_name  String,
  birth_date Nullable(Date),
  is_active  Bool DEFAULT true,
  balance    Decimal(12, 2),
  city       LowCardinality(Nullable(String)),
  tags       Array(String),
  prefs      Map(String, String),
  created_at DateTime64(3, 'UTC') DEFAULT now64(3)
) ENGINE = MergeTree ORDER BY id;

CREATE TABLE shop.products (
  id           UInt32,
  category_id  UInt32,
  sku          String,
  name         String,
  description  Nullable(String),
  price        Decimal(10, 2),
  stock        Int32,
  weight_kg    Nullable(Float32),
  discontinued Bool
) ENGINE = MergeTree ORDER BY id;

CREATE TABLE shop.orders (
  id          UInt64,
  customer_id UInt64,
  status      Enum8('pending' = 1, 'paid' = 2, 'shipped' = 3, 'cancelled' = 4),
  placed_at   DateTime('UTC'),
  total       Decimal(12, 2)
) ENGINE = MergeTree PARTITION BY toYYYYMM(placed_at) ORDER BY (customer_id, placed_at);

CREATE TABLE shop.order_items (
  order_id   UInt64,
  line_no    UInt16,
  product_id UInt32,
  quantity   UInt16,
  unit_price Decimal(10, 2)
) ENGINE = MergeTree ORDER BY (order_id, line_no);

CREATE TABLE shop.page_views (
  id        UInt64,
  path      LowCardinality(String),
  viewed_at DateTime('UTC'),
  visitor   UUID
) ENGINE = MergeTree PARTITION BY toYYYYMM(viewed_at) ORDER BY (path, viewed_at);

INSERT INTO shop.categories VALUES (1, NULL, 'Electronics'), (2, NULL, 'Home'), (3, NULL, 'Books'), (4, NULL, 'Toys'),
  (5, 1, 'Phones'), (6, 1, 'Laptops'), (7, 2, 'Kitchen'), (8, 2, 'Garden'), (9, 3, 'Fiction'), (10, 3, 'Science');

INSERT INTO shop.customers (id, email, full_name, birth_date, is_active, balance, city, tags, prefs)
SELECT number + 1, concat('user', toString(number + 1), '@example.com'), concat('Customer ', toString(number + 1)),
       toDate('2026-01-01') - (7000 + number % 9000), number % 7 != 0, (number % 500) * 1.25,
       arrayElement([NULL, 'Berlin', 'Tehran', 'Austin', 'Osaka'], number % 5 + 1),
       if(number % 2 = 0, ['vip', 'beta'], []), map('theme', if(number % 2 = 0, 'dark', 'light'), 'n', toString(number + 1))
FROM numbers(2000);

INSERT INTO shop.products
SELECT number + 1, 5 + number % 6, concat('SKU-', leftPad(toString(number + 1), 5, '0')), concat('Product ', toString(number + 1)),
       if(number % 3 = 0, NULL, concat('Description of product ', toString(number + 1))), 5 + (number % 200) * 1.5, toInt32(number % 100),
       if(number % 4 = 0, NULL, toFloat32(0.1 + (number % 30) / 10)), number % 50 = 49
FROM numbers(500);

INSERT INTO shop.orders
SELECT number + 1, 1 + number % 2000, arrayElement(['pending', 'paid', 'shipped', 'cancelled'], number % 4 + 1),
       now() - toIntervalMinute(number * 37), toDecimal64(10 + number % 90, 2)
FROM numbers(8000);

INSERT INTO shop.order_items
SELECT o.id AS order_id, toUInt16(ln) AS line_no, toUInt32(1 + (o.id * 7 + ln * 13) % 500) AS product_id,
       toUInt16(1 + (o.id + ln) % 5) AS quantity, toDecimal64(5 + ((product_id - 1) % 200) * 1.5, 2) AS unit_price
FROM shop.orders o
ARRAY JOIN range(1, 2 + toUInt32(o.id % 3)) AS ln;

INSERT INTO shop.page_views
SELECT number + 1, concat('/p/', toString(number % 40)), now() - toIntervalSecond(number * 11), generateUUIDv4()
FROM numbers(40000);

CREATE VIEW shop.customer_totals AS
SELECT c.id AS id, c.full_name AS full_name, count(o.id) AS orders, sum(o.total) AS spent
FROM shop.customers c LEFT JOIN shop.orders o ON o.customer_id = c.id
GROUP BY c.id, c.full_name;
