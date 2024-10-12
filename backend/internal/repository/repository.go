package repository

import (
	"context"
	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/driver"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/cache"
	"gorm.io/gorm"
)

type IConnectionRepo interface {
	ConnectionList(ctx context.Context) (*[]model.Connection, error)
	FindConnection(ctx context.Context, id int32) (*model.Connection, error)
	CreateConnection(ctx context.Context, dto *dto.CreateConnectionRequest) (*model.Connection, error)
	DeleteConnection(ctx context.Context, connection *model.Connection) error
	UpdateConnection(ctx context.Context, connection *model.Connection, req *dto.UpdateConnectionRequest) (*model.Connection, error)
	MakeAllConnectionsNotDefault(ctx context.Context, connection *model.Connection, req *dto.UpdateConnectionRequest) error
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

func NewRepository(_ context.Context, db *gorm.DB, cache cache.Cache, drivers *driver.DriverEngine) *Repository {
	return &Repository{
		ConnectionRepo: NewConnectionRepo(db, drivers),
		CacheRepo:      NewCacheRepo(cache, drivers),
	}
}
