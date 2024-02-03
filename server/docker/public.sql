/*
 Navicat Premium Data Transfer

 Source Server         : tofisa-order-local
 Source Server Type    : PostgreSQL
 Source Server Version : 160001 (160001)
 Source Host           : localhost:9041
 Source Catalog        : default
 Source Schema         : public

 Target Server Type    : PostgreSQL
 Target Server Version : 160001 (160001)
 File Encoding         : 65001

 Date: 04/02/2024 02:51:32
*/


-- ----------------------------
-- Sequence structure for addons_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."addons_id_seq";
CREATE SEQUENCE "public"."addons_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 9223372036854775807
START 1
CACHE 1;
ALTER SEQUENCE "public"."addons_id_seq" OWNER TO "default";

-- ----------------------------
-- Sequence structure for cargo_addons_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."cargo_addons_id_seq";
CREATE SEQUENCE "public"."cargo_addons_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 9223372036854775807
START 1
CACHE 1;
ALTER SEQUENCE "public"."cargo_addons_id_seq" OWNER TO "default";

-- ----------------------------
-- Sequence structure for cargos_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."cargos_id_seq";
CREATE SEQUENCE "public"."cargos_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 9223372036854775807
START 1
CACHE 1;
ALTER SEQUENCE "public"."cargos_id_seq" OWNER TO "default";

-- ----------------------------
-- Sequence structure for failed_jobs_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."failed_jobs_id_seq";
CREATE SEQUENCE "public"."failed_jobs_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 9223372036854775807
START 1
CACHE 1;
ALTER SEQUENCE "public"."failed_jobs_id_seq" OWNER TO "default";

-- ----------------------------
-- Sequence structure for jobs_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."jobs_id_seq";
CREATE SEQUENCE "public"."jobs_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 9223372036854775807
START 1
CACHE 1;
ALTER SEQUENCE "public"."jobs_id_seq" OWNER TO "default";

-- ----------------------------
-- Sequence structure for migrations_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."migrations_id_seq";
CREATE SEQUENCE "public"."migrations_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "public"."migrations_id_seq" OWNER TO "default";

-- ----------------------------
-- Sequence structure for order_activities_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."order_activities_id_seq";
CREATE SEQUENCE "public"."order_activities_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 9223372036854775807
START 1
CACHE 1;
ALTER SEQUENCE "public"."order_activities_id_seq" OWNER TO "default";

-- ----------------------------
-- Sequence structure for order_products_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."order_products_id_seq";
CREATE SEQUENCE "public"."order_products_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 9223372036854775807
START 1
CACHE 1;
ALTER SEQUENCE "public"."order_products_id_seq" OWNER TO "default";

-- ----------------------------
-- Sequence structure for orders_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."orders_id_seq";
CREATE SEQUENCE "public"."orders_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 9223372036854775807
START 1
CACHE 1;
ALTER SEQUENCE "public"."orders_id_seq" OWNER TO "default";

-- ----------------------------
-- Sequence structure for pay_at_door_addons_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."pay_at_door_addons_id_seq";
CREATE SEQUENCE "public"."pay_at_door_addons_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 9223372036854775807
START 1
CACHE 1;
ALTER SEQUENCE "public"."pay_at_door_addons_id_seq" OWNER TO "default";

-- ----------------------------
-- Sequence structure for pay_at_doors_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."pay_at_doors_id_seq";
CREATE SEQUENCE "public"."pay_at_doors_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 9223372036854775807
START 1
CACHE 1;
ALTER SEQUENCE "public"."pay_at_doors_id_seq" OWNER TO "default";

-- ----------------------------
-- Sequence structure for transactions_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."transactions_id_seq";
CREATE SEQUENCE "public"."transactions_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 9223372036854775807
START 1
CACHE 1;
ALTER SEQUENCE "public"."transactions_id_seq" OWNER TO "default";

-- ----------------------------
-- Table structure for addons
-- ----------------------------
DROP TABLE IF EXISTS "public"."addons";
CREATE TABLE "public"."addons" (
  "id" int8 NOT NULL DEFAULT nextval('addons_id_seq'::regclass),
  "order_id" int8 NOT NULL,
  "addon_able_type" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "addon_able_id" int8 NOT NULL,
  "quantity" int4 NOT NULL,
  "buy_price" numeric(8,2) NOT NULL,
  "sell_price" numeric(8,2) NOT NULL,
  "vat_rate" numeric(8,2) NOT NULL DEFAULT '0'::numeric,
  "vat" numeric(8,2) NOT NULL DEFAULT '0'::numeric,
  "sub_total" numeric(8,2) NOT NULL DEFAULT '0'::numeric,
  "total" numeric(8,2) NOT NULL DEFAULT '0'::numeric,
  "profit" numeric(8,2) NOT NULL DEFAULT '0'::numeric,
  "created_at" timestamp(0),
  "updated_at" timestamp(0)
)
;
ALTER TABLE "public"."addons" OWNER TO "default";
COMMENT ON COLUMN "public"."addons"."vat" IS 'vat rate by price ';

-- ----------------------------
-- Records of addons
-- ----------------------------
BEGIN;
INSERT INTO "public"."addons" ("id", "order_id", "addon_able_type", "addon_able_id", "quantity", "buy_price", "sell_price", "vat_rate", "vat", "sub_total", "total", "profit", "created_at", "updated_at") VALUES (1, 1, 'App\Models\CargoAddon', 1, 61, 14.85, 9.53, 7.70, 3.50, 2.48, 11.55, 17.88, '2023-12-28 08:33:50', '2023-12-28 08:33:50');
INSERT INTO "public"."addons" ("id", "order_id", "addon_able_type", "addon_able_id", "quantity", "buy_price", "sell_price", "vat_rate", "vat", "sub_total", "total", "profit", "created_at", "updated_at") VALUES (2, 1, 'App\Models\PayAtDoorAddon', 1, 2, 13.53, 12.04, 5.20, 9.50, 2.87, 15.72, 5.92, '2023-12-28 08:33:50', '2023-12-28 08:33:50');
COMMIT;

