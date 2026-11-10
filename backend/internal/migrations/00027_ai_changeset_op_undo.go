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
	for _, col := range []struct {
		name string
		ddl  string
	}{
		{"undo_sql", "ALTER TABLE ai_changeset_ops ADD COLUMN undo_sql TEXT NOT NULL DEFAULT ''"},
		{"undo_note", "ALTER TABLE ai_changeset_ops ADD COLUMN undo_note TEXT NOT NULL DEFAULT ''"},
	} {
		has, err := sqliteHasColumn(ctx, tx, "ai_changeset_ops", col.name)
		if err != nil {
			return err
		}
		if has {
			continue
		}
		if _, err := tx.ExecContext(ctx, col.ddl); err != nil {
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
