package service

import (
	"github.com/dbo-studio/dbo/internal/repository"
	serviceConnection "github.com/dbo-studio/dbo/internal/service/connection"
	serviceDatabase "github.com/dbo-studio/dbo/internal/service/database"
)

type Service struct {
	ConnectionService serviceConnection.IConnectionService
	DatabaseService   serviceDatabase.IDatabaseService
}

func NewService(repo *repository.Repository) *Service {
	return &Service{
		ConnectionService: serviceConnection.NewConnectionService(repo.ConnectionRepo, repo.CacheRepo),
		DatabaseService:   serviceDatabase.NewDatabaseService(repo.ConnectionRepo),
	}
}