-- ----------------------------
-- Table structure for cargo_addons
-- ----------------------------
DROP TABLE IF EXISTS "public"."cargo_addons";
CREATE TABLE "public"."cargo_addons" (
  "id" int8 NOT NULL DEFAULT nextval('cargo_addons_id_seq'::regclass),
  "cargo_id" int8 NOT NULL,
  "tracking_code" varchar(255) COLLATE "pg_catalog"."default",
  "name" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "estimated_delivery" timestamp(0) NOT NULL,
  "status" varchar(255) COLLATE "pg_catalog"."default",
  "created_at" timestamp(0),
  "updated_at" timestamp(0),
  "discount" numeric(8,2) NOT NULL DEFAULT '0'::numeric
)
;
ALTER TABLE "public"."cargo_addons" OWNER TO "default";

-- ----------------------------
-- Records of cargo_addons
-- ----------------------------
BEGIN;
INSERT INTO "public"."cargo_addons" ("id", "cargo_id", "tracking_code", "name", "estimated_delivery", "status", "created_at", "updated_at", "discount") VALUES (1, 1, 'zv9EZ1jEu6', 'Prof. Margarita Gerhold Jr.', '2019-01-10 06:57:36', NULL, '2023-12-28 08:33:50', '2023-12-28 08:33:50', 0.00);
INSERT INTO "public"."cargo_addons" ("id", "cargo_id", "tracking_code", "name", "estimated_delivery", "status", "created_at", "updated_at", "discount") VALUES (2, 2, '1FHaQio3m7', 'Prof. Fred Kilback Sr.', '1998-10-10 16:40:05', NULL, '2023-12-28 08:33:50', '2023-12-28 08:33:50', 0.00);
INSERT INTO "public"."cargo_addons" ("id", "cargo_id", "tracking_code", "name", "estimated_delivery", "status", "created_at", "updated_at", "discount") VALUES (3, 3, 'Xs9y18ThUJ', 'Nicole Gulgowski DVM', '1982-11-07 06:30:49', NULL, '2023-12-28 08:33:50', '2023-12-28 08:33:50', 0.00);
COMMIT;

-- ----------------------------
-- Table structure for cargos
-- ----------------------------
DROP TABLE IF EXISTS "public"."cargos";
CREATE TABLE "public"."cargos" (
  "id" int8 NOT NULL DEFAULT nextval('cargos_id_seq'::regclass),
  "name" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "min_desi" numeric(8,2) NOT NULL,
  "max_desi" numeric(8,2) NOT NULL,
  "buy_price" numeric(8,2) NOT NULL,
  "sell_price" numeric(8,2) NOT NULL,
  "vat_rate" numeric(8,2) NOT NULL DEFAULT '0'::numeric,
  "max_total_free_cargo" numeric(8,2) NOT NULL DEFAULT '0'::numeric,
  "estimated_delivery_day" int2 NOT NULL DEFAULT '1'::smallint,
  "created_at" timestamp(0),
  "updated_at" timestamp(0)
)
;
ALTER TABLE "public"."cargos" OWNER TO "default";

-- ----------------------------
-- Records of cargos
-- ----------------------------
BEGIN;
INSERT INTO "public"."cargos" ("id", "name", "min_desi", "max_desi", "buy_price", "sell_price", "vat_rate", "max_total_free_cargo", "estimated_delivery_day", "created_at", "updated_at") VALUES (1, 'ea', 0.00, 30.00, 5.94, 5.89, 18.00, 100.00, 2, '2023-12-28 08:33:50', '2023-12-28 08:33:50');
INSERT INTO "public"."cargos" ("id", "name", "min_desi", "max_desi", "buy_price", "sell_price", "vat_rate", "max_total_free_cargo", "estimated_delivery_day", "created_at", "updated_at") VALUES (2, 'et', 6.40, 2.65, 5.44, 9.16, 4.50, 6.59, 6, '2023-12-28 08:33:50', '2023-12-28 08:33:50');
INSERT INTO "public"."cargos" ("id", "name", "min_desi", "max_desi", "buy_price", "sell_price", "vat_rate", "max_total_free_cargo", "estimated_delivery_day", "created_at", "updated_at") VALUES (3, 'quo', 6.29, 5.69, 8.63, 3.41, 2.30, 9.21, 3, '2023-12-28 08:33:50', '2023-12-28 08:33:50');
COMMIT;

-- ----------------------------
-- Table structure for failed_jobs
-- ----------------------------
DROP TABLE IF EXISTS "public"."failed_jobs";
CREATE TABLE "public"."failed_jobs" (
  "id" int8 NOT NULL DEFAULT nextval('failed_jobs_id_seq'::regclass),
  "uuid" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "connection" text COLLATE "pg_catalog"."default" NOT NULL,
  "queue" text COLLATE "pg_catalog"."default" NOT NULL,
  "payload" text COLLATE "pg_catalog"."default" NOT NULL,
  "exception" text COLLATE "pg_catalog"."default" NOT NULL,
  "failed_at" timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP
)
;
ALTER TABLE "public"."failed_jobs" OWNER TO "default";

-- ----------------------------
-- Records of failed_jobs
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for jobs
-- ----------------------------
DROP TABLE IF EXISTS "public"."jobs";
CREATE TABLE "public"."jobs" (
  "id" int8 NOT NULL DEFAULT nextval('jobs_id_seq'::regclass),
  "queue" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "payload" text COLLATE "pg_catalog"."default" NOT NULL,
  "attempts" int2 NOT NULL,
  "reserved_at" int4,
  "available_at" int4 NOT NULL,
  "created_at" int4 NOT NULL
)
;
ALTER TABLE "public"."jobs" OWNER TO "default";

-- ----------------------------
-- Records of jobs
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for migrations
-- ----------------------------
DROP TABLE IF EXISTS "public"."migrations";
CREATE TABLE "public"."migrations" (
  "id" int4 NOT NULL DEFAULT nextval('migrations_id_seq'::regclass),
  "migration" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "batch" int4 NOT NULL
)
;
ALTER TABLE "public"."migrations" OWNER TO "default";

