package databaseCore

import (
	"context"

	"github.com/dbo-studio/dbo/internal/container"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	databaseContract "github.com/dbo-studio/dbo/internal/database/contract"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/dbo-studio/dbo/pkg/helper"
	"github.com/dbo-studio/dbo/pkg/logger"
	"gorm.io/gorm"
)

type BaseRepository struct {
	db         *gorm.DB
	connection *model.Connection
	cm         *databaseConnection.ConnectionManager
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
		cm:         cm,
		cache:      container.Instance().Cache(),
		logger:     container.Instance().Logger(),
	}, nil
}

func (b *BaseRepository) DB() *gorm.DB {
	return b.db
}

func (b *BaseRepository) DBForDatabase(ctx context.Context, database string) (*gorm.DB, error) {
	if database == "" || b.connection.ConnectionType != string(databaseContract.Postgresql) {
		return b.db, nil
	}

	return b.cm.GetConnectionForDatabase(ctx, b.connection, database, true)
}

func (b *BaseRepository) CloseDatabase(ctx context.Context, database string) error {
	if database == "" || b.cm == nil {
		return nil
	}

	return b.cm.CloseDatabase(ctx, helper.CtxOwnerID(ctx), b.connection.ID, database)
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
