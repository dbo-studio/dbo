package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upBackupEncryptionKeys, downBackupEncryptionKeys)
}

func upBackupEncryptionKeys(ctx context.Context, tx *sql.Tx) error {
	columns := []struct{ table, name, definition string }{
		{"backup_schedules", "public_key", "TEXT NOT NULL DEFAULT ''"},
		{"backup_schedules", "wrapped_key", "TEXT NOT NULL DEFAULT ''"},
		{"backup_artifacts", "log", "TEXT NOT NULL DEFAULT ''"},
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

	// The passphrase column from the first design is never written again; a
	// stored passphrase must not outlive it.
	_, err := tx.ExecContext(ctx, "UPDATE backup_schedules SET passphrase_enc = ''")

	return err
}

func downBackupEncryptionKeys(_ context.Context, _ *sql.Tx) error {
	// SQLite does not support dropping columns reliably across versions.
	return nil
}
