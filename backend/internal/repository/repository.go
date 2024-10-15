package repository

import (
	"context"
	"github.com/dbo-studio/dbo/internal/contract"
	"github.com/dbo-studio/dbo/internal/driver"
	"github.com/dbo-studio/dbo/pkg/cache"
	"gorm.io/gorm"
)

type Repository struct {
	ConnectionRepo contract.IConnectionRepo
	CacheRepo      contract.ICacheRepo
	HistoryRepo    contract.IHistoryRepo
	SavedQueryRepo contract.ISavedQueryRepo
}

func NewRepository(_ context.Context, db *gorm.DB, cache cache.Cache, drivers *driver.DriverEngine) *Repository {
	return &Repository{
		ConnectionRepo: NewConnectionRepo(db, drivers),
		CacheRepo:      NewCacheRepo(cache, drivers, db),
		HistoryRepo:    NewHistoryRepo(db),
		SavedQueryRepo: NewSavedQueryRepo(db),
	}
}
