package databaseGeneric

import (
	"context"
	"errors"
	"fmt"

	"github.com/dbo-studio/dbo/pkg/apperror"
	"gorm.io/gorm"
)

var errRollBack = errors.New("roll back the preview")

func (r *Repository) PreviewWrite(ctx context.Context, statements []string, _, _ *string) ([]int64, error) {
	if !r.d.Editable() || !r.d.Transactional() {
		return nil, apperror.Validation(fmt.Errorf("%s has no transactions, so a write cannot be previewed", r.base.Connection().ConnectionType))
	}

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
