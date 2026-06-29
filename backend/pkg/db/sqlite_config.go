package db

import (
	"fmt"

	"gorm.io/gorm"
)

const (
	appSQLiteBusyTimeoutMs = 5000
)

func appSQLiteDSN(path string) string {
	return fmt.Sprintf("%s?_pragma=busy_timeout(%d)&_pragma=journal_mode(WAL)", path, appSQLiteBusyTimeoutMs)
}

func configureAppSQLite(db *gorm.DB) error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}

	sqlDB.SetMaxOpenConns(1)
	sqlDB.SetMaxIdleConns(1)

	if _, err := sqlDB.Exec("PRAGMA journal_mode=WAL"); err != nil {
		return err
	}

	_, err = sqlDB.Exec(fmt.Sprintf("PRAGMA busy_timeout=%d", appSQLiteBusyTimeoutMs))
	return err
}
