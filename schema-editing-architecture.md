# phpMyAdmin Schema Editing Architecture

Complete documentation of how the frontend and backend work for all database schema editing operations: databases, tables, columns, indexes, foreign keys, views, triggers, events, stored procedures/functions, and partitioning.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Operations](#2-database-operations)
3. [Table Operations](#3-table-operations)
4. [Column Operations](#4-column-operations)
5. [Index Operations](#5-index-operations)
6. [Foreign Key Operations](#6-foreign-key-operations)
7. [View Operations](#7-view-operations)
8. [Stored Procedures & Functions](#8-stored-procedures--functions)
9. [Trigger Operations](#9-trigger-operations)
10. [Event Operations](#10-event-operations)
11. [Partitioning](#11-partitioning)
12. [Validation Summary](#12-validation-summary)
13. [Complete SQL Output Examples](#13-complete-sql-output-examples)

---

## 1. Architecture Overview

### 1.1 No Centralized Query Builder

phpMyAdmin does **not** use a centralized SQL builder or query generator pattern. DDL SQL is assembled through **string concatenation** distributed across many classes:

| Class | File | Responsibility |
|-------|------|----------------|
| `CreateAddField` | `src/CreateAddField.php` | CREATE TABLE, ALTER TABLE ADD COLUMN |
| `Table::generateFieldSpec()` | `src/Table/Table.php:418` | Single column definition SQL fragment |
| `Table::generateAlter()` | `src/Table/Table.php:739` | ALTER TABLE CHANGE clause |
| `Table::updateForeignKeys()` | `src/Table/Table.php:1472` | Foreign key DROP/ADD |
| `Indexes::getSqlQueryForIndexCreateOrEdit()` | `src/Table/Indexes.php:39` | Index CREATE/EDIT SQL |
| `Query\Generator` | `src/Query/Generator.php` | Static SQL fragment factory |
| `Database\Routines::getQueryFromRequest()` | `src/Database/Routines.php:791` | Procedure/Function CREATE SQL |
| `Database\Events::getQueryFromRequest()` | `src/Database/Events.php:258` | Event CREATE SQL |
| `Triggers\Triggers::getQueryFromRequest()` | `src/Triggers/Triggers.php:182` | Trigger CREATE SQL |
| `Operations::getTableAltersArray()` | `src/Operations.php:625` | Table options ALTER |
| `View\CreateController::getSqlQuery()` | `src/Controllers/View/CreateController.php:245` | View CREATE/ALTER SQL |

### 1.2 Controller Pattern

All controllers follow the same invocable pattern:

```php
#[Route('/path', ['POST'])]
final readonly class SomeController implements InvocableController
{
    public function __construct(/* dependencies */) {}

    public function __invoke(ServerRequest $request): Response
    {
        // 1. Read $_POST data
        // 2. Validate inputs
        // 3. Build SQL string
        // 4. Execute via $this->dbi->tryQuery()
        // 5. Return response
    }
}
```

### 1.3 Request Lifecycle

```
HTTP POST → Routing (#[Route]) → Controller::__invoke()
  → Read $_POST data
  → Validate (inline, ad-hoc)
  → Build SQL string (concatenation in service classes)
  → Optional: Preview (if $_POST['preview_sql'])
  → Execute: $this->dbi->tryQuery($sql)
  → On success: Message::success(), update relations/MIME
  → On error: Message::error(), optional rollback
  → Response
```

### 1.4 Identifier Escaping

- Identifiers: `Util::backquote($name)` → `` `name` ``
- String values: `$this->dbi->quoteString($value)` → `'escaped_value'`

---

## 2. Database Operations

### 2.1 Create Database

**Controller**: `src/Controllers/Server/Databases/CreateController.php`
**Route**: `POST /server/databases/create`

#### POST Fields

| Field | Type | Description |
|-------|------|-------------|
| `new_db` | string | Database name (required, non-empty) |
| `db_collation` | string\|null | Collation like `utf8mb4_unicode_ci` (optional) |

#### Validation

- `$newDb === ''` → error
- If `$this->dbi->getLowerCaseNames() === 1`, name is lowercased
- Collation validated against `Charsets::getCharsets()` and `Charsets::getCollations()`
- Charset extracted by splitting collation on `_` (e.g., `utf8mb4_unicode_ci` → charset `utf8mb4`)

#### SQL Generation

```php
// src/Controllers/Server/Databases/CreateController.php:57
$sqlQuery = 'CREATE DATABASE ' . Util::backquote($newDb);

// If collation provided and valid:
$sqlQuery .= ' DEFAULT' . Util::getCharsetQueryPart($dbCollation);

$sqlQuery .= ';';
```

#### Complete SQL Output

```sql
-- Without collation:
CREATE DATABASE `my_database`;

-- With collation:
CREATE DATABASE `my_database` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## 3. Table Operations

### 3.1 Create Table

**Controller**: `src/Controllers/Table/CreateController.php`
**Route**: `GET|POST /table/create`

#### POST Fields

| Field | Type | Description |
|-------|------|-------------|
| `do_save_data` | flag | Must be set to trigger save |
| `field_name[N]` | string[] | Column names |
| `field_type[N]` | string[] | Data types (INT, VARCHAR, etc.) |
| `field_length[N]` | string[] | Lengths/values (e.g., `255`, `10,2`) |
| `field_attribute[N]` | string[] | UNSIGNED, BINARY, etc. |
| `field_collation[N]` | string[] | Collation per column |
| `field_null[N]` | string[] | `YES` or `NO` |
| `field_default_type[N]` | string[] | NONE, USER_DEFINED, NULL, CURRENT_TIMESTAMP, UUID |
| `field_default_value[N]` | string[] | Default value for USER_DEFINED |
| `field_extra[N]` | string[] | `AUTO_INCREMENT` or empty |
| `field_comments[N]` | string[] | Column comments |
| `field_virtuality[N]` | string[] | VIRTUAL or STORED |
| `field_expression[N]` | string[] | Virtual column expression |
| `primary_indexes` | JSON | Primary key definitions |
| `indexes` | JSON | INDEX definitions |
| `unique_indexes` | JSON | UNIQUE definitions |
| `fulltext_indexes` | JSON | FULLTEXT definitions |
| `spatial_indexes` | JSON | SPATIAL definitions |
| `tbl_storage_engine` | string | Storage engine (InnoDB, MyISAM, etc.) |
| `tbl_collation` | string | Table collation |
| `connection` | string | FEDERATED connection string |
| `comment` | string | Table comment |
| `partition_by` | string | RANGE, LIST, HASH, KEY |
| `partition_expr` | string | Partition expression |
| `partition_count` | int | Number of partitions |
| `partitions[]` | array | Individual partition definitions |

#### SQL Generation

**Entry point**: `CreateAddField::getTableCreationQuery($db, $table)` at `src/CreateAddField.php:375`

```
1. getColumnCreationStatements(isCreateTable=true)
   → buildColumnCreationStatement() → Table::generateFieldSpec() per column
   → buildIndexStatement() per index type
   → Join with ", "
2. Wrap: CREATE TABLE `db`.`table` (...)
3. Append: ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = ...
4. Append: COMMENT = '...'
5. Append: PARTITION BY ... PARTITIONS N
6. Terminate: ;
```

#### Complete SQL Output

```sql
CREATE TABLE `my_database`.`users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` TINYINT(1) NOT NULL DEFAULT 1,
  `profile` JSON DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_email` (`email`),
  UNIQUE INDEX `uniq_email` (`email`)
) ENGINE = InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT = 'User accounts';
```

---

## 4. Column Operations

### 4.1 Add Column to Existing Table

**Controller**: `src/Controllers/Table/AddFieldController.php`
**Route**: `GET|POST /table/add-field`

#### Additional POST Fields

| Field | Type | Description |
|-------|------|-------------|
| `field_where` | string | `first`, `last`, or empty (for position) |
| `after_field` | string | Column name to insert after |
| `online_transaction` | flag | Enable ALGORITHM=INPLACE, LOCK=NONE |

#### SQL Generation

**Entry point**: `CreateAddField::getColumnCreationQuery($table)` at `src/CreateAddField.php:420`

```
1. getColumnCreationStatements(isCreateTable=false)
   → Each column prefixed with "ADD "
   → Position suffix: FIRST, AFTER `col`, or nothing
2. ALTER TABLE `table` ADD col_def1, ADD col_def2, ... [, ALGORITHM=INPLACE, LOCK=NONE];
```

#### Position Suffix Logic

```
setColumnCreationStatementSuffix($previousField, $isCreateTable):
  - CREATE TABLE: no suffix (just space)
  - ALTER TABLE ADD + field_where='last': no suffix
  - ALTER TABLE ADD + field_where='first': " FIRST"
  - ALTER TABLE ADD + after_field set: " AFTER `colname`"
  - Subsequent columns: " AFTER `previous_colname`"
```

#### Complete SQL Output

```sql
-- Add at end:
ALTER TABLE `users` ADD `phone` VARCHAR(20) DEFAULT NULL;

-- Add at first position:
ALTER TABLE `users` ADD `id` INT NOT NULL AUTO_INCREMENT FIRST;

-- Add after specific column:
ALTER TABLE `users` ADD `email` VARCHAR(255) NOT NULL AFTER `name`;

-- Add multiple columns:
ALTER TABLE `users` ADD `phone` VARCHAR(20), ADD `address` TEXT;

-- With online DDL:
ALTER TABLE `users` ADD `phone` VARCHAR(20), ALGORITHM=INPLACE, LOCK=NONE;
```

### 4.2 Edit Column (Structure Save)

**Controller**: `src/Controllers/Table/Structure/SaveController.php`
**Route**: `POST /table/structure/save`

#### POST Fields

Same as column creation, plus `_orig` variants for change detection:

| Field | Type | Description |
|-------|------|-------------|
| `field_orig[N]` | string[] | Original column name |
| `field_type_orig[N]` | string[] | Original type |
| `field_length_orig[N]` | string[] | Original length |
| `field_attribute_orig[N]` | string[] | Original attribute |
| `field_collation_orig[N]` | string[] | Original collation |
| `field_null_orig[N]` | string[] | Original null setting |
| `field_default_type_orig[N]` | string[] | Original default type |
| `field_default_value_orig[N]` | string[] | Original default value |
| `field_extra_orig[N]` | string[] | Original extra |
| `field_comments_orig[N]` | string[] | Original comment |
| `field_virtuality_orig[N]` | string[] | Original virtuality |
| `field_move_to[N]` | string[] | New position for column |

#### Change Detection

`SaveController::columnNeedsAlterTable($i)` at `src/Controllers/Table/Structure/SaveController.php:338`:

Compares each `field_*[$i]` against `field_*_orig[$i]` for:
- `field_name` vs `field_orig`
- `field_attribute`, `field_collation`, `field_comments`
- `field_default_value`, `field_default_type`
- `field_extra`, `field_length`, `field_null`
- `field_type`, `field_virtuality`
- Plus `field_move_to[$i]` (non-empty = change)

Only columns with actual changes get `ALTER TABLE ... CHANGE` clauses.

#### SQL Generation

```php
// SaveController.php:90
$changes[] = 'CHANGE ' . Table::generateAlter(
    $_POST['field_orig'][$i],      // old column name
    $_POST['field_name'][$i],      // new column name
    $_POST['field_type'][$i],      // type
    $_POST['field_length'][$i],    // length
    $_POST['field_attribute'][$i], // attribute
    $_POST['field_collation'][$i], // collation
    $_POST['field_null'][$i],      // null
    $_POST['field_default_type'][$i],  // default type
    $_POST['field_default_value'][$i], // default value
    $_POST['field_extra'][$i],     // extra
    $_POST['field_comments'][$i],  // comment
    $_POST['field_virtuality'][$i],    // virtuality
    $_POST['field_expression'][$i],    // expression
    $_POST['field_move_to'][$i],   // move position
    $columnsWithIndex,
);

// Final assembly:
$sqlQuery = 'ALTER TABLE `table` '
    . implode(', ', $changes)
    . $keyQuery
    . ';';
```

#### Collation Change Special Handling

When changing column collation, `SaveController` (line 180-215):
1. First converts text columns to BLOB type (`BLOB`, `MEDIUMBLOB`, or `LONGBLOB`)
2. Then applies the main ALTER TABLE with the desired changes
3. On failure, reverts BLOB columns back to original type

```sql
-- Step 1: Convert to BLOB (preserves data)
ALTER TABLE `users` CHANGE `name` `name` BLOB;

-- Step 2: Apply the real change
ALTER TABLE `users` CHANGE `name` `name` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;
```

#### Complete SQL Output

```sql
-- Single column change:
ALTER TABLE `users` CHANGE `name` `name` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unknown';

-- Rename + change type:
ALTER TABLE `users` CHANGE `name` `full_name` VARCHAR(200) NOT NULL;

-- Move column position:
ALTER TABLE `users` CHANGE `email` `email` VARCHAR(255) NOT NULL AFTER `full_name`;

-- Multiple changes:
ALTER TABLE `users` CHANGE `name` `name` VARCHAR(200) NOT NULL, CHANGE `email` `email` VARCHAR(255) NOT NULL AFTER `name`;

-- With online DDL:
ALTER TABLE `users` CHANGE `name` `name` VARCHAR(200) NOT NULL, ALGORITHM=INPLACE, LOCK=NONE;
```

### 4.3 Drop Column

**Controller**: `src/Controllers/Table/DropColumnController.php`
**Route**: `POST /table/structure/drop`

#### POST Fields

| Field | Type | Description |
|-------|------|-------------|
| `selected[]` | string[] | Array of column names to drop |

#### SQL Generation

```php
// DropColumnController.php:48
$statement = 'ALTER TABLE ' . Util::backquote(Current::$table);
foreach ($selected as $field) {
    $statement .= ' DROP ' . Util::backquote($field);
}
$statement .= ';';
```

#### Complete SQL Output

```sql
ALTER TABLE `users` DROP `phone`, DROP `address`;
```

### 4.4 Move Columns (Reorder)

**Controller**: `src/Controllers/Table/Structure/MoveColumnsController.php`
**Route**: `POST /table/structure/move-columns`

Parses `SHOW CREATE TABLE` with the SQL Parser, reorders the `CreateDefinition[]` array, then generates `ALTER TABLE ... CHANGE` statements with `FIRST` or `AFTER` positioning.

#### Complete SQL Output

```sql
ALTER TABLE `users` CHANGE `email` `email` VARCHAR(255) NOT NULL AFTER `name`,
  CHANGE `status` `status` TINYINT(1) NOT NULL DEFAULT 1 FIRST;
```

### 4.5 Column Definition SQL Generator (`Table::generateFieldSpec`)

**File**: `src/Table/Table.php:418`

This is the **core method** that generates a single column definition. It is used by both CREATE TABLE and ALTER TABLE.

#### Parameters

```php
Table::generateFieldSpec(
    name: string,          // Column name
    type: string,          // Data type (INT, VARCHAR, etc.)
    length: string,        // Length (e.g., "255", "10,2", "")
    attribute: string,     // UNSIGNED, BINARY, etc.
    collation: string,     // e.g., "utf8mb4_unicode_ci"
    null: bool|string,     // "YES" (nullable) or "NO" (NOT NULL) or false
    defaultType: string,   // USER_DEFINED, NULL, CURRENT_TIMESTAMP, UUID, NONE
    defaultValue: string,  // Actual default value
    extra: string,         // AUTO_INCREMENT, on update CURRENT_TIMESTAMP, etc.
    comment: string,       // Column comment
    virtuality: string,    // VIRTUAL, STORED, or ""
    expression: string,    // Virtual column expression
    moveTo: string,        // "-first" or "colname" for positioning
    columnsWithIndex: array, // Columns that have indexes
    oldColumnName: string, // For ALTER TABLE: original column name
): string
```

#### SQL Generation Logic

```
1. Type + Length:
   `name` TYPE(length)
   - Skips length for: DATE, TINYBLOB, TINYTEXT, BLOB, TEXT, MEDIUMBLOB,
     MEDIUMTEXT, LONGBLOB, LONGTEXT, SERIAL, BOOLEAN, UUID, JSON

2. Attribute:
   Appends: BINARY, UNSIGNED, UNSIGNED ZEROFILL,
   on update CURRENT_TIMESTAMP, COMPRESSED=zlib

3. Collation (text types only):
   CHARACTER SET charset COLLATE collation
   - MariaDB virtual columns: version-specific collation handling

4. Virtual Column:
   AS (expression) VIRTUAL|STORED

5. NULL/NOT NULL:
   NULL or NOT NULL (skipped for virtual columns on older MariaDB)

6. Default Value:
   USER_DEFINED:
     - TIMESTAMP + "0" → DEFAULT 0
     - TIMESTAMP + quoted datetime → DEFAULT '2024-01-01 00:00:00'
     - BIT → DEFAULT b'01010'
     - BOOLEAN → DEFAULT TRUE / DEFAULT FALSE
     - BINARY/VARBINARY → DEFAULT 0x...
     - unix_timestamp() → DEFAULT unix_timestamp()
     - CURRENT_TIMESTAMP(...) → DEFAULT CURRENT_TIMESTAMP(length)
     - Other → DEFAULT 'escaped_value'
   NULL → DEFAULT NULL (only if nullable)
   CURRENT_TIMESTAMP → DEFAULT CURRENT_TIMESTAMP[(length)]
   UUID → DEFAULT uuid()
   NONE → (no default clause)

7. Extra:
   AUTO_INCREMENT (stripped from virtual columns)

8. Comment:
   COMMENT 'text'

9. Move Position:
   FIRST or AFTER `column`

10. Auto Primary Key:
    If extra is set and column not in existing indexes:
    , ADD PRIMARY KEY (`name`)
```

---

## 5. Index Operations

### 5.1 Quick Add Index (from Structure Page)

**Base Controller**: `src/Controllers/Table/Structure/AbstractIndexController.php`

| Controller | Route | Index Type |
|-----------|-------|------------|
| `PrimaryController` | `POST /table/structure/primary` | PRIMARY KEY |
| `AddIndexController` | `POST /table/structure/index` | INDEX |
| `UniqueController` | `POST /table/structure/unique` | UNIQUE |
| `FulltextController` | `POST /table/structure/fulltext` | FULLTEXT |
| `SpatialController` | `POST /table/structure/spatial` | SPATIAL |
| `AddKeyController` | `POST /table/structure/add-key` | Any (via `key_type` param) |

#### POST Fields

| Field | Type | Description |
|-------|------|-------------|
| `selected_fld[]` | string[] | Column names to index |

#### SQL Generation

```php
// Query\Generator::getAddIndexSql() at src/Query/Generator.php:449
'ALTER TABLE `table` ADD INDEX(`col1`, `col2`);'

// Query\Generator::getAddPrimaryKeyStatement() at src/Query/Generator.php:456
// If existing primary key:
'ALTER TABLE `table` DROP PRIMARY KEY, ADD PRIMARY KEY(`col`);'
// If no existing primary key:
'ALTER TABLE `table` ADD PRIMARY KEY(`col`);'
```

#### Complete SQL Output

```sql
ALTER TABLE `users` ADD PRIMARY KEY(`id`);
ALTER TABLE `users` ADD INDEX(`email`);
ALTER TABLE `users` ADD UNIQUE(`email`);
ALTER TABLE `users` ADD FULLTEXT(`content`);
ALTER TABLE `users` ADD SPATIAL(`location`);
ALTER TABLE `users` DROP PRIMARY KEY, ADD PRIMARY KEY(`id`, `name`);
```

### 5.2 Full Index Edit/Create

**Controller**: `src/Controllers/Table/IndexesController.php`
**Route**: `GET|POST /table/indexes`

#### POST Fields

| Field | Type | Description |
|-------|------|-------------|
| `create_edit_table` | flag | Indicates form submission |
| `old_index_name` | string | Previous name (for rename) |
| `index[Key_name]` | string | Index name |
| `index[Index_choice]` | string | PRIMARY, UNIQUE, INDEX, FULLTEXT, SPATIAL |
| `index[columns][N][col_index]` | int | Column index |
| `index[columns][N][size]` | int | Sub-part length |
| `index[columns][N][collation]` | string | A (ASC), D (DESC), or empty |
| `index[Key_block_size]` | int | Key block size |
| `index[Index_type]` | string | BTREE, HASH, or RTREE |
| `index[Parser]` | string | FULLTEXT parser (e.g., ngram) |
| `index[Index_comment]` | string | Index comment |

#### SQL Generation

**Entry point**: `Indexes::getSqlQueryForIndexCreateOrEdit()` at `src/Table/Indexes.php:39`

```
1. ALTER TABLE `db`.`table`
2. If editing (old name exists):
   - PRIMARY: DROP PRIMARY KEY
   - Others: DROP INDEX `oldname`
3. Build new index:
   - PRIMARY → ADD PRIMARY KEY
   - UNIQUE → ADD UNIQUE `name`
   - INDEX → ADD INDEX `name`
   - FULLTEXT → ADD FULLTEXT `name`
   - SPATIAL → ADD SPATIAL `name`
4. Column list: (`col1`(10) ASC, `col2` DESC)
5. Options: KEY_BLOCK_SIZE = N, USING BTREE/HASH, WITH PARSER name, COMMENT 'text'
6. Terminate: ;
```

#### Complete SQL Output

```sql
-- Create new index:
ALTER TABLE `mydb`.`users` ADD INDEX `idx_status` (`status`, `created_at`);

-- Edit existing index (rename + change columns):
ALTER TABLE `mydb`.`users` DROP INDEX `old_name`, ADD UNIQUE `new_name` (`email`(100) ASC);

-- Primary key change:
ALTER TABLE `mydb`.`users` DROP PRIMARY KEY, ADD PRIMARY KEY (`id`, `name`);

-- FULLTEXT with parser:
ALTER TABLE `mydb`.`posts` ADD FULLTEXT `ft_content` (`title`, `body`) WITH PARSER ngram COMMENT 'Full text search index';
```

---

## 6. Foreign Key Operations

**Controller**: `src/Controllers/Table/RelationController.php`
**Route**: `GET|POST /table/relation`

**SQL Builder**: `Table::updateForeignKeys()` at `src/Table/Table.php:1472`

### POST Fields

| Field | Type | Description |
|-------|------|-------------|
| `destinationForeignDb[md5]` | string | Foreign database name |
| `destinationForeignTable[md5]` | string | Foreign table name |
| `destinationForeignColumn[md5]` | string[] | Foreign column names |
| `multiEditColumnsName[md5]` | string[] | Local column names |
| `constraint_name[md5]` | string | Constraint name |
| `on_delete[md5]` | string | CASCADE, SET NULL, NO ACTION, RESTRICT |
| `on_update[md5]` | string | CASCADE, SET NULL, NO ACTION, RESTRICT |
| `preview_sql` | flag | Show SQL without executing |

### SQL Generation Flow

```
For each foreign key definition:
  1. If existing FK changed → DROP FOREIGN KEY `constraint_name`
  2. If new FK → ADD CONSTRAINT `name`
     FOREIGN KEY (`col1`, `col2`)
     REFERENCES `foreign_db`.`foreign_table`(`ref_col1`, `ref_col2`)
     ON DELETE action ON UPDATE action
  3. On failure → attempt to restore old constraint
```

### Complete SQL Output

```sql
-- Drop existing constraint:
ALTER TABLE `orders` DROP FOREIGN KEY `fk_customer`;

-- Add new constraint:
ALTER TABLE `orders` ADD CONSTRAINT `fk_customer`
  FOREIGN KEY (`customer_id`)
  REFERENCES `customers`(`id`)
  ON DELETE CASCADE ON UPDATE RESTRICT;

-- Composite foreign key:
ALTER TABLE `order_items` ADD CONSTRAINT `fk_order`
  FOREIGN KEY (`order_id`, `product_id`)
  REFERENCES `orders`(`id`, `product_id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Cross-database reference:
ALTER TABLE `orders` ADD CONSTRAINT `fk_customer`
  FOREIGN KEY (`customer_id`)
  REFERENCES `shop`.`customers`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
```

---

## 7. View Operations

**Controller**: `src/Controllers/View/CreateController.php`
**Route**: `GET|POST /view/create`

### POST Fields

| Field | Type | Description |
|-------|------|-------------|
| `view[name]` | string | View name |
| `view[or_replace]` | flag | CREATE OR REPLACE |
| `view[algorithm]` | string | UNDEFINED, MERGE, TEMPTABLE |
| `view[definer]` | string | `user@hostname` format |
| `view[sql_security]` | string | DEFINER or INVOKER |
| `view[column_names]` | string | Comma-separated column aliases |
| `view[as]` | string | SELECT statement |
| `view[with]` | string | CASCADED or LOCAL CHECK OPTION |
| `create_view` | flag | true = CREATE, false = ALTER |

### Validation

- Algorithm: whitelist `['UNDEFINED', 'MERGE', 'TEMPTABLE']` (line 47)
- Security: whitelist `['DEFINER', 'INVOKER']` (line 45)
- Check option: whitelist `['CASCADED', 'LOCAL']` (line 49)
- Definer format: must contain `@`

### SQL Generation

```php
// View\CreateController::getSqlQuery() at src/Controllers/View/CreateController.php:245
$sqlQuery = 'CREATE';
if (or_replace) $sqlQuery .= ' OR REPLACE';
// or
$sqlQuery = 'ALTER';

$sqlQuery .= ' ALGORITHM = ' . $algorithm;
$sqlQuery .= ' DEFINER=`user`@`host`';
$sqlQuery .= ' SQL SECURITY DEFINER';
$sqlQuery .= ' VIEW `view_name`';
$sqlQuery .= ' (`col1`, `col2`)';
$sqlQuery .= ' AS SELECT ...';
$sqlQuery .= ' WITH CASCADED CHECK OPTION';
```

### Complete SQL Output

```sql
-- Create view:
CREATE
  ALGORITHM = MERGE
  DEFINER=`root`@`localhost`
  SQL SECURITY DEFINER
  VIEW `active_users` (`id`, `name`, `email`)
  AS SELECT `id`, `name`, `email` FROM `users` WHERE `status` = 1
  WITH CASCADED CHECK OPTION;

-- Create or replace:
CREATE OR REPLACE VIEW `user_stats` AS
  SELECT `user_id`, COUNT(*) AS `order_count`
  FROM `orders` GROUP BY `user_id`;

-- Alter view:
ALTER VIEW `active_users` AS
  SELECT `id`, `name`, `email` FROM `users` WHERE `status` = 1 AND `deleted_at` IS NULL;
```

---

## 8. Stored Procedures & Functions

**Controller**: `src/Controllers/Database/RoutinesController.php`
**Route**: `GET|POST /database/routines`

**Service**: `src/Database/Routines.php`

### POST Fields

| Field | Type | Description |
|-------|------|-------------|
| `item_type` | string | `PROCEDURE` or `FUNCTION` |
| `item_definer` | string | `user@hostname` format |
| `item_name` | string | Routine name |
| `item_param_name[]` | string[] | Parameter names |
| `item_param_dir[]` | string[] | IN, OUT, INOUT |
| `item_param_type[]` | string[] | Parameter types |
| `item_param_length[]` | string[] | Parameter lengths |
| `item_param_opts_text[]` | string[] | Text options (CHARSET, etc.) |
| `item_param_opts_num[]` | string[] | Numeric options (UNSIGNED, etc.) |
| `item_return_type` | string | Return type (FUNCTION only) |
| `item_return_length` | string | Return length |
| `item_return_opts_text` | string | Return text options |
| `item_return_opts_num` | string | Return numeric options |
| `item_comment` | string | Routine comment |
| `item_isdeterministic` | flag | DETERMINISTIC or NOT DETERMINISTIC |
| `item_sqldataaccess` | string | CONTAINS SQL, NO SQL, READS SQL DATA, MODIFIES SQL DATA |
| `item_securitytype` | string | DEFINER or INVOKER |
| `item_definition` | string | Routine body (SQL code) |

### Validation

- Definer format: must contain `@` (line 799-817)
- Routine type: must be `RoutineType::Procedure` or `RoutineType::Function` (line 820-824)
- Routine name: required, non-empty (line 826-830)
- Definition: required, non-empty (line 888-893)
- SQL data access: whitelist `['CONTAINS SQL', 'NO SQL', 'READS SQL DATA', 'MODIFIES SQL DATA']`
- Security type: must be `DEFINER` or `INVOKER`
- Parameter types: validated against `Util::getSupportedDatatypes()`

### SQL Generation

```php
// Routines::getQueryFromRequest() at src/Database/Routines.php:791
$query = 'CREATE ';
$query .= 'DEFINER=`user`@`host` ';
$query .= 'PROCEDURE ';  // or FUNCTION
$query .= '`routine_name`';
$query .= '(';
// Parameters:
$query .= '[IN|OUT|INOUT] `param_name` TYPE(len) [UNSIGNED|ZEROFILL]';
$query .= ')';
// For functions only:
$query .= 'RETURNS TYPE(len)';
$query .= 'COMMENT \'text\'';
$query .= 'DETERMINISTIC ';  // or NOT DETERMINISTIC
$query .= 'READS SQL DATA ';  // or CONTAINS SQL, etc.
$query .= 'SQL SECURITY DEFINER ';  // or INVOKER
$query .= $definition;  // routine body
```

### Editing Pattern

For editing routines (line 73-206):
1. Backup existing routine definition
2. `DROP` the old routine
3. `CREATE` the new version
4. If creation fails → restore from backup

### Complete SQL Output

```sql
-- Create stored procedure:
CREATE DEFINER=`root`@`localhost` PROCEDURE `get_user_orders`(
  IN `p_user_id` INT UNSIGNED,
  IN `p_limit` INT
)
COMMENT 'Fetches orders for a user'
NOT DETERMINISTIC
READS SQL DATA
SQL SECURITY DEFINER
BEGIN
  SELECT * FROM `orders` WHERE `user_id` = `p_user_id` LIMIT `p_limit`;
END

-- Create function:
CREATE DEFINER=`root`@`localhost` FUNCTION `calc_discount`(
  `p_price` DECIMAL(10,2),
  `p_percent` DECIMAL(5,2)
)
RETURNS DECIMAL(10,2)
DETERMINISTIC
CONTAINS SQL
SQL SECURITY INVOKER
BEGIN
  RETURN `p_price` * (1 - `p_percent` / 100);
END

-- Edit (backup + drop + create):
-- Step 1: Backup (via SHOW CREATE FUNCTION `calc_discount`)
-- Step 2: DROP FUNCTION IF EXISTS `calc_discount`
-- Step 3: CREATE FUNCTION ... (new definition)
```

---

## 9. Trigger Operations

**Controller**: `src/Controllers/Triggers/IndexController.php`
**Route**: `GET|POST /triggers`

**Service**: `src/Triggers/Triggers.php`

### POST Fields

| Field | Type | Description |
|-------|------|-------------|
| `item_definer` | string | `user@hostname` format |
| `item_name` | string | Trigger name |
| `item_timing` | string | `BEFORE` or `AFTER` |
| `item_event` | string | `INSERT`, `UPDATE`, or `DELETE` |
| `item_table` | string | Table name |
| `item_definition` | string | Trigger body (SQL statement) |

### Validation

- Definer: must contain `@` (line 185-192)
- Name: required, non-empty (line 195-199)
- Timing: whitelist `['BEFORE', 'AFTER']` (line 202-206)
- Event: whitelist `['INSERT', 'UPDATE', 'DELETE']` (line 208-212)
- Table: must exist in current database (line 216-222)
- Definition: required, non-empty (line 225-229)

### SQL Generation

```php
// Triggers::getQueryFromRequest() at src/Triggers/Triggers.php:182
$query = 'CREATE ';
$query .= 'DEFINER=`user`@`host` ';
$query .= 'TRIGGER `trigger_name` ';
$query .= 'BEFORE ';  // or AFTER
$query .= 'INSERT ';  // or UPDATE, DELETE
$query .= 'ON `table_name` ';
$query .= 'FOR EACH ROW ';
$query .= $definition;  // trigger body
```

### Complete SQL Output

```sql
-- Create trigger:
CREATE DEFINER=`root`@`localhost` TRIGGER `before_user_insert`
  BEFORE INSERT ON `users`
  FOR EACH ROW
  SET NEW.created_at = NOW(), NEW.status = 1;

-- Audit trigger:
CREATE TRIGGER `audit_order_update`
  AFTER UPDATE ON `orders`
  FOR EACH ROW
BEGIN
  INSERT INTO `audit_log` (`table_name`, `record_id`, `old_data`, `new_data`)
  VALUES ('orders', OLD.id, ROW_TO_JSON(OLD), ROW_TO_JSON(NEW));
END;
```

---

## 10. Event Operations

**Controller**: `src/Controllers/Database/EventsController.php`
**Route**: `GET|POST /database/events`

**Service**: `src/Database/Events.php`

### POST Fields

| Field | Type | Description |
|-------|------|-------------|
| `item_definer` | string | `user@hostname` format |
| `item_name` | string | Event name |
| `item_type` | string | `RECURRING` or `ONE TIME` |
| `item_execute_at` | string | Execution timestamp (ONE TIME) |
| `item_interval_value` | int | Interval value (RECURRING) |
| `item_interval_field` | string | YEAR, QUARTER, MONTH, DAY, HOUR, MINUTE, WEEK, SECOND |
| `item_starts` | string | Start datetime (RECURRING) |
| `item_ends` | string | End datetime (RECURRING) |
| `item_preserve` | flag | ON COMPLETION PRESERVE (default: NOT PRESERVE) |
| `item_status` | string | ENABLE, DISABLE, DISABLE ON SLAVE |
| `item_comment` | string | Event comment |
| `item_definition` | string | Event body (SQL statement) |

### Validation

- Definer: must contain `@` (line 261-268)
- Name: required, non-empty (line 272-276)
- Type: whitelist `['RECURRING', 'ONE TIME']` (line 279)
- Interval: whitelist of MySQL interval fields (line 284)
- Interval value: required for RECURRING (line 281-289)
- Execute at: required for ONE TIME (line 299-302)
- Definition: required, non-empty (line 328-332)

### SQL Generation

```php
// Events::getQueryFromRequest() at src/Database/Events.php:258
$query = 'CREATE ';
$query .= 'DEFINER=`user`@`host` ';
$query .= 'EVENT `event_name` ';
$query .= 'ON SCHEDULE ';

// Recurring:
$query .= 'EVERY 1 DAY STARTS \'2024-01-01\' ENDS \'2024-12-31\'';

// One time:
$query .= 'AT \'2024-06-15 10:00:00\'';

$query .= ' ON COMPLETION NOT PRESERVE ';
$query .= 'ENABLE ';
$query .= 'COMMENT \'Event comment\' ';
$query .= 'DO ...';  // event body
```

### Complete SQL Output

```sql
-- Recurring event:
CREATE DEFINER=`root`@`localhost` EVENT `daily_cleanup`
  ON SCHEDULE EVERY 1 DAY STARTS '2024-01-01 02:00:00'
  ON COMPLETION NOT PRESERVE
  ENABLE
  COMMENT 'Daily cleanup of expired sessions'
  DO DELETE FROM `sessions` WHERE `expires_at` < NOW();

-- One-time event:
CREATE EVENT `once_job`
  ON SCHEDULE AT '2024-06-15 10:00:00'
  ON COMPLETION PRESERVE
  DISABLE
  DO ALTER TABLE `logs` DROP PARTITION p_old;
```

---

## 11. Partitioning

**Controller**: `src/Controllers/Table/Structure/PartitioningController.php`
**Route**: `POST /table/structure/partitioning`

**SQL Builder**: `CreateAddField::getPartitionsDefinition()` at `src/CreateAddField.php:265`

### POST Fields

| Field | Type | Description |
|-------|------|-------------|
| `partition_by` | string | RANGE, LIST, HASH, KEY |
| `partition_expr` | string | Partition expression |
| `partition_count` | int | Number of partitions |
| `subpartition_by` | string | HASH, KEY (optional) |
| `subpartition_expr` | string | Sub-partition expression |
| `subpartition_count` | int | Sub-partition count |
| `partitions[N][name]` | string | Partition name |
| `partitions[N][value_type]` | string | VALUES LESS THAN, VALUES IN |
| `partitions[N][value]` | string | Partition value |
| `partitions[N][engine]` | string | Storage engine |
| `partitions[N][comment]` | string | Partition comment |
| `partitions[N][data_directory]` | string | Data directory |
| `partitions[N][index_directory]` | string | Index directory |
| `partitions[N][max_rows]` | int | Max rows |
| `partitions[N][min_rows]` | int | Min rows |
| `partitions[N][tablespace]` | string | Tablespace |
| `partitions[N][node_group]` | string | Node group |

### SQL Generation

```php
// CreateAddField::getPartitionsDefinition() at src/CreateAddField.php:265
$sqlQuery .= ' PARTITION BY ' . $partition_by
    . ' (' . $partition_expr . ')'
    . ' PARTITIONS ' . $partition_count;

// Sub-partitioning:
$sqlQuery .= ' SUBPARTITION BY ' . $subpartition_by
    . ' (' . $subpartition_expr . ')'
    . ' SUBPARTITIONS ' . $subpartition_count;

// Individual partitions:
$sqlQuery .= ' ('
    . 'PARTITION p0 VALUES LESS THAN (100) ENGINE = InnoDB COMMENT = \'Low\''
    . ', PARTITION p1 VALUES LESS THAN (MAXVALUE) ENGINE = InnoDB'
    . ')';
```

### Complete SQL Output

```sql
-- Simple range partitioning:
ALTER TABLE `logs`
  PARTITION BY RANGE (YEAR(created_at)) PARTITIONS 4
  (PARTITION p2021 VALUES LESS THAN (2022),
   PARTITION p2022 VALUES LESS THAN (2023),
   PARTITION p2023 VALUES LESS THAN (2024),
   PARTITION p2024 VALUES LESS THAN MAXVALUE);

-- Hash partitioning:
ALTER TABLE `sessions`
  PARTITION BY HASH(user_id) PARTITIONS 8;

-- Range with sub-partitioning:
ALTER TABLE `sales`
  PARTITION BY RANGE (YEAR(order_date)) SUBPARTITION BY HASH(order_id)
  SUBPARTITIONS 2 PARTITIONS 4
  (PARTITION p2022 VALUES LESS THAN (2023),
   PARTITION p2023 VALUES LESS THAN (2024),
   PARTITION p2024 VALUES LESS THAN (2025),
   PARTITION pfuture VALUES LESS THAN MAXVALUE);
```

---

## 12. Validation Summary

There is **no centralized validation layer**. Validation is ad-hoc and distributed across controllers and service classes:

| What | Where | How |
|------|-------|-----|
| Table name validity | `Table::isValidName()` (`src/Table/Table.php:787`) | Regex `^[a-zA-Z0-9_$]+$`, trim, no trailing spaces |
| Storage engine validity | `StorageEngine::isValid()` (`src/StorageEngine.php:261`) | Checks against `SHOW ENGINES` |
| Column count limit | `CreateController::getNumberOfFieldsFromRequest()` | Capped at 4096 (MySQL max) |
| Column types | `Table::generateFieldSpec()` | Regex against types that skip length |
| Default values | `Table::generateFieldSpec()` | Type-specific handling (TIMESTAMP, BIT, BOOLEAN, etc.) |
| Index type validity | `Index::getIndexTypes()` | Whitelist: `['BTREE', 'HASH']` |
| Index choice | `AbstractIndexController::getKeyType()` | Whitelist: `['FULLTEXT','INDEX','PRIMARY','SPATIAL','UNIQUE']` |
| Primary key name | `Indexes::getSqlQueryForIndexCreateOrEdit()` | Must be `"PRIMARY"` |
| Index fields | `Indexes::getSqlQueryForIndexCreateOrEdit()` | Must not be empty |
| View algorithm | `View\CreateController` | Whitelist: `['UNDEFINED','MERGE','TEMPTABLE']` |
| View security | `View\CreateController` | Whitelist: `['DEFINER','INVOKER']` |
| View check option | `View\CreateController` | Whitelist: `['CASCADED','LOCAL']` |
| Routine type | `Routines::getQueryFromRequest()` | Enum: `RoutineType::Procedure\|Function` |
| Routine params | `Routines::getDataFromRequest()` | Whitelist: `['IN','OUT','INOUT']` |
| SQL data access | `Routines::getQueryFromRequest()` | Whitelist: `['CONTAINS SQL','NO SQL','READS SQL DATA','MODIFIES SQL DATA']` |
| Routine name | `Routines::getQueryFromRequest()` | Non-empty check |
| Routine definition | `Routines::getQueryFromRequest()` | Non-empty check |
| Definer format | Multiple controllers | Must contain `@` |
| Trigger timing | `Triggers::getQueryFromRequest()` | Whitelist: `['BEFORE','AFTER']` |
| Trigger event | `Triggers::getQueryFromRequest()` | Whitelist: `['INSERT','UPDATE','DELETE']` |
| Trigger table | `Triggers::getQueryFromRequest()` | Must exist in current database |
| Event type | `Events::getQueryFromRequest()` | Whitelist: `['RECURRING','ONE TIME']` |
| Event interval | `Events::getQueryFromRequest()` | Whitelist of MySQL interval fields |
| FK engine support | `ForeignKey::isSupported()` | Checks engine: InnoDB, PBXT, NDB>=7.3 |
| Duplicate indexes | `Index::findDuplicates()` | Compares `getCompareData()` |
| Reserved words | `ReservedWordCheckController` | Checks via `Context::isKeyword()` |
| Collation validity | `Charsets::getCollations()` | Validated against server's available collations |
| MariaDB virtual cols | `Table::generateFieldSpec()` | Version-specific collation handling |

---

## 13. Complete SQL Output Examples

### 13.1 Full Table Creation with Everything

```sql
CREATE TABLE `shop`.`products` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `sku` VARCHAR(50) NOT NULL,
  `name` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` TEXT DEFAULT NULL,
  `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `stock` INT NOT NULL DEFAULT 0,
  `category_id` INT UNSIGNED DEFAULT NULL,
  `image_url` VARCHAR(500) DEFAULT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `searchable_name` VARCHAR(255) AS (LOWER(`name`)) STORED,
  `price_display` VARCHAR(20) AS (CONCAT('$', FORMAT(`price`, 2))) VIRTUAL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uniq_sku` (`sku`),
  INDEX `idx_category` (`category_id`),
  INDEX `idx_price` (`price`),
  FULLTEXT INDEX `ft_search` (`name`, `description`),
  CONSTRAINT `fk_category` FOREIGN KEY (`category_id`)
    REFERENCES `categories`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  COMMENT = 'Product catalog'
  PARTITION BY RANGE (YEAR(`created_at`)) PARTITIONS 3
  (PARTITION p2023 VALUES LESS THAN (2024),
   PARTITION p2024 VALUES LESS THAN (2025),
   PARTITION pfuture VALUES LESS THAN MAXVALUE);
```

### 13.2 Adding Columns to Existing Table

```sql
ALTER TABLE `products`
  ADD `weight` DECIMAL(8,2) DEFAULT NULL AFTER `price`,
  ADD `dimensions` VARCHAR(50) DEFAULT NULL AFTER `weight`,
  ADD INDEX `idx_weight` (`weight`),
  ALGORITHM=INPLACE, LOCK=NONE;
```

### 13.3 Modifying Multiple Columns

```sql
ALTER TABLE `products`
  CHANGE `name` `name` VARCHAR(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  CHANGE `description` `description` MEDIUMTEXT DEFAULT NULL,
  CHANGE `price` `price` DECIMAL(12,2) NOT NULL DEFAULT 0.00;
```

### 13.4 Complex Index Operations

```sql
-- Add composite index:
ALTER TABLE `products` ADD INDEX `idx_category_price` (`category_id`, `price`);

-- Edit existing index (rename + change):
ALTER TABLE `mydb`.`products` DROP INDEX `idx_old`, ADD INDEX `idx_new` (`name`(100) ASC) KEY_BLOCK_SIZE = 4096 USING BTREE COMMENT 'Optimized search index';

-- Fulltext with parser:
ALTER TABLE `products` ADD FULLTEXT INDEX `ft_ngram` (`name`, `description`) WITH PARSER ngram;
```

### 13.5 Foreign Key Chain

```sql
-- Drop old FK:
ALTER TABLE `order_items` DROP FOREIGN KEY `fk_order`;

-- Add new FK with different target:
ALTER TABLE `order_items` ADD CONSTRAINT `fk_order_v2`
  FOREIGN KEY (`order_id`)
  REFERENCES `orders`(`id`)
  ON DELETE CASCADE
  ON UPDATE CASCADE;
```

### 13.6 View with Security

```sql
CREATE
  ALGORITHM = UNDEFINED
  DEFINER=`app_user`@`192.168.1.%`
  SQL SECURITY INVOKER
  VIEW `sales_summary` (`category`, `total_sales`, `order_count`)
  AS
    SELECT c.name, SUM(oi.quantity * oi.price), COUNT(DISTINCT o.id)
    FROM `order_items` oi
    JOIN `orders` o ON oi.order_id = o.id
    JOIN `categories` c ON o.category_id = c.id
    WHERE o.status = 'completed'
    GROUP BY c.name
  WITH LOCAL CHECK OPTION;
```

### 13.7 Complete Stored Procedure

```sql
CREATE DEFINER=`admin`@`localhost` PROCEDURE `transfer_stock`(
  IN `p_product_id` INT UNSIGNED,
  IN `p_from_warehouse` INT,
  IN `p_to_warehouse` INT,
  IN `p_quantity` INT
)
COMMENT 'Transfer stock between warehouses'
NOT DETERMINISTIC
MODIFIES SQL DATA
SQL SECURITY DEFINER
BEGIN
  DECLARE `v_available` INT;

  START TRANSACTION;

  SELECT `quantity` INTO `v_available`
  FROM `inventory`
  WHERE `product_id` = `p_product_id` AND `warehouse_id` = `p_from_warehouse`
  FOR UPDATE;

  IF `v_available` >= `p_quantity` THEN
    UPDATE `inventory` SET `quantity` = `quantity` - `p_quantity`
    WHERE `product_id` = `p_product_id` AND `warehouse_id` = `p_from_warehouse`;

    UPDATE `inventory` SET `quantity` = `quantity` + `p_quantity`
    WHERE `product_id` = `p_product_id` AND `warehouse_id` = `p_to_warehouse`;

    INSERT INTO `stock_transfers` (`product_id`, `from_warehouse`, `to_warehouse`, `quantity`, `transferred_at`)
    VALUES (`p_product_id`, `p_from_warehouse`, `p_to_warehouse`, `p_quantity`, NOW());

    COMMIT;
  ELSE
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient stock';
  END IF;
END
```

### 13.8 Trigger with Conditional Logic

```sql
CREATE DEFINER=`root`@`localhost` TRIGGER ` trg_orders_audit `
  AFTER UPDATE ON `orders`
  FOR EACH ROW
BEGIN
  IF OLD.status != NEW.status THEN
    INSERT INTO `order_status_history` (`order_id`, `old_status`, `new_status`, `changed_at`, `changed_by`)
    VALUES (OLD.id, OLD.status, NEW.status, NOW(), CURRENT_USER());
  END IF;

  IF NEW.status = 'shipped' AND OLD.status != 'shipped' THEN
    UPDATE `customers` SET `total_orders_shipped` = `total_orders_shipped` + 1
    WHERE `id` = NEW.customer_id;
  END IF;
END;
```

### 13.9 Event Scheduler

```sql
-- Monthly archive event:
CREATE DEFINER=`cron_user`@`localhost` EVENT `archive_old_orders`
  ON SCHEDULE EVERY 1 MONTH STARTS '2024-01-01 03:00:00'
  ON COMPLETION NOT PRESERVE
  ENABLE
  COMMENT 'Archive orders older than 1 year'
  DO
  BEGIN
    INSERT INTO `orders_archive`
    SELECT * FROM `orders` WHERE `created_at` < DATE_SUB(NOW(), INTERVAL 1 YEAR);

    DELETE FROM `orders` WHERE `created_at` < DATE_SUB(NOW(), INTERVAL 1 YEAR);
  END;
```

### 13.10 Table Options (ALTER)

```sql
-- Engine change:
ALTER TABLE `users` ENGINE = InnoDB;

-- Collation change:
ALTER TABLE `users` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Comment change:
ALTER TABLE `users` COMMENT = 'Updated user table';

-- Multiple options:
ALTER TABLE `users` ENGINE = InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT = 'Users table' ROW_FORMAT = DYNAMIC auto_increment = 1000;

-- MyISAM-specific:
ALTER TABLE `logs` pack_keys = 1 checksum = 1 delay_key_write = 1;
```

---

## Appendix: Key Files Reference

### Controllers (DDL Operations)

| Route | Controller File |
|-------|----------------|
| `/server/databases/create` | `src/Controllers/Server/Databases/CreateController.php` |
| `/table/create` | `src/Controllers/Table/CreateController.php` |
| `/table/add-field` | `src/Controllers/Table/AddFieldController.php` |
| `/table/structure` | `src/Controllers/Table/StructureController.php` |
| `/table/structure/change` | `src/Controllers/Table/Structure/ChangeController.php` |
| `/table/structure/save` | `src/Controllers/Table/Structure/SaveController.php` |
| `/table/structure/drop` | `src/Controllers/Table/DropColumnController.php` |
| `/table/structure/drop-confirm` | `src/Controllers/Table/DropColumnConfirmationController.php` |
| `/table/structure/move-columns` | `src/Controllers/Table/Structure/MoveColumnsController.php` |
| `/table/structure/primary` | `src/Controllers/Table/Structure/PrimaryController.php` |
| `/table/structure/index` | `src/Controllers/Table/Structure/AddIndexController.php` |
| `/table/structure/unique` | `src/Controllers/Table/Structure/UniqueController.php` |
| `/table/structure/fulltext` | `src/Controllers/Table/Structure/FulltextController.php` |
| `/table/structure/spatial` | `src/Controllers/Table/Structure/SpatialController.php` |
| `/table/structure/add-key` | `src/Controllers/Table/Structure/AddKeyController.php` |
| `/table/structure/reserved-word-check` | `src/Controllers/Table/Structure/ReservedWordCheckController.php` |
| `/table/indexes` | `src/Controllers/Table/IndexesController.php` |
| `/table/indexes/rename` | `src/Controllers/Table/IndexRenameController.php` |
| `/table/relation` | `src/Controllers/Table/RelationController.php` |
| `/view/create` | `src/Controllers/View/CreateController.php` |
| `/database/routines` | `src/Controllers/Database/RoutinesController.php` |
| `/database/events` | `src/Controllers/Database/EventsController.php` |
| `/triggers` | `src/Controllers/Triggers/IndexController.php` |
| `/table/structure/partitioning` | `src/Controllers/Table/Structure/PartitioningController.php` |
| `/database/structure/drop-table` | `src/Controllers/Database/Structure/DropTableController.php` |
| `/table/operations` | `src/Controllers/Operations/TableController.php` |
| `/columns` | `src/Controllers/ColumnController.php` |

### SQL Generation Classes

| Class | File | Purpose |
|-------|------|---------|
| `CreateAddField` | `src/CreateAddField.php` | CREATE TABLE + ALTER TABLE ADD |
| `Table::generateFieldSpec()` | `src/Table/Table.php:418` | Column definition SQL |
| `Table::generateAlter()` | `src/Table/Table.php:739` | ALTER TABLE CHANGE |
| `Table::updateForeignKeys()` | `src/Table/Table.php:1472` | Foreign key operations |
| `Table::getSQLToCreateForeignKey()` | `src/Table/Table.php:1651` | FK creation SQL |
| `Indexes::getSqlQueryForIndexCreateOrEdit()` | `src/Table/Indexes.php:39` | Index SQL |
| `Query\Generator::getAddIndexSql()` | `src/Query/Generator.php:449` | Quick add index |
| `Query\Generator::getAddPrimaryKeyStatement()` | `src/Query/Generator.php:456` | Primary key SQL |
| `Query\Generator::getCreateTrigger()` | `src/Query/Generator.php:281` | Trigger SQL |
| `Routines::getQueryFromRequest()` | `src/Database/Routines.php:791` | Procedure/Function SQL |
| `Events::getQueryFromRequest()` | `src/Database/Events.php:258` | Event SQL |
| `Triggers::getQueryFromRequest()` | `src/Triggers/Triggers.php:182` | Trigger SQL |
| `Operations::getTableAltersArray()` | `src/Operations.php:625` | Table options ALTER |

### Domain Models

| Class | File | Purpose |
|-------|------|---------|
| `Column` | `src/Column.php` | Column metadata DTO |
| `Indexes\Index` | `src/Indexes/Index.php` | Index model |
| `Indexes\IndexColumn` | `src/Indexes/IndexColumn.php` | Index column model |
| `Triggers\Trigger` | `src/Triggers/Trigger.php` | Trigger value object |
| `Triggers\Timing` | `src/Triggers/Timing.php` | BEFORE/AFTER enum |
| `Triggers\Event` | `src/Triggers/Event.php` | INSERT/UPDATE/DELETE enum |
| `Database\RoutineType` | `src/Database/RoutineType.php` | PROCEDURE/FUNCTION enum |

### Frontend Templates

| Template | File |
|----------|------|
| Column definitions form | `resources/templates/columns_definitions/column_definitions_form.twig` |
| Table field definitions | `resources/templates/columns_definitions/table_fields_definitions.twig` |
| Column attributes row | `resources/templates/columns_definitions/column_attributes.twig` |
| Column name input | `resources/templates/columns_definitions/column_name.twig` |
| Column attribute select | `resources/templates/columns_definitions/column_attribute.twig` |
| Database create table quick form | `resources/templates/database/create_table.twig` |
| Table structure display | `resources/templates/table/structure/display_structure.twig` |
| Drop column confirmation | `resources/templates/table/structure/drop_confirm.twig` |
| Index editor | `resources/templates/table/index_form.twig` |
| View creation | `resources/templates/view_create.twig` |
| Foreign key row | `resources/templates/table/relation/foreign_key_row.twig` |
