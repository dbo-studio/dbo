-- DBO Studio demo: `shop` schema for Postgres (database `default`).
-- Rich sample for manual testing: enums, FKs, composite keys, generated columns, arrays, jsonb, tsvector,
-- inet, bytea, check/unique/partial/GIN indexes, views, a materialized view, functions, a trigger,
-- a partitioned table and ~40k rows. Runs on first volume init; re-apply with
--   docker compose -f docker-compose.dev.yml exec -T sample-pgsql psql -U default -d default < docs/sample_db/shop_pg.sql

DROP SCHEMA IF EXISTS shop CASCADE;
CREATE SCHEMA shop;
SET search_path = shop, public;

CREATE TYPE order_status AS ENUM ('pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded');
CREATE TYPE address AS (street text, city text, zip text, country char(2));
CREATE DOMAIN email AS text CHECK (VALUE ~* '^[^@\s]+@[^@\s]+$');

CREATE TABLE categories (
  id         serial PRIMARY KEY,
  parent_id  int REFERENCES categories (id) ON DELETE SET NULL,
  name       text NOT NULL UNIQUE,
  slug       text GENERATED ALWAYS AS (lower(replace(name, ' ', '-'))) STORED
);
COMMENT ON TABLE categories IS 'Self-referencing category tree';

