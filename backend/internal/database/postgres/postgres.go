package databasePostgres

import (
	"context"
	"strings"

	"github.com/dbo-studio/dbo/internal/app/dto"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	databaseCore "github.com/dbo-studio/dbo/internal/database/core"
	"github.com/dbo-studio/dbo/internal/model"
)

type PostgresRepository struct {
	base *databaseCore.BaseRepository
}

func NewPostgresRepository(ctx context.Context, connection *model.Connection, cm *databaseConnection.ConnectionManager) (contract.DatabaseRepository, error) {
	base, err := databaseCore.NewBaseRepository(ctx, connection, cm)
	if err != nil {
		return nil, err
	}

	return &PostgresRepository{
		base: base,
	}, nil
}

func (r *PostgresRepository) Version(ctx context.Context) (string, error) {
	var version string

	result := r.base.DB().WithContext(ctx).Raw("SELECT version()").Scan(&version)
	version = strings.Split(version, " ")[1]

	return version, result.Error
}

func (r *PostgresRepository) ImportData(ctx context.Context, job dto.ImportJob, rows [][]string, columns []string) (*contract.ImportResult, error) {
	return r.base.ImportData(ctx, job, rows, columns)
}
