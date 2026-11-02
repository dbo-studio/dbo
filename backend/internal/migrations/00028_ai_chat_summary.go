package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upAiChatSummary, downAiChatSummary)
}

func upAiChatSummary(ctx context.Context, tx *sql.Tx) error {
	for _, col := range []struct {
		name string
		ddl  string
	}{
		{"summary", "ALTER TABLE ai_chats ADD COLUMN summary TEXT NOT NULL DEFAULT ''"},
		{"summary_up_to", "ALTER TABLE ai_chats ADD COLUMN summary_up_to INTEGER NOT NULL DEFAULT 0"},
	} {
		has, err := sqliteHasColumn(ctx, tx, "ai_chats", col.name)
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

func downAiChatSummary(ctx context.Context, tx *sql.Tx) error {
	for _, statement := range []string{
		"ALTER TABLE ai_chats DROP COLUMN summary",
		"ALTER TABLE ai_chats DROP COLUMN summary_up_to",
	} {
		if _, err := tx.ExecContext(ctx, statement); err != nil {
			return err
		}
	}

	return nil
}
