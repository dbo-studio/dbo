package databaseMysql

import (
	"context"
	"fmt"

	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/samber/lo"
)

func (r *MySQLRepository) PreviewWrite(ctx context.Context, sql string, database, _ *string) (int64, error) {
	name := lo.FromPtr(database)

	// A table that cannot roll back (MyISAM) would really change.
	var unsafe []string

	err := r.base.DB().WithContext(ctx).Raw(
		"SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' AND ENGINE <> 'InnoDB'", name,
	).Scan(&unsafe).Error
	if err != nil {
		return 0, apperror.DriverError(err)
	}

	if len(unsafe) > 0 {
		return 0, apperror.DriverError(fmt.Errorf("rows cannot be counted without changing them: table %s does not use InnoDB", unsafe[0]))
	}

	sqlDB, err := r.base.DB().DB()
	if err != nil {
		return 0, apperror.DriverError(err)
	}

	conn, err := sqlDB.Conn(ctx)
	if err != nil {
		return 0, apperror.DriverError(err)
	}
	defer conn.Close()

	if _, err := conn.ExecContext(ctx, "USE "+databaseCore.QuoteMySQLIdent(name)); err != nil {
		return 0, apperror.DriverError(err)
	}

	tx, err := conn.BeginTx(ctx, nil)
	if err != nil {
		return 0, apperror.DriverError(err)
	}
	defer func() { _ = tx.Rollback() }()

	result, err := tx.ExecContext(ctx, sql)
	if err != nil {
		return 0, apperror.DriverError(err)
	}

	affected, err := result.RowsAffected()
	if err != nil {
		return 0, apperror.DriverError(err)
	}

	return affected, nil
}
