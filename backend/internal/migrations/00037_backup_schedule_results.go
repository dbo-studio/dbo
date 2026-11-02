package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upBackupScheduleResults, downBackupScheduleResults)
}

func upBackupScheduleResults(ctx context.Context, tx *sql.Tx) error {
	columns := map[string]string{
		"last_success_at": "DATETIME",
		"last_size":       "INTEGER NOT NULL DEFAULT 0",
	}

	for name, definition := range columns {
		has, err := sqliteHasColumn(ctx, tx, "backup_schedules", name)
		if err != nil {
			return err
		}

		if has {
			continue
		}

		if _, err := tx.ExecContext(ctx, "ALTER TABLE backup_schedules ADD COLUMN "+name+" "+definition); err != nil {
			return err
		}
	}

	return nil
}

func downBackupScheduleResults(_ context.Context, _ *sql.Tx) error {
	// SQLite does not support dropping columns reliably across versions.
	return nil
}
