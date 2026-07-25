package migrations

import (
	"context"
	"database/sql"
	"errors"

	"github.com/pressly/goose/v3"
)

func Up(ctx context.Context, db *sql.DB) error {
	if err := goose.SetDialect("sqlite3"); err != nil {
		return err
	}
	goose.SetBaseFS(FS)

	if err := repairGooseVersionTable(ctx, db); err != nil {
		return err
	}

	if err := goose.UpContext(ctx, db, "."); err != nil {
		if errors.Is(err, goose.ErrNoNextVersion) {
			return nil
		}
		return err
	}
	return nil
}
