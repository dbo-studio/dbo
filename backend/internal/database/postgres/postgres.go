package databasePostgres

import (
	"context"
	"strings"

	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/cache"
	"gorm.io/gorm"
)

type PostgresRepository struct {
	db         *gorm.DB
	connection *model.Connection
	cache      cache.Cache
}

func NewPostgresRepository(ctx context.Context, connection *model.Connection, cm *databaseConnection.ConnectionManager, cache cache.Cache) (contract.DatabaseRepository, error) {
	db, err := cm.GetConnection(ctx, connection)
	if err != nil {
		return nil, err
	}
	return &PostgresRepository{
		db:         db,
		connection: connection,
		cache:      cache,
	}, nil
}

func (r *PostgresRepository) Version() (string, error) {
	var version string
	result := r.db.Raw("SELECT version()").Scan(&version)
	version = strings.Split(version, " ")[1]

	return version, result.Error
}
