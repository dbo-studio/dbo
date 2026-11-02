package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upBackupArtifacts, downBackupArtifacts)
}

func upBackupArtifacts(ctx context.Context, tx *sql.Tx) error {
	if _, err := tx.ExecContext(ctx, `
CREATE TABLE IF NOT EXISTS backup_artifacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT NOT NULL DEFAULT '',
  connection_id INTEGER NOT NULL,
  job_id INTEGER NOT NULL DEFAULT 0,
  database TEXT NOT NULL DEFAULT '',
  schema TEXT NOT NULL DEFAULT '',
  driver TEXT NOT NULL DEFAULT '',
  method TEXT NOT NULL DEFAULT 'basic',
  status TEXT NOT NULL DEFAULT 'running',
  note TEXT NOT NULL DEFAULT '',
  file_name TEXT NOT NULL DEFAULT '',
  file_path TEXT NOT NULL DEFAULT '',
  size INTEGER NOT NULL DEFAULT 0,
  checksum TEXT NOT NULL DEFAULT '',
  error TEXT NOT NULL DEFAULT '',
  started_at DATETIME NOT NULL,
  completed_at DATETIME,
  created_at DATETIME
)`); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `
CREATE INDEX IF NOT EXISTS idx_backup_artifacts_owner_id ON backup_artifacts(owner_id)`); err != nil {
		return err
	}

	_, err := tx.ExecContext(ctx, `
CREATE INDEX IF NOT EXISTS idx_backup_artifacts_connection_id ON backup_artifacts(connection_id)`)

	return err
}

func downBackupArtifacts(ctx context.Context, tx *sql.Tx) error {
	_, err := tx.ExecContext(ctx, "DROP TABLE IF EXISTS backup_artifacts")

	return err
}
