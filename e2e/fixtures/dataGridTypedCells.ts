/**
 * SQL helpers for Data Grid typed-cell + Quick Look e2e tables.
 * Unique table/type names required — never reuse sample `product`.
 */

const PNG_1X1_HEX =
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082";

export function mysqlTypedCellsSetupSql(tableName: string): string {
  return `
DROP TABLE IF EXISTS ${tableName};
CREATE TABLE ${tableName} (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 0,
  is_flagged TINYINT(1) NULL,
  price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  released_on DATE NULL,
  opens_at TIME NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  meta JSON NULL,
  uuid_text CHAR(36) NULL,
  blob_data BLOB NULL,
  image_data BLOB NULL,
  location POINT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO ${tableName} (
  name, is_active, is_flagged, price, released_on, opens_at, updated_at, status, meta, uuid_text, blob_data, image_data, location
) VALUES (
  'Aurora',
  0,
  NULL,
  129.99,
  '2024-03-15',
  '09:30:00',
  '2024-06-01 14:22:10',
  'draft',
  JSON_OBJECT('a', 1, 'sku', 'KB-AURORA'),
  '11111111-1111-4111-8111-111111111111',
  X'0001FF',
  X'${PNG_1X1_HEX.toUpperCase()}',
  ST_GeomFromText('POINT(-122.4194 37.7749)')
);
`.trim();
}

export function mysqlTypedCellsDropSql(tableName: string): string {
  return `DROP TABLE IF EXISTS ${tableName};`;
}

export function postgresTypedCellsSetupSql(tableName: string, enumType: string): string {
  return `
DROP TABLE IF EXISTS ${tableName} CASCADE;
DROP TYPE IF EXISTS ${enumType} CASCADE;
CREATE TYPE ${enumType} AS ENUM ('draft', 'published', 'archived');
CREATE TABLE ${tableName} (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  is_flagged BOOLEAN,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  released_on DATE,
  opens_at TIME,
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  status ${enumType} NOT NULL DEFAULT 'draft',
  meta JSONB,
  blob_data BYTEA,
  image_data BYTEA,
  location POINT
);
INSERT INTO ${tableName} (
  id, name, is_active, is_flagged, price, released_on, opens_at, updated_at, status, meta, blob_data, image_data, location
) VALUES (
  '11111111-1111-4111-8111-111111111111',
  'Aurora',
  FALSE,
  NULL,
  129.99,
  '2024-03-15',
  '09:30:00',
  '2024-06-01 14:22:10',
  'draft',
  '{"a":1,"sku":"KB-AURORA"}'::jsonb,
  decode('0001ff', 'hex'),
  decode('${PNG_1X1_HEX}', 'hex'),
  POINT(-122.4194, 37.7749)
);
`.trim();
}

export function postgresTypedCellsDropSql(tableName: string, enumType: string): string {
  return `
DROP TABLE IF EXISTS ${tableName} CASCADE;
DROP TYPE IF EXISTS ${enumType} CASCADE;
`.trim();
}
