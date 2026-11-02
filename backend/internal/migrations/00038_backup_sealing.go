package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upBackupSealing, downBackupSealing)
}

func upBackupSealing(ctx context.Context, tx *sql.Tx) error {
	columns := []struct{ table, name, definition string }{
		{"backup_schedules", "compress", "BOOLEAN NOT NULL DEFAULT 0"},
		{"backup_schedules", "passphrase_enc", "TEXT NOT NULL DEFAULT ''"},
		{"backup_artifacts", "compressed", "BOOLEAN NOT NULL DEFAULT 0"},
		{"backup_artifacts", "encrypted", "BOOLEAN NOT NULL DEFAULT 0"},
	}

	for _, c := range columns {
		has, err := sqliteHasColumn(ctx, tx, c.table, c.name)
		if err != nil {
			return err
		}

		if has {
			continue
		}

		if _, err := tx.ExecContext(ctx, "ALTER TABLE "+c.table+" ADD COLUMN "+c.name+" "+c.definition); err != nil {
			return err
		}
	}

	return nil
}

func downBackupSealing(_ context.Context, _ *sql.Tx) error {
	// SQLite does not support dropping columns reliably across versions.
	return nil
}
