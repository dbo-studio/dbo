package repository

import (
	"context"

	"github.com/dbo-studio/dbo/api/dto"
	"github.com/dbo-studio/dbo/model"
)

type IConnectionRepo interface {
	ConnectionList(ctx context.Context) (*[]model.Connection, error)
	FindConnection(ctx context.Context, id int32) (*model.Connection, error)
	CreateConnection(ctx context.Context, dto *dto.CreateConnectionRequest) (*model.Connection, error)
	DeleteConnection(ctx context.Context, connection *model.Connection) error
}

type ICacheRepo interface {
	GetDatabaseVersion(ctx context.Context, connectionID uint, fromCache bool) (string, error)
	GetConnectionDatabases(ctx context.Context, connectionID uint, fromCache bool) ([]string, error)
	GetConnectionSchemas(ctx context.Context, connectionID uint, databaseName string, fromCache bool) ([]string, error)
	GeDatabaseTables(ctx context.Context, connectionID uint, schemaName string, fromCache bool) ([]string, error)

	FlushCache(ctx context.Context) error
}

type Repository struct {
	ConnectionRepo IConnectionRepo
	CacheRepo      ICacheRepo
}

func NewRepository(ctx context.Context) *Repository {
	return &Repository{
		ConnectionRepo: NewConnectionRepo(),
		CacheRepo:      NewCacheRepo(),
	}
}
