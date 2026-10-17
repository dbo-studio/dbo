package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upAiChatMessageFeedback, downAiChatMessageFeedback)
}

func upAiChatMessageFeedback(ctx context.Context, tx *sql.Tx) error {
	has, err := sqliteHasColumn(ctx, tx, "ai_chat_messages", "feedback")
	if err != nil {
		return err
	}

	if has {
		return nil
	}

	_, err = tx.ExecContext(ctx, "ALTER TABLE ai_chat_messages ADD COLUMN feedback TEXT NOT NULL DEFAULT ''")

	return err
}

func downAiChatMessageFeedback(_ context.Context, _ *sql.Tx) error {
	// SQLite does not support dropping columns reliably across versions.
	return nil
}
