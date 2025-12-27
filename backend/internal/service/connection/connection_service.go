package serviceConnection

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/container"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	"github.com/dbo-studio/dbo/internal/repository"
	"github.com/dbo-studio/dbo/pkg/cache"
)

type IConnectionService interface {
	Index(ctx context.Context) (*dto.ConnectionsResponse, error)
	Create(ctx context.Context, req *dto.CreateConnectionRequest) (*dto.ConnectionDetailResponse, error)
	Detail(ctx context.Context, req *dto.ConnectionDetailRequest) (*dto.ConnectionDetailResponse, error)
	Update(ctx context.Context, connectionId int32, req *dto.UpdateConnectionRequest) (*dto.ConnectionDetailResponse, error)
	Delete(ctx context.Context, connectionId int32) (*dto.ConnectionsResponse, error)
	Ping(ctx context.Context, req *dto.CreateConnectionRequest) error
}

type IConnectionServiceImpl struct {
	connectionRepo repository.IConnectionRepo
	cm             *databaseConnection.ConnectionManager
	cache          cache.Cache
}

func NewConnectionService(
	connectionRepo repository.IConnectionRepo,
	cm *databaseConnection.ConnectionManager,
) IConnectionService {
	return &IConnectionServiceImpl{
		connectionRepo: connectionRepo,
		cm:             cm,
		cache:          container.Instance().Cache(),
	}
}

func (s IConnectionServiceImpl) Index(ctx context.Context) (*dto.ConnectionsResponse, error) {
	connections, err := s.connectionRepo.Index(ctx)
	if err != nil {
		return nil, err
	}

	return connectionsToResponse(connections), nil
}
