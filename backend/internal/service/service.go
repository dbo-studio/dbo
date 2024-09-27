package service

import (
	"github.com/dbo-studio/dbo/internal/repository"
	serviceConnection "github.com/dbo-studio/dbo/internal/service/connection"
)

type Service struct {
	ConnectionService serviceConnection.IConnectionService
}

func NewService(repo *repository.Repository) *Service {
	return &Service{
		ConnectionService: serviceConnection.NewConnectionService(repo.ConnectionRepo, repo.CacheRepo),
	}
}
