package databasePostgres

import (
	"context"
	"errors"

	quote "github.com/dbo-studio/dbo/internal/database/ddl/quote"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/samber/lo"
	"gorm.io/gorm"
)

var errRollBack = errors.New("roll back the preview")

func (r *PostgresRepository) PreviewWrite(ctx context.Context, statements []string, database, schema *string) ([]int64, error) {
	conn, err := r.db(ctx, database)
	if err != nil {
		return nil, apperror.DriverError(err)
	}

	affected := make([]int64, 0, len(statements))

	err = conn.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if name := lo.FromPtr(schema); name != "" {
			if err := tx.Exec("SET LOCAL search_path TO " + quote.PostgresIdent(name)).Error; err != nil {
				return err
			}
		}

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
