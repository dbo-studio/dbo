package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upAiAuditEntries, downAiAuditEntries)
}

// No foreign keys: the log must outlive the chat and the connection it describes.
func upAiAuditEntries(ctx context.Context, tx *sql.Tx) error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS ai_audit_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT NOT NULL DEFAULT '',
  connection_id INTEGER NOT NULL,
  chat_id INTEGER NOT NULL,
  changeset_id INTEGER NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  sql TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  error TEXT NOT NULL DEFAULT '',
  created_at DATETIME
)`,
		"CREATE INDEX IF NOT EXISTS idx_ai_audit_entries_owner_id ON ai_audit_entries(owner_id)",
		"CREATE INDEX IF NOT EXISTS idx_ai_audit_entries_connection_id ON ai_audit_entries(connection_id)",
	}

	for _, statement := range statements {
		if _, err := tx.ExecContext(ctx, statement); err != nil {
			return err
		}
	}

	return nil
}

func downAiAuditEntries(ctx context.Context, tx *sql.Tx) error {
	_, err := tx.ExecContext(ctx, "DROP TABLE IF EXISTS ai_audit_entries")

	return err
}
