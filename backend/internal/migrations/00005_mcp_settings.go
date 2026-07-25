package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upMcpSettings, downMcpSettings)
}

func upMcpSettings(ctx context.Context, tx *sql.Tx) error {
	_, err := tx.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS mcp_settings (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			owner_id TEXT NOT NULL DEFAULT 'desktop',
			enabled INTEGER NOT NULL DEFAULT 0,
			port INTEGER NOT NULL DEFAULT 5001,
			token_hash TEXT,
			default_connection_id INTEGER,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		return err
	}

	_, err = tx.ExecContext(ctx, `
		CREATE UNIQUE INDEX IF NOT EXISTS idx_mcp_settings_owner ON mcp_settings(owner_id)
	`)
	return err
}

func downMcpSettings(ctx context.Context, tx *sql.Tx) error {
	if _, err := tx.ExecContext(ctx, `DROP INDEX IF EXISTS idx_mcp_settings_owner`); err != nil {
		return err
	}
	_, err := tx.ExecContext(ctx, `DROP TABLE IF EXISTS mcp_settings`)
	return err
}
