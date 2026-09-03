-- Demo table for Data Grid type coverage (MySQL 8 / database `default`).
-- Covers: string, boolean (TINYINT(1)), number, date, time, datetime, enum, json, binary, geometry.
-- UUID stored as CHAR(36) (MySQL has no native UUID mappedType).
--
-- Apply:
--   docker compose -f docker-compose.dev.yml exec -T sample-mysql mysql -uroot -psecret default < docs/sample_db/mysql.sql

USE `default`;

DROP TABLE IF EXISTS product;

CREATE TABLE product (
  id            CHAR(36) NOT NULL PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  price         DECIMAL(12, 2) NOT NULL DEFAULT 0,
  stock         INT NOT NULL DEFAULT 0,
  released_on   DATE NULL,
  opens_at      TIME NULL,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status        ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  meta          JSON NULL,
  blob_data     BLOB NULL,
  image_data    BLOB NULL,
  location      POINT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO product (
  id, name, is_active, price, stock, released_on, opens_at, updated_at, status, meta, blob_data, image_data, location
) VALUES
(
  '11111111-1111-4111-8111-111111111111',
  'Aurora Keyboard',
  1,
  129.99,
  42,
  '2024-03-15',
  '09:30:00',
  '2024-06-01 14:22:10',
  'published',
  JSON_OBJECT('sku', 'KB-AURORA', 'tags', JSON_ARRAY('mech', 'rgb'), 'attrs', JSON_OBJECT('switches', 'brown')),
  X'0001FFDEAD',
  X'89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C63000100000500010D0A2DB40000000049454E44AE426082',
  ST_GeomFromText('POINT(-122.4194 37.7749)')
),
(
  '22222222-2222-4222-8222-222222222222',
  'Nimbus Mouse',
  0,
  59.50,
  0,
  '2023-11-02',
  '18:00:00',
  '2025-01-10 08:00:00',
  'draft',
  JSON_OBJECT('sku', 'MS-NIMBUS', 'tags', JSON_ARRAY('wireless')),
  NULL,
  NULL,
  ST_GeomFromText('POINT(2.3522 48.8566)')
),
(
  '33333333-3333-4333-8333-333333333333',
  'Orbit Hub',
  1,
  249.00,
  7,
  '2025-01-20',
  NULL,
  '2025-02-01 12:00:00',
  'archived',
  NULL,
  X'FF00FF00',
  NULL,
  NULL
);
