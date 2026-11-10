package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upBackupMonthly, downBackupMonthly)
}

func upBackupMonthly(ctx context.Context, tx *sql.Tx) error {
	has, err := sqliteHasColumn(ctx, tx, "backup_schedules", "month_day")
	if err != nil {
		return err
	}

	if has {
		return nil
	}

	_, err = tx.ExecContext(ctx, "ALTER TABLE backup_schedules ADD COLUMN month_day INTEGER NOT NULL DEFAULT 1")

	return err
}

// Rolling back leaves the column: SQLite cannot drop it safely and an unread column is harmless.
func downBackupMonthly(_ context.Context, _ *sql.Tx) error {
	return nil
}
