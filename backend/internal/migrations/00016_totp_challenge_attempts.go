package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upTotpChallengeAttempts, downTotpChallengeAttempts)
}

func upTotpChallengeAttempts(ctx context.Context, tx *sql.Tx) error {
	has, err := sqliteHasColumn(ctx, tx, "totp_login_challenges", "attempts")
	if err != nil {
		return err
	}

	if has {
		return nil
	}

	_, err = tx.ExecContext(ctx, `
ALTER TABLE totp_login_challenges ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0`)

	return err
}

func downTotpChallengeAttempts(ctx context.Context, tx *sql.Tx) error {
	_, _ = tx.ExecContext(ctx, `SELECT 1`)

	return nil
}
