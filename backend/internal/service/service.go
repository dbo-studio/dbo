package service

import (
	"context"

	"github.com/dbo-studio/dbo/api/dto"
	"github.com/dbo-studio/dbo/internal/repository"
)

type IConnectionService interface {
	CreateConnection(ctx context.Context, req *dto.CreateConnectionRequest) (*dto.CreateConnectionResponse, error)
	ConnectionDetail(ctx context.Context, req *dto.ConnectionDetailRequest) (*dto.ConnectionDetailResponse, error)
}

type Service struct {
	ConnectionService IConnectionService
}

func NewService(repo *repository.Repository) *Service {
	return &Service{
		ConnectionService: NewConnectionService(repo.ConnectionRepo),
	}
}
