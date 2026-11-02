package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upAiChangesets, downAiChangesets)
}

func upAiChangesets(ctx context.Context, tx *sql.Tx) error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS ai_changesets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  connection_id INTEGER NOT NULL,
  database TEXT NOT NULL DEFAULT '',
  schema TEXT NOT NULL DEFAULT '',
  created_at DATETIME,
  FOREIGN KEY(chat_id) REFERENCES ai_chats(id) ON DELETE CASCADE
)`,
		"CREATE INDEX IF NOT EXISTS idx_ai_changesets_chat_id ON ai_changesets(chat_id)",
		`CREATE TABLE IF NOT EXISTS ai_changeset_ops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  changeset_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  op_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT NOT NULL DEFAULT '',
  FOREIGN KEY(changeset_id) REFERENCES ai_changesets(id) ON DELETE CASCADE
)`,
		"CREATE INDEX IF NOT EXISTS idx_ai_changeset_ops_changeset_id ON ai_changeset_ops(changeset_id)",
	}

	for _, statement := range statements {
		if _, err := tx.ExecContext(ctx, statement); err != nil {
			return err
		}
	}

	return nil
}

func downAiChangesets(ctx context.Context, tx *sql.Tx) error {
	if _, err := tx.ExecContext(ctx, "DROP TABLE IF EXISTS ai_changeset_ops"); err != nil {
		return err
	}

	_, err := tx.ExecContext(ctx, "DROP TABLE IF EXISTS ai_changesets")

	return err
}
