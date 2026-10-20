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

func (r *PostgresRepository) PreviewWrite(ctx context.Context, sql string, database, schema *string) (int64, error) {
	conn, err := r.db(ctx, database)
	if err != nil {
		return 0, apperror.DriverError(err)
	}

	var affected int64

	err = conn.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if name := lo.FromPtr(schema); name != "" {
			if err := tx.Exec("SET LOCAL search_path TO " + quote.PostgresIdent(name)).Error; err != nil {
				return err
			}
		}

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
