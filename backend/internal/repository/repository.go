package repository

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/model"
	"github.com/dbo-studio/dbo/pkg/cache"
	"gorm.io/gorm"
)

type IConnectionRepo interface {
	Index(ctx context.Context) (*[]model.Connection, error)
	Find(ctx context.Context, id int32) (*model.Connection, error)
	Create(ctx context.Context, dto *dto.CreateConnectionRequest) (*model.Connection, error)
	Delete(ctx context.Context, connection *model.Connection) error
	Update(ctx context.Context, connection *model.Connection, req *dto.UpdateConnectionRequest) (*model.Connection, error)
	UpdateVersion(ctx context.Context, connection *model.Connection, version string) (*model.Connection, error)
	MakeAllConnectionsNotDefault(ctx context.Context, connection *model.Connection, req *dto.UpdateConnectionRequest) error
}

type ICacheRepo interface {
	GetDatabaseVersion(ctx context.Context, connectionID uint, fromCache bool) (string, error)
	GetConnectionDatabases(ctx context.Context, connectionID uint, fromCache bool) ([]string, error)
	GetConnectionSchemas(ctx context.Context, connectionID uint, databaseName string, fromCache bool) ([]string, error)
	GeDatabaseTables(ctx context.Context, connectionID uint, schemaName string, fromCache bool) ([]string, error)
	FlushCache(ctx context.Context) error
}

type IHistoryRepo interface {
	Index(ctx context.Context, pagination *dto.HistoryListRequest) (*[]model.History, error)
}

type ISavedQueryRepo interface {
	Index(ctx context.Context, pagination *dto.PaginationRequest) (*[]model.SavedQuery, error)
	Find(ctx context.Context, id int32) (*model.SavedQuery, error)
	Create(ctx context.Context, dto *dto.CreateSavedQueryRequest) (*model.SavedQuery, error)
	Delete(ctx context.Context, query *model.SavedQuery) error
	Update(ctx context.Context, query *model.SavedQuery, req *dto.UpdateSavedQueryRequest) (*model.SavedQuery, error)
}

type Repository struct {
	ConnectionRepo IConnectionRepo
	CacheRepo      ICacheRepo
	HistoryRepo    IHistoryRepo
	SavedQueryRepo ISavedQueryRepo
}

func NewRepository(_ context.Context, db *gorm.DB, cache cache.Cache) *Repository {
	return &Repository{
		ConnectionRepo: NewConnectionRepo(db),
		HistoryRepo:    NewHistoryRepo(db),
		SavedQueryRepo: NewSavedQueryRepo(db),
	}
}
