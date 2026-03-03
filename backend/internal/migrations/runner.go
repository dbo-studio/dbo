package migrations

import (
	"context"
	"database/sql"
	"errors"
	"io/fs"

	"github.com/pressly/goose/v3"
)

func Up(ctx context.Context, db *sql.DB) error {
	goose.SetDialect("sqlite3")
	goose.SetBaseFS(FS)

	sub, err := fs.Sub(FS, ".")
	if err == nil {
		goose.SetBaseFS(sub)
	}

	if err := goose.UpContext(ctx, db, "."); err != nil {
		if errors.Is(err, goose.ErrNoNextVersion) {
			return nil
		}
		return err
	}
	return nil
}
