package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upNoSQLRecycleBin, downNoSQLRecycleBin)
}

func upNoSQLRecycleBin(ctx context.Context, tx *sql.Tx) error {
	for _, q := range []string{
		`CREATE TABLE IF NOT EXISTS nosql_recycle_entries (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			owner_id TEXT NOT NULL DEFAULT '',
			connection_id INTEGER NOT NULL,
			container_id TEXT NOT NULL,
			item_id TEXT NOT NULL,
			payload BLOB NOT NULL,
			ttl_ms INTEGER NOT NULL DEFAULT 0,
			size INTEGER NOT NULL DEFAULT 0,
			created_at DATETIME NOT NULL,
			expires_at DATETIME NOT NULL
		)`,
		`CREATE INDEX IF NOT EXISTS idx_nosql_recycle_owner_conn ON nosql_recycle_entries (owner_id, connection_id)`,
	} {
		if _, err := tx.ExecContext(ctx, q); err != nil {
			return err
		}
	}

	return nil
}

func downNoSQLRecycleBin(ctx context.Context, tx *sql.Tx) error {
	_, err := tx.ExecContext(ctx, `DROP TABLE IF EXISTS nosql_recycle_entries`)

	return err
}
