package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upBackupRestoreDrill, downBackupRestoreDrill)
}

func upBackupRestoreDrill(ctx context.Context, tx *sql.Tx) error {
	columns := []struct{ table, name, definition string }{
		{"backup_schedules", "verify_restore", "BOOLEAN NOT NULL DEFAULT 0"},
		{"backup_artifacts", "drill_status", "TEXT NOT NULL DEFAULT ''"},
		{"backup_artifacts", "drill_message", "TEXT NOT NULL DEFAULT ''"},
		{"backup_artifacts", "drilled_at", "DATETIME"},
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

// Rolling back leaves the columns: SQLite cannot drop them safely and unread columns are harmless.
func downBackupRestoreDrill(_ context.Context, _ *sql.Tx) error {
	return nil
}
