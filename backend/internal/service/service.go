package service

import (
	"context"

	"github.com/dbo-studio/dbo/api/dto"
	"github.com/dbo-studio/dbo/internal/repository"
)

type IConnectionService interface {
	Connections(ctx context.Context) (*[]dto.ConnectionsResponse, error)
	CreateConnection(ctx context.Context, req *dto.CreateConnectionRequest) (*dto.ConnectionDetailResponse, error)
	ConnectionDetail(ctx context.Context, req *dto.ConnectionDetailRequest) (*dto.ConnectionDetailResponse, error)
	DeleteConnection(ctx context.Context, connectionId int32) (*[]dto.ConnectionsResponse, error)
}

type Service struct {
	ConnectionService IConnectionService
}

func NewService(repo *repository.Repository) *Service {
	return &Service{
		ConnectionService: NewConnectionService(repo.ConnectionRepo),
	}
}
