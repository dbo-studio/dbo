package service

import (
	"github.com/dbo-studio/dbo/internal/driver"
	"github.com/dbo-studio/dbo/internal/repository"
	serviceConnection "github.com/dbo-studio/dbo/internal/service/connection"
	serviceDatabase "github.com/dbo-studio/dbo/internal/service/database"
	serviceDesign "github.com/dbo-studio/dbo/internal/service/design"
	serviceHistory "github.com/dbo-studio/dbo/internal/service/history"
	serviceSavedQuery "github.com/dbo-studio/dbo/internal/service/saved_query"
)

type Service struct {
	ConnectionService serviceConnection.IConnectionService
	DatabaseService   serviceDatabase.IDatabaseService
	DesignService     serviceDesign.IDesignService
	HistoryService    serviceHistory.IHistoryService
	SavedQueryService serviceSavedQuery.ISavedQueryService
}

func NewService(repo *repository.Repository, drivers *driver.DriverEngine) *Service {
	return &Service{
		ConnectionService: serviceConnection.NewConnectionService(drivers, repo.ConnectionRepo, repo.CacheRepo),
		DatabaseService:   serviceDatabase.NewDatabaseService(repo.ConnectionRepo, drivers),
		DesignService:     serviceDesign.NewDesignService(repo.ConnectionRepo, drivers),
		HistoryService:    serviceHistory.NewHistoryService(repo.HistoryRepo),
		SavedQueryService: serviceSavedQuery.NewSavedQueryService(repo.SavedQueryRepo),
	}
}
