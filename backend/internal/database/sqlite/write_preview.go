package databaseSqlite

import (
	"context"
	"errors"

	"github.com/dbo-studio/dbo/pkg/apperror"
	"gorm.io/gorm"
)

var errRollBack = errors.New("roll back the preview")

func (r *SQLiteRepository) PreviewWrite(ctx context.Context, statements []string, _, _ *string) ([]int64, error) {
	affected := make([]int64, 0, len(statements))

	err := r.base.DB().WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, sql := range statements {
			result := tx.Exec(sql)
			if result.Error != nil {
				return result.Error
			}

			affected = append(affected, result.RowsAffected)
		}

		return errRollBack
	})
	if err != nil && !errors.Is(err, errRollBack) {
		return nil, apperror.DriverError(err)
	}

	return affected, nil
}
