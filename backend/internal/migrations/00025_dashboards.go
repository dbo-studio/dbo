package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upDashboards, downDashboards)
}

func upDashboards(ctx context.Context, tx *sql.Tx) error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS dashboards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT NOT NULL DEFAULT '',
  connection_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  created_at DATETIME,
  updated_at DATETIME,
  FOREIGN KEY(connection_id) REFERENCES connections(id) ON DELETE CASCADE
)`,
		"CREATE INDEX IF NOT EXISTS idx_dashboards_owner_id ON dashboards(owner_id)",
		"CREATE INDEX IF NOT EXISTS idx_dashboards_connection_id ON dashboards(connection_id)",
		`CREATE TABLE IF NOT EXISTS dashboard_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dashboard_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  width INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY(dashboard_id) REFERENCES dashboards(id) ON DELETE CASCADE,
  FOREIGN KEY(question_id) REFERENCES questions(id) ON DELETE CASCADE
)`,
		"CREATE INDEX IF NOT EXISTS idx_dashboard_cards_dashboard_id ON dashboard_cards(dashboard_id)",
		"CREATE INDEX IF NOT EXISTS idx_dashboard_cards_question_id ON dashboard_cards(question_id)",
	}

	for _, statement := range statements {
		if _, err := tx.ExecContext(ctx, statement); err != nil {
			return err
		}
	}

	return nil
}

func downDashboards(ctx context.Context, tx *sql.Tx) error {
	if _, err := tx.ExecContext(ctx, "DROP TABLE IF EXISTS dashboard_cards"); err != nil {
		return err
	}

	_, err := tx.ExecContext(ctx, "DROP TABLE IF EXISTS dashboards")

	return err
}
