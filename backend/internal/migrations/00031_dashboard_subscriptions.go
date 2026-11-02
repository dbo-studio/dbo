package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upDashboardSubscriptions, downDashboardSubscriptions)
}

func upDashboardSubscriptions(ctx context.Context, tx *sql.Tx) error {
	for _, statement := range []string{
		`CREATE TABLE IF NOT EXISTS dashboard_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT NOT NULL DEFAULT '',
  dashboard_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  target TEXT NOT NULL,
  secret_enc TEXT NOT NULL DEFAULT '',
  frequency TEXT NOT NULL,
  hour INTEGER NOT NULL DEFAULT 0,
  minute INTEGER NOT NULL DEFAULT 0,
  weekday INTEGER NOT NULL DEFAULT 0,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  enabled BOOLEAN NOT NULL DEFAULT 1,
  next_run_at DATETIME NOT NULL,
  last_run_at DATETIME,
  last_status TEXT NOT NULL DEFAULT '',
  last_error TEXT NOT NULL DEFAULT '',
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME,
  FOREIGN KEY(dashboard_id) REFERENCES dashboards(id) ON DELETE CASCADE
)`,
		"CREATE INDEX IF NOT EXISTS idx_dashboard_subscriptions_owner_id ON dashboard_subscriptions(owner_id)",
		"CREATE INDEX IF NOT EXISTS idx_dashboard_subscriptions_dashboard_id ON dashboard_subscriptions(dashboard_id)",
		"CREATE INDEX IF NOT EXISTS idx_dashboard_subscriptions_next_run_at ON dashboard_subscriptions(next_run_at)",
		`CREATE TABLE IF NOT EXISTS dashboard_subscription_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subscription_id INTEGER NOT NULL,
  started_at DATETIME NOT NULL,
  finished_at DATETIME NOT NULL,
  status TEXT NOT NULL,
  error TEXT NOT NULL DEFAULT '',
  reports INTEGER NOT NULL DEFAULT 0,
  manual BOOLEAN NOT NULL DEFAULT 0,
  FOREIGN KEY(subscription_id) REFERENCES dashboard_subscriptions(id) ON DELETE CASCADE
)`,
		"CREATE INDEX IF NOT EXISTS idx_dashboard_subscription_runs_subscription_id ON dashboard_subscription_runs(subscription_id)",
		`CREATE TABLE IF NOT EXISTS smtp_settings (
  id INTEGER PRIMARY KEY,
  host TEXT NOT NULL DEFAULT '',
  port INTEGER NOT NULL DEFAULT 587,
  username TEXT NOT NULL DEFAULT '',
  password_enc TEXT NOT NULL DEFAULT '',
  from_address TEXT NOT NULL DEFAULT '',
  security TEXT NOT NULL DEFAULT 'starttls'
)`,
	} {
		if _, err := tx.ExecContext(ctx, statement); err != nil {
			return err
		}
	}

	return nil
}

func downDashboardSubscriptions(ctx context.Context, tx *sql.Tx) error {
	for _, table := range []string{"smtp_settings", "dashboard_subscription_runs", "dashboard_subscriptions"} {
		if _, err := tx.ExecContext(ctx, "DROP TABLE IF EXISTS "+table); err != nil {
			return err
		}
	}

	return nil
}
