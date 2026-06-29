# pgAdmin4: Complete PostgreSQL Object Flow Analysis (UI → Database)

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Databases](#1-databases)
3. [Schemas](#2-schemas)
4. [Tables](#3-tables)
5. [Columns](#4-columns)
6. [Indexes](#5-indexes)
7. [Views](#6-views)
8. [Materialized Views](#7-materialized-views)
9. [Functions/Procedures](#8-functionsprocedures)
10. [Triggers](#9-triggers)
11. [Sequences](#10-sequences)
12. [Foreign Tables](#11-foreign-tables)
13. [Types](#12-types)
14. [Extensions](#13-extensions)
15. [Policies (Row Level Security)](#14-policies-row-level-security)
16. [Roles/Users](#15-rolesusers)

---

## Architecture Overview

### Unified Pattern Across ALL Object Types

Every PostgreSQL object in pgAdmin4 follows an identical architectural pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React 19 + MUI 7)             │
│  {node}.ui.js  → Schema definitions (BaseUISchema subclass) │
│  {node}.js     → Node registration, menu items, callbacks   │
│  SchemaDialogView.jsx → Generic form renderer                │
│  SchemaPropertiesView.jsx → Properties panel                │
│  SQLTab.jsx → SQL preview tab                               │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP (REST API)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND (Flask + Python)                   │
│  __init__.py    → Module class + View class                  │
│  utils.py       → Helper functions                          │
│  operations dict → Route → Method mapping                   │
│  check_precondition decorator → Connection setup             │
└──────────────────────┬──────────────────────────────────────┘
                       │ render_template()
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              SQL GENERATION (Jinja2 Templates)              │
│  templates/{node}/sql/{version_group}/create.sql            │
│  templates/{node}/sql/{version_group}/update.sql            │
│  templates/{node}/sql/{version_group}/delete.sql            │
│  macros/*.macros → Reusable SQL fragments                   │
└──────────────────────┬──────────────────────────────────────┘
                       │ self.conn.execute_scalar() / execute_dict()
                       ▼
┌─────────────────────────────────────────────────────────────┐
│            DATABASE EXECUTION (psycopg3 driver)              │
│  Connection Manager → connection(did=) → execute SQL        │
│  Error handling → HTTP status mapping                       │
│  Result formatting → JSON response                          │
└─────────────────────────────────────────────────────────────┘
```

### State Management
- **Frontend State**: `BaseUISchema` subclass (per-object `.ui.js` files) with `zustand` store managed by `SchemaDialogView.jsx`
- **Form Data**: Serialized as JSON, sent via `POST`/`PUT`/`DELETE` to Flask API
- **Server State**: `@tanstack/react-query` for caching/fetching node data
- **Browser Tree**: `react-arborist` tree with `pgBrowser.tree` API

### SQL Template System
- Templates live in `templates/{object}/sql/{version_group}/`
- Version groups: `default`, `15_plus`, `16_plus`, `17_plus`
- Jinja2 macros imported from `macros/*.macros`
- Parameter binding via `conn|qtIdent()` (identifier quoting) and `|qtLiteral()` (value quoting)
- Versioned template loader resolves `#{version}#` patterns

### API Route Construction
All routes are auto-generated from the `operations` dict in each View class via `NodeView.register_node_view()`. URL pattern:
```
/{command}/{parent_id_params}/{id_params}
```
Example: `GET /browser/obj/<gid>/<sid>/<did>/<scid>/<tid>` → `properties` on a table

---

## 1. Databases

### 1.1 Frontend Layer

**Files:**
- `databases/static/js/database.ui.js` → `DatabaseSchema extends BaseUISchema`
- `databases/static/js/database.js` → Node registration (`pgBrowser.Nodes['database']`)

**UI Components:**
- Create/Edit dialog via `SchemaDialogView.jsx` (generic)
- Properties panel via `SchemaPropertiesView.jsx`
- SQL tab via `SQLTab.jsx`

**Fields (from `database.ui.js:100-323`):**

| Field ID | Label | Type | Group | Mode | Validation | Notes |
|----------|-------|------|-------|------|-----------|-------|
| `name` | Database | `text` | General | edit,create | `noEmpty: true` | Required |
| `datowner` | Owner | `select` | General | edit,create | `allowClear: false` | Options from `role` node |
| `comments` | Comment | `multiline` | General | edit,create | - | |
| `encoding` | Encoding | `select` | Definition | edit,create | readonly if not new | Options from `get_encodings` API |
| `template` | Template | `select` | Definition | create only | `allowClear: false` | Options from `get_databases` API |
| `spcname` | Tablespace | `select` | Definition | edit,create | `allowClear: false` | Options from `tablespace` node |
| `datlocaleprovider` | Locale Provider | `select` | Definition | edit,create | `allowClear: false` | `libc`/`icu`/`builtin` (PG17+) |
| `datcollate` | Collation | `select` | Definition | edit,create | Deps: `datlocaleprovider` | Disabled if not libc |
| `datctype` | Character type | `select` | Definition | edit,create | Deps: `datlocaleprovider` | Disabled if not libc |
| `daticulocale` | ICU Locale | `select` | Definition | edit,create | min_version: 150000 | Disabled if not icu |
| `daticurules` | ICU Rules | `text` | Definition | edit,create | min_version: 160000 | Disabled if not icu |
| `datbuiltinlocale` | Builtin Locale | `select` | Definition | edit,create | min_version: 170000 | Disabled if not builtin |
| `datconnlimit` | Connection limit | `int` | Definition | edit,create | `min: -1` | |
| `is_template` | Template? | `switch` | Definition | edit,create | readonly if sys_obj | |
| `datallowconn` | Allow connections? | `switch` | Definition | properties | - | Read-only |
| `datacl` | Privileges | `collection` | Security | edit,create | `['C','T','c']` | |
| `variables` | Parameters | `collection` | Parameters | edit,create | - | Nested VariableSchema |
| `seclabels` | Security labels | `collection` | Security | edit,create | min_version: 90200 | `SecLabelSchema` |
| `schema_res` | Schema restriction | `select` (multi) | Advanced | edit,create | creatable, noDropdown | |

**Validation Rules (from `database.ui.js:326-333`):**
```javascript
validate(state, setError) {
    if (state.datlocaleprovider == 'builtin' && !state.datbuiltinlocale) {
        setError('datbuiltinlocale', 'Please specify Builtin Locale.');
        return true;
    }
}
```

**API Calls:**
| Operation | HTTP Method | URL Pattern | Payload |
|-----------|------------|-------------|---------|
| List databases | `GET` | `/browser/obj/<gid>/<sid>/` | - |
| Create database | `POST` | `/browser/obj/<gid>/<sid>/` | JSON form data |
| Get properties | `GET` | `/browser/obj/<gid>/<sid>/<did>` | - |
| Update database | `PUT` | `/browser/obj/<gid>/<sid>/<did>` | JSON form data |
| Delete database | `DELETE` | `/browser/obj/<gid>/<sid>/<did>` | `{ids: [did]}` |
| Get encodings | `GET` | `/browser/get_encodings/<gid>/<sid>/` | - |
| Get ctypes | `GET` | `/browser/get_ctypes/<gid>/<sid>/` | - |
| Get ICU locale | `GET` | `/browser/get_icu_locale/<gid>/<sid>/` | - |
| Connect | `POST` | `/browser/connect/<gid>/<sid>/<did>` | - |
| Disconnect | `DELETE` | `/browser/connect/<gid>/<sid>/<did>` | - |
| MSQL | `GET` | `/browser/msql/<gid>/<sid>/<did>` | Query params |

### 1.2 Backend API Layer

**File:** `databases/__init__.py`

**Route/Endpoint:** All routes are auto-generated from `operations` dict (line 154-215):
```python
operations = dict({
    'obj': [
        {'get': 'properties', 'delete': 'delete', 'put': 'update'},
        {'get': 'list', 'post': 'create', 'delete': 'delete'}
    ],
    'nodes': [{'get': 'node'}, {'get': 'nodes'}],
    'connect': [{'get': 'connect_status', 'post': 'connect', 'delete': 'disconnect'}],
    ...
})
```

**URL construction (auto-generated by `register_node_view`):**
```
GET    /browser/obj/<int:gid>/<int:sid>/                         → list
POST   /browser/obj/<int:gid>/<int:sid>/                         → create
GET    /browser/obj/<int:gid>/<int:sid>/<int:did>                → properties
PUT    /browser/obj/<int:gid>/<int:sid>/<int:did>                → update
DELETE /browser/obj/<int:gid>/<int:sid>/<int:did>                → delete
POST   /browser/connect/<int:gid>/<int:sid>/<int:did>            → connect
DELETE /browser/connect/<int:gid>/<int:sid>/<int:did>            → disconnect
```

**Controller Logic - `create()` (line 710-786):**
1. Parse request: `data = request.form if request.form else json.loads(request.data)`
2. Validate required: checks `name` in `data`
3. Render SQL: `render_template("databases/sql/#{version}#/create.sql", data=data, conn=self.conn)`
4. Execute DDL: `self.conn.execute_scalar(SQL)`
5. Render grant SQL: `render_template("databases/sql/#{version}#/grant.sql", data=data, conn=self.conn)`
6. Execute grants: `self.conn.execute_scalar(SQL)`
7. Fetch new OID: `render_template("databases/sql/#{version}#/properties.sql", name=data['name'], ...)`
8. Save schema restrictions to config DB: `Database(id=response['did'], server=sid, schema_res=...)`
9. Return browser node JSON

**Controller Logic - `update()` (line 883-983):**
1. Parse request data
2. Update schema restrictions in config DB
3. Create offline connection for rename/tablespace operations
4. Fetch current database details for old name comparison
5. Execute offline SQL (rename, tablespace, owner, comment, connection limit)
6. Reconnect to database
7. Execute online SQL (variables, privileges, security labels, is_template)
8. Commit config DB changes
9. Return updated browser node

**Controller Logic - `delete()` (line 1024-1071):**
1. Parse request: extract `ids` list
2. For each database:
   a. First query gets name: `SELECT db.datname FROM pg_database WHERE db.oid = {did}`
   b. Release connection if connected
   c. Execute drop: `DROP DATABASE IF EXISTS {name} [WITH (FORCE)]`
3. Return success

**Error Handling:**
- Connection failure: `internal_server_error(errmsg)` (HTTP 500)
- Object not found: `gone()` (HTTP 410)
- Missing required param: `make_json_response(status=410, errormsg=...)`
- Drop failure: Reconnect attempt, then `internal_server_error(underscore_escape(msg))`

### 1.3 Validation Layer

**Input Validation:**
- `name` is required (checked in `create()`, line 712-728)
- All other fields are optional
- `comments` is passed as-is (not JSON-parsed, line 1083)
- Other fields are JSON-parsed from request

**Business Validation:**
- Cannot delete the currently connected database (`canDrop` flag)
- Database connection must be released before offline operations (rename, tablespace)
- Cannot connect to `template0`

**Sanitization:**
- All identifiers use `conn|qtIdent()` Jinja2 filter (properly quotes PostgreSQL identifiers)
- All literal values use `|qtLiteral()` Jinja2 filter (properly quotes values)
- Underscore escape for HTML entities in error messages

### 1.4 SQL Generation Layer

**Approach:** Jinja2 templates with versioned fallback

**CREATE DATABASE template (`databases/sql/default/create.sql`):**
```sql
CREATE DATABASE {{ conn|qtIdent(data.name) }}
    WITH
    OWNER = {{ conn|qtIdent(data.datowner) }}
    TEMPLATE = {{ conn|qtIdent(data.template) }}
    ENCODING = {{ data.encoding|qtLiteral(conn) }}
    LC_COLLATE = {{ data.datcollate|qtLiteral(conn) }}
    LC_CTYPE = {{ data.datctype|qtLiteral(conn) }}
    TABLESPACE = {{ conn|qtIdent(data.spcname) }}
    CONNECTION LIMIT = {{ data.datconnlimit }}
    IS_TEMPLATE = {{ data.is_template }};
```

**Example output:**
```sql
CREATE DATABASE "mydb"
    WITH
    OWNER = "postgres"
    TEMPLATE = "template1"
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TABLESPACE = "pg_default"
    CONNECTION LIMIT = -1
    IS_TEMPLATE = false;
```

**ALTER DATABASE (offline - `alter_offline.sql`):**
```sql
ALTER DATABASE {{ conn|qtIdent(data.old_name) }} RENAME TO {{ conn|qtIdent(data.name) }};
ALTER DATABASE {{ conn|qtIdent(data.name) }} OWNER TO {{ conn|qtIdent(data.datowner) }};
COMMENT ON DATABASE {{ conn|qtIdent(data.name) }} IS {{ data.comments|qtLiteral(conn) }};
ALTER DATABASE {{ conn|qtIdent(data.name) }} WITH CONNECTION LIMIT = {{ data.datconnlimit }};
ALTER DATABASE {{ conn|qtIdent(data.name) }} SET TABLESPACE {{ conn|qtIdent(data.spcname) }};
```

**ALTER DATABASE (online - `alter_online.sql`):**
- Handles variables (`SET/DROP`), privileges (`GRANT/REVOKE`), default privileges, security labels, `IS_TEMPLATE`

**DROP DATABASE (`delete.sql`):**
```sql
-- First: get name from OID
SELECT db.datname as name FROM pg_catalog.pg_database as db WHERE db.oid = {{did}};
-- Then: drop
DROP DATABASE IF EXISTS {{ conn|qtIdent(datname) }} [WITH (FORCE)];
```

**Parameter Binding:** Jinja2 macros `qtIdent()` and `qtLiteral()` handle all quoting. No raw f-strings.

**Transaction Handling:** Each SQL statement executed individually via `self.conn.execute_scalar()`. No explicit transaction wrapping (DDL auto-commits in PostgreSQL).

### 1.5 Database Execution

**Connection:** `self.manager.connection(did=kwargs['did'])` for database-specific operations; `self.manager.connection()` for generic (to avoid connecting to the target DB during drop)

**Error Handling:**
- `self.conn.execute_scalar(SQL)` returns `(status, result)`
- `status == False` → error message in result → `internal_server_error(errormsg=res)`
- Connection loss triggers `pgadmin:database:connection:lost` event on frontend

**Logging:** SQL errors logged via `current_app.logger.error()` and `current_app.logger.exception()`

**Result Return:**
- Create: `{node: {id, label, icon, ...}}` (browser node JSON)
- Update: `{node: {...}}` (updated browser node)
- Delete: `{success: 1}` or error JSON
- Properties: JSON object with all database properties

---

## 2. Schemas

### 2.1 Frontend Layer

**Files:**
- `schemas/static/js/schema.ui.js` → `PGSchema extends BaseUISchema`
- `schemas/static/js/schema.js` → Node registration

**Fields (from `schema.ui.js:37-93`):**

| Field ID | Label | Type | Group | Mode | Notes |
|----------|-------|------|-------|------|-------|
| `name` | Name | `text` | General | edit,create | Required |
| `namespaceowner` | Owner | `select` | General | edit,create | Options from `role` node |
| `description` | Comment | `multiline` | General | edit,create | |
| `nspacl` | Privileges | `collection` | Security | edit,create | `['C','U']` privileges |
| `seclabels` | Security labels | `collection` | Security | edit,create | min_version: 90200 |
| `deftblacl` | Default TABLE privs | `collection` | Default privileges | edit,create | Nested |
| `defseqacl` | Default SEQUENCE privs | `collection` | Default privileges | edit,create | Nested |
| `deffuncacl` | Default FUNCTION privs | `collection` | Default privileges | edit,create | Nested |
| `deftypeacl` | Default TYPE privs | `collection` | Default privileges | edit,create | min_version: 90200 |

**Validation (from `schema.ui.js:96-111`):**
```javascript
validate(state, setError) {
    if (isEmptyString(state.name)) {
        setError('name', 'Name cannot be empty.'); return true;
    }
    if (isEmptyString(state.namespaceowner)) {
        setError('namespaceowner', 'Owner cannot be empty.'); return true;
    }
}
```

**API Calls:**
| Operation | Method | URL | Payload |
|-----------|--------|-----|---------|
| Create | `POST` | `/browser/obj/<gid>/<sid>/<did>/` | JSON |
| Update | `PUT` | `/browser/obj/<gid>/<sid>/<did>/<scid>` | JSON |
| Delete | `DELETE` | `/browser/obj/<gid>/<sid>/<did>/<scid>` | - |
| Properties | `GET` | `/browser/obj/<gid>/<sid>/<did>/<scid>` | - |

### 2.2 Backend API Layer

**File:** `schemas/__init__.py`

**View Class:** `SchemaView(PGChildNodeView)` (line 245)

**Operations dict (line 307-321):**
```python
operations = dict({
    'obj': [{'get': 'properties', 'delete': 'delete', 'put': 'update'},
            {'get': 'list', 'post': 'create', 'delete': 'delete'}],
    'nodes': [{'get': 'nodes'}, {'get': 'nodes'}],
    'children': [{'get': 'children'}],
    'sql': [{'get': 'sql'}],
    'msql': [{'get': 'msql'}, {'get': 'msql'}],
    'stats': [{'get': 'statistics'}],
    'dependency': [{'get': 'dependencies'}],
    'dependent': [{'get': 'dependents'}],
})
```

**Template Path:** `schemas/{server_type}/#{version}#` (e.g., `schemas/pg/#160000#`)

**Controller Logic - `create()` (line 665-738):**
1. Parse + JSON-decode all fields (except `comment`)
2. Validate `name` is present
3. Format privileges: `self.format_request_acls(data)`
4. Render CREATE SQL from template
5. Execute: `self.conn.execute_scalar(SQL)`
6. Fetch new OID: `render_template("schemas/.../sql/oid.sql", schema=data['name'], ...)`
7. Return browser node

**Controller Logic - `update()` (line 741-776):**
1. Get SQL via `self.get_sql()` which renders update template with old vs new data
2. Execute: `self.conn.execute_scalar(SQL)`
3. Return browser node

**Controller Logic - `delete()` (line 779-841):**
1. Get name via `sql/get_name.sql`
2. Render drop SQL: `render_template("schemas/.../sql/delete.sql", name=name, cascade=self._check_cascade_operation())`
3. Execute: `self.conn.execute_scalar(SQL)`

### 1.3-1.5 (Abbreviated for Schema)

**SQL Generation:**

**CREATE SCHEMA (`schemas/pg/default/sql/create.sql`):**
```sql
CREATE SCHEMA [IF NOT EXISTS] {{ conn|qtIdent(data.name) }}
    AUTHORIZATION {{ conn|qtIdent(data.namespaceowner) }};
COMMENT ON SCHEMA {{ conn|qtIdent(data.name) }} IS {{ data.description|qtLiteral(conn) }};
-- ACL, Default Privileges, Security Labels...
```

**UPDATE SCHEMA (`schemas/pg/default/sql/update.sql`):**
```sql
ALTER SCHEMA {{ conn|qtIdent(o_data.name) }} RENAME TO {{ conn|qtIdent(data.name) }};
ALTER SCHEMA {{ conn|qtIdent(data.name) }} OWNER TO {{ conn|qtIdent(data.namespaceowner) }};
COMMENT ON SCHEMA {{ conn|qtIdent(data.name) }} IS {{ data.description|qtLiteral(conn) }};
-- GRANT/REVOKE, DEFAULT PRIVILEGES, SECURITY LABEL...
```

**DROP SCHEMA (`schemas/pg/default/sql/delete.sql`):**
```sql
DROP SCHEMA IF EXISTS {{ conn|qtIdent(name) }} [CASCADE];
```

**Database Execution:** Same pattern as Database - `self.conn.execute_scalar()` via psycopg3 connection manager.

---

## 3. Tables

### 3.1 Frontend Layer

**Files:**
- `tables/static/js/table.ui.js` → `TableSchema extends BaseUISchema`
- `tables/static/js/table.js` → Node registration

**Fields (from `table.ui.js:532-1106`):**

| Field ID | Label | Type | Group | Mode | Notes |
|----------|-------|------|-------|------|-------|
| `name` | Name | `text` | General | edit,create | `noEmpty: true` |
| `relowner` | Owner | `select` | General | edit,create | Options from `role` |
| `schema` | Schema | `select` | General | edit,create | Options from `schema` |
| `spcname` | Tablespace | `select` | General | edit,create | |
| `columns` | Columns | `collection` | Columns | edit,create | `ColumnSchema` (see §4) |
| `primary_key` | Primary Key | `collection` | Constraints | edit,create | `PrimaryKeySchema` |
| `foreign_key` | Foreign Key | `collection` | Constraints | edit,create | `ForeignKeySchema` |
| `check_constraint` | Check | `collection` | Constraints | edit,create | `CheckConstraintSchema` |
| `unique_constraint` | Unique | `collection` | Constraints | edit,create | `UniqueConstraintSchema` |
| `exclude_constraint` | Exclude | `collection` | Constraints | edit,create | `ExclusionConstraintSchema` |
| `is_partitioned` | Partitioned? | `switch` | General | edit,create | min_version: 100000 |
| `partition_type` | Partition Type | `select` | Partitions | create | range/list/hash |
| `partition_keys` | Partition Keys | `collection` | Partitions | create | `PartitionKeysSchema` |
| `partitions` | Partitions | `collection` | Partitions | edit,create | `PartitionsSchema` |
| `rlspolicy` | RLS Policy? | `switch` | Advanced | edit,create | min_version: 90600 |
| `forcerlspolicy` | Force RLS? | `switch` | Advanced | edit,create | Deps: `rlspolicy` |
| `coll_inherits` | Inherited from | `select` (multi) | Columns | edit,create | |
| `typname` | Of type | `select` | Advanced | edit,create | |
| `amname` | Access Method | `select` | Advanced | edit,create | min_version: 120000 |
| `fillfactor` | Fill factor | `int` | Advanced | edit,create | min: 10, max: 100 |
| `toast_tuple_target` | Toast tuple target | `int` | Advanced | edit,create | min: 128, min_version: 110000 |
| `parallel_workers` | Parallel workers | `int` | Advanced | edit,create | min_version: 90600 |
| `relhasoids` | Has OIDs? | `switch` | Advanced | edit,create | Disabled PG12+ |
| `relpersistence` | Unlogged? | `switch` | Advanced | edit,create | |
| `relacl` | Privileges | `collection` | Security | edit,create | `['a','r','w','d','D','x','t']` |
| `seclabels` | Security labels | `collection` | Security | edit,create | |
| `description` | Comment | `multiline` | General | edit,create | |

**Validation (from `table.ui.js:1109-1116`):**
```javascript
validate(state, setError) {
    if (state.is_partitioned && this.isNew(state) &&
        (!state.partition_keys || state.partition_keys.length <= 0)) {
        setError('partition_keys', 'Please specify at least one key for partitioned table.');
        return true;
    }
}
```

**Nested Schemas:** The Table dialog embeds sub-forms:
- `ConstraintsSchema` → PK, FK, Check, Unique, Exclusion constraints
- `ColumnSchema` → See §4
- `PartitionsSchema` → Partition definitions
- `PartitionKeysSchema` → Key column/expression definitions
- `LikeSchema` → LIKE clause options (Relation, defaults, constraints, indexes, storage, comments, compression, generated, identity, statistics)
- `VacuumSettingsSchema` → Storage parameters (autovacuum settings)

### 3.2 Backend API Layer

**File:** `tables/__init__.py` (via `schemas/tables/`)

**Operations dict (from table `__init__.py`):**
```python
operations = dict({
    'obj': [{'get': 'properties', 'delete': 'delete', 'put': 'update'},
            {'get': 'list', 'post': 'create', 'delete': 'delete'}],
    'nodes': [{'get': 'node'}, {'get': 'nodes'}],
    'sql': [{'get': 'sql'}],
    'msql': [{'get': 'msql'}, {'get': 'msql'}],
    'stats': [{'get': 'statistics'}, {'get': 'statistics'}],
    'truncate': [{'put': 'truncate'}],
    'reset': [{'delete': 'reset'}],
    'connect': [{'get': 'connect_status', 'post': 'connect', 'delete': 'disconnect'}],
    'get_inherits': [{'get': 'get_inherits'}],
    'get_oftype': [{'get': 'get_oftype'}],
    'get_table_access_methods': [{'get': 'get_table_access_methods'}],
    'get_columns': [{'get': 'get_columns'}],
    'get_collations': [{'get': 'get_collations'}],
    'get_op_class': [{'get': 'get_operator_class'}],
    'get_attach_tables': [{'get': 'get_attach_tables'}],
})
```

**Template Path:** `tables/{server_type}/#{version}#` (e.g., `tables/pg/#160000#`)

### 3.3-1.5 (Abbreviated for Tables)

**SQL Generation:** Table SQL templates handle complex DDL with nested column definitions, constraints, partitioning, and inheritance. The CREATE TABLE template generates column definitions inline, and separately adds constraints, indexes, and partitioning.

**Database Execution:** Uses `self.conn.execute_dict()` for read operations and `self.conn.execute_scalar()` for DDL. Table creation can involve multiple SQL statements (CREATE TABLE + ALTER TABLE for constraints + CREATE INDEX for indexes).

---

## 4. Columns

### 4.1 Frontend Layer

**File:** `tables/columns/static/js/column.ui.js` → `ColumnSchema extends BaseUISchema`

**Fields (from `column.ui.js:167-665`):**

| Field ID | Label | Type | Group | Notes |
|----------|-------|------|-------|-------|
| `name` | Name | `text` | General | `noEmpty: true` |
| `cltype` | Data type | `select` | Definition | Options from `get_types` API |
| `attlen` | Length/Precision | `int` | Definition | Dynamic min/max from datatype |
| `attprecision` | Scale | `int` | Definition | Dynamic min/max from datatype |
| `attcompression` | Compression | `select` | Definition | pglz/lz4, min_version: 140000 |
| `collspcname` | Collation | `select` | Definition | Disabled if non-collatable type |
| `attstattarget` | Statistics | `text` | Definition | |
| `attstorage` | Storage | `select` | Definition | PLAIN/MAIN/EXTERNAL/EXTENDED/DEFAULT(PG16+) |
| `defval` | Default | `text` | Constraints | Disabled for serial types |
| `attnotnull` | Not NULL? | `switch` | Constraints | |
| `colconstype` | Type | `toggle` | Constraints | NONE/IDENTITY/GENERATED(PG12+) |
| `attidentity` | Identity | `select` | Constraints | ALWAYS/BY DEFAULT |
| `seqincrement` | Increment | `int` | Constraints | For identity columns |
| `seqstart` | Start | `int` | Constraints | For identity columns |
| `seqmin` | Minimum | `int` | Constraints | For identity columns |
| `seqmax` | Maximum | `int` | Constraints | For identity columns |
| `seqcache` | Cache | `int` | Constraints | For identity columns |
| `seqcycle` | Cycled | `switch` | Constraints | For identity columns |
| `genexpr` | Expression | `text` | Constraints | For generated columns |
| `is_primary_key` | Primary key? | `switch` | General | Synced with PK constraint |
| `attacl` | Privileges | `collection` | Security | `['a','r','w','x']` |
| `seclabels` | Security labels | `collection` | Security | min_version: 90100 |

**Validation (from `column.ui.js:668-751`):**
- Length must be within datatype-specific range
- Scale must be within datatype-specific range
- Generated columns require expression
- Identity columns require increment, min, max, cache values
- Min must be < max; start must be within min/max range

### 4.2-1.5 (Columns Backend/SQL/Execution)

**Backend:** Columns are managed as sub-nodes of tables. Operations are part of the table's create/update flow (columns defined within the table DDL).

**SQL Generation:** Column definitions are generated inline in the CREATE TABLE template:
```sql
CREATE TABLE {{ conn|qtIdent(data.name) }} (
    {% for col in data.columns %}
    {{ conn|qtIdent(col.name) }} {{ col.cltype }}{{ '(' + col.attlen|string + ',' + col.attprecision|string + ')' if col.attlen }}
    {% if col.attnotnull %} NOT NULL{% endif %}
    {% if col.defval %} DEFAULT {{ col.defval }}{% endif %}
    {% endfor %}
);
```

ALTER COLUMN operations (add, alter type, drop) are generated via separate templates.

---

## 5. Indexes

### 5.1 Frontend Layer

**File:** `tables/indexes/static/js/index.ui.js` → `IndexSchema extends BaseUISchema`

**Fields (from `index.ui.js:432-661`):**

| Field ID | Label | Type | Group | Notes |
|----------|-------|------|-------|-------|
| `name` | Name | `text` | General | |
| `spcname` | Tablespace | `select` | General | Options from `tablespace` |
| `amname` | Access Method | `select` | Definition | Options from `get_access_methods` |
| `indisunique` | Unique? | `switch` | Definition | Disabled if not btree |
| `indnullsnotdistinct` | NULLs not distinct? | `switch` | Definition | min_version: 150000 |
| `indisclustered` | Clustered? | `switch` | Definition | |
| `isconcurrent` | Concurrent build? | `switch` | Definition | create only |
| `indconstraint` | Constraint | `sql` | Definition | SQL expression |
| `columns` | Columns/Expressions | `collection` | Columns | `IndexColumnSchema` |
| `include` | Include columns | `select` (multi) | Columns | min_version: 110000 |
| `indisonly` | Only Table? | `switch` | Definition | min_version: 110000 |
| `description` | Comment | `multiline` | General | |

**With Options (`WithSchema`):**
| Field | Depends on AM | Notes |
|-------|---------------|-------|
| `fillfactor` | btree, hash, gist, spgist | min: 10, max: 100 |
| `gin_pending_list_limit` | gin | min: 64, max: 2147483647 |
| `pages_per_range` | brin | |
| `buffering` | gist | auto/on/off |
| `deduplicate_items` | btree | min_version: 130000 |
| `fastupdate` | gin | |
| `autosummarize` | brin | |

**Index Column Schema (`IndexColumnSchema`):**
- `colname` / `expression` (toggle via `is_exp`)
- `op_class` (operator class, filtered by access method)
- `sort_order` (ASC/DESC, only editable for btree)
- `nulls` (FIRST/LAST, only editable for btree)
- `collspcname` (collation)
- `statistics` (int, -1 to 10000)

**Validation:**
- Name cannot be empty in edit mode
- Must specify at least one column/expression

### 5.2-1.5 (Index Backend/SQL/Execution)

**SQL Generation (conceptual):**
```sql
CREATE [UNIQUE] INDEX [CONCURRENTLY] {{ conn|qtIdent(data.name) }}
    ON {{ conn|qtIdent(data.tabname) }}
    {% if data.spcname %} TABLESPACE {{ conn|qtIdent(data.spcname) }}{% endif %}
    USING {{ data.amname }} (
    {% for col in data.columns %}
        {{ col.colname }} {% if col.op_class %}{{ col.op_class }}{% endif %}
        {% if col.sort_order %}DESC{% else %}ASC{% endif %}
        {% if col.nulls %}NULLS FIRST{% else %}NULLS LAST{% endif %}
        {% if col.collspcname %}COLLATE {{ conn|qtIdent(col.collspcname) }}{% endif %}
    {% endfor %}
    ) {% if data.indisunique %}UNIQUE{% endif %}
    WITH ({{ with_options }})
    {% if data.indconstraint %}WHERE {{ data.indconstraint }}{% endif %};
```

---

## 6. Views

### 6.1 Frontend Layer

**File:** `schemas/views/static/js/view.ui.js` → `ViewSchema extends BaseUISchema`

**Key Fields:**
- `name` (text, required)
- `relowner` (select from roles)
- `definition` (sql - the view query)
- `columns` (collection of column definitions)
- `security_barrier` (switch, min_version: 90200)
- `relacl` (privileges collection)
- `seclabels` (security labels)

### 6.2-1.5 (Views Backend/SQL/Execution)

**SQL Generation:**
```sql
CREATE OR REPLACE VIEW {{ conn|qtIdent(data.name) }} AS
    {{ data.definition }};
COMMENT ON VIEW {{ conn|qtIdent(data.name) }} IS {{ data.description|qtLiteral(conn) }};
GRANT ... ON VIEW {{ conn|qtIdent(data.name) }} TO {{ conn|qtIdent(priv.grantee) }};
```

**DROP:**
```sql
DROP VIEW IF EXISTS {{ conn|qtIdent(name) }} [CASCADE];
```

---

## 7. Materialized Views

### 7.1 Frontend Layer

**File:** `schemas/views/static/js/mview.ui.js` → `MViewSchema extends BaseUISchema`

**Key Fields:**
- `name` (text, required)
- `relowner` (select from roles)
- `definition` (sql - the query)
- `columns` (collection)
- `spcname` (tablespace)
- `relacl` (privileges)
- `seclabels` (security labels)

**Additional operations vs Views:** `REFRESH MATERIALIZED VIEW [CONCURRENTLY]`

### 7.2-1.5 (MView Backend/SQL/Execution)

**SQL Generation:**
```sql
CREATE MATERIALIZED VIEW {{ conn|qtIdent(data.name) }}
    {% if data.spcname %}TABLESPACE {{ conn|qtIdent(data.spcname) }}{% endif %}
    AS {{ data.definition }}
    {% if data.with_data is defined %}WITH [NO] DATA{% endif %};
```

**Refresh:**
```sql
REFRESH MATERIALIZED VIEW [CONCURRENTLY] {{ conn|qtIdent(name) }};
```

---

## 8. Functions/Procedures

### 8.1 Frontend Layer

**File:** `schemas/functions/static/js/function.ui.js` → `FunctionSchema extends BaseUISchema`

**Key Fields:**
- `name` (text, required)
- `lanname` (select - language: plpgsql, sql, plpython, etc.)
- `prokind` (select - function/procedure/aggregate/window, min_version: 110000)
- `prorettype` (select - return type)
- `proretset` (switch - set return?)
- `volatility` (select - volatile/stable/immutable)
- `parallel` (select - unsafe/restricted/safe, min_version: 90600)
- `proleakproof` (switch, min_version: 90200)
- `prosecdef` (switch - security definer)
- `proargs` (collection - arguments with name, type, mode, default, INOUT)
- `prosrc` (sql - function body)
- `proconfig` (collection - configuration parameters)
- `proacl` (privileges)
- `seclabels` (security labels)
- `description` (comment)

### 8.2-1.5 (Function Backend/SQL/Execution)

**SQL Generation:**
```sql
CREATE OR REPLACE FUNCTION {{ conn|qtIdent(data.name) }}({{ args }})
    RETURNS {{ return_type }}
    LANGUAGE {{ conn|qtIdent(data.lanname) }}
    {{ data.volatility }}
    {{ 'LEAKPROOF' if data.proleakproof }}
    {{ 'SECURITY DEFINER' if data.prosecdef }}
    {{ 'PARALLEL ' + data.parallel }}
    AS {{ data.prosrc|qtLiteral(conn) }};
```

**DROP:**
```sql
DROP FUNCTION [IF EXISTS] {{ conn|qtIdent(name) }}({{ arg_types }}) [CASCADE];
```

---

## 9. Triggers

### 9.1 Frontend Layer

**File:** `tables/triggers/static/js/trigger.ui.js` → `TriggerSchema extends BaseUISchema`

**Key Fields:**
- `name` (text, required)
- `tgamn` (select - trigger function)
- `tgtype` (multi-checkbox - timing: BEFORE/AFTER/INSTEAD OF + event: INSERT/UPDATE/DELETE/TRUNCATE)
- `tgeach` (switch - FOR EACH ROW/STATEMENT)
- `tgdeferrable` (switch, min_version: 90000)
- `tginitdeferred` (switch, min_version: 90000)
- `tgnargs` / `tgarargs` (args collection)
- `tgwhen` (sql - WHEN condition)
- `tgconnname` (text - event trigger name)
- `description` (comment)
- `disabled` (switch)

### 9.2-1.5 (Trigger Backend/SQL/Execution)

**SQL Generation:**
```sql
CREATE TRIGGER {{ conn|qtIdent(data.name) }}
    {{ timing }} {{ events }}
    ON {{ conn|qtIdent(data.tbl_name) }}
    {% if data.tgeach %}FOR EACH ROW{% else %}FOR EACH STATEMENT{% endif %}
    {% if data.tgdeferrable %}DEFERRABLE{% endif %}
    {% if data.tginitdeferred %}INITIALLY DEFERRED{% endif %}
    {% if data.tgwhen %}WHEN ({{ data.tgwhen }}){% endif %}
    EXECUTE PROCEDURE {{ conn|qtIdent(data.tgamn) }}({{ args }});
```

**DROP:**
```sql
DROP TRIGGER [IF EXISTS] {{ conn|qtIdent(name) }} ON {{ conn|qtIdent(tbl_name) }} [CASCADE];
```

---

## 10. Sequences

### 10.1 Frontend Layer

**File:** `schemas/sequences/static/js/sequence.ui.js` → `SequenceSchema extends BaseUISchema`

**Key Fields:**
- `name` (text, required)
- `relowner` (select from roles)
- `spcname` (select - tablespace)
- `sequencetype` (select - smallint/int/bigint)
- `seqstart` (int - START WITH)
- `seqincrement` (int - INCREMENT BY)
- `seqmin` (int - MINVALUE)
- `seqmax` (int - MAXVALUE)
- `seqcache` (int - CACHE)
- `seqcycle` (switch - CYCLE)
- `increment` (int - owned by column)
- `relacl` (privileges)
- `seclabels` (security labels)
- `description` (comment)

### 10.2-1.5 (Sequence Backend/SQL/Execution)

**SQL Generation:**
```sql
CREATE SEQUENCE {{ conn|qtIdent(data.name) }}
    {% if data.sequencetype %}AS {{ data.sequencetype }}{% endif %}
    START WITH {{ data.seqstart }}
    INCREMENT BY {{ data.seqincrement }}
    {% if data.seqmin is not none %}MINVALUE {{ data.seqmin }}{% else %}NO MINVALUE{% endif %}
    {% if data.seqmax is not none %}MAXVALUE {{ data.seqmax }}{% else %}NO MAXVALUE{% endif %}
    CACHE {{ data.seqcache }}
    {% if data.seqcycle %}CYCLE{% else %}NO CYCLE{% endif %};
```

**DROP:**
```sql
DROP SEQUENCE [IF EXISTS] {{ conn|qtIdent(name) }} [CASCADE];
```

---

## 11. Foreign Tables

### 11.1 Frontend Layer

**File:** `schemas/foreign_tables/static/js/foreign_table.ui.js` → `ForeignTableSchema extends BaseUISchema`

**Key Fields:**
- `name` (text, required)
- `relowner` (select from roles)
- `schema` (select from schemas)
- `server` (select - foreign server name)
- `fdwname` (text - FDW name, readonly)
- `columns` (collection - column definitions with column_name, type_name)
- `options` (collection - key-value server options)
- `description` (comment)

### 11.2-1.5 (Foreign Table Backend/SQL/Execution)

**SQL Generation:**
```sql
CREATE FOREIGN TABLE {{ conn|qtIdent(data.schema) }}.{{ conn|qtIdent(data.name) }} (
    {% for col in data.columns %}
    {{ conn|qtIdent(col.column_name) }} {{ col.type_name }}
    {% if not loop.last %},{% endif %}
    {% endfor %}
)
    SERVER {{ conn|qtIdent(data.server) }}
    {% if data.options %}OPTIONS ({% for opt in data.options %}{{ conn|qtIdent(opt.name) }} {{ opt.value|qtLiteral(conn) }}{% if not loop.last %}, {% endif %}{% endfor %}){% endif %};
```

**DROP:**
```sql
DROP FOREIGN TABLE [IF EXISTS] {{ conn|qtIdent(schema) }}.{{ conn|qtIdent(name) }} [CASCADE];
```

---

## 12. Types

### 12.1 Frontend Layer

**File:** `schemas/types/static/js/type.ui.js` → `TypeSchema extends BaseUISchema`

**Key Fields:**
- `name` (text, required)
- `type` (select - composite, enum, range, domain, etc.)
- **Composite type fields:** `columns` collection (column_name, type)
- **Enum type fields:** `enum_values` collection (label)
- **Range type fields:** `subtype` (select), `opclass` (select), `multirange_type`
- **Domain type fields:** `basetype` (select), `not_null` (switch), `default`, `collation`, `check_constraints`
- `spcname` (tablespace for composite)
- `description` (comment)

### 12.2-1.5 (Type Backend/SQL/Execution)

**SQL Generation - Composite:**
```sql
CREATE TYPE {{ conn|qtIdent(data.name) }} AS (
    {% for col in data.columns %}
    {{ conn|qtIdent(col.column_name) }} {{ col.type_name }}
    {% if not loop.last %},{% endif %}
    {% endfor %}
);
```

**SQL Generation - Enum:**
```sql
CREATE TYPE {{ conn|qtIdent(data.name) }} AS ENUM (
    {% for val in data.enum_values %}
    {{ val.label|qtLiteral(conn) }}
    {% if not loop.last %},{% endif %}
    {% endfor %}
);
```

**SQL Generation - Domain:**
```sql
CREATE DOMAIN {{ conn|qtIdent(data.name) }} AS {{ data.basetype }}
    {% if data.default %}DEFAULT {{ data.default }}{% endif %}
    {% if data.not_null %}NOT NULL{% endif %}
    {% if data.collation %}COLLATE {{ conn|qtIdent(data.collation) }}{% endif %}
    {% for check in data.check_constraints %}
    CONSTRAINT {{ conn|qtIdent(check.name) }} CHECK ({{ check.consrc }})
    {% endfor %};
```

**DROP:**
```sql
DROP TYPE [IF EXISTS] {{ conn|qtIdent(name) }} [CASCADE];
```

---

## 13. Extensions

### 13.1 Frontend Layer

**File:** `extensions/static/js/extension.ui.js` → `ExtensionSchema extends BaseUISchema`

**Fields (simplest object):**
- `name` (select - available extensions from `pg_available_extensions`)
- `schema` (select - target schema)
- `version` (select - available versions)
- `cascade` (switch - CASCADE?)
- `description` (comment)

### 13.2-1.5 (Extension Backend/SQL/Execution)

**SQL Generation:**
```sql
CREATE EXTENSION IF NOT EXISTS {{ conn|qtIdent(data.name) }}
    {% if data.schema %}SCHEMA {{ conn|qtIdent(data.schema) }}{% endif %}
    {% if data.version %}VERSION {{ data.version|qtLiteral(conn) }}{% endif %}
    {% if data.cascade %}CASCADE{% endif %};
```

**DROP:**
```sql
DROP EXTENSION [IF EXISTS] {{ conn|qtIdent(name) }} [CASCADE];
```

**Backend:** `extensions/__init__.py` - Simple module with `get_extensions` API to populate the dropdown from `pg_available_extensions`.

---

## 14. Policies (Row Level Security)

### 14.1 Frontend Layer

**File:** `tables/row_security_policies/static/js/row_security_policy.ui.js` → `RowSecurityPolicySchema extends BaseUISchema`

**Key Fields:**
- `name` (text, required)
- `tabloid` (select - table, auto-set from context)
- `policy_type` (select - ALL/SELECT/INSERT/UPDATE/DELETE)
- `roles` (select multi - applicable roles)
- `qual` (sql - USING expression)
- `with_check` (sql - WITH CHECK expression)
- `permissive` (select - PERMISSIVE/RESTRICTIVE, min_version: 90500)
- `cmd` (select - ALL/SELECT/INSERT/UPDATE/DELETE)

### 14.2-1.5 (Policy Backend/SQL/Execution)

**SQL Generation:**
```sql
CREATE POLICY {{ conn|qtIdent(data.name) }} ON {{ conn|qtIdent(data.tbl_name) }}
    {% if data.permissive %}AS {{ data.permissive }}{% endif %}
    FOR {{ data.policy_type }}
    {% if data.roles %}TO {{ roles | join(', ') }}{% endif %}
    {% if data.qual %}USING ({{ data.qual }}){% endif %}
    {% if data.with_check %}WITH CHECK ({{ data.with_check }}){% endif %};
```

**ALTER POLICY:**
```sql
ALTER POLICY {{ conn|qtIdent(data.name) }} ON {{ conn|qtIdent(data.tbl_name) }}
    RENAME TO {{ conn|qtIdent(data.new_name) }};
    -- or change USING/WITH CHECK/roles
```

**DROP:**
```sql
DROP POLICY [IF EXISTS] {{ conn|qtIdent(name) }} ON {{ conn|qtIdent(tbl_name) }};
```

---

## 15. Roles/Users

### 15.1 Frontend Layer

**File:** `server_groups/servers/roles/static/js/role.ui.js` → `RoleSchema extends BaseUISchema`

**Key Fields:**
- `name` (text, required)
- `rolsuper` (switch - superuser)
- `rolinherit` (switch - inherit privileges, default true)
- `rolcreaterole` (switch - create roles)
- `rolcreatedb` (switch - create databases)
- `rolcanlogin` (switch - can login)
- `rolreplication` (switch - replication)
- `rolbypassrls` (switch - bypass RLS, min_version: 90500)
- `rolconnlimit` (int - connection limit, -1 for unlimited)
- `rolvaliduntil` (datetime - password expiration)
- `rolpassword` (password field)
- `rolconfig` (collection - configuration parameters)
- `members` (collection - roles this role is a member of)
- `description` (comment)

### 15.2-1.5 (Role Backend/SQL/Execution)

**SQL Generation - CREATE:**
```sql
CREATE ROLE {{ conn|qtIdent(data.name) }}
    WITH
    {% if data.rolsuper %}SUPERUSER{% endif %}
    {% if data.rolinherit %}INHERIT{% endif %}
    {% if data.rolcreaterole %}CREATEROLE{% endif %}
    {% if data.rolcreatedb %}CREATEDB{% endif %}
    {% if data.rolcanlogin %}LOGIN{% endif %}
    {% if data.rolreplication %}REPLICATION{% endif %}
    {% if data.rolbypassrls %}BYPASSRLS{% endif %}
    {% if data.rolconnlimit is not none %}CONNECTION LIMIT {{ data.rolconnlimit }}{% endif %}
    {% if data.rolvaliduntil %}VALID UNTIL {{ data.rolvaliduntil|qtLiteral(conn) }}{% endif %}
    {% if data.rolpassword %}PASSWORD {{ data.rolpassword|qtLiteral(conn) }}{% endif %};
```

**SQL Generation - ALTER:**
```sql
ALTER ROLE {{ conn|qtIdent(data.name) }}
    [WITH] {options};
ALTER ROLE {{ conn|qtIdent(data.name) }} RENAME TO {{ conn|qtIdent(data.new_name) }};
ALTER ROLE {{ conn|qtIdent(data.name) }} PASSWORD {{ data.rolpassword|qtLiteral(conn) }};
```

**SQL Generation - GRANT/REVOKE:**
```sql
GRANT {{ conn|qtIdent(member_role) }} TO {{ conn|qtIdent(data.name) }} [WITH ADMIN OPTION];
REVOKE {{ conn|qtIdent(member_role) }} FROM {{ conn|qtIdent(data.name) }};
```

**SQL Generation - DROP:**
```sql
DROP ROLE [IF EXISTS] {{ conn|qtIdent(name) }};
```

---

## Cross-Cutting Concerns

### Error Handling Pattern (All Objects)

**Backend:**
```python
# Connection setup
self.manager = get_driver(PG_DEFAULT_DRIVER).connection_manager(sid)
self.conn = self.manager.connection(did=kwargs['did'])

# SQL execution
status, result = self.conn.execute_scalar(SQL)
if not status:
    return internal_server_error(errormsg=result)  # HTTP 500

# Not found
if len(res['rows']) == 0:
    return gone(self.not_found_error_msg())  # HTTP 410

# Missing required param
return make_json_response(status=410, success=0,
    errormsg=_("Could not find the required parameter ({})").format(arg))
```

**Frontend:**
```javascript
api.post(url, data)
    .then(({data: res}) => {
        if (res.success == 1) { /* success */ }
    })
    .catch((error) => {
        pgAdmin.Browser.notifier.pgNotifier('error', error, 'Error');
    });
```

### Identifier Quoting (All Objects)

All PostgreSQL identifiers are quoted using `conn|qtIdent()`:
- Double-quotes reserved words: `"user"`, `"order"`, `"select"`
- Preserves case: `"MyTable"` stays `"MyTable"`
- Escapes embedded double-quotes: `"table""name"`

All literal values are quoted using `|qtLiteral(conn)`:
- Strings: `'value'`
- Numbers: `123`
- Booleans: `true`/`false`
- NULL: `NULL`

### Version-Aware Template Resolution

The `#{version}#` pattern in template paths resolves as follows:
1. For PG version 160000: tries `17_plus/` → `16_plus/` → `15_plus/` → `default/`
2. First matching directory wins
3. Version-specific templates override defaults

### Transaction Handling

- DDL statements (CREATE/ALTER/DROP) are executed individually - PostgreSQL auto-commits DDL
- Config DB changes (e.g., schema restrictions) use `db.session.commit()`
- Error rollback handled by SQLAlchemy transaction management
- No explicit `BEGIN`/`COMMIT` wrappers around DDL

### Connection Management

- `self.manager.connection(did=X)` - database-specific connection
- `self.manager.connection()` - generic server connection (used for DROP DATABASE)
- `self.manager.release(did=X)` - release specific connection
- `conn_id='db_offline_update'` - named connection for offline operations
- Auto-reconnect available: `auto_reconnect=True`
