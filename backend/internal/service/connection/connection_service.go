package serviceConnection

import (
	"context"
	"time"

	"github.com/dbo-studio/dbo/internal/app/dto"
	"github.com/dbo-studio/dbo/internal/container"
	databaseConnection "github.com/dbo-studio/dbo/internal/database/connection"
	"github.com/dbo-studio/dbo/internal/repository"
	serviceSafemode "github.com/dbo-studio/dbo/internal/service/safemode"
	secretStore "github.com/dbo-studio/dbo/internal/service/secret_store"
	"github.com/dbo-studio/dbo/pkg/apperror"
	"github.com/dbo-studio/dbo/pkg/cache"
	"github.com/dbo-studio/dbo/pkg/helper"
)

type IConnectionService interface {
	Index(ctx context.Context) (*dto.ConnectionsResponse, error)
	Create(ctx context.Context, req *dto.CreateConnectionRequest) error
	Update(ctx context.Context, connectionID int32, req *dto.UpdateConnectionRequest) (*dto.UpdateConnectionResponse, error)
	Delete(ctx context.Context, connectionID int32) (*dto.ConnectionsResponse, error)
	Close(ctx context.Context, connectionID int32) error
	Ping(ctx context.Context, req *dto.PingConnectionRequest) (*dto.PingConnectionResponse, error)
	SetCredentials(ctx context.Context, connectionID int32, req *dto.ConnectionCredentialsRequest) error
	UnlockSafeMode(ctx context.Context, connectionID int32, req *dto.SafeModeUnlockRequest) (*dto.SafeModeUnlockResponse, error)
	LockSafeMode(ctx context.Context, connectionID int32) error
}

type IConnectionServiceImpl struct {
	connectionRepo   repository.IConnectionRepo
	cm               *databaseConnection.ConnectionManager
	cache            cache.Cache
	secrets          secretStore.ISecretStore
	unlockStore      *serviceSafemode.UnlockStore
	safeModePassword serviceSafemode.ISafeModePasswordService
}

func NewConnectionService(
	connectionRepo repository.IConnectionRepo,
	cm *databaseConnection.ConnectionManager,
	secrets secretStore.ISecretStore,
	safeModePassword serviceSafemode.ISafeModePasswordService,
) IConnectionService {
	c := container.Instance().Cache()

	return &IConnectionServiceImpl{
		connectionRepo:   connectionRepo,
		cm:               cm,
		cache:            c,
		secrets:          secrets,
		unlockStore:      serviceSafemode.NewUnlockStore(c),
		safeModePassword: safeModePassword,
	}
}

func (s IConnectionServiceImpl) UnlockSafeMode(ctx context.Context, connectionID int32, req *dto.SafeModeUnlockRequest) (*dto.SafeModeUnlockResponse, error) {
	connection, err := s.connectionRepo.Find(ctx, connectionID)
	if err != nil {
		return nil, apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	password := ""
	if req != nil {
		password = req.Password
	}

	if err := s.safeModePassword.Check(ctx, password); err != nil {
		return nil, err
	}

	ttl := serviceSafemode.DefaultUnlockTTL
	if req != nil && req.TTLMinutes != nil {
		ttl = time.Duration(*req.TTLMinutes) * time.Minute
	}

	until, err := s.unlockStore.Unlock(ctx, helper.CtxOwnerID(ctx), connection.ID, ttl)
	if err != nil {
		return nil, apperror.InternalServerError(err)
	}

	return &dto.SafeModeUnlockResponse{
		UnlockedUntil: until.UTC().Format(time.RFC3339),
	}, nil
}

func (s IConnectionServiceImpl) LockSafeMode(ctx context.Context, connectionID int32) error {
	connection, err := s.connectionRepo.Find(ctx, connectionID)
	if err != nil {
		return apperror.NotFound(apperror.ErrConnectionNotFound)
	}

	if err := s.unlockStore.Clear(ctx, helper.CtxOwnerID(ctx), connection.ID); err != nil {
		return apperror.InternalServerError(err)
	}

	return nil
}
