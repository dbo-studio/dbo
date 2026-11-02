package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upConnectionAgentTier, downConnectionAgentTier)
}

// Existing connections keep what the agent could already do: data and schema changes, each reviewed.
func upConnectionAgentTier(ctx context.Context, tx *sql.Tx) error {
	_, err := tx.ExecContext(ctx, "ALTER TABLE connections ADD COLUMN agent_tier TEXT NOT NULL DEFAULT 'schema_change'")

	return err
}

func downConnectionAgentTier(ctx context.Context, tx *sql.Tx) error {
	_, err := tx.ExecContext(ctx, "ALTER TABLE connections DROP COLUMN agent_tier")

	return err
}
