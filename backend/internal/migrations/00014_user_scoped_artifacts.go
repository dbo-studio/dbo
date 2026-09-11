package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upUserScopedArtifacts, downUserScopedArtifacts)
}

func upUserScopedArtifacts(ctx context.Context, tx *sql.Tx) error {
	tables := []string{"saved_queries", "histories", "ai_chats"}

	for _, table := range tables {
		if err := addOwnerIDColumn(ctx, tx, table); err != nil {
			return err
		}
	}

	return nil
}

func addOwnerIDColumn(ctx context.Context, tx *sql.Tx, table string) error {
	has, err := sqliteHasColumn(ctx, tx, table, "owner_id")
	if err != nil {
		return err
	}

	if !has {
		if _, err := tx.ExecContext(ctx, "ALTER TABLE "+table+" ADD COLUMN owner_id TEXT NOT NULL DEFAULT ''"); err != nil {
			return err
		}
	}

	if _, err := tx.ExecContext(ctx, "CREATE INDEX IF NOT EXISTS idx_"+table+"_owner_connection ON "+table+"(owner_id, connection_id)"); err != nil {
		return err
	}

	// Orphan rows (deleted connection) make the subquery NULL; COALESCE keeps NOT NULL.
	_, err = tx.ExecContext(ctx, `
UPDATE `+table+` SET owner_id = COALESCE((
  SELECT owner_id FROM connections WHERE connections.id = `+table+`.connection_id
), 'desktop') WHERE owner_id = '' OR owner_id IS NULL`)

	return err
}

func downUserScopedArtifacts(ctx context.Context, tx *sql.Tx) error {
	indexes := []string{
		"idx_saved_queries_owner_connection",
		"idx_histories_owner_connection",
		"idx_ai_chats_owner_connection",
	}

	for _, index := range indexes {
		if _, err := tx.ExecContext(ctx, "DROP INDEX IF EXISTS "+index); err != nil {
			return err
		}
	}

	return nil
}
