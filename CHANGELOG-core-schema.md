# Changelog: Core schema objects

Everything on this branch for the core schema objects (17 commits, no migrations). The PG and MySQL work up to `99b1fab6` was already in `new_features`; the last commit adds the SQLite and MySQL follow-ups.

## Postgres

- Table Indexes tab: create, edit and drop indexes, with the index method (btree, hash, gist, gin, spgist, brin) and partial indexes.
- Table Checks and Triggers tabs. A trigger sets its timing and event, and a check has a name and an expression.
- Enum types as tree objects: create, rename and add values. Removing or reordering labels is refused. A type in use cannot be dropped. An enum can be used as a column type.
- Sequences as tree objects and as a table tab, with start, increment, min, max, cache and cycle. A sequence can be owned by a column.
- Functions and procedures, with IN, OUT and INOUT parameters. A changed signature drops and creates the routine; otherwise it is replaced in place.
- Materialized views can be edited and refreshed, with or without data. The owner and name can be changed.

## MySQL

- Table Triggers tab, with timing and event.
- Functions and procedures, including IN and OUT parameters.
- UNIQUE keys now show in the Keys tab, so they round-trip and can be renamed or dropped. The Indexes tab no longer lists them.
- Table Checks tab. It only shows on servers that enforce checks (MySQL 8.0.16+, MariaDB 10.2.1+).
- Scheduled events: an Events container in the tree, with create, edit and drop. An edit runs one `ALTER EVENT` with only the changed parts.
- An edit that MySQL rejects keeps the original trigger, routine or check: the new definition is created under a temporary name first, because MySQL cannot roll DDL back.

## SQLite

- Table Indexes tab: load, create, edit and drop. An edit that only touches indexes or triggers runs in place.
- Table Triggers and Checks tabs. SQLite cannot change a check in place, so a check edit recreates the table.
- A table recreate used to lose its indexes, triggers and checks. The unchanged ones are now read back and created again, following column renames and drops.

## All engines

- Double-click opens the edit form for type, sequence, routine and event nodes.
- Every new object shows its SQL in the preview before it runs, and goes through safe mode as DDL.
- Invalid input is refused with a clear message instead of being skipped: unsafe parameter lists, bad schedules, check expressions with `;` or comments, and triggers or routines without a body.
- `schema-editing-architecture.md` covers the new object families and the SQLite recreate rules.
- Unit tests that the e2e suite supersedes were removed. The new behavior has e2e specs for Postgres, MySQL and SQLite.

## Known limits

- Overloaded Postgres routines cannot be told apart in the tree.
- The refresh action reuses the generic confirm dialog, whose button says "Delete".
- SQLite partial and expression indexes, and triggers with an `UPDATE OF` column list, are not editable and are dropped by a table recreate.
- The MySQL event scheduler is not switched on by DBO, so an event only runs if the server has it enabled.
