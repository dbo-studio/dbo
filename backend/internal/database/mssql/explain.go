package databaseMssql

import (
	"context"
	"database/sql/driver"
	"errors"
	"time"

	"gorm.io/gorm"
)

// ShowPlan uses a single session so SHOWPLAN cannot affect regular queries in the pool.
func ShowPlan(ctx context.Context, db *gorm.DB, statement string) (plan string, err error) {
	pool, err := db.DB()
	if err != nil {
		return "", err
	}

	session, err := pool.Conn(ctx)
	if err != nil {
		return "", err
	}
	defer session.Close()

	if _, err := session.ExecContext(ctx, "SET SHOWPLAN_XML ON"); err != nil {
		_ = session.Raw(func(any) error { return driver.ErrBadConn })

		return "", err
	}

	defer func() {
		cleanup, cancel := context.WithTimeout(context.WithoutCancel(ctx), 3*time.Second)
		defer cancel()

		if _, resetErr := session.ExecContext(cleanup, "SET SHOWPLAN_XML OFF"); resetErr != nil {
			_ = session.Raw(func(any) error { return driver.ErrBadConn })
			err = errors.Join(err, resetErr)
		}
	}()

	err = session.QueryRowContext(ctx, statement).Scan(&plan)

	return plan, err
}
