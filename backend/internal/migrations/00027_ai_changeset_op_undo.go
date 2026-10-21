package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upAiChangesetOpUndo, downAiChangesetOpUndo)
}

func upAiChangesetOpUndo(ctx context.Context, tx *sql.Tx) error {
	for _, statement := range []string{
		"ALTER TABLE ai_changeset_ops ADD COLUMN undo_sql TEXT NOT NULL DEFAULT ''",
		"ALTER TABLE ai_changeset_ops ADD COLUMN undo_note TEXT NOT NULL DEFAULT ''",
	} {
		if _, err := tx.ExecContext(ctx, statement); err != nil {
			return err
		}
	}

	return nil
}

func downAiChangesetOpUndo(ctx context.Context, tx *sql.Tx) error {
	for _, statement := range []string{
		"ALTER TABLE ai_changeset_ops DROP COLUMN undo_sql",
		"ALTER TABLE ai_changeset_ops DROP COLUMN undo_note",
	} {
		if _, err := tx.ExecContext(ctx, statement); err != nil {
			return err
		}
	}

	return nil
}
