package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upAiProviderCompletionModel, downAiProviderCompletionModel)
}

func upAiProviderCompletionModel(ctx context.Context, tx *sql.Tx) error {
	has, err := sqliteHasColumn(ctx, tx, "ai_providers", "completion_model")
	if err != nil || has {
		return err
	}

	_, err = tx.ExecContext(ctx, "ALTER TABLE ai_providers ADD COLUMN completion_model TEXT NOT NULL DEFAULT ''")

	return err
}

func downAiProviderCompletionModel(_ context.Context, _ *sql.Tx) error {
	return nil
}
