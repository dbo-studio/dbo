package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upConnectionShares, downConnectionShares)
}

func upConnectionShares(ctx context.Context, tx *sql.Tx) error {
	if _, err := tx.ExecContext(ctx, `
CREATE TABLE IF NOT EXISTS connection_shares (
  connection_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (connection_id, user_id)
)`); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `
CREATE INDEX IF NOT EXISTS idx_connection_shares_user_id ON connection_shares(user_id)`); err != nil {
		return err
	}

	_, err := tx.ExecContext(ctx, `
CREATE TABLE IF NOT EXISTS connection_shared_secrets (
  connection_id INTEGER PRIMARY KEY,
  ciphertext TEXT NOT NULL,
  updated_at DATETIME NOT NULL
)`)

	return err
}

func downConnectionShares(ctx context.Context, tx *sql.Tx) error {
	if _, err := tx.ExecContext(ctx, "DROP TABLE IF EXISTS connection_shared_secrets"); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, "DROP INDEX IF EXISTS idx_connection_shares_user_id"); err != nil {
		return err
	}

	_, err := tx.ExecContext(ctx, "DROP TABLE IF EXISTS connection_shares")

	return err
}