CREATE TABLE customers (
  id            bigserial PRIMARY KEY,
  email         email NOT NULL UNIQUE,
  full_name     text NOT NULL,
  birth_date    date,
  is_active     boolean NOT NULL DEFAULT true,
  balance       numeric(12, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  tags          text[] NOT NULL DEFAULT '{}',
  home          address,
  last_ip       inet,
  avatar        bytea,
  prefs         jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customers_tags_gin ON customers USING gin (tags);
CREATE INDEX customers_prefs_gin ON customers USING gin (prefs jsonb_path_ops);
CREATE INDEX customers_inactive ON customers (created_at) WHERE NOT is_active;

CREATE TABLE products (
  id           serial PRIMARY KEY,
  category_id  int NOT NULL REFERENCES categories (id),
  sku          text NOT NULL UNIQUE,
  name         text NOT NULL,
  description  text,
  price        numeric(10, 2) NOT NULL CHECK (price > 0),
  stock        int NOT NULL DEFAULT 0,
  weight_kg    real,
  attrs        jsonb NOT NULL DEFAULT '{}',
  search       tsvector GENERATED ALWAYS AS (to_tsvector('english', name || ' ' || coalesce(description, ''))) STORED,
  discontinued boolean NOT NULL DEFAULT false
);
CREATE INDEX products_search_gin ON products USING gin (search);
CREATE INDEX products_category_price ON products (category_id, price DESC);

CREATE TABLE orders (
  id           bigserial PRIMARY KEY,
  customer_id  bigint NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
  status       order_status NOT NULL DEFAULT 'pending',
  placed_at    timestamptz NOT NULL DEFAULT now(),
  shipped_at   timestamptz,
  total        numeric(12, 2) NOT NULL DEFAULT 0,
  note         text
);
CREATE INDEX orders_customer_placed ON orders (customer_id, placed_at DESC);
CREATE INDEX orders_status ON orders (status);

CREATE TABLE order_items (
  order_id    bigint NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  line_no     smallint NOT NULL,
  product_id  int NOT NULL REFERENCES products (id),
  qty         int NOT NULL CHECK (qty > 0),
  unit_price  numeric(10, 2) NOT NULL,
  line_total  numeric(12, 2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  PRIMARY KEY (order_id, line_no)
);

CREATE TABLE reviews (
  id          bigserial PRIMARY KEY,
  product_id  int NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  customer_id bigint NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
  rating      smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title       text,
  body        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, customer_id)
);

-- Partitioned by month
CREATE TABLE events (
  id          bigint GENERATED ALWAYS AS IDENTITY,
  occurred_at timestamptz NOT NULL,
  kind        text NOT NULL,
  customer_id bigint,
  payload     jsonb,
  PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);
CREATE TABLE events_2026_01 PARTITION OF events FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE events_2026_02 PARTITION OF events FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE events_2026_03 PARTITION OF events FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE events_default PARTITION OF events DEFAULT;
CREATE INDEX events_kind_time ON events (kind, occurred_at);

CREATE TABLE audit_log (
  id         bigserial PRIMARY KEY,
  table_name text NOT NULL,
  op         text NOT NULL,
  row_id     text,
  at         timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = shop AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
CREATE TRIGGER customers_touch BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE FUNCTION log_order_change() RETURNS trigger LANGUAGE plpgsql SET search_path = shop AS $$
BEGIN
  INSERT INTO audit_log (table_name, op, row_id) VALUES ('orders', TG_OP, COALESCE(NEW.id, OLD.id)::text);
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER orders_audit AFTER INSERT OR UPDATE OR DELETE ON orders FOR EACH ROW EXECUTE FUNCTION log_order_change();

CREATE FUNCTION customer_lifetime_value(cid bigint) RETURNS numeric LANGUAGE sql STABLE SET search_path = shop AS $$
  SELECT COALESCE(sum(total), 0) FROM orders WHERE customer_id = cid AND status NOT IN ('cancelled', 'refunded')
$$;

-- Data ------------------------------------------------------------------------------------------------
INSERT INTO categories (name, parent_id) VALUES
  ('Electronics', NULL), ('Books', NULL), ('Home', NULL), ('Toys', NULL), ('Garden', NULL),
  ('Laptops', 1), ('Phones', 1), ('Fiction', 2), ('Science', 2), ('Kitchen', 3), ('Furniture', 3);

INSERT INTO customers (email, full_name, birth_date, is_active, balance, tags, home, last_ip, prefs, created_at)
SELECT 'user' || g || '@example.com',
       'Customer ' || g,
       date '1950-01-01' + (g * 37 % 20000),
       g % 9 <> 0,
       round((g * 13 % 5000)::numeric + (g % 100) / 100.0, 2),
       ARRAY(SELECT (ARRAY['vip', 'newsletter', 'beta', 'staff', 'wholesale'])[1 + (g + k) % 5] FROM generate_series(0, g % 3) k),
       ROW(g || ' Main St', (ARRAY['Tehran', 'Berlin', 'London', 'Tokyo', 'Paris', 'Toronto'])[1 + g % 6], lpad((g % 99999)::text, 5, '0'), 'US')::address,
       ('10.' || g % 250 || '.' || g % 200 || '.' || g % 250)::inet,
       jsonb_build_object('theme', CASE WHEN g % 2 = 0 THEN 'dark' ELSE 'light' END, 'lang', (ARRAY['en', 'fa', 'de', 'ja'])[1 + g % 4], 'notify', jsonb_build_object('email', g % 3 <> 0, 'sms', g % 5 = 0)),
       now() - (g % 900) * interval '1 day'
FROM generate_series(1, 2000) g;

INSERT INTO products (category_id, sku, name, description, price, stock, weight_kg, attrs, discontinued)
SELECT 1 + g % 11,
       'SKU-' || lpad(g::text, 5, '0'),
       (ARRAY['Aurora', 'Nimbus', 'Vertex', 'Orbit', 'Pixel', 'Summit'])[1 + g % 6] || ' ' || (ARRAY['Lamp', 'Chair', 'Book', 'Phone', 'Laptop', 'Mug', 'Robot', 'Spade'])[1 + g % 8] || ' ' || g,
       'A ' || (ARRAY['durable', 'lightweight', 'classic', 'modern', 'compact'])[1 + g % 5] || ' item number ' || g,
       round((5 + g * 7 % 995)::numeric + 0.99, 2),
       g * 17 % 150,
       round((g % 50) / 4.0)::real,
       jsonb_build_object('color', (ARRAY['red', 'blue', 'green', 'black', 'white'])[1 + g % 5], 'warranty_months', 6 * (1 + g % 4)),
       g % 23 = 0
FROM generate_series(1, 500) g;

INSERT INTO orders (customer_id, status, placed_at, shipped_at, note)
SELECT 1 + g * 7 % 2000,
       (ARRAY['pending', 'paid', 'shipped', 'delivered', 'delivered', 'cancelled', 'refunded'])[1 + g % 7]::order_status,
       now() - (g % 365) * interval '1 day' - (g % 24) * interval '1 hour',
       CASE WHEN g % 7 IN (2, 3, 4) THEN now() - (g % 360) * interval '1 day' END,
       CASE WHEN g % 11 = 0 THEN 'gift wrap' END
FROM generate_series(1, 8000) g;

INSERT INTO order_items (order_id, line_no, product_id, qty, unit_price)
SELECT o.id, l, p.id, 1 + (o.id + l) % 4, p.price
FROM orders o
CROSS JOIN LATERAL generate_series(1, 1 + (o.id % 4)::int) l
JOIN products p ON p.id = 1 + ((o.id * 31 + l * 17) % 500);

UPDATE orders o SET total = s.t FROM (SELECT order_id, sum(line_total) t FROM order_items GROUP BY order_id) s WHERE s.order_id = o.id;

INSERT INTO reviews (product_id, customer_id, rating, title, body, created_at)
SELECT 1 + g % 500, 1 + (g * 13) % 2000, 1 + g % 5, (ARRAY['Great', 'Okay', 'Not for me', 'Love it', 'Broke quickly'])[1 + g % 5], 'Review text number ' || g, now() - (g % 400) * interval '1 day'
FROM generate_series(1, 3000) g
ON CONFLICT DO NOTHING;

INSERT INTO events (occurred_at, kind, customer_id, payload)
SELECT timestamptz '2026-01-01' + (g * 211 % 8000000) * interval '1 second',
       (ARRAY['pageview', 'click', 'signup', 'purchase', 'error'])[1 + g % 5],
       CASE WHEN g % 4 = 0 THEN NULL ELSE 1 + g % 2000 END,
       jsonb_build_object('path', (ARRAY['/', '/products', '/cart', '/checkout'])[1 + g % 4], 'ms', g % 3000)
FROM generate_series(1, 20000) g;

TRUNCATE audit_log;

-- Views -----------------------------------------------------------------------------------------------
CREATE VIEW customer_summary AS
SELECT c.id, c.full_name, c.email, count(o.id) AS orders, COALESCE(sum(o.total), 0) AS spent
FROM customers c LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id;

CREATE MATERIALIZED VIEW daily_sales AS
SELECT date_trunc('day', placed_at)::date AS day, count(*) AS orders, sum(total) AS revenue
FROM orders WHERE status NOT IN ('cancelled', 'refunded')
GROUP BY 1;
CREATE UNIQUE INDEX daily_sales_day ON daily_sales (day);

ANALYZE;
RESET search_path;
