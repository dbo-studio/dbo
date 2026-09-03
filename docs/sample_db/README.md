# Sample databases

| File | Engine | Purpose |
|------|--------|---------|
| `public.sql` | Postgres | USDA food dump + **`product` demo table** (all Data Grid mapped types) |
| `mysql.sql` | MySQL | **`product` demo table** for MySQL 8 |

## Credentials

- DB: `default`
- Postgres user/pass: `default` / `secret` (port `5432`)
- MySQL root/pass: `root` / `secret` (port `3307`)

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
