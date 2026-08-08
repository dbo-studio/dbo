package databaseSqlite

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
	"github.com/dbo-studio/dbo/internal/model"
)

type SQLiteRepository struct {
	base *databaseCore.BaseRepository
}

func NewSQLiteRepository(ctx context.Context, connection *model.Connection, cm *databaseConnection.ConnectionManager) (contract.DatabaseRepository, error) {
	base, err := databaseCore.NewBaseRepository(ctx, connection, cm)
	if err != nil {
		return nil, err
	}

	return &SQLiteRepository{
		base: base,
	}, nil
}

func (r *SQLiteRepository) Version(ctx context.Context) (string, error) {
	var version string

	result := r.base.DB().WithContext(ctx).Raw("SELECT sqlite_version()").Scan(&version)

	return version, result.Error
}

func (r *SQLiteRepository) ImportData(ctx context.Context, job dto.ImportJob, rows [][]string, columns []string) (*contract.ImportResult, error) {
	return r.base.ImportData(ctx, job, rows, columns)
}
