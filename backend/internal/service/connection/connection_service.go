package serviceConnection

import (
	"context"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/container"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	"github.com/dbo-studio/dbo/internal/repository"
	secretStore "github.com/dbo-studio/dbo/internal/service/secret_store"
	"github.com/dbo-studio/dbo/pkg/cache"
)

type IConnectionService interface {
	Index(ctx context.Context) (*dto.ConnectionsResponse, error)
	Create(ctx context.Context, req *dto.CreateConnectionRequest) error
	Update(ctx context.Context, connectionId int32, req *dto.UpdateConnectionRequest) error
	Delete(ctx context.Context, connectionId int32) (*dto.ConnectionsResponse, error)
	Close(ctx context.Context, connectionId int32) error
	Ping(ctx context.Context, req *dto.CreateConnectionRequest) error
	SetCredentials(ctx context.Context, connectionId int32, req *dto.ConnectionCredentialsRequest) error
}

type IConnectionServiceImpl struct {
	connectionRepo repository.IConnectionRepo
	cm             *databaseConnection.ConnectionManager
	cache          cache.Cache
	secrets        secretStore.ISecretStore
}

func NewConnectionService(
	connectionRepo repository.IConnectionRepo,
	cm *databaseConnection.ConnectionManager,
	secrets secretStore.ISecretStore,
) IConnectionService {
	return &IConnectionServiceImpl{
		connectionRepo: connectionRepo,
		cm:             cm,
		cache:          container.Instance().Cache(),
		secrets:        secrets,
	}
}
