package serviceBackup

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"gorm.io/gorm"
)

var ErrSQLiteTargetNotEmpty = errors.New("target SQLite database is not empty")

type sqliteObject struct {
	Type string
	Name string
	SQL  string
}

// RestoreSQLite copies every object and row of a SQLite backup file into an
// empty target. It uses ATTACH on one pinned connection, so no external tool is
// needed and the target file stays open.
func RestoreSQLite(ctx context.Context, db *gorm.DB, artifactPath string) error {
	pool, err := db.DB()
	if err != nil {
		return err
	}

	// ATTACH and PRAGMA are per connection, so everything runs on one.
	c, err := pool.Conn(ctx)
	if err != nil {
		return err
	}

	defer func() { _ = c.Close() }()

	var existing int
	if err := c.QueryRowContext(ctx, "SELECT count(*) FROM main.sqlite_master WHERE name NOT LIKE 'sqlite_%'").Scan(&existing); err != nil {
		return err
	}

	if existing > 0 {
		return ErrSQLiteTargetNotEmpty
	}

	if _, err := c.ExecContext(ctx, "ATTACH DATABASE ? AS bk", artifactPath); err != nil {
		return err
	}

	defer func() { _, _ = c.ExecContext(context.WithoutCancel(ctx), "DETACH DATABASE bk") }()

	objects, err := readSQLiteObjects(ctx, c)
	if err != nil {
		return err
	}

	// Foreign keys stay off so rows load in any table order. The pragma is a
	// no-op inside a transaction, so it is set before BEGIN.
	if _, err := c.ExecContext(ctx, "PRAGMA foreign_keys = OFF"); err != nil {
		return err
	}

	defer func() { _, _ = c.ExecContext(context.WithoutCancel(ctx), "PRAGMA foreign_keys = ON") }()

	tx, err := c.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	if err := replaySQLite(ctx, tx, objects); err != nil {
		_ = tx.Rollback()

		return err
	}

	return tx.Commit()
}

func readSQLiteObjects(ctx context.Context, c *sql.Conn) ([]sqliteObject, error) {
	rows, err := c.QueryContext(ctx, "SELECT type, name, sql FROM bk.sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY rowid")
	if err != nil {
		return nil, err
	}

	defer func() { _ = rows.Close() }()

	var objects []sqliteObject

	for rows.Next() {
		var o sqliteObject
		if err := rows.Scan(&o.Type, &o.Name, &o.SQL); err != nil {
			return nil, err
		}

		objects = append(objects, o)
	}

	return objects, rows.Err()
}

// replaySQLite creates tables first, copies their rows, then adds indexes,
// views and triggers so triggers cannot fire during the copy.
func replaySQLite(ctx context.Context, tx *sql.Tx, objects []sqliteObject) error {
	for _, o := range objects {
		if o.Type != "table" {
			continue
		}

		if _, err := tx.ExecContext(ctx, o.SQL); err != nil {
			return fmt.Errorf("create %s: %w", o.Name, err)
		}

		quoted := `"` + strings.ReplaceAll(o.Name, `"`, `""`) + `"`

		if _, err := tx.ExecContext(ctx, "INSERT INTO main."+quoted+" SELECT * FROM bk."+quoted); err != nil {
			return fmt.Errorf("copy %s: %w", o.Name, err)
		}
	}

	for _, o := range objects {
		if o.Type == "table" {
			continue
		}

		if _, err := tx.ExecContext(ctx, o.SQL); err != nil {
			return fmt.Errorf("create %s: %w", o.Name, err)
		}
	}

	return nil
}
