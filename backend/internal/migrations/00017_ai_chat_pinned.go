package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upAiChatPinned, downAiChatPinned)
}

func upAiChatPinned(ctx context.Context, tx *sql.Tx) error {
	has, err := sqliteHasColumn(ctx, tx, "ai_chats", "pinned")
	if err != nil {
		return err
	}

	if has {
		return nil
	}

	_, err = tx.ExecContext(ctx, "ALTER TABLE ai_chats ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0")

	return err
}

func downAiChatPinned(_ context.Context, _ *sql.Tx) error {
	// SQLite does not support dropping columns reliably across versions.
	return nil
}
