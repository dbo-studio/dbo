package migrations

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upAddOwnerIDToConnections, downAddOwnerIDToConnections)
}

func upAddOwnerIDToConnections(ctx context.Context, tx *sql.Tx) error {
	has, err := sqliteHasColumn(ctx, tx, "connections", "owner_id")
	if err != nil {
		return err
	}
	if has {
		// Ensure backfill.
		if _, err := tx.ExecContext(ctx, "UPDATE connections SET owner_id = 'desktop' WHERE owner_id IS NULL OR owner_id = ''"); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, "CREATE INDEX IF NOT EXISTS idx_connections_owner_id ON connections(owner_id)"); err != nil {
			return err
		}
		return nil
	}

	if _, err := tx.ExecContext(ctx, "ALTER TABLE connections ADD COLUMN owner_id TEXT NOT NULL DEFAULT 'desktop'"); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, "UPDATE connections SET owner_id = 'desktop' WHERE owner_id IS NULL OR owner_id = ''"); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, "CREATE INDEX IF NOT EXISTS idx_connections_owner_id ON connections(owner_id)"); err != nil {
		return err
	}
	return nil
}

func downAddOwnerIDToConnections(ctx context.Context, tx *sql.Tx) error {
	// SQLite does not support dropping columns. We keep the column.
	if _, err := tx.ExecContext(ctx, "DROP INDEX IF EXISTS idx_connections_owner_id"); err != nil {
		return err
	}
	return nil
}

func sqliteHasColumn(ctx context.Context, tx *sql.Tx, table string, column string) (bool, error) {
	rows, err := tx.QueryContext(ctx, fmt.Sprintf("PRAGMA table_info(%s)", table))
	if err != nil {
		return false, err
	}
	defer rows.Close()

	for rows.Next() {
		var (
			cid       int
			name      string
			ctype     string
			notnull   int
			dfltValue any
			pk        int
		)
		if err := rows.Scan(&cid, &name, &ctype, &notnull, &dfltValue, &pk); err != nil {
			return false, err
		}
		if name == column {
			return true, nil
		}
	}
	return false, rows.Err()
}
