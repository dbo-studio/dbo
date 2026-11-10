package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upBackupConnectors, downBackupConnectors)
}

func upBackupConnectors(ctx context.Context, tx *sql.Tx) error {
	if _, err := tx.ExecContext(ctx, `
CREATE TABLE IF NOT EXISTS backup_connectors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'destination',
  type TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT 1,
  config TEXT NOT NULL DEFAULT '{}',
  secrets_enc TEXT NOT NULL DEFAULT '',
  created_at DATETIME
)`); err != nil {
		return err
	}

	for _, stmt := range []string{
		`CREATE INDEX IF NOT EXISTS idx_backup_connectors_owner_id ON backup_connectors(owner_id)`,
		`CREATE INDEX IF NOT EXISTS idx_backup_connectors_kind ON backup_connectors(kind)`,
	} {
		if _, err := tx.ExecContext(ctx, stmt); err != nil {
			return err
		}
	}

	columns := []struct{ table, name, definition string }{
		{"backup_schedules", "destination_id", "INTEGER NOT NULL DEFAULT 0"},
		{"backup_schedules", "channel_ids", "TEXT NOT NULL DEFAULT '[]'"},
		{"backup_schedules", "notify_on", "TEXT NOT NULL DEFAULT 'failure'"},
		{"backup_artifacts", "destination_id", "INTEGER NOT NULL DEFAULT 0"},
		{"backup_artifacts", "remote_path", "TEXT NOT NULL DEFAULT ''"},
		{"backup_artifacts", "remote_status", "TEXT NOT NULL DEFAULT ''"},
		{"backup_artifacts", "remote_error", "TEXT NOT NULL DEFAULT ''"},
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

func downBackupConnectors(ctx context.Context, tx *sql.Tx) error {
	_, err := tx.ExecContext(ctx, `DROP TABLE IF EXISTS backup_connectors`)

	return err
}
