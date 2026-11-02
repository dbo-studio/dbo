package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upAiProviderRemoveGroqAndTimeout, downAiProviderRemoveGroqAndTimeout)
}

// The "groq" provider was set up wrongly and is gone; its row is removed. A chat now
// waits at least five minutes, so stored timeouts below that are raised to match
// what the form shows.
func upAiProviderRemoveGroqAndTimeout(ctx context.Context, tx *sql.Tx) error {
	statements := []string{
		"DELETE FROM ai_providers WHERE type = 'groq'",
		"UPDATE ai_providers SET timeout = 300 WHERE timeout < 300",
	}

	for _, statement := range statements {
		if _, err := tx.ExecContext(ctx, statement); err != nil {
			return err
		}
	}

	return nil
}

func downAiProviderRemoveGroqAndTimeout(_ context.Context, _ *sql.Tx) error {
	// Neither the removed provider nor the old timeouts are worth restoring.
	return nil
}
