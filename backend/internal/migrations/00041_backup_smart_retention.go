package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upBackupSmartRetention, downBackupSmartRetention)
}

func upBackupSmartRetention(ctx context.Context, tx *sql.Tx) error {
	has, err := sqliteHasColumn(ctx, tx, "backup_schedules", "keep_smart")
	if err != nil {
		return err
	}

	if has {
		return nil
	}

	_, err = tx.ExecContext(ctx, "ALTER TABLE backup_schedules ADD COLUMN keep_smart BOOLEAN NOT NULL DEFAULT 0")

	return err
}

// Rolling back leaves the column: SQLite cannot drop it safely and an unread column is harmless.
func downBackupSmartRetention(_ context.Context, _ *sql.Tx) error {
	return nil
}
