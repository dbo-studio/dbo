package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upDropConnectionEnv, downDropConnectionEnv)
}

func upDropConnectionEnv(ctx context.Context, tx *sql.Tx) error {
	has, err := sqliteHasColumn(ctx, tx, "connections", "env")
	if err != nil {
		return err
	}
	if !has {
		return nil
	}
	_, err = tx.ExecContext(ctx, "ALTER TABLE connections DROP COLUMN env")
	return err
}

func downDropConnectionEnv(ctx context.Context, tx *sql.Tx) error {
	has, err := sqliteHasColumn(ctx, tx, "connections", "env")
	if err != nil {
		return err
	}
	if has {
		return nil
	}
	_, err = tx.ExecContext(ctx, "ALTER TABLE connections ADD COLUMN env TEXT NOT NULL DEFAULT ''")
	return err
}
