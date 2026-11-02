package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upDashboardShareFiltersViews, downDashboardShareFiltersViews)
}

// upDashboardShareFiltersViews lets a link opt in to viewer-chosen filters, and keeps a log of who opened it.
func upDashboardShareFiltersViews(ctx context.Context, tx *sql.Tx) error {
	has, err := sqliteHasColumn(ctx, tx, "dashboard_shares", "allow_filters")
	if err != nil {
		return err
	}

	if !has {
		if _, err := tx.ExecContext(ctx, "ALTER TABLE dashboard_shares ADD COLUMN allow_filters BOOLEAN NOT NULL DEFAULT 0"); err != nil {
			return err
		}
	}

	for _, statement := range []string{
		`CREATE TABLE IF NOT EXISTS dashboard_share_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  share_id INTEGER NOT NULL,
  viewed_at DATETIME NOT NULL,
  outcome TEXT NOT NULL,
  ip TEXT NOT NULL DEFAULT '',
  FOREIGN KEY(share_id) REFERENCES dashboard_shares(id) ON DELETE CASCADE
)`,
		"CREATE INDEX IF NOT EXISTS idx_dashboard_share_views_share_id ON dashboard_share_views(share_id)",
	} {
		if _, err := tx.ExecContext(ctx, statement); err != nil {
			return err
		}
	}

	return nil
}

func downDashboardShareFiltersViews(ctx context.Context, tx *sql.Tx) error {
	if _, err := tx.ExecContext(ctx, "DROP TABLE IF EXISTS dashboard_share_views"); err != nil {
		return err
	}

	_, err := tx.ExecContext(ctx, "ALTER TABLE dashboard_shares DROP COLUMN allow_filters")

	return err
}
