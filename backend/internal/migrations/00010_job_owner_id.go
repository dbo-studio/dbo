package migrations

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upJobOwnerID, downJobOwnerID)
}

type jobOwnerRow struct {
	ID   int64
	Data []byte
}

func upJobOwnerID(ctx context.Context, tx *sql.Tx) error {
	has, err := sqliteHasColumn(ctx, tx, "jobs", "owner_id")
	if err != nil {
		return err
	}

	if has {
		return backfillJobOwnerID(ctx, tx)
	}

	if _, err := tx.ExecContext(ctx, "ALTER TABLE jobs ADD COLUMN owner_id TEXT NOT NULL DEFAULT ''"); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, "CREATE INDEX IF NOT EXISTS idx_jobs_owner_id ON jobs(owner_id)"); err != nil {
		return err
	}

	return backfillJobOwnerID(ctx, tx)
}

// backfillJobOwnerID copies ownerId from the job Data JSON payload into the
// new column. Done in Go (not SQL json_extract) to avoid depending on the
// SQLite build having JSON1 enabled.
func backfillJobOwnerID(ctx context.Context, tx *sql.Tx) error {
	rows, err := tx.QueryContext(ctx, "SELECT id, data FROM jobs WHERE owner_id = '' OR owner_id IS NULL")
	if err != nil {
		return err
	}
	defer rows.Close()

	type ownerUpdate struct {
		id    int64
		owner string
	}

	var updates []ownerUpdate

	for rows.Next() {
		var row jobOwnerRow
		if err := rows.Scan(&row.ID, &row.Data); err != nil {
			return err
		}

		var payload struct {
			OwnerID string `json:"ownerId"`
		}
		if err := json.Unmarshal(row.Data, &payload); err != nil || payload.OwnerID == "" {
			continue
		}

		updates = append(updates, ownerUpdate{id: row.ID, owner: payload.OwnerID})
	}

	if err := rows.Err(); err != nil {
		return err
	}

	for _, u := range updates {
		if _, err := tx.ExecContext(ctx, "UPDATE jobs SET owner_id = ? WHERE id = ?", u.owner, u.id); err != nil {
			return err
		}
	}

	return nil
}

func downJobOwnerID(ctx context.Context, tx *sql.Tx) error {
	// SQLite does not support dropping columns; drop only the index.
	_, err := tx.ExecContext(ctx, "DROP INDEX IF EXISTS idx_jobs_owner_id")

	return err
}
