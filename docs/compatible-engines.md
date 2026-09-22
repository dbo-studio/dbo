# Compatible engines

DBO has three drivers: **PostgreSQL**, **MySQL**, **SQLite**. Other products either *are* those engines (hosted), speak the same wire protocol, or need a new dialer.

**Rule:** one driver per protocol. A picker **alias** is a stored `type` + icon that still calls the existing dialer and repository. Do not copy `internal/database/mysql/` (or postgres/sqlite) per brand.

SQL Server is a different protocol. Out of scope here.

How we already grew MySQL still applies: **connect → tree + SQL + grid first**, Object Form / diagram later. New engines follow that same slice, not “full GUI on day one.”

Coverage below is predicted from catalogs vs current code (`pg_catalog`, `information_schema`, `sqlite_master`). Login succeeding and the tree dying is the usual failure.

Legend: **Yes** · **Partial** (named holes) · **No** · **Blocked** (cannot open today).

---

## Connect as PostgreSQL

These **are** Postgres. In the Add Connection picker they appear as their own cards (icons + labels) and store a branding `type`, but they still use the PostgreSQL dialer and repository.

| Product | Stored type | Notes |
| ------- | ----------- | ----- |
| PostgreSQL | `postgresql` | Core |
| Supabase | `supabase` | Direct URI **`:5432`**, not pooler `:6543` |
| Neon | `neon` | Same pooled-endpoint caveat |
| Amazon RDS (PostgreSQL) | `rds_postgresql` | |
| Amazon Aurora (PostgreSQL) | `aurora_postgresql` | |
| AlloyDB | `alloydb` | |
| Cloud SQL (PostgreSQL) | `cloudsql_postgresql` | |
| Azure Database (PostgreSQL) | `azure_postgresql` | |
| TimescaleDB | `timescaledb` | Extension on Postgres |

## Connect as MySQL

Same pattern: picker branding over the MySQL driver.

| Product | Stored type | Notes |
| ------- | ----------- | ----- |
| MySQL | `mysql` | Core |
| MariaDB | `mariadb` | |
| Amazon RDS (MySQL) | `rds_mysql` | |
| Amazon Aurora (MySQL) | `aurora_mysql` | |
| Cloud SQL (MySQL) | `cloudsql_mysql` | |
| Azure Database (MySQL) | `azure_mysql` | |
| Percona | `percona` | |
| HeatWave | `heatwave` | |

Proxies (ProxySQL, MaxScale, MySQL Router, Vitess VTGate) are not engines. Point at them as MySQL if that is how the app reaches the server.

---

## Surfaces

| Column | In the app |
| ------ | ----------- |
| Connect | Add connection, ping, SSL on the base driver |
| Tree | Databases, schemas (PG), tables, views; PG matviews/sequences when catalogs have them |
| SQL | Editor, raw query, autocomplete |
| Grid | Browse, filter/sort/page, inline edit, FK picker |
| Object Form | Create/edit/drop database, schema (PG), table (columns/FKs/keys/indexes), view, matview (PG) |
| Diagram | ERD from catalog PK/FK |
| Import/Export | CSV / JSON / SQL jobs |
| AI | Chat context, inline complete, MCP — same catalogs as tree |

Saved queries, history, and Safe Mode are app-level. They work as soon as Connect works.

---

## Wave 1 — simple aliases ✅ (MariaDB shipped)

Same driver, new `type` + icon + Add Connection card. Factory: `case "mariadb":` → MySQL path. Smoke: create, ping, open tree.

Ship the **full** current MySQL/Postgres surface. No Object Form tax.

| Engine | Driver | Connect | Tree | SQL | Grid | Object Form | Diagram | Import/Export | AI | Status |
| ------ | ------ | ------- | ---- | --- | ---- | ----------- | ------- | ------------- | -- | ------ |
| **MariaDB** | `mysql` | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | **Shipped** |

MariaDB: default port 3306, reuse MySQL form fields. Optional later (branding only): Supabase, Neon picker cards — not required; connect-as is documented in README.

---

## Wave 2 — protocol-compatible, basic first

Same alias pattern. **Do not wait for Object Form.** Ship like early MySQL:

1. Connect + tree + SQL + grid browse  
2. Grid edit + import/export  
3. Object Form + diagram (honest Partial until then)

