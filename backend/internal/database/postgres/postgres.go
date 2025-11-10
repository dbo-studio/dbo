package databasePostgres

import (
	"context"
	"strings"

	"github.com/dbo-studio/dbo/internal/container"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	contract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/dbo-studio/dbo/pkg/logger"
	"gorm.io/gorm"
)

type PostgresRepository struct {
	db         *gorm.DB
	connection *model.Connection
	cache      cache.Cache
	logger     logger.Logger
}

func NewPostgresRepository(ctx context.Context, connection *model.Connection, cm *databaseConnection.ConnectionManager) (contract.DatabaseRepository, error) {
	db, err := cm.GetConnection(ctx, connection)
	if err != nil {
		return nil, err
	}

	return &PostgresRepository{
		db:         db,
		connection: connection,
		cache:      container.Instance().Cache(),
		logger:     container.Instance().Logger(),
	}, nil
}

func (r *PostgresRepository) Version(ctx context.Context) (string, error) {
	var version string
	result := r.db.WithContext(ctx).Raw("SELECT version()").Scan(&version)
	version = strings.Split(version, " ")[1]

	return version, result.Error
}
