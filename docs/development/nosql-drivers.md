# Adding a NoSQL driver

NoSQL databases use one backend contract and one frontend Browse UI. SQL `DatabaseRepository` is not involved.
A driver describes its data; the UI renders it. In the common case you write no UI.

## Pieces

| Piece | Where |
| --- | --- |
| Contract (`NoSQLRepository`, `ContainerSpec`, `Item`, optional `PubSubProvider` / `CommandRunner`) | `backend/internal/database/contract/nosql.go` |
| Reference driver (in-memory, test-only) | `backend/internal/database/nosqlfixture/` |
| Factory | `NewNoSQLRepository` in `backend/internal/database/repository.go` |
| HTTP | `backend/internal/service/nosql`, `backend/internal/app/handler/nosql.go`, routes under `/api/nosql` |
| Browse tab | `frontend/src/routes/Browse/` (`TabMode.Browse`) |
| Tools (`TabMode.Tool`) | `frontend/src/routes/Tool/` — registry in `Tool.tsx`, titles in `core/constants/nosqlTools.ts` |

## Steps

1. **Implement `NoSQLRepository`** in `backend/internal/database/<driver>/`. Add a compile-time assertion
   (`var _ databaseContract.NoSQLRepository = (*Repo)(nil)`).
   - `Tree` returns containers (redis db, mongo collection). Give each container node
     `Action{Name: BrowseContainerAction, Type: tab, Params: {"path": "browse"}}`; its node `id` is the container id.
   - `Describe` returns the `ContainerSpec`: `Filter` (`pattern` | `fields` | `query`), `Fields` (with every type seen per field),
     `ListStyle`/`Delimiter`, `Capabilities`, `Tools`. Declare **only** what the driver really supports; the UI shows
     actions for declared capabilities only, and the service rejects undeclared writes with 400.
   - `Browse` is cursor-paged and bounded: use `q.ClampLimit(default)`; return `NextCursor` empty on the last page.
   - `Classify` rates each `Operation` (`read` | `write` | `destructive` | `blocked`) for Safe Mode.
     Destructive operations always require confirmation. `blocked` is always rejected.
2. **Map data onto an existing `ViewKind`**: `text`, `document`, `fields`, `list`, `set`, `table`. Add a new kind only when two
   drivers need it; otherwise pass specifics through `Item.Meta` / `FieldInfo`.
3. **Keep values lossless.** Non-UTF-8 bytes are sent base64 with `Meta["encoding"] = "base64"`. Documents use canonical Extended JSON.
4. **Optional tools**: implement `PubSubProvider` and/or `CommandRunner` and declare `ToolPubSub` / `ToolCLI` in `ContainerSpec.Tools`.
   `Subscribe` must block until its context is done and must use a dedicated connection that it closes on return.
   A tool with its own UI registers a component in `frontend/src/routes/Tool/Tool.tsx`.
5. **Register the type**
   - add the connection type constant and add it to `NoSQLTypes` in `backend/internal/database/contract/database_enum.go`;
   - add it to `ValidConnectionTypes`-style validation (`dto/connection_types.go`) so it can be created;
   - switch on it in `NewNoSQLRepository`;
   - handle ping/create options for the type in `service/connection` (`pingNoSQL`, `createConnectionDto`);
   - add it to `NOSQL_TYPES` in `frontend/src/core/db/connectionAliases.ts` and to the connection picker.
6. **Cover it in Playwright** (`e2e/tests/nosql/`); the repo does not use unit tests for features.

## Fixture driver

`nosql_fixture` has one container per view kind, all three filter kinds, a base64 item, Extended JSON documents and a ticking
Pub/Sub channel. It exists only when the backend runs with `DBO_ENABLE_NOSQL_FIXTURE=1` (set by `e2e/scripts/start-stack.mjs`)
and is never offered in the connection picker. Run it with `cd e2e && npm run test:nosql`.

## Contract status