| Engine | Driver | Connect | Tree | SQL | Grid | Object Form | Diagram | Import/Export | AI | Notes |
| ------ | ------ | ------- | ---- | --- | ---- | ----------- | ------- | ------------- | -- | ----- |
| **YugabyteDB (YSQL)** | `postgresql` | Yes | Yes | Yes | Yes | Partial | Yes | Yes | Yes | Best distributed PG. Real `pg_*`. Slice 3 holes: `TABLESPACE`, `UNLOGGED`, some `ALTER`. |
| **TiDB** | `mysql` | Yes | Yes | Yes | Yes | Partial | Partial | Yes | Yes | Tree/grid first. `ENGINE=InnoDB` ignored; FK/diagram after a smoke. |
| **PlanetScale / Vitess** | `mysql` | Yes | Yes | Yes | Yes | Partial | Partial | Yes | Yes | Tree/grid first. Skip promising Form FKs / some `ALTER`. |
| **CockroachDB** | `postgresql` | Yes | Partial | Yes | Partial | Partial | Partial | Yes | Partial | Tree may fail first (`pg_tablespace`, `::regclass`, `pg_shdescription`). Grid: `40001` retries. Form last. |
| **Dolt** | `mysql` | Yes | Yes | Yes | Yes | Partial | Yes | Yes | Yes | Git extras invisible. After TiDB. |
| **OceanBase (MySQL mode)** | `mysql` | Yes | Partial | Yes | Yes | Partial | Partial | Yes | Partial | After TiDB. Oracle mode is not MySQL. |

**Out of Wave 2 (do not alias):** ClickHouse, Apache Doris, StarRocks, AnalyticDB, Redshift, Spanner PG, RisingWave, Materialize, QuestDB, CrateDB, Yellowbrick, DuckDB pgwire, SingleStore, Greenplum/Cloudberry. Wire or SQL SELECT is not a DBO GUI. SingleStore/Greenplum can be revisited only after Cockroach-style tree smoke.

---

## Wave 3 — new dialer

SQLite here is a **file + C API**. Remote products are not aliases. After a dialer exists, **reuse the SQLite repository** (`sqlite_master`) the same way MariaDB reuses MySQL. Then apply the Wave 2 slice: tree/grid first, Object Form after.

| Engine | Connect today | After a dialer | Transport |
| ------ | ------------- | -------------- | --------- |
| libSQL **local file** | Yes (pick SQLite) | — | File |
| **Turso / libSQL remote** | Blocked | SQLite feature set, plus token auth | Hrana HTTP/WebSocket |
| **rqlite / dqlite** | Blocked | SQLite subset (Raft/HTTP limits) | HTTP / cluster API |
| **Cloudflare D1** | Blocked | SQLite subset (time/size limits) | HTTP API |
| **SQLite Cloud** | Blocked | Unknown until protocol is wired | Custom |

Do not treat them as a new engine family unless the SQLite repo is proven wrong.

SQLCipher (encrypted local files) is also a driver/key change, not an alias. Same wave class if we ever want it.

---

## Rollout

| Order | What | Work | Done when |
| ----- | ---- | ---- | --------- |
| **0** | Connect-as | README notes for hosted PG/MySQL | ✅ Documented |
| **1** | MariaDB alias | Enum, DTO, factory, picker, icon, e2e smoke | ✅ Shipped |
| **2a** | Yugabyte alias | Same as MariaDB, route to Postgres | Tree + SQL + grid browse. Object Form can stay Partial |
| **2b** | TiDB alias | Route to MySQL | Tree + SQL + grid. Form/diagram later |
| **2c** | PlanetScale, then Cockroach, then Dolt | Same | Tree smoke on a real instance **before** calling it Supported. Form last |
| **3** | Turso (then rqlite/D1 if still wanted) | New dialer + SQLite repo | Connect works; then Wave-2 slices |

Factory pattern for every alias:

```text
type=mariadb | yugabytedb | tidb | …
  → existing OpenMysql / OpenPostgres
  → existing MySQLRepository / PostgresRepository
  → store the alias type (icons, labels). Do not rewrite to mysql/postgresql.
```

Honesty: do not mark Cockroach, TiDB, or Turso **Supported** until that wave’s smoke exists. Connect-as products do not need a README row.

---

## Not this catalog

- **SQL Server** — own protocol, already a backend enum, separate project  
- **DuckDB files** — not SQLite  
- Warehouses / streaming behind a MySQL or PG port — SQL editor only would be a different product
