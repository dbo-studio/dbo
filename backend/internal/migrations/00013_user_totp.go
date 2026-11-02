package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upUserTotp, downUserTotp)
}

func upUserTotp(ctx context.Context, tx *sql.Tx) error {
	// Idempotent: a prior partial apply can leave columns without a goose row.
	has, err := sqliteHasColumn(ctx, tx, "users", "totp_secret_ciphertext")
	if err != nil {
		return err
	}
	if !has {
		if _, err := tx.ExecContext(ctx, `ALTER TABLE users ADD COLUMN totp_secret_ciphertext TEXT`); err != nil {
			return err
		}
	}

	has, err = sqliteHasColumn(ctx, tx, "users", "totp_enabled_at")
	if err != nil {
		return err
	}
	if !has {
		if _, err := tx.ExecContext(ctx, `ALTER TABLE users ADD COLUMN totp_enabled_at DATETIME`); err != nil {
			return err
		}
	}

	if _, err := tx.ExecContext(ctx, `
CREATE TABLE IF NOT EXISTS totp_login_challenges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL
)`); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `
CREATE INDEX IF NOT EXISTS idx_totp_login_challenges_expires_at ON totp_login_challenges(expires_at)`); err != nil {
		return err
	}

	return nil
}

func downUserTotp(ctx context.Context, tx *sql.Tx) error {
	if _, err := tx.ExecContext(ctx, `DROP TABLE IF EXISTS totp_login_challenges`); err != nil {
		return err
	}

	// SQLite cannot drop columns easily; leave user TOTP columns on downgrade.
	_, _ = tx.ExecContext(ctx, `SELECT 1`)

	return nil
}
