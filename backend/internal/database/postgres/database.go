package databasePostgres

import (
	"context"

	"github.com/samber/lo"
	"gorm.io/gorm"
)

func (r *PostgresRepository) db(ctx context.Context, database *string) (*gorm.DB, error) {
	if database == nil || lo.FromPtr(database) == "" {
		return r.base.DB(), nil
	}

	return r.base.DBForDatabase(ctx, lo.FromPtr(database))
}
