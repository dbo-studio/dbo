package migrations

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upUserPermissionSet, downUserPermissionSet)
}

// upUserPermissionSet moves the seven per-column permission flags into one JSON set (users.permissions), so a new
// permission no longer needs a new column. The old columns are left in place, unread. Members keep exactly what
// they had; permissions that did not exist before start off, and an admin gets everything by role.
func upUserPermissionSet(ctx context.Context, tx *sql.Tx) error {
	has, err := sqliteHasColumn(ctx, tx, "users", "permissions")
	if err != nil {
		return err
	}

	if !has {
		if _, err := tx.ExecContext(ctx, "ALTER TABLE users ADD COLUMN permissions TEXT NOT NULL DEFAULT ''"); err != nil {
			return err
		}
	}

	rows, err := tx.QueryContext(ctx, `SELECT id, perm_create_connection, perm_ai_settings, perm_mcp_settings,
		perm_cli, perm_import, perm_export, perm_ai_use FROM users WHERE permissions = ''`)
	if err != nil {
		return err
	}

	type row struct {
		id    string
		flags [7]bool
	}

	var users []row

	for rows.Next() {
		var r row
		if err := rows.Scan(&r.id, &r.flags[0], &r.flags[1], &r.flags[2], &r.flags[3], &r.flags[4], &r.flags[5], &r.flags[6]); err != nil {
			_ = rows.Close()

			return err
		}

		users = append(users, r)
	}

	if err := rows.Err(); err != nil {
		return err
	}

	_ = rows.Close()

	for _, u := range users {
		raw, err := json.Marshal(map[string]bool{
			"connection.create": u.flags[0],
			"ai.settings":       u.flags[1],
			"ai.mcp":            u.flags[2],
			"data.cli":          u.flags[3],
			"data.import":       u.flags[4],
			"data.export":       u.flags[5],
			"ai.use":            u.flags[6],
		})
		if err != nil {
			return err
		}

		if _, err := tx.ExecContext(ctx, "UPDATE users SET permissions = ? WHERE id = ?", string(raw), u.id); err != nil {
			return err
		}
	}

	return nil
}

func downUserPermissionSet(_ context.Context, _ *sql.Tx) error {
	// SQLite cannot drop columns portably; the extra column is harmless and the old flag columns are untouched.
	return nil
}
