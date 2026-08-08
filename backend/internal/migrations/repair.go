package migrations

import (
	"context"
	"database/sql"
)

// repairGooseVersionTable fixes a broken goose state where goose_db_version exists but
// has no applied rows. Goose then returns ErrNoNextVersion and skips all migrations.
func repairGooseVersionTable(ctx context.Context, db *sql.DB) error {
	var tableExists int
	if err := db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='goose_db_version'
	`).Scan(&tableExists); err != nil {
		return err
	}

	if tableExists == 0 {
		return nil
	}

	var applied int
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM goose_db_version WHERE is_applied = 1`).Scan(&applied); err != nil {
		return err
	}

	if applied > 0 {
		return nil
	}

	var rowCount int
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM goose_db_version`).Scan(&rowCount); err != nil {
		return err
	}

	if rowCount > 0 {
		return nil
	}

	var hasConnections int
	if err := db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='connections'
	`).Scan(&hasConnections); err != nil {
		return err
	}

	if hasConnections > 0 {
		for v := 1; v <= 4; v++ {
			if _, err := db.ExecContext(ctx, `
				INSERT INTO goose_db_version (version_id, is_applied) VALUES (?, 1)
			`, v); err != nil {
				return err
			}
		}

		return nil
	}

	_, err := db.ExecContext(ctx, `INSERT INTO goose_db_version (version_id, is_applied) VALUES (0, 1)`)

	return err
}
