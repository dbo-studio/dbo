package databaseCore

import (
	"context"

	"github.com/dbo-studio/dbo/internal/container"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/dbo-studio/dbo/pkg/logger"
	"gorm.io/gorm"
)

type BaseRepository struct {
	db         *gorm.DB
	connection *model.Connection
	cache      cache.Cache
	logger     logger.Logger
}

func NewBaseRepository(ctx context.Context, connection *model.Connection, cm *databaseConnection.ConnectionManager) (*BaseRepository, error) {
	db, err := cm.GetConnection(ctx, connection, true)
	if err != nil {
		return nil, err
	}

	return &BaseRepository{
		db:         db,
		connection: connection,
		cache:      container.Instance().Cache(),
		logger:     container.Instance().Logger(),
	}, nil
}

func (b *BaseRepository) DB() *gorm.DB {
	return b.db
}

func (b *BaseRepository) Connection() *model.Connection {
	return b.connection
}

func (b *BaseRepository) Cache() cache.Cache {
	return b.cache
}

func (b *BaseRepository) Logger() logger.Logger {
	return b.logger
}
