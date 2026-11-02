package migrations

import (
	"context"
	"database/sql"

	"github.com/pressly/goose/v3"
)

func init() {
	goose.AddMigrationContext(upQuestionParams, downQuestionParams)
}

// upQuestionParams stores a report's default {{filter}} values.
func upQuestionParams(ctx context.Context, tx *sql.Tx) error {
	has, err := sqliteHasColumn(ctx, tx, "questions", "params_json")
	if err != nil || has {
		return err
	}

	_, err = tx.ExecContext(ctx, "ALTER TABLE questions ADD COLUMN params_json TEXT NOT NULL DEFAULT '{}'")

	return err
}

func downQuestionParams(ctx context.Context, tx *sql.Tx) error {
	_, err := tx.ExecContext(ctx, "ALTER TABLE questions DROP COLUMN params_json")

	return err
}
