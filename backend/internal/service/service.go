package service

import (
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	"github.com/dbo-studio/dbo/internal/repository"
	serviceConnection "github.com/dbo-studio/dbo/internal/service/connection"
	serviceHistory "github.com/dbo-studio/dbo/internal/service/history"
	serviceQuery "github.com/dbo-studio/dbo/internal/service/query"
	serviceSavedQuery "github.com/dbo-studio/dbo/internal/service/saved_query"
	serviceTree "github.com/dbo-studio/dbo/internal/service/tree"
)

type Service struct {
	ConnectionService serviceConnection.IConnectionService
	HistoryService    serviceHistory.IHistoryService
	SavedQueryService serviceSavedQuery.ISavedQueryService
	TreeService       serviceTree.ITreeService
	QueryService      serviceQuery.IQueryService
}

func NewService(repo *repository.Repository, cm *databaseConnection.ConnectionManager) *Service {
	return &Service{
		ConnectionService: serviceConnection.NewConnectionService(repo.ConnectionRepo),
		HistoryService:    serviceHistory.NewHistoryService(repo.HistoryRepo),
		SavedQueryService: serviceSavedQuery.NewSavedQueryService(repo.SavedQueryRepo),
		TreeService:       serviceTree.NewTreeService(repo.ConnectionRepo, cm),
		QueryService:      serviceQuery.NewQueryService(repo.ConnectionRepo, cm),
	}
}
