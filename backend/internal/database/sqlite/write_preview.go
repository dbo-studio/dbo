package databaseSqlite

import (
	"context"
	"errors"

	"github.com/dbo-studio/dbo/pkg/apperror"
	"gorm.io/gorm"
)

var errRollBack = errors.New("roll back the preview")

func (r *SQLiteRepository) PreviewWrite(ctx context.Context, sql string, _, _ *string) (int64, error) {
	var affected int64

	err := r.base.DB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		result := tx.Exec(sql)
		affected = result.RowsAffected

		if result.Error != nil {
			return result.Error
		}

		return errRollBack
	})
	if err != nil && !errors.Is(err, errRollBack) {
		return 0, apperror.DriverError(err)
	}

	return affected, nil
}
