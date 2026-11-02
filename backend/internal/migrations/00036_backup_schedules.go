package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upBackupSchedules, downBackupSchedules)
}

func upBackupSchedules(ctx context.Context, tx *sql.Tx) error {
	if _, err := tx.ExecContext(ctx, `
CREATE TABLE IF NOT EXISTS backup_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT NOT NULL DEFAULT '',
  connection_id INTEGER NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  database TEXT NOT NULL DEFAULT '',
  schema TEXT NOT NULL DEFAULT '',
  cadence TEXT NOT NULL DEFAULT 'daily',
  hour INTEGER NOT NULL DEFAULT 0,
  minute INTEGER NOT NULL DEFAULT 0,
  weekday INTEGER NOT NULL DEFAULT 0,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  enabled BOOLEAN NOT NULL DEFAULT 1,
  keep_last INTEGER NOT NULL DEFAULT 0,
  keep_days INTEGER NOT NULL DEFAULT 0,
  next_run_at DATETIME,
  last_run_at DATETIME,
  last_job_id INTEGER NOT NULL DEFAULT 0,
  last_status TEXT NOT NULL DEFAULT '',
  last_error TEXT NOT NULL DEFAULT '',
  created_at DATETIME
)`); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `CREATE INDEX IF NOT EXISTS idx_backup_schedules_owner_id ON backup_schedules(owner_id)`); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `CREATE INDEX IF NOT EXISTS idx_backup_schedules_next_run ON backup_schedules(enabled, next_run_at)`); err != nil {
		return err
	}

	has, err := sqliteHasColumn(ctx, tx, "backup_artifacts", "schedule_id")
	if err != nil {
		return err
	}

	if has {
		return nil
	}

	_, err = tx.ExecContext(ctx, "ALTER TABLE backup_artifacts ADD COLUMN schedule_id INTEGER NOT NULL DEFAULT 0")

	return err
}

func downBackupSchedules(ctx context.Context, tx *sql.Tx) error {
	_, err := tx.ExecContext(ctx, "DROP TABLE IF EXISTS backup_schedules")

	return err
}
