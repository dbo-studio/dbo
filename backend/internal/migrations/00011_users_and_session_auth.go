package migrations

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upUsersAndSessionAuth, downUsersAndSessionAuth)
}

func upUsersAndSessionAuth(ctx context.Context, tx *sql.Tx) error {
	if _, err := tx.ExecContext(ctx, `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  must_change_password INTEGER NOT NULL DEFAULT 0,
  disabled_at DATETIME,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
)`); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)`); err != nil {
		return err
	}

	for _, col := range []struct {
		name string
		ddl  string
	}{
		{"user_id", "ALTER TABLE web_sessions ADD COLUMN user_id TEXT"},
		{"absolute_expires_at", "ALTER TABLE web_sessions ADD COLUMN absolute_expires_at DATETIME"},
	} {
		has, err := sqliteHasColumn(ctx, tx, "web_sessions", col.name)
		if err != nil {
			return err
		}

		if has {
			continue
		}

		if _, err := tx.ExecContext(ctx, col.ddl); err != nil {
			return fmt.Errorf("add web_sessions.%s: %w", col.name, err)
		}
	}

	if _, err := tx.ExecContext(ctx, `
CREATE INDEX IF NOT EXISTS idx_web_sessions_user_id ON web_sessions(user_id)`); err != nil {
		return err
	}

	// Backfill absolute expiry for existing sessions (7 days from created_at).
	_, err := tx.ExecContext(ctx, `
UPDATE web_sessions
SET absolute_expires_at = datetime(created_at, '+7 days')
WHERE absolute_expires_at IS NULL`)

	return err
}

func downUsersAndSessionAuth(ctx context.Context, tx *sql.Tx) error {
	if _, err := tx.ExecContext(ctx, "DROP INDEX IF EXISTS idx_web_sessions_user_id"); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, "DROP INDEX IF EXISTS idx_users_email"); err != nil {
		return err
	}

	_, err := tx.ExecContext(ctx, "DROP TABLE IF EXISTS users")

	return err
}
