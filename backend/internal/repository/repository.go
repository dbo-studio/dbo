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
	Create(ctx context.Context, connectionID uint, query string) error
	DeleteAll(_ context.Context, connectionID uint) error
}

type ISavedQueryRepo interface {
	Index(ctx context.Context, pagination *dto.SavedQueryListRequest) (*[]model.SavedQuery, error)
	Find(ctx context.Context, id int32) (*model.SavedQuery, error)
	Create(ctx context.Context, dto *dto.CreateSavedQueryRequest) (*model.SavedQuery, error)
	Delete(ctx context.Context, query *model.SavedQuery) error
	Update(ctx context.Context, query *model.SavedQuery, req *dto.UpdateSavedQueryRequest) (*model.SavedQuery, error)
}

type IJobRepo interface {
	Create(ctx context.Context, job *model.Job) error
	Find(ctx context.Context, id int32) (*model.Job, error)
	Update(ctx context.Context, job *model.Job) error
	GetPendingJobs(ctx context.Context) ([]model.Job, error)
	GetRunningJobs(ctx context.Context) ([]model.Job, error)
	DeleteOldJobs(ctx context.Context, days int) error
}

type Repository struct {
	DB             *gorm.DB
	ConnectionRepo IConnectionRepo
	CacheRepo      ICacheRepo
	HistoryRepo    IHistoryRepo
	SavedQueryRepo ISavedQueryRepo
	JobRepo        IJobRepo
}

func NewRepository(_ context.Context, db *gorm.DB, cache cache.Cache) *Repository {
	return &Repository{
		DB:             db,
		ConnectionRepo: NewConnectionRepo(db),
		HistoryRepo:    NewHistoryRepo(db),
		SavedQueryRepo: NewSavedQueryRepo(db),
		JobRepo:        NewJobRepo(db),
	}
}
