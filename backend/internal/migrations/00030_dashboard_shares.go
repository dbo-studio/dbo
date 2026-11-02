package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upDashboardShares, downDashboardShares)
}

func upDashboardShares(ctx context.Context, tx *sql.Tx) error {
	for _, statement := range []string{
		`CREATE TABLE IF NOT EXISTS dashboard_shares (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT NOT NULL DEFAULT '',
  dashboard_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL,
  password_hash TEXT NOT NULL DEFAULT '',
  expires_at DATETIME,
  revoked_at DATETIME,
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at DATETIME,
  created_at DATETIME,
  FOREIGN KEY(dashboard_id) REFERENCES dashboards(id) ON DELETE CASCADE
)`,
		"CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_shares_token_hash ON dashboard_shares(token_hash)",
		"CREATE INDEX IF NOT EXISTS idx_dashboard_shares_owner_id ON dashboard_shares(owner_id)",
		"CREATE INDEX IF NOT EXISTS idx_dashboard_shares_dashboard_id ON dashboard_shares(dashboard_id)",
	} {
		if _, err := tx.ExecContext(ctx, statement); err != nil {
			return err
		}
	}

	return nil
}

func downDashboardShares(ctx context.Context, tx *sql.Tx) error {
	_, err := tx.ExecContext(ctx, "DROP TABLE IF EXISTS dashboard_shares")

	return err
}
