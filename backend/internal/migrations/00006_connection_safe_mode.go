package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upConnectionSafeMode, downConnectionSafeMode)
}

func upConnectionSafeMode(ctx context.Context, tx *sql.Tx) error {
	columns := []struct {
		name string
		ddl  string
	}{
		{name: "safe_mode", ddl: "ALTER TABLE connections ADD COLUMN safe_mode TEXT NOT NULL DEFAULT 'silent'"},
		{name: "env", ddl: "ALTER TABLE connections ADD COLUMN env TEXT NOT NULL DEFAULT ''"},
	}

	for _, col := range columns {
		has, err := sqliteHasColumn(ctx, tx, "connections", col.name)
		if err != nil {
			return err
		}

		if has {
			continue
		}

		if _, err := tx.ExecContext(ctx, col.ddl); err != nil {
			return err
		}
	}

	return nil
}

func downConnectionSafeMode(_ context.Context, _ *sql.Tx) error {
	// SQLite does not support dropping columns reliably across versions.
	return nil
}