v0. It is expected to change when the second real driver lands; update the fixture and this page with it.

## Redis driver (reference real driver)

`backend/internal/database/redis/` serves `redis`, `valkey`, `keydb` and `dragonfly`.

- Containers are logical dbs (`db0`..); the tree shows non-empty dbs plus the default one. One client per db index, never `SELECT`.
- Browse uses `SCAN MATCH` only (never `KEYS`); `KEYS`, `SELECT`, `EVAL`, `CONFIG SET`, blocking and replication commands are `blocked` in the CLI.
- Key types map to views: string → `text`, hash → `fields`, list/stream → `list`, set/zset → `set` (zset carries `meta.scored`), ReJSON → `document`.
  Streams and JSON are read-only (`meta.readonly`). Collections over 1000 members set `meta.truncated`: the UI pages them with
  `GET /nosql/item/window` (`Windower`, HSCAN/SSCAN/ZSCAN/LRANGE) and edits one member at a time with `POST /nosql/item/member`
  (HSET/HDEL, SADD/SREM, ZADD/ZREM, LSET/RPUSH/LREM). A whole-key save of such a key is refused so unloaded members are never dropped.
- Recycle bin (`Recycler`, `CapRecycle`): deleting 1–100 keys stores `DUMP` + TTL in `nosql_recycle_entries` (per owner, 1 MiB per key,
  32 MiB / 500 entries per owner, 7 days; pruned on every list and delete). `POST /nosql/recycle/:id/restore` uses plain `RESTORE`
  (never overwrites, goes through Safe Mode). Bulk, folder and flush deletes are not recycled; keys over the cap are skipped.
- Tools: CLI (`CommandRunner`) and Pub/Sub (`PubSubProvider`, dedicated connection per subscription).
- E2E needs a Redis: `docker compose -f docker-compose.dev.yml up -d sample-redis` (`REDIS_TEST_PORT`, default 6380), then `cd e2e && npm run test:nosql`.

## MongoDB driver

`backend/internal/database/mongo/` serves `mongodb` (connection string including `mongodb+srv://`, or host/port with auth source and TLS).

- Containers are `database/collection`; the tree lists databases, then a database's collections when it is expanded. System databases are hidden.
  The tree lists databases once per connection (cached), so a database created later shows after a tree refresh.
- Items are documents. Browse filters take a JSON filter (Extended JSON, `FilterQuery`) and page by `_id`; `_id` values of mixed BSON types page only
  through the first type. Documents cross the API as **canonical Extended JSON**, so ObjectId, dates and int32/int64/double survive a save.
  The id shown in the UI is the hex string for an ObjectId, the plain string for strings, and Extended JSON otherwise (always round-trips).
- Capabilities: insert (id optional, generated when empty), edit (whole-document replace, `_id` cannot change), delete, bulk delete by filter
  (`BulkDeleter`, same job and typed-name confirmation as Redis), recycle bin (`Recycler`: canonical JSON snapshot, restore never overwrites) and
  collection stats (`StatsProvider`: size, average document, indexes).
- Terminal: a mongosh-style **parser, not a JavaScript engine**: `db.<coll>.find|findOne|count|countDocuments|aggregate|distinct|getIndexes|insertOne|
  insertMany|updateOne|updateMany|replaceOne|deleteOne|deleteMany|createIndex(...)` with JSON arguments and `.sort() .limit() .skip() .count()` chains, plus
  `show dbs`, `show collections`, `use <db>`. `find` returns at most 200 rows and `aggregate` appends `$limit: 200`.
- Blocked everywhere (filters and commands): `$where`, `$function`, `$accumulator`, `$out`, `$merge`, `mapReduce`, `eval`, `drop` and any method not listed.
- E2E needs a MongoDB: `docker compose -f docker-compose.dev.yml up -d sample-mongo` (`MONGO_TEST_PORT`, default 27018), then `cd e2e && npm run test:nosql`.
