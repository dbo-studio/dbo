package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upBackupRetry, downBackupRetry)
}

func upBackupRetry(ctx context.Context, tx *sql.Tx) error {
	for _, name := range []string{"retry_max", "retry_count"} {
		has, err := sqliteHasColumn(ctx, tx, "backup_schedules", name)
		if err != nil {
			return err
		}

		if has {
			continue
		}

		if _, err := tx.ExecContext(ctx, "ALTER TABLE backup_schedules ADD COLUMN "+name+" INTEGER NOT NULL DEFAULT 0"); err != nil {
			return err
		}
	}

	return nil
}

// Rolling back leaves the columns: SQLite cannot drop them safely and unread columns are harmless.
func downBackupRetry(_ context.Context, _ *sql.Tx) error {
	return nil
}
