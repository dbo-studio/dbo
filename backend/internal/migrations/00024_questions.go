package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upQuestions, downQuestions)
}

func upQuestions(ctx context.Context, tx *sql.Tx) error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT NOT NULL DEFAULT '',
  connection_id INTEGER NOT NULL,
  database TEXT NOT NULL DEFAULT '',
  schema TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  sql TEXT NOT NULL,
  chart_json TEXT NOT NULL DEFAULT '{}',
  created_at DATETIME,
  updated_at DATETIME,
  FOREIGN KEY(connection_id) REFERENCES connections(id) ON DELETE CASCADE
)`,
		"CREATE INDEX IF NOT EXISTS idx_questions_owner_id ON questions(owner_id)",
		"CREATE INDEX IF NOT EXISTS idx_questions_connection_id ON questions(connection_id)",
	}

	for _, statement := range statements {
		if _, err := tx.ExecContext(ctx, statement); err != nil {
			return err
		}
	}

	return nil
}

func downQuestions(ctx context.Context, tx *sql.Tx) error {
	_, err := tx.ExecContext(ctx, "DROP TABLE IF EXISTS questions")

	return err
}
