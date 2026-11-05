package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upConnectionEnv, downConnectionEnv)
}

// upConnectionEnv brings back the env tag (00007 dropped it while nothing used it). "prod" write-locks a connection.
func upConnectionEnv(ctx context.Context, tx *sql.Tx) error {
	has, err := sqliteHasColumn(ctx, tx, "connections", "env")
	if err != nil || has {
		return err
	}

	_, err = tx.ExecContext(ctx, "ALTER TABLE connections ADD COLUMN env TEXT NOT NULL DEFAULT ''")

	return err
}

func downConnectionEnv(_ context.Context, _ *sql.Tx) error {
	// SQLite cannot drop columns portably; the extra column is harmless.
	return nil
}
