package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upUserPermissionsAiOwner, downUserPermissionsAiOwner)
}

func upUserPermissionsAiOwner(ctx context.Context, tx *sql.Tx) error {
	for _, col := range []struct {
		name string
		ddl  string
	}{
		{"perm_create_connection", "ALTER TABLE users ADD COLUMN perm_create_connection INTEGER NOT NULL DEFAULT 0"},
		{"perm_ai_settings", "ALTER TABLE users ADD COLUMN perm_ai_settings INTEGER NOT NULL DEFAULT 0"},
		{"perm_mcp_settings", "ALTER TABLE users ADD COLUMN perm_mcp_settings INTEGER NOT NULL DEFAULT 0"},
	} {
		has, err := sqliteHasColumn(ctx, tx, "users", col.name)
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

	if _, err := tx.ExecContext(ctx, `
UPDATE users SET
  perm_create_connection = 1,
  perm_ai_settings = 1,
  perm_mcp_settings = 1
WHERE role = 'admin'`); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `
UPDATE users SET perm_ai_settings = 1 WHERE role = 'member'`); err != nil {
		return err
	}

	has, err := sqliteHasColumn(ctx, tx, "ai_providers", "owner_id")
	if err != nil {
		return err
	}

	if !has {
		if _, err := tx.ExecContext(ctx, `
ALTER TABLE ai_providers ADD COLUMN owner_id TEXT NOT NULL DEFAULT 'desktop'`); err != nil {
			return err
		}
	}

	if _, err := tx.ExecContext(ctx, `
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_providers_owner_type ON ai_providers(owner_id, type)`); err != nil {
		return err
	}

	return nil
}

func downUserPermissionsAiOwner(ctx context.Context, tx *sql.Tx) error {
	if _, err := tx.ExecContext(ctx, "DROP INDEX IF EXISTS idx_ai_providers_owner_type"); err != nil {
		return err
	}

	return nil
}