-- ----------------------------
-- Records of migrations
-- ----------------------------
BEGIN;
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (1, '2019_08_19_000000_create_failed_jobs_table', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (2, '2022_12_13_081729_create_orders_table', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (3, '2022_12_13_082953_create_transactions_table', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (4, '2022_12_13_085736_create_addons_table', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (5, '2022_12_13_090514_create_order_products_table', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (6, '2022_12_28_081411_create_cargos_table', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (7, '2023_01_04_130315_create_jobs_table', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (8, '2023_03_10_092742_create_cargo_addons_table', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (9, '2023_03_17_090122_create_pay_add_doors_table', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (10, '2023_03_17_090123_create_pay_at_door_addons_table', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (11, '2023_05_02_125622_create_notifications_table', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (12, '2023_08_24_124028_create_order_activities_table', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (13, '2023_11_28_182422_add_new_pricing_to_order_products_table', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (14, '2023_11_28_182422_add_new_pricing_to_orders_table', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (15, '2023_11_29_112829_add_discount_to_cargo_addons_table', 1);
INSERT INTO "public"."migrations" ("id", "migration", "batch") VALUES (16, '2023_12_06_133510_add_sale_channel_id_to_orders_table', 1);
COMMIT;

-- ----------------------------
-- Table structure for notifications
-- ----------------------------
DROP TABLE IF EXISTS "public"."notifications";
CREATE TABLE "public"."notifications" (
  "id" uuid NOT NULL,
  "type" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "notifiable_type" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "notifiable_id" int8 NOT NULL,
  "data" text COLLATE "pg_catalog"."default" NOT NULL,
  "read_at" timestamp(0),
  "created_at" timestamp(0),
  "updated_at" timestamp(0)
)
;
ALTER TABLE "public"."notifications" OWNER TO "default";

-- ----------------------------
-- Records of notifications
-- ----------------------------
BEGIN;
COMMIT;

-- ----------------------------
-- Table structure for order_activities
-- ----------------------------
DROP TABLE IF EXISTS "public"."order_activities";
CREATE TABLE "public"."order_activities" (
  "id" int8 NOT NULL DEFAULT nextval('order_activities_id_seq'::regclass),
  "order_id" int8 NOT NULL,
  "user_id" int8,
  "from" json,
  "to" json,
  "description" text COLLATE "pg_catalog"."default",
  "additional_info" text COLLATE "pg_catalog"."default",
  "created_at" timestamp(0),
  "updated_at" timestamp(0)
)
;
ALTER TABLE "public"."order_activities" OWNER TO "default";

-- ----------------------------
-- Records of order_activities
-- ----------------------------
BEGIN;
INSERT INTO "public"."order_activities" ("id", "order_id", "user_id", "from", "to", "description", "additional_info", "created_at", "updated_at") VALUES (1, 1, 6, '{"status":"delivered"}', '{"status":"preorder"}', 'Qui fugit nisi rem commodi accusantium. Exercitationem est aut qui velit reprehenderit necessitatibus. Suscipit ut consequuntur quisquam asperiores ut et et.', NULL, '2023-12-28 08:33:50', '2023-12-28 08:33:50');
COMMIT;

-- ----------------------------
-- Table structure for order_products
-- ----------------------------
DROP TABLE IF EXISTS "public"."order_products";
CREATE TABLE "public"."order_products" (
  "id" int8 NOT NULL DEFAULT nextval('order_products_id_seq'::regclass),
  "order_id" int8,
  "product_id" int8,
  "variation_id" int8,
  "stock_id" int8,
  "store_id" int8,
  "brand_id" int8,
  "category_id" int8,
  "product_color_id" int8,
  "brand" varchar(255) COLLATE "pg_catalog"."default",
  "category" varchar(255) COLLATE "pg_catalog"."default",
  "product_name" varchar(255) COLLATE "pg_catalog"."default",
  "product_media" json,
  "product_size" varchar(255) COLLATE "pg_catalog"."default",
  "product_color" varchar(255) COLLATE "pg_catalog"."default",
  "store_name" varchar(255) COLLATE "pg_catalog"."default",
  "barcode" varchar(255) COLLATE "pg_catalog"."default",
  "stock_code" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "variation_code" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "mp_code" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "quantity" int4,
  "desi" numeric(8,2) NOT NULL,
  "buy_price" numeric(8,2),
  "sell_price" numeric(8,2),
  "discount" numeric(8,2) NOT NULL DEFAULT '0'::numeric,
  "vat_rate" numeric(8,2) NOT NULL DEFAULT '0'::numeric,
  "vat" numeric(8,2) NOT NULL DEFAULT '0'::numeric,
  "sub_total" numeric(8,2) NOT NULL DEFAULT '0'::numeric,
  "total" numeric(8,2) NOT NULL DEFAULT '0'::numeric,
  "profit" numeric(8,2) NOT NULL DEFAULT '0'::numeric,
  "currency_unit" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'TL'::character varying,
  "created_at" timestamp(0),
  "updated_at" timestamp(0),
  "base_price" numeric(8,2),
  "total_calculated" numeric(8,2),
  "promotion" numeric(8,2)
)
;
ALTER TABLE "public"."order_products" OWNER TO "default";
COMMENT ON COLUMN "public"."order_products"."vat" IS 'vat rate by price ';

-- ----------------------------
-- Records of order_products
-- ----------------------------
BEGIN;
INSERT INTO "public"."order_products" ("id", "order_id", "product_id", "variation_id", "stock_id", "store_id", "brand_id", "category_id", "product_color_id", "brand", "category", "product_name", "product_media", "product_size", "product_color", "store_name", "barcode", "stock_code", "variation_code", "mp_code", "quantity", "desi", "buy_price", "sell_price", "discount", "vat_rate", "vat", "sub_total", "total", "profit", "currency_unit", "created_at", "updated_at", "base_price", "total_calculated", "promotion") VALUES (2, 1, 0, 1, 1, 9, 0, 1, 2, 'Ivy Pagac', 'Bernardo Stanton', 'Micheal Altenwerth', '["http:\/\/www.strosin.com\/"]', '4', 'LavenderBlush', 'Alivia Lesch', '230075', '21905-LILA-GRI', '21905-LILA-GRI-STD', '21905', 2, 9.00, 17.58, 16.39, 0.00, 2.14, 1.00, 17.12, 1.34, 9.22, 'KZT', '2023-12-28 08:33:50', '2023-12-28 08:33:50', 19.73, 17.75, NULL);
INSERT INTO "public"."order_products" ("id", "order_id", "product_id", "variation_id", "stock_id", "store_id", "brand_id", "category_id", "product_color_id", "brand", "category", "product_name", "product_media", "product_size", "product_color", "store_name", "barcode", "stock_code", "variation_code", "mp_code", "quantity", "desi", "buy_price", "sell_price", "discount", "vat_rate", "vat", "sub_total", "total", "profit", "currency_unit", "created_at", "updated_at", "base_price", "total_calculated", "promotion") VALUES (1, 1, 2, 8, 6, 7, 4, 4, 1, 'Mr. Jerel Hill PhD', 'Stella Howell', 'Ona Lowe', '["https:\/\/www.langosh.com\/blanditiis-quod-iure-qui-voluptatem-omnis-nisi-occaecati"]', '4', 'LightPink', 'Paul Ullrich', '855223', '21905-LILA-GRI', '21905-LILA-GRI-STD', '21905', 1, 4.00, 5.16, 2.27, 0.00, 19.42, 9.00, 14.80, 3.84, 9.63, 'BSD', '2023-12-28 08:33:50', '2023-12-28 08:33:50', 16.15, 10.14, NULL);
INSERT INTO "public"."order_products" ("id", "order_id", "product_id", "variation_id", "stock_id", "store_id", "brand_id", "category_id", "product_color_id", "brand", "category", "product_name", "product_media", "product_size", "product_color", "store_name", "barcode", "stock_code", "variation_code", "mp_code", "quantity", "desi", "buy_price", "sell_price", "discount", "vat_rate", "vat", "sub_total", "total", "profit", "currency_unit", "created_at", "updated_at", "base_price", "total_calculated", "promotion") VALUES (3, 1, 0, 1, 1, 9, 0, 1, 3, 'Ivy Pagac', 'Bernardo Stanton', 'Micheal Altenwerth', '["http:\/\/www.strosin.com\/"]', '4', 'LavenderBlush', 'Alivia Lesch', '230075', '21905-LILA-GRI', '21905-LILA-GRI-STD', '21905', 3, 9.00, 17.58, 16.39, 0.00, 2.14, 1.00, 17.12, 1.34, 9.22, 'KZT', '2023-12-28 08:33:50', '2023-12-28 08:33:50', 19.73, 17.75, NULL);
INSERT INTO "public"."order_products" ("id", "order_id", "product_id", "variation_id", "stock_id", "store_id", "brand_id", "category_id", "product_color_id", "brand", "category", "product_name", "product_media", "product_size", "product_color", "store_name", "barcode", "stock_code", "variation_code", "mp_code", "quantity", "desi", "buy_price", "sell_price", "discount", "vat_rate", "vat", "sub_total", "total", "profit", "currency_unit", "created_at", "updated_at", "base_price", "total_calculated", "promotion") VALUES (4, 2, 0, 1, 1, 9, 0, 1, 1, 'Ivy Pagac', 'Bernardo Stanton', 'Micheal Altenwerth', '["http:\/\/www.strosin.com\/"]', '4', 'LavenderBlush', 'Alivia Lesch', '230075', '21905-LILA-GRI', '21905-LILA-GRI-STD', '21905', 3, 9.00, 17.58, 16.39, 0.00, 2.14, 1.00, 17.12, 1.34, 9.22, 'KZT', '2023-12-28 08:33:50', '2023-12-28 08:33:50', 19.73, 17.75, NULL);
INSERT INTO "public"."order_products" ("id", "order_id", "product_id", "variation_id", "stock_id", "store_id", "brand_id", "category_id", "product_color_id", "brand", "category", "product_name", "product_media", "product_size", "product_color", "store_name", "barcode", "stock_code", "variation_code", "mp_code", "quantity", "desi", "buy_price", "sell_price", "discount", "vat_rate", "vat", "sub_total", "total", "profit", "currency_unit", "created_at", "updated_at", "base_price", "total_calculated", "promotion") VALUES (5, 2, 0, 1, 1, 9, 0, 1, 4, 'Ivy Pagac', 'Bernardo Stanton', 'Micheal Altenwerth', '["http:\/\/www.strosin.com\/"]', '4', 'LavenderBlush', 'Alivia Lesch', '230075', '21905-LILA-GRI', '21905-LILA-GRI-STD', '21905', 2, 9.00, 17.58, 16.39, 0.00, 2.14, 1.00, 17.12, 1.34, 9.22, 'KZT', '2023-12-28 08:33:50', '2023-12-28 08:33:50', 19.73, 17.75, NULL);
COMMIT;

-- ----------------------------
-- Table structure for orders
-- ----------------------------
DROP TABLE IF EXISTS "public"."orders";
CREATE TABLE "public"."orders" (
  "id" int8 NOT NULL DEFAULT nextval('orders_id_seq'::regclass),
  "user_id" int8 NOT NULL,
  "tracking_code" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "shipping_address" json NOT NULL,
  "billing_address" json NOT NULL,
  "desi" numeric(8,2) NOT NULL,
  "sub_total" numeric(8,2) NOT NULL DEFAULT '0'::numeric,
  "total" numeric(8,2) NOT NULL DEFAULT '0'::numeric,
  "vat" numeric(8,2) NOT NULL DEFAULT '0'::numeric,
  "profit" numeric(8,2) NOT NULL DEFAULT '0'::numeric,
  "buy_total" numeric(8,2) NOT NULL DEFAULT '0'::numeric,
  "product_sub_total" numeric(8,2) NOT NULL DEFAULT '0'::numeric,
  "product_total" numeric(8,2) NOT NULL DEFAULT '0'::numeric,
  "product_vat" numeric(8,2) NOT NULL DEFAULT '0'::numeric,
  "product_profit" numeric(8,2) NOT NULL DEFAULT '0'::numeric,
  "product_buy_total" numeric(8,2) NOT NULL DEFAULT '0'::numeric,
  "addon_vat" numeric(8,2) NOT NULL DEFAULT '0'::numeric,
  "addon_sub_total" numeric(8,2) NOT NULL DEFAULT '0'::numeric,
  "addon_total" numeric(8,2) NOT NULL DEFAULT '0'::numeric,
  "addon_profit" numeric(8,2) NOT NULL DEFAULT '0'::numeric,
  "addon_buy_total" numeric(8,2) NOT NULL DEFAULT '0'::numeric,
  "payment_type" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "status" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'received'::character varying,
  "precise_status" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'new'::character varying,
  "delivery_date" timestamp(0),
  "platform" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "ip" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "request" json,
  "tsoft_sync" bool NOT NULL DEFAULT false,
  "created_at" timestamp(0),
  "updated_at" timestamp(0),
  "total_calculated" numeric(8,2),
  "product_sell_price" numeric(8,2),
  "product_base_price" numeric(8,2),
  "product_total_calculated" numeric(8,2),
  "country_id" int8,
  "currency_id" int8,
  "exchange_rate" numeric(8,2),
  "sale_channel_id" int8
)
;
ALTER TABLE "public"."orders" OWNER TO "default";

-- ----------------------------
-- Records of orders
-- ----------------------------
BEGIN;
INSERT INTO "public"."orders" ("id", "user_id", "tracking_code", "shipping_address", "billing_address", "desi", "sub_total", "total", "vat", "profit", "buy_total", "product_sub_total", "product_total", "product_vat", "product_profit", "product_buy_total", "addon_vat", "addon_sub_total", "addon_total", "addon_profit", "addon_buy_total", "payment_type", "status", "precise_status", "delivery_date", "platform", "ip", "request", "tsoft_sync", "created_at", "updated_at", "total_calculated", "product_sell_price", "product_base_price", "product_total_calculated", "country_id", "currency_id", "exchange_rate", "sale_channel_id") VALUES (1, 1, '5SNlc397CD', '{"id":1,"name":"shirin","surname":"test","countryCode":"90","phoneNumber":"5013494834","line":"tofisa","title":"Home","email":"test@gmail.com","country":{"countryName":"T\u00fcrkiye","countryId":225},"province":{"provinceName":"Ad\u0131yaman","provinceId":2155},"district":{"districtName":"Besni","districtId":107332},"neighborhood":{"neighborhoodName":"Cirit Meydan\u0131 Mah","neighborhoodId":835},"zipCode":"25","companyName":"test","taxAdministration":"test","taxNumber":"test","type":"personal","isDefault":0}', '{"id":2,"name":"shirin","surname":"test","countryCode":"90","phoneNumber":"5013494834","line":"tofisa","title":"Home","email":"test@gmail.com","country":{"countryName":"T\u00fcrkiye","countryId":225},"province":{"provinceName":"Ad\u0131yaman","provinceId":2155},"district":{"districtName":"Besni","districtId":107332},"neighborhood":{"neighborhoodName":"Cirit Meydan\u0131 Mah","neighborhoodId":835},"zipCode":"25","companyName":"test","taxAdministration":"test","taxNumber":"test","type":"personal","isDefault":0}', 6.00, 19.23, 12.54, 11.04, 14.89, 6.92, 7.79, 15.98, 19.89, 6.08, 2.44, 9.02, 19.61, 6.22, 16.97, 0.00, 'at_door', 'received', 'returnRequest', '2023-12-28 08:33:50', 'mobile', '42.253.231.218', '"aut"', 't', '2023-12-28 08:33:50', '2023-12-28 08:33:50', 15.55, 10.44, 6.75, 6.85, 225, 1, 3.00, NULL);
INSERT INTO "public"."orders" ("id", "user_id", "tracking_code", "shipping_address", "billing_address", "desi", "sub_total", "total", "vat", "profit", "buy_total", "product_sub_total", "product_total", "product_vat", "product_profit", "product_buy_total", "addon_vat", "addon_sub_total", "addon_total", "addon_profit", "addon_buy_total", "payment_type", "status", "precise_status", "delivery_date", "platform", "ip", "request", "tsoft_sync", "created_at", "updated_at", "total_calculated", "product_sell_price", "product_base_price", "product_total_calculated", "country_id", "currency_id", "exchange_rate", "sale_channel_id") VALUES (2, 6571794, 'dxbOS8QRvw', '{"id":1,"name":"shirin","surname":"test","countryCode":"90","phoneNumber":"5013494834","line":"tofisa","title":"Home","email":"test@gmail.com","country":{"countryName":"T\u00fcrkiye","countryId":225},"province":{"provinceName":"Ad\u0131yaman","provinceId":2155},"district":{"districtName":"Besni","districtId":107332},"neighborhood":{"neighborhoodName":"Cirit Meydan\u0131 Mah","neighborhoodId":835},"zipCode":"25","companyName":"test","taxAdministration":"test","taxNumber":"test","type":"personal","isDefault":0}', '{"id":2,"name":"shirin","surname":"test","countryCode":"90","phoneNumber":"5013494834","line":"tofisa","title":"Home","email":"test@gmail.com","country":{"countryName":"T\u00fcrkiye","countryId":225},"province":{"provinceName":"Ad\u0131yaman","provinceId":2155},"district":{"districtName":"Besni","districtId":107332},"neighborhood":{"neighborhoodName":"Cirit Meydan\u0131 Mah","neighborhoodId":835},"zipCode":"25","companyName":"test","taxAdministration":"test","taxNumber":"test","type":"personal","isDefault":0}', 0.00, 13.62, 15.35, 17.12, 9.76, 17.85, 5.65, 7.69, 14.24, 9.02, 17.43, 12.95, 7.83, 2.86, 17.92, 0.00, 'online', 'notDelivered', 'notDelivered', '2023-12-28 08:33:50', 'web', '226.216.208.154', '"est"', 't', '2023-12-28 08:33:50', '2023-12-28 08:33:50', 5.88, 3.21, 10.69, 7.92, 225, 1, 0.00, NULL);
COMMIT;

-- ----------------------------
-- Table structure for pay_at_door_addons
-- ----------------------------
DROP TABLE IF EXISTS "public"."pay_at_door_addons";
CREATE TABLE "public"."pay_at_door_addons" (
  "id" int8 NOT NULL DEFAULT nextval('pay_at_door_addons_id_seq'::regclass),
  "pay_add_door_id" int8 NOT NULL,
  "created_at" timestamp(0),
  "updated_at" timestamp(0)
)
;
ALTER TABLE "public"."pay_at_door_addons" OWNER TO "default";

-- ----------------------------
-- Records of pay_at_door_addons
-- ----------------------------
BEGIN;
INSERT INTO "public"."pay_at_door_addons" ("id", "pay_add_door_id", "created_at", "updated_at") VALUES (1, 1, '2023-12-28 08:33:50', '2023-12-28 08:33:50');
COMMIT;

-- ----------------------------
-- Table structure for pay_at_doors
-- ----------------------------
DROP TABLE IF EXISTS "public"."pay_at_doors";
CREATE TABLE "public"."pay_at_doors" (
  "id" int8 NOT NULL DEFAULT nextval('pay_at_doors_id_seq'::regclass),
  "name" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "buy_price" numeric(8,2) NOT NULL,
  "sell_price" numeric(8,2) NOT NULL,
  "vat_rate" numeric(8,2) NOT NULL DEFAULT '0'::numeric,
  "max_total_free_pay_at_door" numeric(8,2) NOT NULL,
  "created_at" timestamp(0),
  "updated_at" timestamp(0)
)
;
ALTER TABLE "public"."pay_at_doors" OWNER TO "default";

-- ----------------------------
-- Records of pay_at_doors
-- ----------------------------
BEGIN;
INSERT INTO "public"."pay_at_doors" ("id", "name", "buy_price", "sell_price", "vat_rate", "max_total_free_pay_at_door", "created_at", "updated_at") VALUES (1, 'Clemmie Schmidt', 0.33, 1.52, 18.00, 100.00, '2023-12-28 08:33:50', '2023-12-28 08:33:50');
COMMIT;

-- ----------------------------
-- Table structure for transactions
-- ----------------------------
DROP TABLE IF EXISTS "public"."transactions";
CREATE TABLE "public"."transactions" (
  "id" int8 NOT NULL DEFAULT nextval('transactions_id_seq'::regclass),
  "user_id" int8 NOT NULL,
  "order_id" int8 NOT NULL,
  "card_number" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "card_holder_name" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "card_expiry" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "shipping_address" json NOT NULL,
  "billing_address" json NOT NULL,
  "purchaser" json,
  "currency" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'tl'::character varying,
  "default_currency" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'tl'::character varying,
  "language" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'tr'::character varying,
  "bank_id" varchar(255) COLLATE "pg_catalog"."default",
  "items" json NOT NULL,
  "total" numeric(10,2) NOT NULL,
  "gateway" varchar(255) COLLATE "pg_catalog"."default",
  "installment" int2,
  "third" bool NOT NULL,
  "conversation_id" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "response" json,
  "status" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'new'::character varying,
  "created_at" timestamp(0),
  "updated_at" timestamp(0)
)
;
ALTER TABLE "public"."transactions" OWNER TO "default";

-- ----------------------------
-- Records of transactions
-- ----------------------------
BEGIN;
INSERT INTO "public"."transactions" ("id", "user_id", "order_id", "card_number", "card_holder_name", "card_expiry", "shipping_address", "billing_address", "purchaser", "currency", "default_currency", "language", "bank_id", "items", "total", "gateway", "installment", "third", "conversation_id", "response", "status", "created_at", "updated_at") VALUES (1, 6571794, 1, '5356553977488987', 'Ettie Schmidt', '2025-12-02 09:39:58', '{"id":1,"name":"shirin","surname":"test","countryCode":"90","phoneNumber":"5013494834","line":"tofisa","title":"Home","email":"test@gmail.com","country":{"countryName":"T\u00fcrkiye","countryId":225},"province":{"provinceName":"Ad\u0131yaman","provinceId":2155},"district":{"districtName":"Besni","districtId":107332},"neighborhood":{"neighborhoodName":"Cirit Meydan\u0131 Mah","neighborhoodId":835},"zipCode":"25","companyName":"test","taxAdministration":"test","taxNumber":"test","type":"personal","isDefault":0}', '{"id":2,"name":"shirin","surname":"test","countryCode":"90","phoneNumber":"5013494834","line":"tofisa","title":"Home","email":"test@gmail.com","country":{"countryName":"T\u00fcrkiye","countryId":225},"province":{"provinceName":"Ad\u0131yaman","provinceId":2155},"district":{"districtName":"Besni","districtId":107332},"neighborhood":{"neighborhoodName":"Cirit Meydan\u0131 Mah","neighborhoodId":835},"zipCode":"25","companyName":"test","taxAdministration":"test","taxNumber":"test","type":"personal","isDefault":0}', '{"name":"shirin","surname":"test","phone_number":"5013494834","ip":"65.29.27.101"}', 'tl', 'tl', 'tr', '852970', '[{"id":2,"order_id":2,"product_id":0,"variation_id":1,"stock_id":1,"store_id":9,"brand_id":0,"category_id":1,"product_color_id":3,"brand":"Ivy Pagac","category":"Bernardo Stanton","product_name":"Micheal Altenwerth","product_media":["http:\/\/www.strosin.com\/"],"product_size":"4","product_color":"LavenderBlush","store_name":"Alivia Lesch","barcode":"230075","stock_code":"21905-LILA-GRI","variation_code":"21905-LILA-GRI-STD","mp_code":"21905","quantity":33698202,"desi":"9.00","buy_price":"17.58","sell_price":"16.39","discount":"0.00","vat_rate":"2.14","vat":"1.00","sub_total":"17.12","total":"1.34","profit":"9.22","currency_unit":"KZT","created_at":"2023-12-28T08:33:50.000000Z","updated_at":"2023-12-28T08:33:50.000000Z","base_price":"19.73","total_calculated":"17.75","promotion":null}]', 5.88, 'ipara', 79, 't', '61', '"{\"tracking_code\":\"dxbOS8QRvw\",\"user_id\":6571794,\"shipping_address\":{\"id\":1,\"name\":\"shirin\",\"surname\":\"test\",\"countryCode\":\"90\",\"phoneNumber\":\"5013494834\",\"line\":\"tofisa\",\"title\":\"Home\",\"email\":\"test@gmail.com\",\"country\":{\"countryName\":\"T\\u00fcrkiye\",\"countryId\":225},\"province\":{\"provinceName\":\"Ad\\u0131yaman\",\"provinceId\":2155},\"district\":{\"districtName\":\"Besni\",\"districtId\":107332},\"neighborhood\":{\"neighborhoodName\":\"Cirit Meydan\\u0131 Mah\",\"neighborhoodId\":835},\"zipCode\":\"25\",\"companyName\":\"test\",\"taxAdministration\":\"test\",\"taxNumber\":\"test\",\"type\":\"personal\",\"isDefault\":0},\"billing_address\":{\"id\":2,\"name\":\"shirin\",\"surname\":\"test\",\"countryCode\":\"90\",\"phoneNumber\":\"5013494834\",\"line\":\"tofisa\",\"title\":\"Home\",\"email\":\"test@gmail.com\",\"country\":{\"countryName\":\"T\\u00fcrkiye\",\"countryId\":225},\"province\":{\"provinceName\":\"Ad\\u0131yaman\",\"provinceId\":2155},\"district\":{\"districtName\":\"Besni\",\"districtId\":107332},\"neighborhood\":{\"neighborhoodName\":\"Cirit Meydan\\u0131 Mah\",\"neighborhoodId\":835},\"zipCode\":\"25\",\"companyName\":\"test\",\"taxAdministration\":\"test\",\"taxNumber\":\"test\",\"type\":\"personal\",\"isDefault\":0},\"desi\":0,\"country_id\":225,\"currency_id\":1,\"exchange_rate\":0,\"sub_total\":13.62,\"total\":15.35,\"total_calculated\":5.88,\"vat\":17.12,\"profit\":9.76,\"buy_total\":17.85,\"product_sub_total\":5.65,\"product_total\":7.69,\"product_total_calculated\":7.92,\"product_sell_price\":3.21,\"product_base_price\":10.69,\"product_vat\":14.24,\"product_profit\":9.02,\"product_buy_total\":17.43,\"addon_sub_total\":7.83,\"addon_total\":2.86,\"addon_vat\":12.95,\"addon_profit\":17.92,\"payment_type\":\"online\",\"status\":\"notDelivered\",\"precise_status\":\"notDelivered\",\"delivery_date\":\"2023-12-28T08:33:50.531971Z\",\"platform\":\"web\",\"ip\":\"226.216.208.154\",\"request\":\"est\",\"tsoft_sync\":true,\"created_at\":\"2023-12-28T08:33:50.000000Z\",\"updated_at\":\"2023-12-28T08:33:50.000000Z\",\"id\":2,\"products\":[{\"id\":2,\"order_id\":2,\"product_id\":0,\"variation_id\":1,\"stock_id\":1,\"store_id\":9,\"brand_id\":0,\"category_id\":1,\"product_color_id\":3,\"brand\":\"Ivy Pagac\",\"category\":\"Bernardo Stanton\",\"product_name\":\"Micheal Altenwerth\",\"product_media\":[\"http:\\\/\\\/www.strosin.com\\\/\"],\"product_size\":\"4\",\"product_color\":\"LavenderBlush\",\"store_name\":\"Alivia Lesch\",\"barcode\":\"230075\",\"stock_code\":\"21905-LILA-GRI\",\"variation_code\":\"21905-LILA-GRI-STD\",\"mp_code\":\"21905\",\"quantity\":33698202,\"desi\":\"9.00\",\"buy_price\":\"17.58\",\"sell_price\":\"16.39\",\"discount\":\"0.00\",\"vat_rate\":\"2.14\",\"vat\":\"1.00\",\"sub_total\":\"17.12\",\"total\":\"1.34\",\"profit\":\"9.22\",\"currency_unit\":\"KZT\",\"created_at\":\"2023-12-28T08:33:50.000000Z\",\"updated_at\":\"2023-12-28T08:33:50.000000Z\",\"base_price\":\"19.73\",\"total_calculated\":\"17.75\",\"promotion\":null}]}"', 'payed', '2023-12-28 08:33:50', '2023-12-28 08:33:50');
COMMIT;

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."addons_id_seq"
OWNED BY "public"."addons"."id";
SELECT setval('"public"."addons_id_seq"', 3, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."cargo_addons_id_seq"
OWNED BY "public"."cargo_addons"."id";
SELECT setval('"public"."cargo_addons_id_seq"', 4, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."cargos_id_seq"
OWNED BY "public"."cargos"."id";
SELECT setval('"public"."cargos_id_seq"', 4, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."failed_jobs_id_seq"
OWNED BY "public"."failed_jobs"."id";
SELECT setval('"public"."failed_jobs_id_seq"', 1, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."jobs_id_seq"
OWNED BY "public"."jobs"."id";
SELECT setval('"public"."jobs_id_seq"', 1, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."migrations_id_seq"
OWNED BY "public"."migrations"."id";
SELECT setval('"public"."migrations_id_seq"', 17, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."order_activities_id_seq"
OWNED BY "public"."order_activities"."id";
SELECT setval('"public"."order_activities_id_seq"', 2, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."order_products_id_seq"
OWNED BY "public"."order_products"."id";
SELECT setval('"public"."order_products_id_seq"', 3, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."orders_id_seq"
OWNED BY "public"."orders"."id";
SELECT setval('"public"."orders_id_seq"', 3, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."pay_at_door_addons_id_seq"
OWNED BY "public"."pay_at_door_addons"."id";
SELECT setval('"public"."pay_at_door_addons_id_seq"', 2, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."pay_at_doors_id_seq"
OWNED BY "public"."pay_at_doors"."id";
SELECT setval('"public"."pay_at_doors_id_seq"', 2, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."transactions_id_seq"
OWNED BY "public"."transactions"."id";
SELECT setval('"public"."transactions_id_seq"', 2, false);

-- ----------------------------
-- Indexes structure for table addons
-- ----------------------------
CREATE INDEX "addons_addon_able_type_addon_able_id_index" ON "public"."addons" USING btree (
  "addon_able_type" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "addon_able_id" "pg_catalog"."int8_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table addons
-- ----------------------------
ALTER TABLE "public"."addons" ADD CONSTRAINT "addons_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Uniques structure for table cargo_addons
-- ----------------------------
ALTER TABLE "public"."cargo_addons" ADD CONSTRAINT "cargo_addons_tracking_code_unique" UNIQUE ("tracking_code");

-- ----------------------------
-- Primary Key structure for table cargo_addons
-- ----------------------------
ALTER TABLE "public"."cargo_addons" ADD CONSTRAINT "cargo_addons_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table cargos
-- ----------------------------
ALTER TABLE "public"."cargos" ADD CONSTRAINT "cargos_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Uniques structure for table failed_jobs
-- ----------------------------
ALTER TABLE "public"."failed_jobs" ADD CONSTRAINT "failed_jobs_uuid_unique" UNIQUE ("uuid");

-- ----------------------------
-- Primary Key structure for table failed_jobs
-- ----------------------------
ALTER TABLE "public"."failed_jobs" ADD CONSTRAINT "failed_jobs_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table jobs
-- ----------------------------
CREATE INDEX "jobs_queue_index" ON "public"."jobs" USING btree (
  "queue" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table jobs
-- ----------------------------
ALTER TABLE "public"."jobs" ADD CONSTRAINT "jobs_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table migrations
-- ----------------------------
ALTER TABLE "public"."migrations" ADD CONSTRAINT "migrations_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table notifications
-- ----------------------------
CREATE INDEX "notifications_notifiable_type_notifiable_id_index" ON "public"."notifications" USING btree (
  "notifiable_type" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "notifiable_id" "pg_catalog"."int8_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table notifications
-- ----------------------------
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table order_activities
-- ----------------------------
ALTER TABLE "public"."order_activities" ADD CONSTRAINT "order_activities_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table order_products
-- ----------------------------
ALTER TABLE "public"."order_products" ADD CONSTRAINT "order_products_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Uniques structure for table orders
-- ----------------------------
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_tracking_code_unique" UNIQUE ("tracking_code");

-- ----------------------------
-- Checks structure for table orders
-- ----------------------------
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_payment_type_check" CHECK (payment_type::text = ANY (ARRAY['at_door'::character varying, 'online'::character varying]::text[]));
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_status_check" CHECK (status::text = ANY (ARRAY['preorder'::character varying, 'received'::character varying, 'processing'::character varying, 'shipping'::character varying, 'delivered'::character varying, 'notDelivered'::character varying, 'notDeliveredShippingBack'::character varying, 'notDeliveredRefund'::character varying, 'canceled'::character varying]::text[]));
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_precise_status_check" CHECK (precise_status::text = ANY (ARRAY['preorder'::character varying, 'new'::character varying, 'waiting'::character varying, 'approved'::character varying, 'rejected'::character varying, 'canceled'::character varying, 'picking'::character varying, 'packing'::character varying, 'shipping'::character varying, 'delivered'::character varying, 'notDelivered'::character varying, 'returnRequest'::character varying, 'returned'::character varying, 'supplying'::character varying]::text[]));
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_platform_check" CHECK (platform::text = ANY (ARRAY['mobile'::character varying, 'web'::character varying]::text[]));

-- ----------------------------
-- Primary Key structure for table orders
-- ----------------------------
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table pay_at_door_addons
-- ----------------------------
ALTER TABLE "public"."pay_at_door_addons" ADD CONSTRAINT "pay_at_door_addons_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table pay_at_doors
-- ----------------------------
ALTER TABLE "public"."pay_at_doors" ADD CONSTRAINT "pay_at_doors_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Checks structure for table transactions
-- ----------------------------
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_status_check" CHECK (status::text = ANY (ARRAY['new'::character varying, 'canceled'::character varying, 'sentToGateWay'::character varying, 'payed'::character varying, 'failed'::character varying]::text[]));

-- ----------------------------
-- Primary Key structure for table transactions
-- ----------------------------
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Foreign Keys structure for table addons
-- ----------------------------
ALTER TABLE "public"."addons" ADD CONSTRAINT "addons_order_id_foreign" FOREIGN KEY ("order_id") REFERENCES "public"."orders" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table cargo_addons
-- ----------------------------
ALTER TABLE "public"."cargo_addons" ADD CONSTRAINT "cargo_addons_cargo_id_foreign" FOREIGN KEY ("cargo_id") REFERENCES "public"."cargos" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table order_activities
-- ----------------------------
ALTER TABLE "public"."order_activities" ADD CONSTRAINT "order_activities_order_id_foreign" FOREIGN KEY ("order_id") REFERENCES "public"."orders" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table pay_at_door_addons
-- ----------------------------
ALTER TABLE "public"."pay_at_door_addons" ADD CONSTRAINT "pay_at_door_addons_pay_add_door_id_foreign" FOREIGN KEY ("pay_add_door_id") REFERENCES "public"."pay_at_doors" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table transactions
-- ----------------------------
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_order_id_foreign" FOREIGN KEY ("order_id") REFERENCES "public"."orders" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
