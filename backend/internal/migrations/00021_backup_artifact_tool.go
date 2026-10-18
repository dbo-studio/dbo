package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upBackupArtifactTool, downBackupArtifactTool)
}

func upBackupArtifactTool(ctx context.Context, tx *sql.Tx) error {
	for _, column := range []string{"tool", "tool_version"} {
		has, err := sqliteHasColumn(ctx, tx, "backup_artifacts", column)
		if err != nil {
			return err
		}

		if has {
			continue
		}

		if _, err := tx.ExecContext(ctx, "ALTER TABLE backup_artifacts ADD COLUMN "+column+" TEXT NOT NULL DEFAULT ''"); err != nil {
			return err
		}
	}

	return nil
}

func downBackupArtifactTool(_ context.Context, _ *sql.Tx) error {
	// SQLite does not support dropping columns reliably across versions.
	return nil
}
