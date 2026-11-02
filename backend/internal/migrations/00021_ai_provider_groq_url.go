package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upAiProviderGroqURL, downAiProviderGroqURL)
}

// The Groq entry was created pointing at xAI (api.x.ai, grok-4). Rows still on
// those defaults move to Groq's own endpoint; a URL the user typed is left alone.
func upAiProviderGroqURL(ctx context.Context, tx *sql.Tx) error {
	_, err := tx.ExecContext(ctx, `
UPDATE ai_providers
SET url = 'https://api.groq.com/openai/v1',
    model = 'llama-3.3-70b-versatile',
    models = '["llama-3.3-70b-versatile"]'
WHERE type = 'groq' AND url = 'https://api.x.ai/v1'`)

	return err
}

func downAiProviderGroqURL(_ context.Context, _ *sql.Tx) error {
	// The old values were a mistake; there is nothing to restore.
	return nil
}
