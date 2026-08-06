package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upHistoriesIsSystem, downHistoriesIsSystem)
}

func upHistoriesIsSystem(ctx context.Context, tx *sql.Tx) error {
	has, err := sqliteHasColumn(ctx, tx, "histories", "is_system")
	if err != nil {
		return err
	}
	if has {
		return nil
	}

	_, err = tx.ExecContext(ctx, "ALTER TABLE histories ADD COLUMN is_system INTEGER NOT NULL DEFAULT 0")
	return err
}

func downHistoriesIsSystem(_ context.Context, _ *sql.Tx) error {
	// SQLite does not support dropping columns reliably across versions.
	return nil
}
