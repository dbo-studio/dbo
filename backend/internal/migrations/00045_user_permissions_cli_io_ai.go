package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upUserPermissionsCliIoAi, downUserPermissionsCliIoAi)
}

// upUserPermissionsCliIoAi adds the CLI, import, export and AI-use flags. Import, export and AI use were open to
// everyone before, so existing users keep them; the terminal is new and stays admin-only until an admin grants it.
func upUserPermissionsCliIoAi(ctx context.Context, tx *sql.Tx) error {
	for _, col := range []struct{ name, ddl string }{
		{"perm_cli", "ALTER TABLE users ADD COLUMN perm_cli INTEGER NOT NULL DEFAULT 0"},
		{"perm_import", "ALTER TABLE users ADD COLUMN perm_import INTEGER NOT NULL DEFAULT 1"},
		{"perm_export", "ALTER TABLE users ADD COLUMN perm_export INTEGER NOT NULL DEFAULT 1"},
		{"perm_ai_use", "ALTER TABLE users ADD COLUMN perm_ai_use INTEGER NOT NULL DEFAULT 1"},
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

	_, err := tx.ExecContext(ctx, "UPDATE users SET perm_cli = 1 WHERE role = 'admin'")

	return err
}

func downUserPermissionsCliIoAi(_ context.Context, _ *sql.Tx) error {
	// SQLite cannot drop columns portably; the extra columns are harmless.
	return nil
}
