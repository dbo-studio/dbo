package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upNotifications, downNotifications)
}

func upNotifications(ctx context.Context, tx *sql.Tx) error {
	for _, statement := range []string{
		`CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL,
  job_type TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  job_id INTEGER,
  read_at DATETIME,
  created_at DATETIME
)`,
		"CREATE INDEX IF NOT EXISTS idx_notifications_owner_read ON notifications(owner_id, read_at)",
	} {
		if _, err := tx.ExecContext(ctx, statement); err != nil {
			return err
		}
	}

	return nil
}

func downNotifications(ctx context.Context, tx *sql.Tx) error {
	_, err := tx.ExecContext(ctx, "DROP TABLE IF EXISTS notifications")

	return err
}
