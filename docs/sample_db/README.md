# Sample databases

| File | Engine | Purpose |
|------|--------|---------|
| `public.sql` | Postgres | USDA food dump + **`product` demo table** (all Data Grid mapped types) |
| `mysql.sql` | MySQL | **`product` demo table** for MySQL 8 |
| `shop_pg.sql` | Postgres | Rich `shop` schema (~40k rows): enums, FKs, generated cols, jsonb, partitions, views, matview, functions, triggers |
| `shop_mysql.sql` | MySQL | Rich `shop` database (~40k rows): FKs, generated cols, JSON, fulltext/spatial, partitions, views, routines, triggers |
| `shop_mssql.sql` | SQL Server 2022 | `shop` database (~25k rows): self-FK, composite keys, computed/identity/uniqueidentifier/decimal/bit columns, `analytics` schema, view, procedure, function, trigger |
| `shop_clickhouse.sql` | ClickHouse 24 | `shop` database (~65k rows): MergeTree + partitions, `LowCardinality`, `Nullable`, `Array`, `Map`, `Enum8`, `DateTime64`, `Decimal`, `UUID`, a view |

## Credentials

- DB: `default`
- Postgres user/pass: `default` / `secret` (port `45432`)
- MySQL root/pass: `root` / `secret` (port `43306`)
- SQL Server: `sa` / `Secret_pass1`, database `shop` (port `41433`, `MSSQL_TEST_PORT`)
- ClickHouse: `default` / `secret`, database `shop`, native protocol (port `49000`, `CLICKHOUSE_TEST_PORT`)

## Refresh `shop`

Postgres reuses `docker/data/pgsql`, so init only runs on a fresh volume. Re-apply:

```bash
docker compose -f docker-compose.dev.yml exec -T sample-pgsql psql -U default -d default < docs/sample_db/shop_pg.sql
docker compose -f docker-compose.dev.yml exec -T sample-mysql mysql -uroot -psecret < docs/sample_db/shop_mysql.sql
```

`sample-mssql` re-applies its seed on every start (`docker/mssql/entrypoint.sh`); `sample-clickhouse` seeds on first start of a fresh container (`rm -sfv sample-clickhouse`, then `up`).

## Refresh `product` on an existing volume

Init only runs on first volume create. To re-apply:

```bash
docker compose -f docker-compose.dev.yml exec -T sample-pgsql \
  psql -U default -d default -c "$(sed -n '/DBO Studio demo: product table/,$p' docs/sample_db/public.sql)"

# or pipe the product section:
docker compose -f docker-compose.dev.yml exec -T sample-pgsql \
  psql -U default -d default < /tmp/product_pg.sql

docker compose -f docker-compose.dev.yml exec -T sample-mysql \
  mysql -uroot -psecret default < docs/sample_db/mysql.sql
```

## `product` columns → mappedType

| Column | Type | Grid mappedType |
|--------|------|-----------------|
| `name` | varchar | string |
| `is_active` | boolean / tinyint(1) | boolean |
| `price`, `stock` | numeric / int | number |
| `released_on` | date | date |
| `opens_at` | time | time |
| `updated_at` | timestamp / datetime | datetime |
| `status` | enum | enum |
| `meta` | jsonb / json | json |
| `id` | uuid / char(36) | uuid (PG) / string (MySQL) |
| `blob_data` | bytea / blob | binary → `[hex]` |
| `image_data` | bytea / blob (PNG) | binary → `[image]` |
| `location` | point | geometry → `[geometry]` |
